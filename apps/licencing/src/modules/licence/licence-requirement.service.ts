import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicenceRequirementDto } from './dtos/licence-requirement.dto';
import { LicenceTypeEntity } from '../setup/licencing/entity/licence-type.entity';
import { LicenceRequirementsResponseDto, GroupDto, LicenceClassDto, CategoryDto, StateDataDto, AbnConditionsDto } from './dtos/licence-requirements-response.dto';
import { CategoryStateEntity } from '../setup/licencing/entity/category-state.entity';
import { CategoryStateAbnConditionEntity, AbnConditionKind } from '../setup/licencing/entity/category-state-abn-condition.entity';
import { CategoryStateLicenceGroupEntity } from '../setup/licencing/entity/category-state-licence-group.entity';
import { LicenceRequirementGroupEntity } from '../setup/licencing/entity/licence-requirement-group.entity';
import { LicenceRequirementGroupLicenceEntity } from '../setup/licencing/entity/licence-requirement-group-licence.entity';
import { ParentCategoryEntity } from '../setup/category/entity/parent-category.entity';
import { SubCategoryEntity } from '../setup/category/entity/sub-category.entity';
import { AuthorityEntity } from '../setup/licencing/entity/authority.entity';

@Injectable()
export class LicenceRequirementService {
  private readonly logger = new Logger(LicenceRequirementService.name);

  constructor(
    @InjectRepository(LicenceTypeEntity)
    private readonly licenceTypeRepo: Repository<LicenceTypeEntity>,
    @InjectRepository(CategoryStateEntity)
    private readonly categoryStateRepo: Repository<CategoryStateEntity>,
    @InjectRepository(CategoryStateAbnConditionEntity)
    private readonly categoryStateAbnConditionRepo: Repository<CategoryStateAbnConditionEntity>,
    @InjectRepository(CategoryStateLicenceGroupEntity)
    private readonly categoryStateLicenceGroupRepo: Repository<CategoryStateLicenceGroupEntity>,
    @InjectRepository(LicenceRequirementGroupEntity)
    private readonly licenceRequirementGroupRepo: Repository<LicenceRequirementGroupEntity>,
    @InjectRepository(LicenceRequirementGroupLicenceEntity)
    private readonly licenceRequirementGroupLicenceRepo: Repository<LicenceRequirementGroupLicenceEntity>,
    @InjectRepository(ParentCategoryEntity)
    private readonly parentCategoryRepo: Repository<ParentCategoryEntity>,
    @InjectRepository(SubCategoryEntity)
    private readonly subCategoryRepo: Repository<SubCategoryEntity>,
    @InjectRepository(AuthorityEntity)
    private readonly authorityRepo: Repository<AuthorityEntity>,
  ) {}

  async getLicenceRequirements(parentCategoryIds: number[], subCategoryId: number = 0): Promise<LicenceRequirementDto[]> {
    this.logger.log(`Fetching licence requirements for parent categories: ${parentCategoryIds.join(', ')} and sub category: ${subCategoryId}`);

    // Build the WHERE clause dynamically based on the input parameters
    const categoryConditions = parentCategoryIds.map(id => `c.parent_category_id = ${id} AND c.sub_category_id = ${subCategoryId}`);
    
    const query = `
      WITH cat AS (
        SELECT c.sub_category_id sub_category_id, c.parent_category_id, c."name" category_name
        FROM categories_view c
        WHERE ${categoryConditions}
      ),
      grp AS (
        SELECT
          rg.licence_requirement_group_id,
          rg.name         AS requirement_group,
          rg.min_required,
          c.category_name
        FROM licence_requirement_group rg
        JOIN cat c ON c.parent_category_id = rg.parent_category_id AND c.sub_category_id = rg.sub_category_id
      ),
      req AS (
        SELECT
          g.licence_requirement_group_id,
          g.requirement_group,
          g.min_required,
          COUNT(*) AS group_size,
          ARRAY_AGG(l.name ORDER BY l.name) AS licences,
          g.category_name
        FROM grp g
        JOIN licence_requirement_group_licence rgl ON rgl.licence_requirement_group_id = g.licence_requirement_group_id
        JOIN licence_type l ON l.licence_type_id = rgl.licence_type_id
        GROUP BY g.licence_requirement_group_id, g.requirement_group, g.min_required, g.category_name
      )
      SELECT
        category_name
        requirement_group,
        min_required,
        group_size,
        CASE
          WHEN min_required = 1 AND group_size = 1 THEN 'REQUIRED'
          WHEN min_required = 1 THEN 'ANY 1 OF'
          WHEN min_required = group_size THEN 'ALL OF'
          ELSE min_required::text || ' OF'
        END AS rule,
        licences
      FROM req
      ORDER BY licence_requirement_group_id;
    `;

    try {
      // Use raw query since this is a complex CTE that's easier to express in SQL
      const result = await this.licenceTypeRepo.query(query);
      this.logger.log(`Found ${result.length} licence requirement groups`);
      return result;
    } catch (error) {
      this.logger.error('Error executing licence requirements query:', error);
      throw error;
    }
  }

