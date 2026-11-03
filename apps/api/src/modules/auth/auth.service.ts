import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException, HttpException } from '@nestjs/common';
import { parse as parseCookie } from 'cookie';
import type { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword, verifyPassword } from './password';

export const SESSION_COOKIE = 'blog_session';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const digest = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, { count: number; expires: number }>();
  private readonly dummyHash = hashPassword(randomBytes(32).toString('hex'));
  constructor(private readonly prisma: PrismaService) {}

  private throttle(ip: string) {
    const now = Date.now();
    for (const [key, entry] of this.attempts) if (entry.expires <= now) this.attempts.delete(key);
    const entry = this.attempts.get(ip) ?? { count: 0, expires: now + 15 * 60_000 };
    if (entry.count >= 10 || this.attempts.size >= 10_000 && !this.attempts.has(ip)) {
      throw new HttpException('登录尝试过多，请稍后再试', 429);
    }
    entry.count++;
    this.attempts.set(ip, entry);
  }

  async login(email: string, password: string, ip: string) {
    this.throttle(ip);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? await this.dummyHash);
    if (!user || !valid) throw new UnauthorizedException('邮箱或密码错误');
    this.attempts.delete(ip);
    await this.prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    const token = randomBytes(32).toString('hex');
    const session = await this.prisma.session.create({ data: {
      tokenHash: digest(token), csrfToken: randomBytes(32).toString('hex'), userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
    } });
    return { token, response: { user: { id: user.id, email: user.email, displayName: user.displayName }, csrfToken: session.csrfToken } };
  }

  async session(request: Request) {
    const token = parseCookie(request.headers.cookie ?? '')[SESSION_COOKIE];
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException('请先登录');
    const session = await this.prisma.session.findUnique({ where: { tokenHash: digest(token) },
      include: { user: { select: { id: true, email: true, displayName: true } } } });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException('登录已过期，请重新登录');
    return session;
  }

  async logout(request: Request) {
    const session = await this.session(request);
    await this.prisma.session.deleteMany({ where: { id: session.id } });
  }
}
