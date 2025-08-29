import { AbnConditionKind } from '../entities/category-state-abn-condition.entity';

export interface CategoryRequestDto {
  parent_category_id: number;
  sub_category_id?: number;
  abn_kind: AbnConditionKind;
}

export interface LicenceRequirementsRequestDto {
  categories: CategoryRequestDto[];
}