  async getLicenceRequirementsWithAbn(
    parentCategoryId: number,
    subCategoryId: number,
    abnKind: AbnConditionKind,
  ): Promise<LicenceRequirementsResponseDto> {
    this.logger.log(`Fetching licence requirements with ABN conditions for parent category: ${parentCategoryId}, sub category: ${subCategoryId}, ABN kind: ${abnKind}`);

    try {
      // Find the category state based on the provided parameters
      let categoryState: CategoryStateEntity | null = null;
      
      if (subCategoryId > 0) {
        // Look for sub category state
        categoryState = await this.categoryStateRepo.findOne({
          where: { subCategoryId, state: 'NSW' }, // Assuming NSW for now
          relations: ['subCategory']
        });
      } else {
        // Look for parent category state
        categoryState = await this.categoryStateRepo.findOne({
          where: { parentCategoryId, state: 'NSW' }, // Assuming NSW for now
          relations: ['parentCategory']
        });
      }

      if (!categoryState) {
        throw new Error(`No category state found for parent_category_id: ${parentCategoryId}, sub_category_id: ${subCategoryId}`);
      }

      // Get ABN conditions for this category state and ABN kind
      const abnCondition = await this.categoryStateAbnConditionRepo.findOne({
        where: { categoryStateId: categoryState.id, kind: abnKind }
      });

      // Get licence requirement groups linked to this category state
      const categoryStateLicenceGroups = await this.categoryStateLicenceGroupRepo.find({
        where: { categoryStateId: categoryState.id },
        relations: ['licenceRequirementGroup']
      });

      // Build the response structure
      const response: LicenceRequirementsResponseDto = {
        groups: {},
        categories: []
      };

      // Build groups
      for (const categoryStateLicenceGroup of categoryStateLicenceGroups) {
        const group = categoryStateLicenceGroup.licenceRequirementGroup;
        const groupKey = this.generateGroupKey(group.name);
        
        // Get licence types for this group
        const groupLicences = await this.licenceRequirementGroupLicenceRepo.find({
          where: { licenceRequirementGroupId: group.id },
          relations: ['licenceType']
        });

        const licenceClasses: LicenceClassDto[] = groupLicences.map(gl => ({
          name: gl.licenceType.name,
          state: gl.licenceType.state,
          authority: gl.licenceType.authority?.authority || 'Unknown'
        }));

        response.groups[groupKey] = {
          name: group.name,
          min_required: group.minRequired,
          classes: licenceClasses
        };
      }

      // Build categories
      const category: CategoryDto = {
        name: categoryState.parentCategory?.name || categoryState.subCategory?.name || 'Unknown',
        sub_category_name: categoryState.subCategory?.name,
        is_parent: !categoryState.subCategory,
        states: {
          'NSW': {
            licence_required: categoryState.licenceRequired || false,
            licence_note: categoryState.licenceNote || '',
            abn_conditions: {
              company: abnCondition?.kind === AbnConditionKind.COMPANY ? abnCondition.message : undefined,
              individual: abnCondition?.kind === AbnConditionKind.INDIVIDUAL ? abnCondition.message : undefined,
              partnership: abnCondition?.kind === AbnConditionKind.PARTNERSHIP ? abnCondition.message : undefined,
              trust: abnCondition?.kind === AbnConditionKind.TRUST ? abnCondition.message : undefined,
              other: abnCondition?.kind === AbnConditionKind.OTHER ? abnCondition.message : undefined,
            },
            groups: Object.keys(response.groups)
          }
        }
      };

      response.categories.push(category);

      this.logger.log(`Successfully built response with ${Object.keys(response.groups).length} groups and ${response.categories.length} categories`);
      return response;

    } catch (error) {
      this.logger.error('Error fetching licence requirements with ABN conditions:', error);
      throw error;
    }
  }

