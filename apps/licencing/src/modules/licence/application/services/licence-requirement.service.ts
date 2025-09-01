import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { LicenceRequirementsResponseDto } from '../../dtos/licence-requirements-response.dto';
import { LICENCE_REQUIREMENT_REPOSITORY, LicenceRequirementRepository } from '../../ports/licence-requirement.repository.port';
import { DATA_IMPORT_PORT, DataImportPort } from '../../ports/data-import.port';
import { GROUP_LINKING_PORT, GroupLinkingPort } from '../../ports/group-linking.port';
import { LicenceRequirementDomainService } from '../../domain/services/licence-requirement-domain.service';
import { AbnConditionKind, AbnCondition } from '../../domain/entities/abn-condition.entity';
import { CategoryState } from '../../domain/entities/category-state.entity';

export interface UpdateResult {
  message: string;
  updated: boolean;
  processed: number;
  missing: Array<{
    name: string;
    sub_category_name?: string;
    reason: string;
    type: 'parent' | 'sub';
  }>;
}

export interface RequirementsResult {
  data: LicenceRequirementsResponseDto;
  found: number;
  notFound: Array<{
    parent_category_id: number;
    sub_category_id?: number;
    abn_kind: string;
    reason: string;
  }>;
}

@Injectable()
export class LicenceRequirementService {
  private readonly logger = new Logger(LicenceRequirementService.name);

  constructor(
    @Inject(LICENCE_REQUIREMENT_REPOSITORY)
    private readonly licenceRequirementRepository: LicenceRequirementRepository,
    @Inject(DATA_IMPORT_PORT)
    private readonly dataImportPort: DataImportPort,
    private readonly licenceRequirementDomainService: LicenceRequirementDomainService,
  ) {}

  /**
   * Get licence requirements for a single category
   */
  async getLicenceRequirementsWithAbn(
    parentCategoryId: number,
    subCategoryId: number,
    abnKind: AbnConditionKind,
    state: string = 'NSW',
  ): Promise<LicenceRequirementsResponseDto> {
    this.logger.log(`Fetching licence requirements with ABN conditions for parent category: ${parentCategoryId}, sub category: ${subCategoryId}, ABN kind: ${abnKind}`);

    // Validate business rules
    if (!this.licenceRequirementDomainService.validateCategoryCompatibility(parentCategoryId, subCategoryId)) {
      throw new NotFoundException('Invalid category combination: parent_category_id and sub_category_id are not compatible');
    }

    // Find parent category
    const parentCategory = await this.licenceRequirementRepository.findParentCategoryById(parentCategoryId);
    if (!parentCategory) {
      throw new NotFoundException(`Parent category with ID ${parentCategoryId} not found. Please provide a valid parent_category_id.`);
    }

    let subCategory = await this.licenceRequirementRepository.findSubCategory(subCategoryId);
    let subCategoryName: string | undefined = undefined;

    // Find sub-category if provided and not 0
    if (subCategoryId && subCategoryId > 0) {
      subCategory = await this.licenceRequirementRepository.findSubCategory(subCategoryId);
      if (!subCategory) {
        throw new NotFoundException(`Sub-category with ID ${subCategoryId} not found or not associated with parent category ${parentCategoryId}. Please provide a valid sub_category_id.`);
      }
      subCategoryName = subCategory.name;
    }

    // Find category state for the specified state
    const categoryState = await this.licenceRequirementRepository.findCategoryState(
      parentCategoryId,
      subCategoryId || null,
      state
    );

    if (!categoryState) {
      const categoryDescription = subCategory 
        ? `"${parentCategory.name} -> ${subCategory.name}"` 
        : `"${parentCategory.name}"`;
      throw new NotFoundException(`No licence requirements found for category ${categoryDescription} in ${state}. This category may not require licensing or may not be available in this state.`);
    }

    // NEW SCHEMA: ABN conditions are now stored in licence requirement groups, not in separate table
    // We'll get the ABN conditions from the groups when we fetch them below

    // Find licence groups for this category state
    const categoryStateLicenceGroups = await this.licenceRequirementRepository.findCategoryStateLicenceGroups(categoryState.id!);
    
    if (categoryStateLicenceGroups.length === 0) {
      const categoryDescription = subCategory 
        ? `"${parentCategory.name} -> ${subCategory.name}"` 
        : `"${parentCategory.name}"`;
      this.logger.warn(`No licence groups found for category ${categoryDescription} in ${state}`);
    }

    // Build the response using domain logic (ABN conditions now come from groups)
    const response = await this.buildRequirementsResponse(
      categoryState,
      null, // No longer using separate ABN condition entity
      categoryStateLicenceGroups,
      parentCategory.name,
      subCategoryName,
      state,
      abnKind // Pass the requested ABN kind for filtering
    );

    this.logger.log(`Successfully retrieved licence requirements for category ${parentCategory.name}${subCategoryName ? ` -> ${subCategoryName}` : ''}`);
    return response;
  }

