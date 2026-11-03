import { resolve } from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { hashPassword } from './password';

async function main() {
  config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
  const input = z.object({ DATABASE_URL: z.string().min(1), ADMIN_EMAIL: z.email().transform((value) => value.toLowerCase()),
    ADMIN_PASSWORD: z.string().min(12).max(256), ADMIN_NAME: z.string().min(1).default('管理员') }).parse(process.env);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: input.DATABASE_URL }) });
  try {
    const existing = await prisma.user.findUnique({ where: { email: input.ADMIN_EMAIL } });
    if (existing) { console.log('管理员已存在，未修改密码。'); return; }
    await prisma.user.create({ data: { email: input.ADMIN_EMAIL, displayName: input.ADMIN_NAME, passwordHash: await hashPassword(input.ADMIN_PASSWORD) } });
    console.log('管理员已创建；账号和初始密码见根目录 .env。没有公开注册接口。');
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error('初始化失败，请检查数据库连接和 ADMIN_* 配置（密码至少 12 位）。'); process.exitCode = 1; });
