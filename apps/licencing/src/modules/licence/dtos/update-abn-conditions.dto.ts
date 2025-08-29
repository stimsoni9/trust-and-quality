import { IsObject, IsNotEmpty, ValidateNested, IsArray, IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class LicenceClassDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsNotEmpty()
  authority!: string;
}

export class GroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  min_required!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LicenceClassDto)
  classes!: LicenceClassDto[];
}

export class AbnConditionsDto {
  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  individual?: string;

  @IsOptional()
  @IsString()
  partnership?: string;

  @IsOptional()
  @IsString()
  trust?: string;

  @IsOptional()
  @IsString()
  other?: string;
}

export class StateDataDto {
  @IsBoolean()
  licence_required!: boolean;

  @IsString()
  licence_note!: string;

  @ValidateNested()
  @Type(() => AbnConditionsDto)
  abn_conditions!: AbnConditionsDto;

  @IsArray()
  @IsString({ each: true })
  groups!: string[];
}

export class CategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  sub_category_name?: string;

  @IsBoolean()
  is_parent!: boolean;

  @IsObject()
  states!: Record<string, StateDataDto>;
}

export class UpdateLicenceRequirementsDto {
  @IsObject()
  @ValidateNested()
  @Type(() => GroupDto)
  groups!: Record<string, GroupDto>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  categories!: CategoryDto[];
}
