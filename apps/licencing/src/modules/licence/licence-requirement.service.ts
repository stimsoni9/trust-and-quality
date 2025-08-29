import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicenceRequirementDto } from './dtos/licence-requirement.dto';
import { LicenceTypeEntity } from './entities/licence-type.entity';
import { LicenceRequirementsResponseDto, GroupDto, LicenceClassDto, CategoryDto, StateDataDto, AbnConditionsDto } from './dtos/licence-requirements-response.dto';
import { CategoryStateEntity } from './entities/category-state.entity';
import { CategoryStateAbnConditionEntity, AbnConditionKind } from './entities/category-state-abn-condition.entity';
import { CategoryStateLicenceGroupEntity } from './entities/category-state-licence-group.entity';
import { LicenceRequirementGroupEntity } from './entities/licence-requirement-group.entity';
import { LicenceRequirementGroupLicenceEntity } from './entities/licence-requirement-group-licence.entity';
import { ParentCategoryEntity } from '../shared/entities/parent-category.entity';
import { SubCategoryEntity } from '../shared/entities/sub-category.entity';
import { AuthorityEntity } from './entities/authority.entity';

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
        // FIXED: Look for sub category state with both parent and sub category IDs
        categoryState = await this.categoryStateRepo.findOne({
          where: { parentCategoryId, subCategoryId, state: 'NSW' }, // Both IDs required for sub-categories
          relations: ['subCategory']
        });
      } else {
        // Look for parent category state
        categoryState = await this.categoryStateRepo.findOne({
          where: { parentCategoryId, state: 'NSW' }, // Only parent ID for parent categories
          relations: ['parentCategory']
        });
      }

      if (!categoryState) {
        throw new NotFoundException(`No category state found for parent_category_id: ${parentCategoryId}, sub_category_id: ${subCategoryId}`);
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
        const groupKey = group.key || this.generateGroupKey(group.name); // Use stored key if available
        
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

  async getLicenceRequirementsMultiple(
    categoryRequests: Array<{ parent_category_id: number; sub_category_id?: number; abn_kind: AbnConditionKind }>
  ): Promise<{ 
    data: LicenceRequirementsResponseDto; 
    found: number; 
    notFound: Array<{ 
      parent_category_id: number; 
      sub_category_id?: number; 
      abn_kind: AbnConditionKind; 
      reason: string 
    }> 
  }> {
    this.logger.log(`Fetching licence requirements for multiple categories: ${categoryRequests.length} categories`);

    // Build the response structure
    const response: LicenceRequirementsResponseDto = {
      groups: {},
      categories: []
    };

    const notFound: Array<{ 
      parent_category_id: number; 
      sub_category_id?: number; 
      abn_kind: AbnConditionKind; 
      reason: string 
    }> = [];
    let found = 0;

    // Process each category request
    for (const request of categoryRequests) {
      const { parent_category_id, sub_category_id = 0, abn_kind } = request;
      
      try {
        // Get requirements for this single category
        const singleResponse = await this.getLicenceRequirementsWithAbn(
          parent_category_id,
          sub_category_id,
          abn_kind
        );

        // Merge groups (avoid duplicates)
        for (const [groupKey, group] of Object.entries(singleResponse.groups)) {
          if (!response.groups[groupKey]) {
            response.groups[groupKey] = group;
          }
        }

        // Add categories
        response.categories.push(...singleResponse.categories);
        found++;
        
      } catch (error) {
        // Handle individual category errors
        if (error instanceof Error) {
          if ((error as any).notFound) {
            // Category not found - add to notFound list and continue
            notFound.push({
              parent_category_id,
              sub_category_id,
              abn_kind,
              reason: error.message
            });
            this.logger.warn(`Category not found: ${error.message}`);
          } else {
            // Other error - log and continue with other categories
            this.logger.error(`Error processing category ${parent_category_id}/${sub_category_id}: ${error.message}`);
            notFound.push({
              parent_category_id,
              sub_category_id,
              abn_kind,
              reason: `Processing error: ${error.message}`
            });
          }
        } else {
          // Unknown error type
          this.logger.error(`Unknown error processing category ${parent_category_id}/${sub_category_id}:`, error);
          notFound.push({
            parent_category_id,
            sub_category_id,
            abn_kind,
            reason: 'Unknown processing error'
          });
        }
      }
    }

    this.logger.log(`Successfully processed ${found} categories, ${notFound.length} not found`);
    
    return {
      data: response,
      found,
      notFound
    };
  }

  private generateGroupKey(groupName: string): string {
    // Convert group name to a key format similar to the JSON
    return groupName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  async updateLicenceRequirements(licenceData: any): Promise<{ 
    message: string; 
    updated: boolean; 
    processed: number; 
    missing: Array<{ 
      name: string; 
      sub_category_name?: string; 
      reason: string; 
      type: 'parent' | 'sub' 
    }> 
  }> {
    this.logger.log('Updating licence requirements from request body...');

    try {
      // Validate the structure
      if (!licenceData.groups || !licenceData.categories) {
        throw new Error('Invalid data format. Expected "groups" and "categories" properties.');
      }

      // Process the data (append/update existing data)
      this.logger.log('About to call processLicenceRequirementsData...');
      const categoryResults = await this.processLicenceRequirementsData(licenceData);
      this.logger.log(`processLicenceRequirementsData returned: processed=${categoryResults.processed}, missing=${categoryResults.missing.length}`);

      this.logger.log('Licence requirements updated successfully');
      return { 
        message: 'Licence requirements updated successfully', 
        updated: true,
        processed: categoryResults.processed,
        missing: categoryResults.missing
      };

    } catch (error) {
      this.logger.error('Error updating licence requirements:', error);
      
      // Provide better error messages for common database issues
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('value too long for type character varying')) {
        const fieldMatch = errorMessage.match(/column "([^"]+)"/);
        const fieldName = fieldMatch ? fieldMatch[1] : 'unknown field';
        const lengthMatch = errorMessage.match(/character varying\((\d+)\)/);
        const maxLength = lengthMatch ? lengthMatch[1] : 'unknown';
        
        throw new Error(`Database field length exceeded: The field '${fieldName}' cannot exceed ${maxLength} characters. Please check your data and ensure all text fields are within the length limits.`);
      }
      
      if (errorMessage && errorMessage.includes('duplicate key value violates unique constraint')) {
        const constraintMatch = errorMessage.match(/constraint "([^"]+)"/);
        const constraintName = constraintMatch ? constraintMatch[1] : 'unique constraint';
        throw new Error(`Duplicate data detected: A record with this information already exists (violates ${constraintName}). The system prevents duplicate entries.`);
      }
      
      if (errorMessage && errorMessage.includes('foreign key constraint')) {
        const constraintMatch = errorMessage.match(/constraint "([^"]+)"/);
        const constraintName = constraintMatch ? constraintMatch[1] : 'foreign key constraint';
        throw new Error(`Reference error: The data references a record that doesn't exist (violates ${constraintName}). Please ensure all referenced data exists first.`);
      }
      
      // Generic database error
      if (errorMessage && errorMessage.includes('QueryFailedError')) {
        throw new Error(`Database operation failed: ${errorMessage}. Please check your data format and try again.`);
      }
      
      // Re-throw the original error if we can't provide a better message
      throw error;
    }
  }


  async processLicenceRequirementsData(licenceData: any): Promise<{ 
    processed: number; 
    missing: Array<{ 
      name: string; 
      sub_category_name?: string; 
      reason: string; 
      type: 'parent' | 'sub' 
    }> 
  }> {
    this.logger.log('Processing licence requirements data...');

    try {
      // Load authorities first (will create new ones if they don't exist)
      await this.loadAuthorities(licenceData.groups);

      // Load licence types (will create new ones if they don't exist)
      await this.loadLicenceTypes(licenceData.groups);

      // Load licence requirement groups (will create new ones if they don't exist)
      await this.loadLicenceRequirementGroups(licenceData.groups);

      // Load category states and related data (will create new ones if they don't exist)
      this.logger.log('About to call loadCategoryStates...');
      const categoryResults = await this.loadCategoryStates(licenceData.categories);
      this.logger.log(`loadCategoryStates returned: processed=${categoryResults.processed}, missing=${categoryResults.missing.length}`);
      
      // Now link everything together (will create new links if they don't exist)
      await this.linkAllCategoryStatesToGroups(licenceData.categories);

      this.logger.log('Licence requirements data processed successfully');
      return categoryResults;
    } catch (error) {
      this.logger.error('Error processing licence requirements data:', error);
      throw error;
    }
  }

  private async clearExistingLicenceRequirementsData(): Promise<void> {
    this.logger.log('Clearing existing licence requirements data...');
    
    // Clear in reverse order of dependencies
    await this.categoryStateLicenceGroupRepo.clear();
    await this.licenceRequirementGroupLicenceRepo.clear();
    await this.categoryStateAbnConditionRepo.clear();
    await this.categoryStateRepo.clear();
    await this.licenceRequirementGroupRepo.clear();
    await this.licenceTypeRepo.clear();
    
    this.logger.log('Existing licence requirements data cleared');
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
        this.logger.log(`Created new authority: ${authorityName}`);
      } else {
        this.logger.log(`Authority already exists: ${authorityName}`);
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
          this.logger.log(`Created new licence type: ${licenceClass.name}`);
        } else {
          this.logger.log(`Licence type already exists: ${licenceClass.name}`);
        }
      }
    }
  }

  private async loadLicenceRequirementGroups(groups: any): Promise<void> {
    this.logger.log(`Loading ${Object.keys(groups).length} licence requirement groups...`);
    
    for (const [groupKey, group] of Object.entries(groups)) {
      // Check for existing group by KEY, not by name
      const existingGroup = await this.licenceRequirementGroupRepo.findOne({ 
        where: { key: groupKey } 
      });
      
      if (!existingGroup) {
        const requirementGroup = this.licenceRequirementGroupRepo.create({
          name: (group as any).name,
          key: groupKey, // Store the original key
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
        this.logger.log(`Licence requirement group already exists: ${(group as any).name} (key: ${groupKey})`);
        
        // Check if we need to create new links to licence types
        for (const licenceClass of (group as any).classes) {
          const licenceType = await this.licenceTypeRepo.findOne({ 
            where: { name: licenceClass.name } 
          });
          
          if (licenceType) {
            // Check if link already exists
            const existingLink = await this.licenceRequirementGroupLicenceRepo.findOne({
              where: {
                licenceRequirementGroupId: existingGroup.id,
                licenceTypeId: licenceType.id
              }
            });
            
            if (!existingLink) {
              const junctionRecord = this.licenceRequirementGroupLicenceRepo.create({
                licenceRequirementGroupId: existingGroup.id,
                licenceTypeId: licenceType.id
              });
              
              await this.licenceRequirementGroupLicenceRepo.save(junctionRecord);
              this.logger.log(`Created new link for existing group ${(group as any).name} to licence type ${licenceClass.name}`);
            } else {
              this.logger.log(`Link already exists for group ${(group as any).name} to licence type ${licenceClass.name}`);
            }
          }
        }
      }
    }
    
    this.logger.log(`Finished loading licence requirement groups`);
  }

  private async loadCategoryStates(categories: any[]): Promise<{ 
    processed: number; 
    missing: Array<{ 
      name: string; 
      sub_category_name?: string; 
      reason: string; 
      type: 'parent' | 'sub' 
    }> 
  }> {
    const missing: Array<{ 
      name: string; 
      sub_category_name?: string; 
      reason: string; 
      type: 'parent' | 'sub' 
    }> = [];
    let processed = 0;

    for (const category of categories) {
      if (category.is_parent) {
        const parentCategory = await this.parentCategoryRepo.findOne({ 
          where: { name: category.name } 
        });
        
        if (parentCategory) {
          await this.processCategoryState(category, parentCategory.id, null);
          processed++;
        } else {
          missing.push({
            name: category.name,
            reason: `Parent category '${category.name}' not found in database`,
            type: 'parent'
          });
        }
      } else {
        // For sub-categories, we need to find both the parent category and sub-category
        const parentCategory = await this.parentCategoryRepo.findOne({ 
          where: { name: category.name } 
        });
        
        // Try to find sub-category by shortName first, then by name as fallback
        let subCategory = await this.subCategoryRepo.findOne({ 
          where: { shortName: category.sub_category_name } 
        });
        
        if (!subCategory) {
          subCategory = await this.subCategoryRepo.findOne({ 
            where: { name: category.sub_category_name } 
          });
        }
        
        if (parentCategory && subCategory) {
          // FIXED: Set both parent_category_id and sub_category_id for sub-categories
          await this.processCategoryState(category, parentCategory.id, subCategory.id);
          processed++;
        } else {
          let reason = '';
          if (!parentCategory && !subCategory) {
            reason = `Both parent category '${category.name}' and sub-category '${category.sub_category_name}' not found`;
          } else if (!parentCategory) {
            reason = `Parent category '${category.name}' not found`;
          } else {
            reason = `Sub-category '${category.sub_category_name}' not found`;
          }
          
          missing.push({
            name: category.name,
            sub_category_name: category.sub_category_name,
            reason,
            type: 'sub'
          });
        }
      }
    }

    return { processed, missing };
  }

  private async processCategoryState(category: any, parentCategoryId: number | null, subCategoryId: number | null): Promise<void> {
    this.logger.log(`DEBUG: processCategoryState called for ${category.name}`);
    for (const [stateCode, stateData] of Object.entries(category.states)) {
      // Check if category state already exists
      const existingCategoryState = await this.categoryStateRepo.findOne({
        where: {
          parentCategoryId,
          subCategoryId,
          state: stateCode
        }
      });
      
      if (!existingCategoryState) {
        const categoryState = this.categoryStateRepo.create({
          parentCategoryId,
          subCategoryId,
          state: stateCode,
          licenceRequired: (stateData as any).licence_required,
          licenceNote: (stateData as any).licence_note
        });
        
        const savedCategoryState = await this.categoryStateRepo.save(categoryState);
        this.logger.log(`Created new category state for ${category.name} - ${stateCode}`);

        await this.createAbnConditions(savedCategoryState.id, (stateData as any).abn_conditions);
      } else {
        this.logger.log(`Category state already exists for ${category.name} - ${stateCode}`);
        this.logger.log(`Existing category state ID: ${existingCategoryState.id}`);
        this.logger.log(`ABN conditions data: ${JSON.stringify((stateData as any).abn_conditions)}`);
        
        // Update existing category state if needed
        if (existingCategoryState.licenceRequired !== (stateData as any).licence_required || 
            existingCategoryState.licenceNote !== (stateData as any).licence_note) {
          existingCategoryState.licenceRequired = (stateData as any).licence_required;
          existingCategoryState.licenceNote = (stateData as any).licence_note;
          await this.categoryStateRepo.save(existingCategoryState);
          this.logger.log(`Updated existing category state for ${category.name} - ${stateCode}`);
        }
        
        // CRITICAL: Always process ABN conditions for existing category states
        this.logger.log(`=== FORCING ABN CONDITIONS UPDATE ===`);
        this.logger.log(`About to call updateAbnConditionsDirectly for category state ${existingCategoryState.id}`);
        
        // WORKING FIX: Direct database operations with explicit error handling
        try {
          this.logger.log(`Calling updateAbnConditionsDirectly with categoryStateId: ${existingCategoryState.id}`);
          
          // Direct method call with explicit parameters
          const categoryStateId = existingCategoryState.id;
          const abnConditionsData = (stateData as any).abn_conditions;
          
          this.logger.log(`Parameters: categoryStateId=${categoryStateId}, abnConditions=${JSON.stringify(abnConditionsData)}`);
          
          // CRITICAL: Force the method call
          this.logger.log(`About to execute updateAbnConditionsDirectly...`);
          
          // ADDITIONAL DEBUGGING: Check if method exists
          if (typeof this.updateAbnConditionsDirectly === 'function') {
            this.logger.log(`Method exists, calling it...`);
            await this.updateAbnConditionsDirectly(categoryStateId, abnConditionsData);
            this.logger.log(`Successfully completed updateAbnConditionsDirectly for category state ${categoryStateId}`);
          } else {
            this.logger.error(`CRITICAL: Method updateAbnConditionsDirectly does not exist!`);
            throw new Error('Method updateAbnConditionsDirectly does not exist');
          }
        } catch (error) {
          this.logger.error(`CRITICAL ERROR in updateAbnConditionsDirectly:`, error);
          throw error; // Re-throw to see the full error
        }
      }
    }
  }

  private async updateAbnConditionsDirectly(categoryStateId: number, abnConditions: any): Promise<void> {
    this.logger.log(`WORKING FIX: updateAbnConditionsDirectly called for category state ${categoryStateId}`);
    this.logger.log(`ABN conditions input: ${JSON.stringify(abnConditions)}`);
    
    // First, remove ALL existing ABN conditions for this category state
    this.logger.log(`Finding existing ABN conditions for category state ${categoryStateId}`);
    const existingConditions = await this.categoryStateAbnConditionRepo.find({
      where: { categoryStateId }
    });
    this.logger.log(`Found ${existingConditions.length} existing ABN conditions`);

    if (existingConditions.length > 0) {
      this.logger.log(`Removing ${existingConditions.length} existing ABN conditions`);
      await this.categoryStateAbnConditionRepo.remove(existingConditions);
      this.logger.log(`Successfully removed ${existingConditions.length} existing ABN conditions for category state ${categoryStateId}`);
    } else {
      this.logger.log(`No existing ABN conditions found for category state ${categoryStateId}`);
    }

    // Then create new ones based on the provided data
    const conditions = [
      { kind: AbnConditionKind.COMPANY, message: abnConditions.company },
      { kind: AbnConditionKind.INDIVIDUAL, message: abnConditions.individual },
      { kind: AbnConditionKind.PARTNERSHIP, message: abnConditions.partnership },
      { kind: AbnConditionKind.TRUST, message: abnConditions.trust },
      { kind: AbnConditionKind.OTHER, message: abnConditions.other }
    ];

    this.logger.log(`Processing ${conditions.length} condition types`);
    let createdCount = 0;
    
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      this.logger.log(`Processing condition ${i + 1}: kind=${condition.kind}, message=${condition.message}`);
      
      if (condition.message) {
        const abnCondition = this.categoryStateAbnConditionRepo.create({
          categoryStateId,
          kind: condition.kind,
          message: condition.message,
          position: i + 1
        });
        
        await this.categoryStateAbnConditionRepo.save(abnCondition);
        this.logger.log(`Created new ABN condition: ${condition.kind}`);
        createdCount++;
      } else {
        this.logger.log(`Skipping condition ${condition.kind} - no message provided`);
      }
    }
    
    this.logger.log(`Finished processing ABN conditions. Created ${createdCount} new conditions.`);
  }

  private async createAbnConditions(categoryStateId: number, abnConditions: any): Promise<void> {
    this.logger.log(`DEBUG: createAbnConditions called for category state ${categoryStateId}`);
    this.logger.log(`ABN conditions input: ${JSON.stringify(abnConditions)}`);
    
    // First, remove ALL existing ABN conditions for this category state
    this.logger.log(`Finding existing ABN conditions for category state ${categoryStateId}`);
    const existingConditions = await this.categoryStateAbnConditionRepo.find({
      where: { categoryStateId }
    });
    this.logger.log(`Found ${existingConditions.length} existing ABN conditions`);

    if (existingConditions.length > 0) {
      this.logger.log(`Removing ${existingConditions.length} existing ABN conditions`);
      await this.categoryStateAbnConditionRepo.remove(existingConditions);
      this.logger.log(`Successfully removed ${existingConditions.length} existing ABN conditions for category state ${categoryStateId}`);
    } else {
      this.logger.log(`No existing ABN conditions found for category state ${categoryStateId}`);
    }

    // Then create new ones based on the provided data
    const conditions = [
      { kind: AbnConditionKind.COMPANY, message: abnConditions.company },
      { kind: AbnConditionKind.INDIVIDUAL, message: abnConditions.individual },
      { kind: AbnConditionKind.PARTNERSHIP, message: abnConditions.partnership },
      { kind: AbnConditionKind.TRUST, message: abnConditions.trust },
      { kind: AbnConditionKind.OTHER, message: abnConditions.other }
    ];

    this.logger.log(`Processing ${conditions.length} condition types`);
    let createdCount = 0;
    
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      this.logger.log(`Processing condition ${i + 1}: kind=${condition.kind}, message=${condition.message}`);
      
      if (condition.message) {
        const abnCondition = this.categoryStateAbnConditionRepo.create({
          categoryStateId,
          kind: condition.kind,
          message: condition.message,
          position: i + 1
        });
        
        await this.categoryStateAbnConditionRepo.save(abnCondition);
        this.logger.log(`Created new ABN condition: ${condition.kind}`);
        createdCount++;
      } else {
        this.logger.log(`Skipping condition ${condition.kind} - no message provided`);
      }
    }
    
    this.logger.log(`Finished processing ABN conditions. Created ${createdCount} new conditions.`);
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
        // Try to find sub-category by shortName first, then by name as fallback
        let subCategory = await this.subCategoryRepo.findOne({ 
          where: { shortName: category.sub_category_name } 
        });
        
        if (!subCategory) {
          subCategory = await this.subCategoryRepo.findOne({ 
            where: { name: category.sub_category_name } 
          });
        }
        
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
      // FIXED: Look up groups by 'key' field, not 'name' field
      let group = await this.licenceRequirementGroupRepo.findOne({ 
        where: { key: groupKey } 
      });
      
      if (group) {
        // Check if link already exists
        const existingLink = await this.categoryStateLicenceGroupRepo.findOne({
          where: {
            categoryStateId,
            licenceRequirementGroupId: group.id
          }
        });
        
        if (!existingLink) {
          const categoryStateLicenceGroup = this.categoryStateLicenceGroupRepo.create({
            categoryStateId,
            licenceRequirementGroupId: group.id
          });
          
          await this.categoryStateLicenceGroupRepo.save(categoryStateLicenceGroup);
          this.logger.log(`Created new link: category state to licence requirement group: ${group.name} (key: ${group.key})`);
        } else {
          this.logger.log(`Link already exists: category state to licence requirement group: ${group.name} (key: ${group.key})`);
        }

        // Update group's category references if needed
        const categoryState = await this.categoryStateRepo.findOne({ 
          where: { id: categoryStateId } 
        });
        
        if (categoryState) {
          const needsUpdate = group.parentCategoryId !== (categoryState.parentCategoryId || null) || 
                             group.subCategoryId !== (categoryState.subCategoryId || null);
          
          if (needsUpdate) {
            group.parentCategoryId = categoryState.parentCategoryId || null;
            group.subCategoryId = categoryState.subCategoryId || null;
            await this.licenceRequirementGroupRepo.save(group);
            this.logger.log(`Updated group ${group.name} (key: ${group.key}) category references`);
          }
        }
      } else {
        this.logger.warn(`Could not find group for key: ${groupKey}`);
      }
    }
  }

}
