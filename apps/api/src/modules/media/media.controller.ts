import { BadRequestException, Controller, Get, Post, Patch, Param, Body, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Multipart } from '../../common/decorators/multipart';
import { MediaService } from './media.service';
import { MAX_IMAGE_SIZE } from './image';
import { decodeMultipartFilename } from './filename';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Get('config') config() { return this.media.config(); }
  @Get() list(@Query() query: unknown) { return this.media.list(query); }
  @Patch(':id') alt(@Param('id') id: string, @Body() body: unknown) { return this.media.alt(id, body); }
  @Post('upload')
  @Multipart()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE, files: 1, fields: 0, parts: 1 } }))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择图片文件（字段名 file）');
    return this.media.upload(file.buffer, decodeMultipartFilename(file.originalname));
  }
}
