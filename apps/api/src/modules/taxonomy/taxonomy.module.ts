import { Module } from '@nestjs/common';
import { CategoriesController, TagsController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';

@Module({ controllers: [CategoriesController, TagsController], providers: [TaxonomyService] })
export class TaxonomyModule {}
