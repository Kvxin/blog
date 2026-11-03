import 'reflect-metadata';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { MediaService } from './media.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  try {
    const root = resolve(process.cwd(), '../..');
    const media = app.get(MediaService);
    const images: string[] = [];
    async function scan(directory: string) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) await scan(path);
        else if (entry.isFile() && /\.(jpg|jpeg|png|gif|webp|avif|ico)$/i.test(extname(path))) images.push(path);
      }
    }
    // Source images only: dependencies, generated dist output and other sites are excluded.
    for (const directory of ['apps/web/src', 'apps/web/public', 'apps/admin/src', 'apps/admin/public']) await scan(resolve(root, directory));
    const manifest: Record<string, string> = {};
    for (const path of images.sort()) {
      const name = relative(root, path).replace(/\\/g, '/');
      const result = await media.upload(await readFile(path), path.split('/').at(-1)!, name);
      manifest[name] = result.url;
      console.log(`${name} -> ${result.url}`);
    }
    await mkdir(resolve(root, 'docs'), { recursive: true });
    await writeFile(resolve(root, 'docs/qiniu-images.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Imported ${images.length} source images; local files preserved. Re-running skips database-recorded objects.`);
  } finally { await app.close(); }
}
main().catch(() => { console.error('图片迁移失败，请检查七牛云配置/网络及服务日志。'); process.exitCode = 1; });
