import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { QiniuStorage } from './qiniu.storage';

@Module({ controllers: [MediaController], providers: [MediaService, QiniuStorage], exports: [MediaService] })
export class MediaModule {}
