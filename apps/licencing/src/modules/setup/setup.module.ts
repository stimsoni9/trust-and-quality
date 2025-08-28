import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenceEntity } from './licencing/entity/licence.entity';
import { ParentCategoryEntity } from './category/entity/parent-category.entity';
import { SubCategoryEntity } from './category/entity/sub-category.entity';
import { CategoryLoader } from './category/category.loader';
import { CategoryController } from './category/category.controller';
import { SetupService } from './setup.service';
import { AuthorityEntity } from './licencing/entity/authority.entity';
import { AuthorityLoader } from './licencing/authority.loader';
import { LicenceTypeEntity } from './licencing/entity/licence-type.entity';
import { LicenceRequirementGroupEntity } from './licencing/entity/licence-requirement-group.entity';
import { LicenceRequirementGroupLicenceEntity } from './licencing/entity/licence-requirement-group-licence.entity';
import { CategoryStateEntity } from './licencing/entity/category-state.entity';
import { CategoryStateLicenceGroupEntity } from './licencing/entity/category-state-licence-group.entity';
import { CategoryStateAbnConditionEntity } from './licencing/entity/category-state-abn-condition.entity';
import { AbnConditionsLoader } from './licencing/abn-conditions.loader';

@Module({
  imports: [TypeOrmModule.forFeature([
    LicenceEntity, 
    ParentCategoryEntity, 
    SubCategoryEntity, 
    AuthorityEntity,
    LicenceTypeEntity,
    LicenceRequirementGroupEntity,
    LicenceRequirementGroupLicenceEntity,
    CategoryStateEntity,
    CategoryStateLicenceGroupEntity,
    CategoryStateAbnConditionEntity
  ])],
  providers: [SetupService, CategoryLoader, AuthorityLoader, AbnConditionsLoader],
  controllers: [CategoryController],
})
export class SetupModule {}

