import { BadRequestException } from '@nestjs/common';
import { AbnConditionKind } from '../domain/entities/abn-condition.entity';

export interface CategoryRequestInput {
  parent_category_id: number;
  sub_category_id?: number | string; // Allow both number and string for flexible input
  abn_kind: string;
  state?: string;
}

export interface ValidatedCategoryRequest {
  parent_category_id: number;
  sub_category_id: number;
  abn_kind: AbnConditionKind;
  state: string;
}

/**
 * Centralized validation helper to eliminate duplication between single and batch endpoints
 */
export class CategoryRequestValidator {
  private static readonly VALID_ABN_KINDS = ['company', 'individual', 'partnership', 'trust', 'other'];
  private static readonly DEFAULT_STATE = 'NSW';
  private static readonly DEFAULT_SUB_CATEGORY_ID = 0;

  /**
   * Parse and validate a single category request (used by both endpoints)
   */
  static validateAndParseCategoryRequest(
    input: CategoryRequestInput, 
    context: string = 'Category'
  ): ValidatedCategoryRequest {
    // Validate parent_category_id
    if (typeof input.parent_category_id !== 'number') {
      throw new BadRequestException(
        `${context}: parent_category_id must be a number, got ${typeof input.parent_category_id}`
      );
    }

    // Parse and validate sub_category_id
    const sub_category_id = this.parseSubCategoryId(input.sub_category_id, context);

    // Validate abn_kind
    const abn_kind = this.validateAbnKind(input.abn_kind, context);

    // Validate state
    const state = this.validateState(input.state, context);

    return {
      parent_category_id: input.parent_category_id,
      sub_category_id,
      abn_kind,
      state
    };
  }

  /**
   * Parse sub_category_id with consistent logic (string or number → number)
   */
  static parseSubCategoryId(subCategoryId: string | number | undefined, context: string): number {
    if (subCategoryId === undefined || subCategoryId === null) {
      return this.DEFAULT_SUB_CATEGORY_ID;
    }

    if (typeof subCategoryId === 'number') {
      return subCategoryId;
    }

    if (typeof subCategoryId === 'string') {
      // Handle empty string as default
      if (subCategoryId.trim() === '') {
        return this.DEFAULT_SUB_CATEGORY_ID;
      }
      
      const parsed = parseInt(subCategoryId, 10);
      if (isNaN(parsed)) {
        throw new BadRequestException(
          `${context}: sub_category_id must be a valid number, got "${subCategoryId}"`
        );
      }
      return parsed;
    }

    throw new BadRequestException(
      `${context}: sub_category_id must be a number, got ${typeof subCategoryId}`
    );
  }

  /**
   * Validate ABN kind with enum consistency
   */
  static validateAbnKind(abnKind: string, context: string): AbnConditionKind {
    if (!abnKind) {
      throw new BadRequestException(`${context}: abn_kind is required`);
    }

    if (!this.VALID_ABN_KINDS.includes(abnKind)) {
      throw new BadRequestException(
        `${context}: abn_kind must be one of: ${this.VALID_ABN_KINDS.join(', ')}. Got: ${abnKind}`
      );
    }

    return abnKind as AbnConditionKind;
  }

  /**
   * Validate state parameter
   */
  static validateState(state: string | undefined, context: string): string {
    if (state === undefined) {
      return this.DEFAULT_STATE;
    }

    if (typeof state !== 'string') {
      throw new BadRequestException(
        `${context}: state must be a string if provided, got ${typeof state}`
      );
    }

    return state;
  }

  /**
   * Validate batch filter array structure
   */
  static validateBatchFilter(filter: string): CategoryRequestInput[] {
    if (!filter) {
      throw new BadRequestException('Missing required query parameter: filter');
    }

    // Parse JSON
    let categories: any[];
    try {
      categories = JSON.parse(filter);
    } catch (parseError) {
      throw new BadRequestException('Invalid filter parameter. Expected valid JSON array.');
    }

    // Validate array structure
    if (!Array.isArray(categories)) {
      throw new BadRequestException('Filter parameter must be a JSON array.');
    }

    // Validate each category
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const context = `Category ${i + 1}`;
      
      if (!category || typeof category !== 'object') {
        throw new BadRequestException(`${context}: Must be a valid object`);
      }
    }

    return categories;
  }
}
