import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenceEntity } from './entities/licence.entity';
import { LicenceService } from './licence.service';
import { LicenceController } from './licence.controller';
import { LicenceRequirementService } from './licence-requirement.service';
import { LicenceTypeEntity } from './entities/licence-type.entity';
import { CategoryStateEntity } from './entities/category-state.entity';
import { CategoryStateAbnConditionEntity } from './entities/category-state-abn-condition.entity';
import { CategoryStateLicenceGroupEntity } from './entities/category-state-licence-group.entity';
import { LicenceRequirementGroupEntity } from './entities/licence-requirement-group.entity';
import { LicenceRequirementGroupLicenceEntity } from './entities/licence-requirement-group-licence.entity';
import { ParentCategoryEntity } from '../shared/entities/parent-category.entity';
import { SubCategoryEntity } from '../shared/entities/sub-category.entity';
import { AuthorityEntity } from './entities/authority.entity';

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
