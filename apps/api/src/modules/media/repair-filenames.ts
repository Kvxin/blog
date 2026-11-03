import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { decodeMultipartFilename } from './filename';

async function main() {
  config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const records = await prisma.media.findMany({ where: { storageKey: { startsWith: 'blog/' } }, select: { id: true, originalName: true } });
    let count = 0;
    for (const record of records) {
      const restored = decodeMultipartFilename(record.originalName);
      // Automatic repair is limited to clearly recoverable Chinese mojibake.
      // Preserve ambiguous Latin names and names already correctly decoded.
      if (restored === record.originalName || !/[\u3400-\u9fff]/u.test(restored)) continue;
      const result = await prisma.media.updateMany({ where: { id: record.id, originalName: record.originalName }, data: { originalName: restored } });
      if (result.count) { count++; console.log(`${record.id}: ${restored}`); }
    }
    console.log(`修复 ${count} 条图片文件名；未修改对象键、图片文件或外链。`);
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error('文件名修复失败，请检查数据库配置。'); process.exitCode = 1; });
