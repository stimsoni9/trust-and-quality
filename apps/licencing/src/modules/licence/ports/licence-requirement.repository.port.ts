import { CategoryState } from '../domain/entities/category-state.entity';
import { AbnCondition, AbnConditionKind } from '../domain/entities/abn-condition.entity';
import { LicenceRequirementGroup } from '../domain/entities/licence-requirement-group.entity';

export const LICENCE_REQUIREMENT_REPOSITORY = Symbol('LicenceRequirementRepository');

export interface LicenceRequirementRepository {
  // Category State operations
  findCategoryState(parentId: number, subId: number, state: string): Promise<CategoryState | null>;
  findCategoryStateWithRelations(parentId: number, subId: number, state: string): Promise<any | null>;
  saveCategoryState(categoryState: CategoryState): Promise<CategoryState>;
  findCategoryStatesByParent(parentId: number): Promise<CategoryState[]>;
  findCategoryStatesBySubCategory(subId: number): Promise<CategoryState[]>;
  deleteCategoryState(id: number): Promise<void>;
  clearAllCategoryStates(): Promise<void>;

  // ABN Condition operations
  findAbnConditions(categoryStateId: number): Promise<AbnCondition[]>;
  findAbnCondition(categoryStateId: number, kind: AbnConditionKind): Promise<AbnCondition | null>;
  saveAbnCondition(abnCondition: AbnCondition): Promise<AbnCondition>;
  deleteAbnConditions(categoryStateId: number): Promise<void>;
  clearAllAbnConditions(): Promise<void>;

  // Licence Requirement Group operations
  findLicenceRequirementGroup(key: string): Promise<LicenceRequirementGroup | null>;
  findLicenceRequirementGroupById(id: number): Promise<LicenceRequirementGroup | null>;
  saveLicenceRequirementGroup(group: LicenceRequirementGroup): Promise<LicenceRequirementGroup>;
  findLicenceRequirementGroupsByCategory(parentId: number, subId?: number): Promise<LicenceRequirementGroup[]>;
  deleteLicenceRequirementGroup(id: number): Promise<void>;
  clearAllLicenceRequirementGroups(): Promise<void>;

  // Category State Licence Group operations
  findCategoryStateLicenceGroups(categoryStateId: number): Promise<any[]>;
  saveCategoryStateLicenceGroup(categoryStateId: number, groupId: number): Promise<void>;
  deleteCategoryStateLicenceGroups(categoryStateId: number): Promise<void>;
  clearAllCategoryStateLicenceGroups(): Promise<void>;

  // Licence Requirement Group Licence operations (linking groups to licence types)
  saveLicenceRequirementGroupLicence(groupId: number, licenceTypeId: number): Promise<void>;
  deleteLicenceRequirementGroupLicences(groupId: number): Promise<void>;
  clearAllLicenceRequirementGroupLicences(): Promise<void>;

  // Licence Type operations
  findLicenceType(name: string): Promise<any | null>;
  saveLicenceType(licenceType: any): Promise<any>;
  findLicenceTypesByGroup(groupId: number, state?: string): Promise<any[]>;
  clearAllLicenceTypes(): Promise<void>;

  // Authority operations
  findAuthority(authority: string): Promise<any | null>;
  saveAuthority(authority: any): Promise<any>;
  clearAllAuthorities(): Promise<void>;

  // Parent/Sub Category operations
  findParentCategory(name: string): Promise<any | null>;
  findParentCategoryById(id: number): Promise<any | null>;
  findSubCategory(name: string): Promise<any | null>;
  findSubCategoryById(id: number): Promise<any | null>;
  findSubCategoryByShortName(shortName: string): Promise<any | null>;
}
