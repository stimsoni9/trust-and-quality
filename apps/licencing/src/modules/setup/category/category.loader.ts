import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParentCategoryEntity } from '../../shared/entities/parent-category.entity';
import { SubCategoryEntity } from '../../shared/entities/sub-category.entity';
import { CategoryViewDto } from './dtos/category-view.dto';

@Injectable()
export class CategoryLoader {
  private readonly logger = new Logger(CategoryLoader.name);

  constructor(
    @InjectRepository(ParentCategoryEntity)
    private readonly parentRepo: Repository<ParentCategoryEntity>,
    @InjectRepository(SubCategoryEntity)
    private readonly subRepo: Repository<SubCategoryEntity>,
  ) {}

  async loadAndSaveIfEmpty(): Promise<void> {
    const parentCount = await this.parentRepo.count();
    const subCount = await this.subRepo.count();
    if (parentCount > 0 || subCount > 0) {
      this.logger.log('Category seed skipped: data already present');
      return;
    }

    this.logger.log('Fetching categories for initial seed...');
    const url = 'https://on-demand-service.homeimprovementpages.com.au/v1/categories';
    const response = await axios.get(url, { timeout: 15000 });
    const payload = response.data;

    const parents: any[] = Array.isArray(payload?.data) ? payload.data : [];
    const parentsToSave: ParentCategoryEntity[] = [];
    const subsToSave: SubCategoryEntity[] = [];

    for (const parent of parents) {
      const parentId = Number(parent?.practice_id);
      if (!Number.isFinite(parentId)) continue;
      parentsToSave.push({
        id: parentId,
        name: String(parent?.practice_seo_name ?? ''),
      } as ParentCategoryEntity);

      const subs: any[] = Array.isArray(parent?.subcategories) ? parent.subcategories : [];
      for (const sub of subs) {
        const subId = Number(sub?.practice_id);
        const subParentId = Number(sub?.practice_parent_id);
        if (!Number.isFinite(subId) || !Number.isFinite(subParentId)) continue;
        subsToSave.push({
          id: subId,
          parentId: subParentId,
          name: String(sub?.practice_seo_name ?? ''),
          shortName: String(sub?.practice_name ?? ''),
        } as SubCategoryEntity);
      }
    }

    if (parentsToSave.length === 0 && subsToSave.length === 0) {
      this.logger.warn('No categories received from source; skipping seed.');
      return;
    }

    await this.parentRepo.save(parentsToSave, { chunk: 100 });
    await this.subRepo.save(subsToSave, { chunk: 100 });
    this.logger.log(`Seeded ${parentsToSave.length} parent categories and ${subsToSave.length} sub categories.`);
  }

  async getCategoriesView(): Promise<CategoryViewDto[]> {
    // Use raw query to fetch from the view since TypeORM doesn't have a direct entity for it
    const result = await this.parentRepo.query('SELECT * FROM categories_view ORDER BY parent_category_id');
    return result.map((row: any) => ({
      parent_category_id: row.parent_category_id,
      name: row.name,
      shortName: row.shortName,
      sub_category_id: row.sub_category_id,
    }));
  }
}

