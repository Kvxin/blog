import { timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService, private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const isPublic = this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()]);
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const multipart = this.reflector.getAllAndOverride<boolean>('multipart', [context.getHandler(), context.getClass()]);
    if (unsafe) {
      const allowed = [this.config.getOrThrow<string>('ADMIN_ORIGIN')];
      if (process.env.NODE_ENV !== 'production') allowed.push('http://127.0.0.1:5174', 'http://localhost:5174');
      if (!allowed.includes(request.headers.origin ?? '')) throw new ForbiddenException('请求来源不被允许');
      if (!request.is(multipart ? 'multipart/form-data' : 'application/json')) throw new ForbiddenException(multipart ? '请使用文件表单请求' : '请使用 JSON 请求');
    }
    if (isPublic) return true;
    const session = await this.auth.session(request);
    if (unsafe) {
      const token = request.headers['x-csrf-token'];
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) ||
        !timingSafeEqual(Buffer.from(token), Buffer.from(session.csrfToken))) throw new ForbiddenException('CSRF 校验失败');
    }
    return true;
  }
}
