import { CategoryState } from '../entities/category-state.entity';
import { AbnCondition, AbnConditionKind } from '../entities/abn-condition.entity';
import { LicenceRequirementGroup } from '../entities/licence-requirement-group.entity';

export interface CategoryStateResult {
  processed: number;
  missing: Array<{
    name: string;
    sub_category_name?: string;
    reason: string;
    type: 'parent' | 'sub';
  }>;
}

export interface RequirementsResult {
  data: {
    groups: Record<string, any>;
    categories: any[];
  };
  found: number;
  notFound: Array<{
    parent_category_id: number;
    sub_category_id?: number;
    abn_kind: string;
    reason: string;
  }>;
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
}

export class LicenceRequirementDomainService {
  
  /**
   * Validates import data according to business rules
   */
  validateImportData(licenceData: any): ImportValidationResult {
    const errors: string[] = [];

    if (!licenceData.groups || !licenceData.categories) {
      errors.push('Invalid data format. Expected "groups" and "categories" properties.');
      return { isValid: false, errors };
    }

    // Validate groups
    for (const [groupKey, group] of Object.entries(licenceData.groups)) {
      const groupData = group as any;
      if (!LicenceRequirementGroup.isValidKey(groupKey)) {
        errors.push(`Invalid group key: ${groupKey}`);
      }
      
      if (!groupData.name || typeof groupData.name !== 'string') {
        errors.push(`Group ${groupKey}: name is required and must be a string`);
      }
      
      if (!groupData.min_required || typeof groupData.min_required !== 'number' || groupData.min_required <= 0) {
        errors.push(`Group ${groupKey}: min_required must be a positive number`);
      }
    }

    // Validate categories
    for (let i = 0; i < licenceData.categories.length; i++) {
      const category = licenceData.categories[i] as any;
      const index = i + 1;
      
      if (!category.name || typeof category.name !== 'string') {
        errors.push(`Category ${index}: name is required and must be a string`);
      }
      
      if (typeof category.is_parent !== 'boolean') {
        errors.push(`Category ${index}: is_parent must be a boolean`);
      }
      
      if (!category.states || typeof category.states !== 'object') {
        errors.push(`Category ${index}: states object is required`);
      }
      
      // Validate states
      for (const [stateKey, stateData] of Object.entries(category.states)) {
        const stateDataTyped = stateData as any;
        if (typeof stateDataTyped.licence_required !== 'boolean') {
          errors.push(`Category ${index}, state ${stateKey}: licence_required must be a boolean`);
        }
        
        if (!stateDataTyped.abn_conditions || typeof stateDataTyped.abn_conditions !== 'object') {
          errors.push(`Category ${index}, state ${stateKey}: abn_conditions object is required`);
        }
        
        if (!Array.isArray(stateDataTyped.groups)) {
          errors.push(`Category ${index}, state ${stateKey}: groups must be an array`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculates required licences based on business rules
   */
  calculateRequiredLicences(groups: LicenceRequirementGroup[], minRequired: number): LicenceRequirementGroup[] {
    const activeGroups = groups.filter(group => group.isActive);
    
    if (activeGroups.length < minRequired) {
      throw new Error(`Insufficient active groups. Required: ${minRequired}, Available: ${activeGroups.length}`);
    }

    return activeGroups.slice(0, minRequired);
  }

  /**
   * Validates category compatibility according to business rules
   */
  validateCategoryCompatibility(parentCategoryId: number, subCategoryId: number | null): boolean {
    if (parentCategoryId <= 0) {
      return false;
    }

    // Treat subCategoryId: 0 as "no sub-category" (parent category)
    if (subCategoryId !== null && subCategoryId !== 0 && subCategoryId <= 0) {
      return false;
    }

    return true;
  }

  /**
   * Aggregates results from multiple category requests
   */
  aggregateResults(results: Array<{ category: any; requirements?: any; error?: string; found: boolean }>): RequirementsResult {
    const data = {
      groups: {},
      categories: []
    };

    let found = 0;
    const notFound: Array<{ parent_category_id: number; sub_category_id?: number; abn_kind: string; reason: string }> = [];

    for (const result of results) {
      if (result.found && result.requirements) {
        // Merge groups (avoid duplicates)
        for (const [groupKey, group] of Object.entries(result.requirements.groups)) {
          if (!data.groups[groupKey]) {
            data.groups[groupKey] = group;
          }
        }

        // Add categories (consolidate by category name + sub_category_name + is_parent)
        for (const category of result.requirements.categories) {
          const existingIndex = data.categories.findIndex(existing => 
            existing.name === category.name && 
            existing.sub_category_name === category.sub_category_name &&
            existing.is_parent === category.is_parent
          );

          if (existingIndex >= 0) {
            // Merge states for existing category
            Object.assign(data.categories[existingIndex].states, category.states);
          } else {
            // Add new category
            data.categories.push(category);
          }
        }
        found++;
      } else {
        notFound.push({
          parent_category_id: result.category.parent_category_id,
          sub_category_id: result.category.sub_category_id,
          abn_kind: result.category.abn_kind,
          reason: result.error || 'Unknown error'
        });
      }
    }

    return { data, found, notFound };
  }

  /**
   * Validates ABN condition data according to business rules
   */
  validateAbnConditions(abnConditions: any): boolean {
    if (!abnConditions || typeof abnConditions !== 'object') {
      return false;
    }

    for (const [kind, message] of Object.entries(abnConditions)) {
      if (!AbnCondition.isValidKind(kind)) {
        return false;
      }
      
      if (message !== undefined && typeof message !== 'string') {
        return false;
      }
    }

    return true;
  }

  /**
   * Creates domain entities from raw data
   */
  createCategoryState(
    parentCategoryId: number,
    subCategoryId: number | null,
    state: string,
    licenceRequired: boolean,
    licenceNote: string = '',
  ): CategoryState {
    return CategoryState.create(
      parentCategoryId,
      subCategoryId,
      state,
      licenceRequired,
      licenceNote
    );
  }

  /**
   * Creates ABN condition domain entity
   */
  createAbnCondition(
    categoryStateId: number,
    kind: AbnConditionKind,
    message: string,
  ): AbnCondition {
    return AbnCondition.create(categoryStateId, kind, message);
  }

  /**
   * Creates licence requirement group domain entity
   */
  createLicenceRequirementGroup(
    name: string,
    key: string,
    minRequired: number,
    parentCategoryId?: number,
    subCategoryId?: number,
  ): LicenceRequirementGroup {
    return LicenceRequirementGroup.create(
      name,
      key,
      minRequired,
      parentCategoryId,
      subCategoryId
    );
  }
}
