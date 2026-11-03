import { randomUUID, createHash } from 'node:crypto';
import { Injectable, HttpException, NotFoundException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { mediaListQuerySchema, mediaAltSchema } from '@blog/contracts';
import { PrismaService } from '../../database/prisma.service';
import { parse } from '../../common/validation';
import { QiniuStorage, QINIU_PREFIX, QINIU_BUCKET, QINIU_DOMAIN } from './qiniu.storage';
import { inspectImage, MAX_IMAGE_SIZE, IMAGE_MIMES } from './image';
import { safeFilename } from './filename';

@Injectable()
export class MediaService {
  private uploads = 0;
  constructor(private readonly prisma: PrismaService, private readonly storage: QiniuStorage) {}
  config() {
    return { configured: this.storage.configured(), bucket: QINIU_BUCKET, region: 'z2', domain: QINIU_DOMAIN,
      prefix: QINIU_PREFIX, maxSize: MAX_IMAGE_SIZE, allowedTypes: IMAGE_MIMES };
  }
  async list(query: unknown) {
    const { page, pageSize, search } = parse(mediaListQuerySchema, query);
    // Only show records under this project's prefix, never the rest of the shared bucket.
    const where = { storageKey: { startsWith: QINIU_PREFIX }, ...(search ? { OR: [
      { originalName: { contains: search, mode: 'insensitive' as const } }, { alt: { contains: search, mode: 'insensitive' as const } },
    ] } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
      this.prisma.media.count({ where }),
    ]);
    return { items: items.map((item) => ({ ...item, url: this.storage.url(item.storageKey) })), total, page, pageSize };
  }
  async upload(bytes: Buffer, filename: string, importPath?: string) {
    if (!this.storage.configured()) throw new ServiceUnavailableException('七牛云 AK/SK 尚未配置');
    if (this.uploads >= 3) throw new HttpException('同时上传的图片过多，请稍后重试', 429);
    this.uploads++;
    try {
      const { mime, extension } = await inspectImage(bytes);
      // HTTP callers cannot provide an import path or an object key.
      const hash = createHash('sha256').update(bytes).digest('hex');
      const date = new Date().toISOString().slice(0, 7).replace('-', '/');
      const key = importPath
        ? `${QINIU_PREFIX}project/${createHash('sha256').update(importPath).digest('hex').slice(0, 12)}-${hash}.${extension}`
        : `${QINIU_PREFIX}images/${date}/${randomUUID()}.${extension}`;
      const existing = importPath ? await this.prisma.media.findUnique({ where: { storageKey: key } }) : null;
      if (existing) return { ...existing, url: this.storage.url(key) };
      const url = await this.storage.upload(key, bytes, mime);
      const safeName = safeFilename(filename, extension);
      try {
        const media = await this.prisma.media.create({ data: { storageKey: key, originalName: safeName, mimeType: mime, size: bytes.length,
          alt: importPath ? importPath.slice(0, 300) : '' } });
        return { ...media, url };
      } catch {
        Logger.warn(`Uploaded object not recorded: ${key}`, 'Media');
        // Never silently remove a shared bucket object; it can be reconciled by this key.
        throw new ServiceUnavailableException(`图片已上传但素材记录保存失败，请保留对象键 ${key} 联系管理员核对`);
      }
    } finally { this.uploads--; }
  }
  async alt(id: string, body: unknown) {
    const input = parse(mediaAltSchema, body);
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media || !media.storageKey.startsWith(QINIU_PREFIX)) throw new NotFoundException('素材不存在');
    const updated = await this.prisma.media.update({ where: { id }, data: input });
    return { ...updated, url: this.storage.url(updated.storageKey) };
  }
}
