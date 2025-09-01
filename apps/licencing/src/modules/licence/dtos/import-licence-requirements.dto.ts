import { IsObject, IsNotEmpty, ValidateNested, IsArray, IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// NEW SCHEMA: ABN Conditions are now at group level under authority
export class ImportAbnConditionsDto {
  @IsString()
  @IsNotEmpty()
  company!: string;

  @IsString()
  @IsNotEmpty()
  individual!: string;

  @IsString()
  @IsNotEmpty()
  partnership!: string;

  @IsString()
  @IsNotEmpty()
  trust!: string;
}

// NEW SCHEMA: Authority object contains ABN conditions
export class ImportAuthorityDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateNested()
  @Type(() => ImportAbnConditionsDto)
  abn_conditions!: ImportAbnConditionsDto;
}

// NEW SCHEMA: Groups now have state, authority, and simple string classes
export class ImportGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  min_required!: number;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @ValidateNested()
  @Type(() => ImportAuthorityDto)
  authority!: ImportAuthorityDto;

  @IsArray()
  @IsString({ each: true })
  classes!: string[];
}

// NEW SCHEMA: Category states no longer have ABN conditions
export class ImportStateDataDto {
  @IsBoolean()
  licence_required!: boolean;

  @IsString()
  licence_note!: string;

  @IsArray()
  @IsString({ each: true })
  groups!: string[];
}

export class ImportCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  sub_category_name?: string;

  @IsBoolean()
  is_parent!: boolean;

  @IsObject()
  states!: Record<string, ImportStateDataDto>;
}

export class ImportLicenceRequirementsDto {
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => ImportGroupDto)
  groups!: Record<string, ImportGroupDto>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportCategoryDto)
  categories!: ImportCategoryDto[];
}
