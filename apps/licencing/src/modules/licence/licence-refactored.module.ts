import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenceController } from './licence.controller';
import { LicenceService } from './licence.service';
import { LicenceRequirementService } from './application/services/licence-requirement.service';
import { TypeOrmLicenceRequirementRepository } from './adapters/repositories/typeorm-licence-requirement.repository';
import { LicenceDataImportAdapter } from './adapters/data-import/licence-data-import.adapter';
import { GroupLinkingAdapter } from './adapters/group-linking/group-linking.adapter';
import { LicenceRequirementDomainService } from './domain/services/licence-requirement-domain.service';
import { LICENCE_REQUIREMENT_REPOSITORY, LicenceRequirementRepository } from './ports/licence-requirement.repository.port';
import { DATA_IMPORT_PORT, DataImportPort } from './ports/data-import.port';
import { GROUP_LINKING_PORT, GroupLinkingPort } from './ports/group-linking.port';

// Entities
import { CategoryStateEntity } from './entities/category-state.entity';
import { CategoryStateAbnConditionEntity } from './entities/category-state-abn-condition.entity';
import { LicenceRequirementGroupEntity } from './entities/licence-requirement-group.entity';
import { CategoryStateLicenceGroupEntity } from './entities/category-state-licence-group.entity';
import { LicenceRequirementGroupLicenceEntity } from './entities/licence-requirement-group-licence.entity';
import { LicenceEntity } from './entities/licence.entity';
import { LicenceTypeEntity } from './entities/licence-type.entity';
import { AuthorityEntity } from './entities/authority.entity';
import { ParentCategoryEntity } from '../shared/entities/parent-category.entity';
import { SubCategoryEntity } from '../shared/entities/sub-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LicenceEntity,
      CategoryStateEntity,
      CategoryStateAbnConditionEntity,
      LicenceRequirementGroupEntity,
      CategoryStateLicenceGroupEntity,
      LicenceRequirementGroupLicenceEntity,
      LicenceTypeEntity,
      AuthorityEntity,
      ParentCategoryEntity,
      SubCategoryEntity,
    ]),
  ],
  controllers: [LicenceController],
  providers: [
    // Application Services
    LicenceService,
    LicenceRequirementService,
    
    // Domain Services
    LicenceRequirementDomainService,
    
    // Adapters
    LicenceDataImportAdapter,
    GroupLinkingAdapter,
    
    // Repository implementations
    TypeOrmLicenceRequirementRepository,
    
    // Port mappings
    {
      provide: LICENCE_REQUIREMENT_REPOSITORY,
      useClass: TypeOrmLicenceRequirementRepository,
    },
    {
      provide: DATA_IMPORT_PORT,
      useClass: LicenceDataImportAdapter,
    },
    {
      provide: GROUP_LINKING_PORT,
      useClass: GroupLinkingAdapter,
    },
  ],
  exports: [
    LicenceRequirementService,
  ],
})
export class LicenceRefactoredModule {}
