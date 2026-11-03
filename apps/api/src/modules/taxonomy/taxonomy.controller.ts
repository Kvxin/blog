import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly taxonomy: TaxonomyService) {}
  @Get() list(@Query() query: unknown) { return this.taxonomy.list('category', query); }
  @Post() create(@Body() body: unknown) { return this.taxonomy.create('category', body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: unknown) { return this.taxonomy.update('category', id, body); }
  @Delete(':id') delete(@Param('id') id: string, @Body() body: unknown) { return this.taxonomy.delete('category', id, body); }
}

@Controller('tags')
export class TagsController {
  constructor(private readonly taxonomy: TaxonomyService) {}
  @Get() list(@Query() query: unknown) { return this.taxonomy.list('tag', query); }
  @Post() create(@Body() body: unknown) { return this.taxonomy.create('tag', body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: unknown) { return this.taxonomy.update('tag', id, body); }
  @Delete(':id') delete(@Param('id') id: string, @Body() body: unknown) { return this.taxonomy.delete('tag', id, body); }
}
