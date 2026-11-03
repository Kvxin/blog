import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { publishInputSchema } from '@blog/contracts';
import { parse } from '../../common/validation';

@Controller('publishing')
export class PublishingController {
  constructor(private readonly publishing: PublishingService) {}
  @Get('overview') overview() { return this.publishing.overview(); }
  @Get('jobs') list(@Query() query: unknown) { return this.publishing.list(query); }
  @Get('jobs/:id') get(@Param('id') id: string) { return this.publishing.get(id); }
  @Post('jobs') start(@Body() body: unknown) {
    const { remark } = parse(publishInputSchema, body);
    return this.publishing.start(remark);
  }
}
