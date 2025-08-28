import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@lib/shared';
import { LicenceModule } from './licence/licence.module';
import { SetupModule } from './setup/setup.module';
import { ParentCategoryEntity } from './setup/category/entity/parent-category.entity';
import { SubCategoryEntity } from './setup/category/entity/sub-category.entity';
import { HealthController } from './health.controller';
import { AuthorityEntity } from './setup/licencing/entity/authority.entity';
import { LicenceTypeEntity } from './setup/licencing/entity/licence-type.entity';
import { LicenceRequirementGroupEntity } from './setup/licencing/entity/licence-requirement-group.entity';
import { LicenceRequirementGroupLicenceEntity } from './setup/licencing/entity/licence-requirement-group-licence.entity';
import { CategoryStateEntity } from './setup/licencing/entity/category-state.entity';
import { CategoryStateLicenceGroupEntity } from './setup/licencing/entity/category-state-licence-group.entity';
import { CategoryStateAbnConditionEntity } from './setup/licencing/entity/category-state-abn-condition.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule.forDatabase({ synchronize: true }),
    TypeOrmModule.forFeature([
      ParentCategoryEntity, 
      SubCategoryEntity, 
      AuthorityEntity,
      LicenceTypeEntity,
      LicenceRequirementGroupEntity,
      LicenceRequirementGroupLicenceEntity,
      CategoryStateEntity,
      CategoryStateLicenceGroupEntity,
      CategoryStateAbnConditionEntity
    ]),
    SetupModule,
    LicenceModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

