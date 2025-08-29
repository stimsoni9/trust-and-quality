import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenceEntity } from '../licence/entities/licence.entity';
import { ParentCategoryEntity } from '../shared/entities/parent-category.entity';
import { SubCategoryEntity } from '../shared/entities/sub-category.entity';
import { CategoryLoader } from './category/category.loader';
import { CategoryController } from './category/category.controller';
import { SetupService } from './setup.service';
import { AuthorityEntity } from '../licence/entities/authority.entity';
import { AuthorityLoader } from './licencing/authority.loader';
import { LicenceTypeEntity } from '../licence/entities/licence-type.entity';
import { LicenceRequirementGroupEntity } from '../licence/entities/licence-requirement-group.entity';
import { LicenceRequirementGroupLicenceEntity } from '../licence/entities/licence-requirement-group-licence.entity';
import { CategoryStateEntity } from '../licence/entities/category-state.entity';
import { CategoryStateLicenceGroupEntity } from '../licence/entities/category-state-licence-group.entity';
import { CategoryStateAbnConditionEntity } from '../licence/entities/category-state-abn-condition.entity';
import { AbnConditionsLoader } from './licencing/abn-conditions.loader';
import { LicenceRequirementService } from '../licence/licence-requirement.service';

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
  providers: [SetupService, CategoryLoader, AuthorityLoader, AbnConditionsLoader, LicenceRequirementService],
  controllers: [CategoryController],
})
export class SetupModule {}

