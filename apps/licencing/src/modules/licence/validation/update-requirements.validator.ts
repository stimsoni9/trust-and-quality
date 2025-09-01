import { BadRequestException } from '@nestjs/common';

/**
 * Centralized validator for update-licence-requirements endpoint
 * Eliminates duplicate validation code from controller
 */
export class UpdateLicenceRequirementsValidator {
  
  /**
   * Validate the complete update DTO structure
   * Extracts all manual validation logic from controller
   */
  static validate(updateDto: any): void {
    this.validateRequestBody(updateDto);
    this.validateCategoriesArray(updateDto);
    this.validateEachCategory(updateDto.categories);
  }

  /**
   * Validate top-level request body structure
   */
  private static validateRequestBody(updateDto: any): void {
    if (!updateDto) {
      throw new BadRequestException('Request body is required for this endpoint');
    }
  }

  /**
   * Validate categories array exists and is valid
   */
  private static validateCategoriesArray(updateDto: any): void {
    if (!updateDto.categories || !Array.isArray(updateDto.categories)) {
      throw new BadRequestException('Request body must contain a categories array');
    }
  }

  /**
   * Validate each category object in the array
   */
  private static validateEachCategory(categories: any[]): void {
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const index = i + 1;
      
      this.validateCategoryStructure(category, index);
      this.validateCategoryProperties(category, index);
      this.validateStatesObject(category, index);
    }
  }

  /**
   * Validate category object structure
   */
  private static validateCategoryStructure(category: any, index: number): void {
    if (!category || typeof category !== 'object') {
      throw new BadRequestException(`Category ${index}: Must be a valid object`);
    }
  }

  /**
   * Validate category properties (name, is_parent, states)
   */
  private static validateCategoryProperties(category: any, index: number): void {
    if (!category.name || typeof category.name !== 'string') {
      throw new BadRequestException(`Category ${index}: name is required and must be a string`);
    }
    
    if (typeof category.is_parent !== 'boolean') {
      throw new BadRequestException(`Category ${index}: is_parent must be a boolean, got ${typeof category.is_parent}`);
    }
    
    if (!category.states || typeof category.states !== 'object') {
      throw new BadRequestException(`Category ${index}: states object is required`);
    }
  }

  /**
   * Validate states object and each state's properties
   */
  private static validateStatesObject(category: any, categoryIndex: number): void {
    for (const [stateKey, stateData] of Object.entries(category.states)) {
      if (!stateData || typeof stateData !== 'object') {
        throw new BadRequestException(`Category ${categoryIndex}, state ${stateKey}: Must be a valid object`);
      }
      
      const stateDataTyped = stateData as any;
      
      if (typeof stateDataTyped.licence_required !== 'boolean') {
        throw new BadRequestException(`Category ${categoryIndex}, state ${stateKey}: licence_required must be a boolean`);
      }
      
      // NEW SCHEMA: abn_conditions are no longer in category states, they're in groups
      // This validation was removed during schema migration
      
      if (!Array.isArray(stateDataTyped.groups)) {
        throw new BadRequestException(`Category ${categoryIndex}, state ${stateKey}: groups must be an array`);
      }
    }
  }
}
