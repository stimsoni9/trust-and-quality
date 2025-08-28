import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { LicenceTypeEntity } from './entity/licence-type.entity';
import { LicenceRequirementGroupEntity } from './entity/licence-requirement-group.entity';
import { CategoryStateEntity } from './entity/category-state.entity';
import { CategoryStateLicenceGroupEntity } from './entity/category-state-licence-group.entity';
import { CategoryStateAbnConditionEntity, AbnConditionKind } from './entity/category-state-abn-condition.entity';
import { LicenceRequirementGroupLicenceEntity } from './entity/licence-requirement-group-licence.entity';
import { ParentCategoryEntity } from '../category/entity/parent-category.entity';
import { SubCategoryEntity } from '../category/entity/sub-category.entity';
import { AuthorityEntity } from './entity/authority.entity';

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
    @InjectRepository(LicenceTypeEntity)
    private readonly licenceTypeRepo: Repository<LicenceTypeEntity>,
    @InjectRepository(LicenceRequirementGroupEntity)
    private readonly licenceRequirementGroupRepo: Repository<LicenceRequirementGroupEntity>,
    @InjectRepository(CategoryStateEntity)
    private readonly categoryStateRepo: Repository<CategoryStateEntity>,
    @InjectRepository(CategoryStateLicenceGroupEntity)
    private readonly categoryStateLicenceGroupRepo: Repository<CategoryStateLicenceGroupEntity>,
    @InjectRepository(CategoryStateAbnConditionEntity)
    private readonly categoryStateAbnConditionRepo: Repository<CategoryStateAbnConditionEntity>,
    @InjectRepository(LicenceRequirementGroupLicenceEntity)
    private readonly licenceRequirementGroupLicenceRepo: Repository<LicenceRequirementGroupLicenceEntity>,
    @InjectRepository(ParentCategoryEntity)
    private readonly parentCategoryRepo: Repository<ParentCategoryEntity>,
    @InjectRepository(SubCategoryEntity)
    private readonly subCategoryRepo: Repository<SubCategoryEntity>,
    @InjectRepository(AuthorityEntity)
    private readonly authorityRepo: Repository<AuthorityEntity>,
  ) {}

  async load(): Promise<void> {
    this.logger.log('Loading ABN conditions data...');

    try {
      // Read the JSON file
      const jsonPath = path.join(__dirname, 'imports', 'example_nsw_abn_conditions_multiple.json');
      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      const seedData: SeedData = JSON.parse(jsonData);

      // Load authorities first
      await this.loadAuthorities(seedData.groups);

      // Load licence types
      await this.loadLicenceTypes(seedData.groups);

      // Load licence requirement groups
      await this.loadLicenceRequirementGroups(seedData.groups);

      // Load category states and related data
      await this.loadCategoryStates(seedData.categories);

      // Now link everything together
      await this.linkAllCategoryStatesToGroups(seedData.categories);

      this.logger.log('ABN conditions data loaded successfully');
    } catch (error) {
      this.logger.error('Error loading ABN conditions data:', error);
      throw error;
    }
  }

  private async loadAuthorities(groups: Record<string, Group>): Promise<void> {
    const authorities = new Set<string>();
    
    // Extract unique authorities from groups
    Object.values(groups).forEach(group => {
      group.classes.forEach(licenceClass => {
        authorities.add(licenceClass.authority);
      });
    });

    // Create authorities
    for (const authorityName of authorities) {
      const existingAuthority = await this.authorityRepo.findOne({ where: { authority: authorityName } });
      if (!existingAuthority) {
        const authority = this.authorityRepo.create({ 
          authority: authorityName,
          authorityName: authorityName,
          state: 'NSW' // Default state for now
        });
        await this.authorityRepo.save(authority);
        this.logger.log(`Created authority: ${authorityName}`);
      }
    }
  }

  private async loadLicenceTypes(groups: Record<string, Group>): Promise<void> {
    // Create licence types from groups
    for (const [groupKey, group] of Object.entries(groups)) {
      for (const licenceClass of group.classes) {
        const existingLicenceType = await this.licenceTypeRepo.findOne({ 
          where: { name: licenceClass.name } 
        });
        
        if (!existingLicenceType) {
          const authority = await this.authorityRepo.findOne({ 
            where: { authority: licenceClass.authority } 
          });
          
          const licenceType = this.licenceTypeRepo.create({
            name: licenceClass.name,
            state: licenceClass.state,
            licenceType: groupKey,
            authorityId: authority?.id || null,
            isActive: true
          });
          
          await this.licenceTypeRepo.save(licenceType);
          this.logger.log(`Created licence type: ${licenceClass.name}`);
        }
      }
    }
  }

  private async loadLicenceRequirementGroups(groups: Record<string, Group>): Promise<void> {
    this.logger.log(`Loading ${Object.keys(groups).length} licence requirement groups...`);
    
    // Create licence requirement groups
    for (const [groupKey, group] of Object.entries(groups)) {
      const existingGroup = await this.licenceRequirementGroupRepo.findOne({ 
        where: { name: group.name } 
      });
      
      if (!existingGroup) {
        const requirementGroup = this.licenceRequirementGroupRepo.create({
          name: group.name,
          minRequired: group.min_required,
          parentCategoryId: null, // Will be updated when linking to categories
          subCategoryId: null,
          isActive: true
        });
        
        const savedGroup = await this.licenceRequirementGroupRepo.save(requirementGroup);
        this.logger.log(`Created licence requirement group: ${group.name} (key: ${groupKey})`);

        // Create junction table records linking the group to its licence types
        for (const licenceClass of group.classes) {
          const licenceType = await this.licenceTypeRepo.findOne({ 
            where: { name: licenceClass.name } 
          });
          
          if (licenceType) {
            const junctionRecord = this.licenceRequirementGroupLicenceRepo.create({
              licenceRequirementGroupId: savedGroup.id,
              licenceTypeId: licenceType.id
            });
            
            await this.licenceRequirementGroupLicenceRepo.save(junctionRecord);
            this.logger.log(`Linked licence requirement group ${group.name} to licence type ${licenceClass.name}`);
          }
        }
      } else {
        this.logger.log(`Licence requirement group already exists: ${group.name}`);
      }
    }
    
    this.logger.log(`Finished loading licence requirement groups`);
  }

  private async loadCategoryStates(categories: Category[]): Promise<void> {
    for (const category of categories) {
      if (category.is_parent) {
        // Handle parent category
        const parentCategory = await this.parentCategoryRepo.findOne({ 
          where: { name: category.name } 
        });
        
        if (parentCategory) {
          await this.processCategoryState(category, parentCategory.id, null);
        }
      } else {
        // Handle sub category
        const subCategory = await this.subCategoryRepo.findOne({ 
          where: { name: category.sub_category_name! } 
        });
        
        if (subCategory) {
          await this.processCategoryState(category, null, subCategory.id);
        }
      }
    }
  }

  private async processCategoryState(
    category: Category, 
    parentCategoryId: number | null, 
    subCategoryId: number | null
  ): Promise<void> {
    for (const [stateCode, stateData] of Object.entries(category.states)) {
      // Create category state
      const categoryState = this.categoryStateRepo.create({
        parentCategoryId,
        subCategoryId,
        state: stateCode,
        licenceRequired: stateData.licence_required,
        licenceNote: stateData.licence_note
      });
      
      const savedCategoryState = await this.categoryStateRepo.save(categoryState);
      this.logger.log(`Created category state for ${category.name} - ${stateCode}`);

      // Create ABN conditions
      await this.createAbnConditions(savedCategoryState.id, stateData.abn_conditions);
    }
  }

  private async createAbnConditions(categoryStateId: number, abnConditions: AbnConditions): Promise<void> {
    const conditions = [
      { kind: AbnConditionKind.COMPANY, message: abnConditions.company },
      { kind: AbnConditionKind.INDIVIDUAL, message: abnConditions.individual },
      { kind: AbnConditionKind.PARTNERSHIP, message: abnConditions.partnership },
      { kind: AbnConditionKind.TRUST, message: abnConditions.trust },
      { kind: AbnConditionKind.OTHER, message: abnConditions.other }
    ];

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      if (condition.message) {
        const abnCondition = this.categoryStateAbnConditionRepo.create({
          categoryStateId,
          kind: condition.kind,
          message: condition.message,
          position: i + 1
        });
        
        await this.categoryStateAbnConditionRepo.save(abnCondition);
        this.logger.log(`Created ABN condition: ${condition.kind}`);
      }
    }
  }

  private async linkLicenceRequirementGroups(categoryStateId: number, groupKeys: string[]): Promise<void> {
    for (const groupKey of groupKeys) {
      // Find the group by matching the key to the group name
      // The JSON has keys like "arc_requirement" but groups are named "ARC requirement"
      let group = null;
      
      // Try to find by exact name match first
      group = await this.licenceRequirementGroupRepo.findOne({ 
        where: { name: groupKey } 
      });
      
      // If not found, try to find by converting the key to a readable name
      if (!group) {
        const readableName = this.convertGroupKeyToName(groupKey);
        group = await this.licenceRequirementGroupRepo.findOne({ 
          where: { name: readableName } 
        });
      }
      
      if (group) {
        // Link category state to licence requirement group
        const categoryStateLicenceGroup = this.categoryStateLicenceGroupRepo.create({
          categoryStateId,
          licenceRequirementGroupId: group.id
        });
        
        await this.categoryStateLicenceGroupRepo.save(categoryStateLicenceGroup);
        this.logger.log(`Linked category state to licence requirement group: ${group.name}`);

        // Update the group's parent/sub category reference
        const categoryState = await this.categoryStateRepo.findOne({ 
          where: { id: categoryStateId } 
        });
        
        if (categoryState) {
          group.parentCategoryId = categoryState.parentCategoryId || null;
          group.subCategoryId = categoryState.subCategoryId || null;
          await this.licenceRequirementGroupRepo.save(group);
        }
      } else {
        this.logger.warn(`Could not find group for key: ${groupKey}`);
      }
    }
  }

  private convertGroupKeyToName(groupKey: string): string {
    // Create a mapping from JSON keys to actual group names
    const keyToNameMap: Record<string, string> = {
      'arc_requirement': 'ARC requirement',
      'nsw_air_conditioning_trade': 'NSW trade licence',
      'nsw_air_conditioning_air_conditioners_trade': 'NSW trade licence',
      'nsw_locksmiths_trade': 'NSW trade licence',
      'nsw_locksmiths_24_7_emergency_trade': 'NSW trade licence'
    };
    
    return keyToNameMap[groupKey] || groupKey;
  }

  private async linkAllCategoryStatesToGroups(categories: Category[]): Promise<void> {
    this.logger.log('Linking all category states to licence requirement groups...');
    
    for (const category of categories) {
      let categoryState: CategoryStateEntity | null = null;
      
      if (category.is_parent) {
        const parentCategory = await this.parentCategoryRepo.findOne({ 
          where: { name: category.name } 
        });
        
        if (parentCategory) {
          categoryState = await this.categoryStateRepo.findOne({ 
            where: { parentCategoryId: parentCategory.id, state: 'NSW' } 
          });
        }
      } else {
        const subCategory = await this.subCategoryRepo.findOne({ 
          where: { name: category.sub_category_name! } 
        });
        
        if (subCategory) {
          categoryState = await this.categoryStateRepo.findOne({ 
            where: { subCategoryId: subCategory.id, state: 'NSW' } 
          });
        }
      }
      
      if (categoryState) {
        await this.linkLicenceRequirementGroups(categoryState.id, category.states.NSW.groups);
      }
    }
  }
}
