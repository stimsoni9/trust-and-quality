import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@lib/shared';
import { LicenceModule } from './licence/licence.module';
import { SetupModule } from './setup/setup.module';
import { ParentCategoryEntity } from './shared/entities/parent-category.entity';
import { SubCategoryEntity } from './shared/entities/sub-category.entity';
import { HealthController } from './health.controller';
import { AuthorityEntity } from './licence/entities/authority.entity';
import { LicenceTypeEntity } from './licence/entities/licence-type.entity';
import { LicenceRequirementGroupEntity } from './licence/entities/licence-requirement-group.entity';
import { LicenceRequirementGroupLicenceEntity } from './licence/entities/licence-requirement-group-licence.entity';
import { CategoryStateEntity } from './licence/entities/category-state.entity';
import { CategoryStateLicenceGroupEntity } from './licence/entities/category-state-licence-group.entity';
import { CategoryStateAbnConditionEntity } from './licence/entities/category-state-abn-condition.entity';

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