  /**
   * Get licence requirements for multiple categories
   */
  async getLicenceRequirementsMultiple(
    categoryRequests: Array<{ parent_category_id: number; sub_category_id?: number; abn_kind: AbnConditionKind; state?: string }>
  ): Promise<RequirementsResult> {
    this.logger.log(`Fetching licence requirements for multiple categories: ${categoryRequests.length} categories`);

    const results = await Promise.all(
      categoryRequests.map(async (request) => {
        const { parent_category_id, sub_category_id = 0, abn_kind, state = 'NSW' } = request;
        
        try {
          const requirements = await this.getLicenceRequirementsWithAbn(
            parent_category_id,
            sub_category_id,
            abn_kind,
            state
          );
          
          return { 
            category: request, 
            requirements, 
            found: true 
          };
        } catch (error) {
          this.logger.error(`Error fetching requirements for category ${parent_category_id}/${sub_category_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return { 
            category: request, 
            error: error instanceof Error ? error.message : 'Unknown error', 
            found: false 
          };
        }
      })
    );

    // Aggregate results using domain service
    const foundResults = results.filter(r => r.found && r.requirements);
    const notFoundResults = results.filter(r => !r.found);

    const aggregatedResult = this.licenceRequirementDomainService.aggregateResults(results);

    this.logger.log(`Multi-category request completed: ${foundResults.length} found, ${notFoundResults.length} not found`);
    
    return aggregatedResult;
  }

  /**
   * Update licence requirements from external data
   */
  async updateLicenceRequirements(licenceData: any): Promise<UpdateResult> {
    this.logger.log('Updating licence requirements from request body...');

    // Validate the input data using domain service
    const validation = this.licenceRequirementDomainService.validateImportData(licenceData);
    if (!validation.isValid) {
      const errorMessage = `Import data validation failed: ${validation.errors.join(', ')}`;
      this.logger.error(errorMessage);
      throw new NotFoundException(errorMessage);
    }

    try {
      // Use the selective update method to preserve existing data
      this.logger.log('Starting selective database update process...');
      const importResult = await this.dataImportPort.updateLicenceDataSelectively(licenceData);
      
      this.logger.log(`Licence requirements update completed successfully. Processed ${importResult.processed} categories, Missing: ${importResult.missing.length}`);
      
      return {
        message: `Licence requirements updated selectively. Updated/added ${importResult.processed} categories (existing data preserved).${importResult.missing.length > 0 ? ` ${importResult.missing.length} categories could not be processed.` : ''}`,
        updated: true,
        processed: importResult.processed,
        missing: importResult.missing
      };
    } catch (error) {
      this.logger.error('Error updating licence requirements:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during update';
      throw new NotFoundException(`Failed to update licence requirements: ${errorMessage}`);
    }
  }

  /**
   * Build requirements response using domain logic
   */
  private async buildRequirementsResponse(
    categoryState: CategoryState,
    abnCondition: AbnCondition | null,
    categoryStateLicenceGroups: any[],
    categoryName: string,
    subCategoryName?: string,
    state: string = 'NSW',
    abnKind?: AbnConditionKind // Add abnKind parameter for filtering
  ): Promise<LicenceRequirementsResponseDto> {
    const response: LicenceRequirementsResponseDto = {
      groups: {},
      categories: []
    };

    // Build groups with NEW SCHEMA format
    for (const categoryStateLicenceGroup of categoryStateLicenceGroups) {
      const group = categoryStateLicenceGroup.licenceRequirementGroup;
      const groupKey = group.key || this.generateGroupKey(group.name);
      
      // Load licence classes for this group, filtered by state (as simple string array)
      const licenceClasses = await this.licenceRequirementRepository.findLicenceTypesByGroup(group.id!, state);
      const classNames = licenceClasses.map(lc => lc.name);

      // NEW SCHEMA: Build authority with filtered ABN conditions
      const authority = {
        name: group.authorityName || 'Unknown',
        abn_conditions: {} as any
      };

      // Filter ABN conditions by requested type
      if (abnKind) {
        switch (abnKind) {
          case AbnConditionKind.COMPANY:
            authority.abn_conditions.company = group.abnCompany || '';
            break;
          case AbnConditionKind.INDIVIDUAL:
            authority.abn_conditions.individual = group.abnIndividual || '';
            break;
          case AbnConditionKind.PARTNERSHIP:
            authority.abn_conditions.partnership = group.abnPartnership || '';
            break;
          case AbnConditionKind.TRUST:
            authority.abn_conditions.trust = group.abnTrust || '';
            break;
        }
      }

      response.groups[groupKey] = {
        name: group.name,
        min_required: group.minRequired,
        state: group.state || state,
        authority: authority,
        classes: classNames // Simple string array as per new schema
      };
    }

    // NEW SCHEMA: Categories no longer have ABN conditions at state level
    const category = {
      name: categoryName,
      sub_category_name: subCategoryName,
      is_parent: !categoryState.subCategoryId,
      states: {
        [state]: {
          licence_required: categoryState.licenceRequired || false,
          licence_note: categoryState.licenceNote || '',
          groups: Object.keys(response.groups) // Only group references, no ABN conditions here
        }
      }
    };

    response.categories.push(category);

    this.logger.log(`Successfully built response with ${Object.keys(response.groups).length} groups and ${response.categories.length} categories`);
    return response;
  }

  /**
   * Merge multiple requirements results into one
   */
  private mergeRequirementsResults(results: LicenceRequirementsResponseDto[]): LicenceRequirementsResponseDto {
    const merged: LicenceRequirementsResponseDto = {
      groups: {},
      categories: []
    };

    for (const result of results) {
      // Merge groups
      Object.assign(merged.groups, result.groups);
      // Merge categories
      merged.categories.push(...result.categories);
    }

    return merged;
  }

  /**
   * Generate group key from name (utility method)
   */
  private generateGroupKey(groupName: string): string {
    return groupName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }
}
