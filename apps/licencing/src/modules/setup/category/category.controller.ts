import { Controller, Get } from '@nestjs/common';
import { CategoryLoader } from './category.loader';
import { CategoryViewDto } from './dtos/category-view.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryLoader: CategoryLoader) {}

  @Get()
  async getCategories(): Promise<CategoryViewDto[]> {
    return this.categoryLoader.getCategoriesView();
  }
}
