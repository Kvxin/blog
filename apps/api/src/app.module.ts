import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { AuthGuard } from './common/guards/auth.guard';
import { PrismaFilter } from './common/filters/prisma.filter';
import { PostsModule } from './modules/posts/posts.module';
import { MomentsModule } from './modules/moments/moments.module';
import { MediaModule } from './modules/media/media.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { PublishingModule } from './modules/publishing/publishing.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Production receives secrets through systemd, not by reading a root-only file.
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    PostsModule,
    MomentsModule,
    MediaModule,
    TaxonomyModule,
    PublishingModule,
    AiModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: PrismaFilter },
  ],
})
export class AppModule {}
