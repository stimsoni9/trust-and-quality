import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicenceEntity } from './licencing/entity/licence.entity';
import { CategoryLoader } from './category/category.loader';
import { AuthorityLoader } from './licencing/authority.loader';
import { AbnConditionsLoader } from './licencing/abn-conditions.loader';

@Injectable()
export class SetupService implements OnModuleInit {
  private readonly logger = new Logger(SetupService.name);

  constructor(
    @InjectRepository(LicenceEntity)
    private readonly licenceRepository: Repository<LicenceEntity>,
    private readonly categoryLoader: CategoryLoader,
    private readonly authorityLoader: AuthorityLoader,
    private readonly abnConditionsLoader: AbnConditionsLoader,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedLicencesOnce();
    await this.authorityLoader.loadAndSaveIfEmpty();
    await this.categoryLoader.loadAndSaveIfEmpty();
    // Always load ABN conditions data to ensure new tables are created
    await this.abnConditionsLoader.load();
  }

  private async seedLicencesOnce(): Promise<void> {
    const count = await this.licenceRepository.count();
    if (count > 0) {
      this.logger.log('Licence seed skipped: data already present');
      return;
    }
    this.logger.log('Seeding initial licences...');
    await this.licenceRepository.save([
      { tradieId: 'seed-tradie-1', licenceNumber: 'LIC-0001', expiryDate: null },
    ]);
  }

  
}