  private generateGroupKey(groupName: string): string {
    // Convert group name to a key format similar to the JSON
    return groupName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  async updateAbnConditions(fileContent: string): Promise<{ message: string; updated: boolean }> {
    this.logger.log('Updating ABN conditions from uploaded file...');

    try {
      // Parse the JSON content
      const seedData: any = JSON.parse(fileContent);
      
      // Validate the structure
      if (!seedData.groups || !seedData.categories) {
        throw new Error('Invalid file format. Expected "groups" and "categories" properties.');
      }

      // Clear existing data to ensure clean update
      await this.clearExistingAbnConditionsData();

      // Load new data using the same logic as the loader
      await this.loadAuthorities(seedData.groups);
      await this.loadLicenceTypes(seedData.groups);
      await this.loadLicenceRequirementGroups(seedData.groups);
      await this.loadCategoryStates(seedData.categories);
      await this.linkAllCategoryStatesToGroups(seedData.categories);

      this.logger.log('ABN conditions updated successfully');
      return { 
        message: 'ABN conditions updated successfully', 
        updated: true 
      };

    } catch (error) {
      this.logger.error('Error updating ABN conditions:', error);
      throw error;
    }
  }

  private async clearExistingAbnConditionsData(): Promise<void> {
    this.logger.log('Clearing existing ABN conditions data...');
    
    // Clear in reverse order of dependencies
    await this.categoryStateLicenceGroupRepo.clear();
    await this.licenceRequirementGroupLicenceRepo.clear();
    await this.categoryStateAbnConditionRepo.clear();
    await this.categoryStateRepo.clear();
    await this.licenceRequirementGroupRepo.clear();
    await this.licenceTypeRepo.clear();
    
    this.logger.log('Existing ABN conditions data cleared');
  }

  private async loadAuthorities(groups: any): Promise<void> {
    const authorities = new Set<string>();
    Object.values(groups).forEach((group: any) => {
      group.classes.forEach((licenceClass: any) => {
        authorities.add(licenceClass.authority);
      });
    });

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

  private async loadLicenceTypes(groups: any): Promise<void> {
    for (const [groupKey, group] of Object.entries(groups)) {
      for (const licenceClass of (group as any).classes) {
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

  private async loadLicenceRequirementGroups(groups: any): Promise<void> {
    this.logger.log(`Loading ${Object.keys(groups).length} licence requirement groups...`);
    
    for (const [groupKey, group] of Object.entries(groups)) {
      const existingGroup = await this.licenceRequirementGroupRepo.findOne({ 
        where: { name: (group as any).name } 
      });
      
      if (!existingGroup) {
        const requirementGroup = this.licenceRequirementGroupRepo.create({
          name: (group as any).name,
          minRequired: (group as any).min_required,
          parentCategoryId: null,
          subCategoryId: null,
          isActive: true
        });
        
        const savedGroup = await this.licenceRequirementGroupRepo.save(requirementGroup);
        this.logger.log(`Created licence requirement group: ${(group as any).name} (key: ${groupKey})`);

        for (const licenceClass of (group as any).classes) {
          const licenceType = await this.licenceTypeRepo.findOne({ 
            where: { name: licenceClass.name } 
          });
          
          if (licenceType) {
            const junctionRecord = this.licenceRequirementGroupLicenceRepo.create({
              licenceRequirementGroupId: savedGroup.id,
              licenceTypeId: licenceType.id
            });
            
            await this.licenceRequirementGroupLicenceRepo.save(junctionRecord);
            this.logger.log(`Linked licence requirement group ${(group as any).name} to licence type ${licenceClass.name}`);
          }
        }
      } else {
        this.logger.log(`Licence requirement group already exists: ${(group as any).name}`);
      }
    }
    
    this.logger.log(`Finished loading licence requirement groups`);
  }

  private async loadCategoryStates(categories: any[]): Promise<void> {
    for (const category of categories) {
      if (category.is_parent) {
        const parentCategory = await this.parentCategoryRepo.findOne({ 
          where: { name: category.name } 
        });
        
        if (parentCategory) {
          await this.processCategoryState(category, parentCategory.id, null);
        }
      } else {
        const subCategory = await this.subCategoryRepo.findOne({ 
          where: { name: category.sub_category_name } 
        });
        
        if (subCategory) {
          await this.processCategoryState(category, null, subCategory.id);
        }
      }
    }
  }

  private async processCategoryState(category: any, parentCategoryId: number | null, subCategoryId: number | null): Promise<void> {
    for (const [stateCode, stateData] of Object.entries(category.states)) {
      const categoryState = this.categoryStateRepo.create({
        parentCategoryId,
        subCategoryId,
        state: stateCode,
        licenceRequired: (stateData as any).licence_required,
        licenceNote: (stateData as any).licence_note
      });
      
      const savedCategoryState = await this.categoryStateRepo.save(categoryState);
      this.logger.log(`Created category state for ${category.name} - ${stateCode}`);

      await this.createAbnConditions(savedCategoryState.id, (stateData as any).abn_conditions);
    }
  }

  private async createAbnConditions(categoryStateId: number, abnConditions: any): Promise<void> {
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

  private async linkAllCategoryStatesToGroups(categories: any[]): Promise<void> {
    this.logger.log('Linking all category states to licence requirement groups...');
    
    for (const category of categories) {
      let categoryState: any = null;
      
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
          where: { name: category.sub_category_name } 
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

  private async linkLicenceRequirementGroups(categoryStateId: number, groupKeys: string[]): Promise<void> {
    for (const groupKey of groupKeys) {
      let group = null;
      
      group = await this.licenceRequirementGroupRepo.findOne({ 
        where: { name: groupKey } 
      });
      
      if (!group) {
        const readableName = this.convertGroupKeyToName(groupKey);
        group = await this.licenceRequirementGroupRepo.findOne({ 
          where: { name: readableName } 
        });
      }
      
      if (group) {
        const categoryStateLicenceGroup = this.categoryStateLicenceGroupRepo.create({
          categoryStateId,
          licenceRequirementGroupId: group.id
        });
        
        await this.categoryStateLicenceGroupRepo.save(categoryStateLicenceGroup);
        this.logger.log(`Linked category state to licence requirement group: ${group.name}`);

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
    const keyToNameMap: Record<string, string> = {
      'arc_requirement': 'ARC requirement',
      'nsw_air_conditioning_trade': 'NSW trade licence',
      'nsw_air_conditioning_air_conditioners_trade': 'NSW trade licence',
      'nsw_locksmiths_trade': 'NSW trade licence',
      'nsw_locksmiths_24_7_emergency_trade': 'NSW trade licence'
    };
    
    return keyToNameMap[groupKey] || groupKey;
  }
}
