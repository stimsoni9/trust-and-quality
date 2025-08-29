import { IsObject, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class LicenceClassDto {
  name!: string;
  state!: string;
  authority!: string;
}

export class GroupDto {
  name!: string;
  min_required!: number;
  classes!: LicenceClassDto[];
}

export class AbnConditionsDto {
  company?: string;
  individual?: string;
  partnership?: string;
  trust?: string;
  other?: string;
}

export class StateDataDto {
  licence_required!: boolean;
  licence_note!: string;
  abn_conditions!: AbnConditionsDto;
  groups!: string[];
}

export class CategoryDto {
  name!: string;
  sub_category_name?: string;
  is_parent!: boolean;
  states!: Record<string, StateDataDto>;
}

export class UpdateLicenceRequirementsDto {
  @IsObject()
  groups!: Record<string, GroupDto>;

  @IsArray()
  categories!: CategoryDto[];
}
