import { spawn } from 'node:child_process';
import { cp, mkdir, readlink, writeFile, stat, rm } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { Injectable, ConflictException, NotFoundException, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { publishQuerySchema } from '@blog/contracts';
import { PrismaService } from '../../database/prisma.service';
import { parse } from '../../common/validation';

@Injectable()
export class PublishingService implements OnModuleInit, OnModuleDestroy {
  private running = false;
  private child?: ReturnType<typeof spawn>;
  private readonly root: string;
  private readonly repo = resolve(__dirname, '../../../../..');
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {
    this.root = config.getOrThrow<string>('PUBLISH_ROOT');
  }
  async onModuleInit() {
    // A single API instance runs the worker. Reconcile tasks interrupted by restart.
    const current = await this.currentRelease();
    const jobs = await this.prisma.publishJob.findMany({ where: { status: { in: ['QUEUED', 'RUNNING'] } } });
    for (const job of jobs) await this.prisma.publishJob.update({ where: { id: job.id }, data: {
      status: current === job.id ? 'SUCCEEDED' : 'FAILED', releaseId: current === job.id ? job.id : null,
      finishedAt: new Date(), log: job.log + '\n服务重启：' + (current === job.id ? '已核对该版本在线。' : '任务已中断，请重新发布。'),
    } });
  }
  private stopChild() {
    if (this.child?.pid) { try { process.kill(-this.child.pid, 'SIGTERM'); } catch {} }
  }
  onModuleDestroy() { this.stopChild(); }
  private async currentRelease() {
    try { return basename(await readlink(join(this.root, 'releases/current'))); } catch { return null; }
  }
  async overview() {
    const cutoff = new Date();
    const [posts, translations, moments, activeJob] = await this.prisma.$transaction([
      this.prisma.post.count({ where: { status: 'PUBLISHED', publishedAt: { lte: cutoff } } }),
      this.prisma.postTranslation.count({ where: { post: { status: 'PUBLISHED', publishedAt: { lte: cutoff } } } }),
      this.prisma.moment.count({ where: { status: 'PUBLISHED', publishedAt: { lte: cutoff } } }),
      this.prisma.publishJob.findFirst({ where: { status: { in: ['QUEUED', 'RUNNING'] } }, orderBy: { createdAt: 'desc' } }),
    ]);
    const base = this.config.getOrThrow<string>('BLOG_BASE_PATH');
    return { posts, translations, moments, activeJob, currentRelease: await this.currentRelease(), siteUrl: this.config.getOrThrow<string>('BLOG_SITE_URL').replace(/\/$/, '') + (base === '/' ? '/' : base + '/') };
  }
  async list(query: unknown) {
    const { page, pageSize } = parse(publishQuerySchema, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.publishJob.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
      this.prisma.publishJob.count(),
    ]);
    return { items: items.map(({ log, ...job }) => ({ ...job, log: '' })), total, page, pageSize };
  }
  async get(id: string) {
    const job = await this.prisma.publishJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('发布任务不存在');
    return job;
  }
  async start(remark = '') {
    if (this.running) throw new ConflictException('已有发布任务，请等待完成');
    this.running = true;
    try {
      const job = await this.prisma.publishJob.create({ data: { remark, log: '发布任务已创建，等待构建。\n' } });
      void this.run(job.id).catch(() => Logger.error('Publish worker failed; see job log', 'Publishing')).finally(() => { this.running = false; });
      return job;
    } catch (error) { this.running = false; throw error; }
  }
  private async run(id: string) {
    let log = '';
    let flush: ReturnType<typeof setInterval> | undefined;
    let writes: Promise<unknown> = Promise.resolve();
    const append = (text: string) => { log = (log + text.replace(/\u001b\[[0-9;]*m/g, '')).slice(-60_000); };
    const work = join(this.root, 'builds', id);
    const release = join(this.root, 'releases', id);
    try {
      await mkdir(work, { recursive: true, mode: 0o700 });
      await this.prisma.publishJob.update({ where: { id }, data: { status: 'RUNNING', startedAt: new Date() } });
      const cutoff = new Date();
      const [posts, moments] = await this.prisma.$transaction([
        this.prisma.post.findMany({ where: { status: 'PUBLISHED', publishedAt: { lte: cutoff } }, include: { translations: true, category: true, tags: true } }),
        this.prisma.moment.findMany({ where: { status: 'PUBLISHED', publishedAt: { lte: cutoff } } }),
      ], { isolationLevel: 'RepeatableRead' });
      const blog = posts.flatMap((post) => post.translations.map((translation) => ({
        id: `${translation.locale}/blog/${post.translationKey}`, body: translation.content,
        data: { title: translation.title, description: translation.description, translationKey: post.translationKey,
          pubDate: post.publishedAt!.toISOString(), updatedDate: post.updatedAt.toISOString(),
          ...(translation.coverUrl ? { heroImage: translation.coverUrl } : {}),
          category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
          tags: post.tags.map(({ name, slug }) => ({ name, slug })) },
      })));
      const snapshot = { locales: [...new Set(['en', 'zh-cn', ...posts.flatMap((post) => post.translations.map((t) => t.locale)), ...moments.map((m) => m.locale)])], blog,
        jobId: id, snapshotAt: cutoff.toISOString(), postCount: posts.length,
        moments: moments.map((moment) => ({ id: `${moment.locale}/moments/${moment.id}`, body: moment.content,
          data: { date: moment.publishedAt!.toISOString(), ...(moment.location ? { location: moment.location } : {}), images: moment.images } })) };
      await writeFile(join(work, 'snapshot.json'), JSON.stringify(snapshot), { mode: 0o600 });
      append(`快照：${posts.length} 篇文章、${blog.length} 个语言版本、${moments.length} 条碎碎念。草稿、归档及未来时间内容已排除。\n`);
      await this.prisma.publishJob.update({ where: { id }, data: { postCount: posts.length, momentCount: moments.length, log } });
      const web = join(work, 'apps/web');
      await mkdir(web, { recursive: true });
      for (const name of ['src', 'public', 'astro.config.mjs', 'package.json', 'tsconfig.json']) await cp(join(this.repo, 'apps/web', name), join(web, name), { recursive: true });
      await mkdir(join(work, 'docs'), { recursive: true });
      await cp(join(this.repo, 'docs/qiniu-images.json'), join(work, 'docs/qiniu-images.json'));
      // Materialize dependencies inside the job. Reflinks are used where supported;
      // ordinary copies work with the host's protected-hardlink security policy.
      await mkdir(join(work, 'node_modules'), { recursive: true });
      await new Promise<void>((accept, reject) => {
        const copy = spawn('/bin/cp', ['-a', '--reflink=auto', '--no-preserve=ownership', join(this.repo, 'node_modules/.pnpm'), join(work, 'node_modules/.pnpm')], { stdio: 'ignore' });
        copy.once('error', reject); copy.once('close', (code) => code === 0 ? accept() : reject(new Error('依赖准备失败')));
      });
      await cp(join(this.repo, 'apps/web/node_modules'), join(web, 'node_modules'), { recursive: true, verbatimSymlinks: true });
      await mkdir(join(this.root, 'releases'), { recursive: true });
      // Fixed executable/arguments; no shell or client-supplied build commands.
      // Build subprocess gets ONLY public snapshot/config, never API credentials.
      const runner = join(this.repo, 'scripts/publish-build.mjs');
      flush = setInterval(() => {
        const progress = log;
        writes = writes.then(() => this.prisma.publishJob.updateMany({ where: { id, status: 'RUNNING' }, data: { log: progress } })).catch(() => undefined);
      }, 1000);
      await new Promise<void>((accept, reject) => {
        this.child = spawn('/usr/bin/flock', ['-n', join(this.root, 'publish.lock'), process.execPath, runner, web, join(work, 'snapshot.json'), release], {
          detached: true,
          env: { PATH: '/usr/local/bin:/usr/bin:/bin', NODE_ENV: 'production', HOME: work, ASTRO_TELEMETRY_DISABLED: '1',
            BLOG_SITE_URL: this.config.getOrThrow<string>('BLOG_SITE_URL'), BLOG_BASE_PATH: this.config.getOrThrow<string>('BLOG_BASE_PATH') }, stdio: ['ignore', 'pipe', 'pipe'],
        });
        this.child.stdout?.on('data', (chunk) => append(chunk.toString()));
        this.child.stderr?.on('data', (chunk) => append(chunk.toString()));
        const timeout = setTimeout(() => { this.stopChild(); }, 300_000);
        this.child.once('error', () => { clearTimeout(timeout); reject(new Error('无法启动构建进程')); });
        this.child.once('close', (code) => { clearTimeout(timeout); this.child = undefined; code === 0 ? accept() : reject(new Error(`构建未成功（退出码 ${code}），线上版本未切换`)); });
      });
      clearInterval(flush); flush = undefined;
      await writes;
      if (!(await stat(join(release, 'index.html'))).size) throw new Error('构建缺少首页');
      append('\n构建成功，线上版本已原子切换。\n');
      await this.prisma.publishJob.update({ where: { id }, data: { status: 'SUCCEEDED', finishedAt: new Date(), releaseId: id, log } });
    } catch (error) {
      if (flush) clearInterval(flush);
      await writes;
      if (await this.currentRelease() === id) {
        await this.prisma.publishJob.update({ where: { id }, data: { status: 'SUCCEEDED', releaseId: id, finishedAt: new Date(), log: log + '\n已核对版本在线。' } });
        return;
      }
      append(`\n发布失败：${error instanceof Error ? error.message : '未知错误'}\n`);
      await this.prisma.publishJob.update({ where: { id }, data: { status: 'FAILED', finishedAt: new Date(), log } });
    } finally {
      // Only remove this worker's private temporary directory, never release output.
      await rm(work, { recursive: true, force: true }).catch(() => Logger.warn('Publish workspace cleanup failed', 'Publishing'));
    }
  }
}
