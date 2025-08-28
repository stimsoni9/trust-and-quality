import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenceEntity } from '../setup/licencing/entity/licence.entity';
import { LicenceService } from './licence.service';
import { LicenceController } from './licence.controller';
import { LicenceRequirementService } from './licence-requirement.service';
import { LicenceTypeEntity } from '../setup/licencing/entity/licence-type.entity';
import { CategoryStateEntity } from '../setup/licencing/entity/category-state.entity';
import { CategoryStateAbnConditionEntity } from '../setup/licencing/entity/category-state-abn-condition.entity';
import { CategoryStateLicenceGroupEntity } from '../setup/licencing/entity/category-state-licence-group.entity';
import { LicenceRequirementGroupEntity } from '../setup/licencing/entity/licence-requirement-group.entity';
import { LicenceRequirementGroupLicenceEntity } from '../setup/licencing/entity/licence-requirement-group-licence.entity';
import { ParentCategoryEntity } from '../setup/category/entity/parent-category.entity';
import { SubCategoryEntity } from '../setup/category/entity/sub-category.entity';
import { AuthorityEntity } from '../setup/licencing/entity/authority.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    LicenceEntity, 
    LicenceTypeEntity,
    CategoryStateEntity,
    CategoryStateAbnConditionEntity,
    CategoryStateLicenceGroupEntity,
    LicenceRequirementGroupEntity,
    LicenceRequirementGroupLicenceEntity,
    ParentCategoryEntity,
    SubCategoryEntity,
    AuthorityEntity
  ])],
  providers: [LicenceService, LicenceRequirementService],
  controllers: [LicenceController],
  exports: [LicenceService, LicenceRequirementService],
})
export class LicenceModule {}
