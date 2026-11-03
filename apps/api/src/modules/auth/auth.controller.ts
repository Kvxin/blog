import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { serialize } from 'cookie';
import { loginSchema } from '@blog/contracts';
import { Public } from '../../common/decorators/public';
import { parse } from '../../common/validation';
import { AuthService, SESSION_COOKIE, SESSION_SECONDS } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  private cookie(value: string, maxAge: number) {
    return serialize(SESSION_COOKIE, value, { httpOnly: true, secure: this.config.getOrThrow<boolean>('SESSION_SECURE'),
      sameSite: 'strict', path: '/api', maxAge });
  }

  @Public()
  @Post('login')
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const input = parse(loginSchema, body);
    const result = await this.auth.login(input.email, input.password, req.ip ?? 'unknown');
    res.setHeader('Set-Cookie', this.cookie(result.token, SESSION_SECONDS));
    return result.response;
  }

  @Get('me')
  async me(@Req() req: Request) {
    const session = await this.auth.session(req);
    return { user: session.user, csrfToken: session.csrfToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req);
    res.setHeader('Set-Cookie', this.cookie('', 0));
    return { ok: true };
  }
}
