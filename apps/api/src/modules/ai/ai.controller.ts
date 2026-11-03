import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Get('config') get() { return this.ai.get(); }
  @Put('config') save(@Body() body: unknown) { return this.ai.save(body); }
  @Post('models') models() { return this.ai.models(); }
  @Post('test') test() { return this.ai.test(); }
  @Post('translate') translate(@Body() body: unknown) { return this.ai.translate(body); }
}
