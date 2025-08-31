import { Injectable, Logger, Inject } from '@nestjs/common';
import { GroupLinkingPort } from '../../ports/group-linking.port';
import { LICENCE_REQUIREMENT_REPOSITORY, LicenceRequirementRepository } from '../../ports/licence-requirement.repository.port';

@Injectable()
export class GroupLinkingAdapter implements GroupLinkingPort {
  private readonly logger = new Logger(GroupLinkingAdapter.name);

  constructor(
    @Inject(LICENCE_REQUIREMENT_REPOSITORY)
    private readonly licenceRequirementRepository: LicenceRequirementRepository,
  ) {}

  async linkAllCategoryStatesToGroups(categories: any[]): Promise<void> {
    this.logger.log('Linking all category states to groups...');

    for (const category of categories) {
      try {
        if (category.is_parent) {
          // Handle parent category
          const parentCategory = await this.licenceRequirementRepository.findParentCategory(category.name);
          if (!parentCategory) {
            this.logger.warn(`Parent category not found: ${category.name}`);
            continue;
          }

          // Process states for parent category
          for (const [stateKey, stateData] of Object.entries(category.states)) {
            const stateDataTyped = stateData as any;
            const categoryState = await this.licenceRequirementRepository.findCategoryState(
              parentCategory.id,
              null, // No sub-category for parent
              stateKey
            );

            if (categoryState && stateDataTyped.groups && Array.isArray(stateDataTyped.groups)) {
              await this.linkLicenceRequirementGroups(categoryState.id!, stateDataTyped.groups);
            }
          }
        } else {
          // Handle sub-category
          const parentCategory = await this.licenceRequirementRepository.findParentCategory(category.name);
          if (!parentCategory) {
            this.logger.warn(`Parent category not found: ${category.name}`);
            continue;
          }

          const subCategory = await this.licenceRequirementRepository.findSubCategory(category.sub_category_name);
          if (!subCategory) {
            // Try finding by short name as fallback
            const subCategoryByShortName = await this.licenceRequirementRepository.findSubCategoryByShortName(category.sub_category_name);
            if (!subCategoryByShortName) {
              this.logger.warn(`Sub-category not found: ${category.sub_category_name}`);
              continue;
            }
          }

          const actualSubCategory = subCategory || await this.licenceRequirementRepository.findSubCategoryByShortName(category.sub_category_name);

          // Process states for sub-category
          for (const [stateKey, stateData] of Object.entries(category.states)) {
            const stateDataTyped = stateData as any;
            const categoryState = await this.licenceRequirementRepository.findCategoryState(
              parentCategory.id,
              actualSubCategory.id,
              stateKey
            );

            if (categoryState && stateDataTyped.groups && Array.isArray(stateDataTyped.groups)) {
              await this.linkLicenceRequirementGroups(categoryState.id!, stateDataTyped.groups);
            }
          }
        }
      } catch (error) {
        const categoryData = category as any;
        this.logger.error(`Error linking groups for category ${categoryData.name}: ${(error as any).message}`);
      }
    }

    this.logger.log('All category states linked to groups successfully');
  }

  async linkLicenceRequirementGroups(categoryStateId: number, groupKeys: string[]): Promise<void> {
    this.logger.log(`Linking licence requirement groups to category state ${categoryStateId}`);

    // First, unlink existing groups
    await this.unlinkGroupsFromCategoryState(categoryStateId);

    // Then link new groups
    for (const groupKey of groupKeys) {
      try {
        const group = await this.licenceRequirementRepository.findLicenceRequirementGroup(groupKey);
        if (group) {
          await this.licenceRequirementRepository.saveCategoryStateLicenceGroup(categoryStateId, group.id!);
          this.logger.debug(`Linked group ${groupKey} to category state ${categoryStateId}`);
        } else {
          this.logger.warn(`Group not found: ${groupKey}`);
        }
      } catch (error) {
        this.logger.error(`Error linking group ${groupKey} to category state ${categoryStateId}: ${(error as any).message}`);
      }
    }
  }

  async linkLicenceTypesToGroups(groupId: number, licenceTypeIds: number[]): Promise<void> {
    this.logger.log(`Linking licence types to group ${groupId}`);

    for (const licenceTypeId of licenceTypeIds) {
      try {
        await this.licenceRequirementRepository.saveLicenceRequirementGroupLicence(groupId, licenceTypeId);
        this.logger.debug(`Linked licence type ${licenceTypeId} to group ${groupId}`);
      } catch (error) {
        this.logger.error(`Error linking licence type ${licenceTypeId} to group ${groupId}: ${(error as any).message}`);
      }
    }
  }

  async unlinkGroupsFromCategoryState(categoryStateId: number): Promise<void> {
    this.logger.log(`Unlinking groups from category state ${categoryStateId}`);
    await this.licenceRequirementRepository.deleteCategoryStateLicenceGroups(categoryStateId);
  }

  async clearAllGroupLinks(): Promise<void> {
    this.logger.log('Clearing all group links...');
    await this.licenceRequirementRepository.clearAllCategoryStateLicenceGroups();
    this.logger.log('All group links cleared successfully');
  }
}
