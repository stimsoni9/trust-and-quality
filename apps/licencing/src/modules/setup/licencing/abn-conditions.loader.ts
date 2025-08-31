import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { LicenceRequirementService } from '../../licence/application/services/licence-requirement.service';

interface LicenceClass {
  name: string;
  state: string;
  authority: string;
}

interface Group {
  name: string;
  min_required: number;
  classes: LicenceClass[];
}

interface AbnConditions {
  company?: string;
  individual?: string;
  partnership?: string;
  trust?: string;
  other?: string;
}

interface StateData {
  licence_required: boolean;
  licence_note: string;
  abn_conditions: AbnConditions;
  groups: string[];
}

interface Category {
  name: string;
  sub_category_name?: string;
  is_parent: boolean;
  states: Record<string, StateData>;
}

interface SeedData {
  groups: Record<string, Group>;
  categories: Category[];
}

@Injectable()
export class AbnConditionsLoader {
  private readonly logger = new Logger(AbnConditionsLoader.name);

  constructor(
    private readonly licenceRequirementService: LicenceRequirementService,
  ) {}

  async load(): Promise<void> {
    this.logger.log('Loading ABN conditions data...');

    try {
      // Read the JSON file
      const jsonPath = path.join(__dirname, 'imports', 'example_nsw_abn_conditions_multiple.json');
      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      const seedData: SeedData = JSON.parse(jsonData);

      // Use the licence service to process the data
      await this.licenceRequirementService.updateLicenceRequirements(seedData);

      this.logger.log('ABN conditions data loaded successfully');
    } catch (error) {
      this.logger.error('Error loading ABN conditions data:', error);
      throw error;
    }
  }
}
