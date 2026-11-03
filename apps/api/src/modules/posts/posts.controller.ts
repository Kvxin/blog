import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}
  @Get() list(@Query() query: unknown) { return this.posts.list(query); }
  @Get(':id') get(@Param('id') id: string) { return this.posts.get(id); }
  @Post() create(@Body() body: unknown) { return this.posts.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: unknown) { return this.posts.update(id, body); }
  @Delete(':id') delete(@Param('id') id: string, @Body() body: unknown) { return this.posts.delete(id, body); }
}
