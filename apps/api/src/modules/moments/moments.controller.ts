import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { MomentsService } from './moments.service';
@Controller('moments')
export class MomentsController {
  constructor(private readonly moments: MomentsService) {}
  @Get() list(@Query() query: unknown) { return this.moments.list(query); }
  @Get(':id') get(@Param('id') id: string) { return this.moments.get(id); }
  @Post() create(@Body() body: unknown) { return this.moments.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: unknown) { return this.moments.update(id, body); }
  @Delete(':id') delete(@Param('id') id: string, @Body() body: unknown) { return this.moments.delete(id, body); }
}
