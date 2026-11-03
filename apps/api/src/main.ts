import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.use(json({ limit: '2mb' }));
  app.set('trust proxy', 'loopback');
  app.use((_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  const host = config.getOrThrow<string>('API_HOST');
  const port = config.getOrThrow<number>('API_PORT');
  await app.listen(port, host);
  Logger.log(`API listening on http://${host}:${port}/api`, 'Bootstrap');
}

bootstrap().catch(() => {
  // Nest logs startup failures; avoid dumping connection strings here.
  process.exitCode = 1;
});
