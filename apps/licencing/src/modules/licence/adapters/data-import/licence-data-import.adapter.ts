import { Injectable, Logger, Inject } from '@nestjs/common';
import { DataImportPort, ImportResult } from '../../ports/data-import.port';
import { LICENCE_REQUIREMENT_REPOSITORY, LicenceRequirementRepository } from '../../ports/licence-requirement.repository.port';
import { GROUP_LINKING_PORT, GroupLinkingPort } from '../../ports/group-linking.port';
import { LicenceRequirementDomainService } from '../../domain/services/licence-requirement-domain.service';
import { AbnCondition, AbnConditionKind } from '../../domain/entities/abn-condition.entity';

@Injectable()
export class LicenceDataImportAdapter implements DataImportPort {
  private readonly logger = new Logger(LicenceDataImportAdapter.name);

  constructor(
    @Inject(LICENCE_REQUIREMENT_REPOSITORY)
    private readonly licenceRequirementRepository: LicenceRequirementRepository,
    @Inject(GROUP_LINKING_PORT)
    private readonly groupLinkingPort: GroupLinkingPort,
    private readonly licenceRequirementDomainService: LicenceRequirementDomainService,
  ) {}

  async importLicenceData(data: any): Promise<ImportResult> {
    this.logger.log('Starting licence data import...');

    // Clear existing data
    await this.clearExistingData();

    // Load data in order
    await this.loadAuthorities(data.groups);
    await this.loadLicenceTypes(data.groups);
    await this.loadLicenceRequirementGroups(data.groups);
    const categoryResult = await this.loadCategoryStates(data.categories);

    // Link category states to licence requirement groups
    this.logger.log('Linking category states to licence requirement groups...');
    await this.groupLinkingPort.linkAllCategoryStatesToGroups(data.categories);
    this.logger.log('Category states linked to groups successfully');

    // Link licence types to licence requirement groups
    this.logger.log('Linking licence types to licence requirement groups...');
    await this.linkLicenceTypesToGroups(data.groups);
    this.logger.log('Licence types linked to groups successfully');

    this.logger.log(`Licence data import completed. Processed: ${categoryResult.processed}, Missing: ${categoryResult.missing.length}`);
    return categoryResult;
  }

  async updateLicenceDataSelectively(data: any): Promise<ImportResult> {
    this.logger.log('Starting selective licence data update (preserving existing data)...');

    // NO clearExistingData() call - this is the key difference!
    // We only update/add the specific data provided in the request

    // Load/update data in order (will update existing or create new records)
    if (data.groups) {
      await this.loadAuthorities(data.groups);
      await this.loadLicenceTypes(data.groups);  
      await this.loadLicenceRequirementGroups(data.groups);
    }

    let categoryResult = { processed: 0, missing: [] };
    if (data.categories) {
      categoryResult = await this.loadCategoryStates(data.categories);

      // Link category states to licence requirement groups (only for the categories provided)
      this.logger.log('Linking provided category states to licence requirement groups...');
      await this.groupLinkingPort.linkAllCategoryStatesToGroups(data.categories);
      this.logger.log('Category states linked to groups successfully');

      // Link licence types to licence requirement groups (only for the groups provided)
      if (data.groups) {
        this.logger.log('Linking licence types to licence requirement groups...');
        await this.linkLicenceTypesToGroups(data.groups);
        this.logger.log('Licence types linked to groups successfully');
      }
    }

    this.logger.log(`Selective licence data update completed. Processed: ${categoryResult.processed}, Missing: ${categoryResult.missing.length}`);
    return categoryResult;
  }

  private async linkLicenceTypesToGroups(groups: any): Promise<void> {
    for (const [groupKey, group] of Object.entries(groups)) {
      const groupData = group as any;
      if (groupData.classes && groupData.classes.length > 0) {
        // Find the licence requirement group
        const licenceRequirementGroup = await this.licenceRequirementRepository.findLicenceRequirementGroup(groupKey);
        if (licenceRequirementGroup) {
          // Find all licence types for this group
          const licenceTypeIds: number[] = [];
          for (const classData of groupData.classes) {
            const licenceType = await this.licenceRequirementRepository.findLicenceType(classData.name);
            if (licenceType && licenceType.id) {
              licenceTypeIds.push(licenceType.id);
            }
          }
          
          // Link the licence types to the group
          if (licenceTypeIds.length > 0) {
            await this.groupLinkingPort.linkLicenceTypesToGroups(licenceRequirementGroup.id!, licenceTypeIds);
            this.logger.debug(`Linked ${licenceTypeIds.length} licence types to group ${groupKey}`);
          }
        }
      }
    }
  }

  async loadAuthorities(groups: any): Promise<void> {
    this.logger.log('Loading authorities...');
    
    for (const [groupKey, group] of Object.entries(groups)) {
      const groupData = group as any;
      if (groupData.licence_types) {
        for (const licenceType of groupData.licence_types) {
          const licenceTypeData = licenceType as any;
          if (licenceTypeData.authority) {
            const existingAuthority = await this.licenceRequirementRepository.findAuthority(licenceTypeData.authority);
            if (!existingAuthority) {
              const authorityEntity = {
                authority: licenceTypeData.authority,
                authorityName: licenceTypeData.authority,
                state: 'NSW' // Default state
              };
              await this.licenceRequirementRepository.saveAuthority(authorityEntity);
            }
          }
        }
      }
    }
    
    this.logger.log('Authorities loaded successfully');
  }

  async loadLicenceTypes(groups: any): Promise<void> {
    this.logger.log('Loading licence types...');
    
    for (const [groupKey, group] of Object.entries(groups)) {
      const groupData = group as any;
      if (groupData.classes) {
        for (const licenceType of groupData.classes) {
          const licenceTypeData = licenceType as any;
          const existingLicenceType = await this.licenceRequirementRepository.findLicenceType(licenceTypeData.name);
          if (!existingLicenceType) {
            const authority = await this.licenceRequirementRepository.findAuthority(licenceTypeData.authority);
            const licenceTypeEntity = {
              name: licenceTypeData.name,
              state: licenceTypeData.state || 'NSW',
              licenceType: licenceTypeData.name, // Set the required licenceType field
              authority: authority
            };
            await this.licenceRequirementRepository.saveLicenceType(licenceTypeEntity);
          }
        }
      }
    }
    
    this.logger.log('Licence types loaded successfully');
  }

  async loadLicenceRequirementGroups(groups: any): Promise<void> {
    this.logger.log('Loading licence requirement groups...');
    
    for (const [groupKey, group] of Object.entries(groups)) {
      const groupData = group as any;
      const existingGroup = await this.licenceRequirementRepository.findLicenceRequirementGroup(groupKey);
      if (!existingGroup) {
        const groupEntity = this.licenceRequirementDomainService.createLicenceRequirementGroup(
          groupData.name,
          groupKey,
          groupData.min_required
        );
        await this.licenceRequirementRepository.saveLicenceRequirementGroup(groupEntity);
      }
    }
    
    this.logger.log('Licence requirement groups loaded successfully');
  }

  async loadCategoryStates(categories: any[]): Promise<ImportResult> {
    this.logger.log('Loading category states...');
    
    let processed = 0;
    const missing: Array<{ name: string; sub_category_name?: string; reason: string; type: 'parent' | 'sub' }> = [];

    for (const category of categories) {
      try {
        if (category.is_parent) {
          // Handle parent category
          const parentCategory = await this.licenceRequirementRepository.findParentCategory(category.name);
          if (!parentCategory) {
            missing.push({
              name: category.name,
              reason: 'Parent category not found in database',
              type: 'parent'
            });
            continue;
          }

          // Process states for parent category
          for (const [stateKey, stateData] of Object.entries(category.states)) {
            const stateDataTyped = stateData as any;
            const categoryState = this.licenceRequirementDomainService.createCategoryState(
              parentCategory.id,
              null, // No sub-category for parent
              stateKey,
              stateDataTyped.licence_required,
              stateDataTyped.licence_note || ''
            );

            const savedCategoryState = await this.licenceRequirementRepository.saveCategoryState(categoryState);

            // Process ABN conditions
            if (stateDataTyped.abn_conditions) {
              for (const [abnKind, message] of Object.entries(stateDataTyped.abn_conditions)) {
                if (message && (abnKind === 'company' || abnKind === 'individual' || abnKind === 'partnership' || abnKind === 'trust' || abnKind === 'other')) {
                  const abnCondition = this.licenceRequirementDomainService.createAbnCondition(
                    savedCategoryState.id!,
                    abnKind as AbnConditionKind,
                    message as string
                  );
                  await this.licenceRequirementRepository.saveAbnCondition(abnCondition);
                }
              }
            }

            processed++;
          }
        } else {
          // Handle sub-category
          const parentCategory = await this.licenceRequirementRepository.findParentCategory(category.name);
          if (!parentCategory) {
            missing.push({
              name: category.name,
              reason: 'Parent category not found in database',
              type: 'parent'
            });
            continue;
          }

          const subCategory = await this.licenceRequirementRepository.findSubCategory(category.sub_category_name);
          if (!subCategory) {
            // Try finding by short name as fallback
            const subCategoryByShortName = await this.licenceRequirementRepository.findSubCategoryByShortName(category.sub_category_name);
            if (!subCategoryByShortName) {
              missing.push({
                name: category.name,
                sub_category_name: category.sub_category_name,
                reason: 'Sub-category not found in database',
                type: 'sub'
              });
              continue;
            }
          }

          const actualSubCategory = subCategory || await this.licenceRequirementRepository.findSubCategoryByShortName(category.sub_category_name);

          // Process states for sub-category
          for (const [stateKey, stateData] of Object.entries(category.states)) {
            const stateDataTyped = stateData as any;
            const categoryState = this.licenceRequirementDomainService.createCategoryState(
              parentCategory.id,
              actualSubCategory.id,
              stateKey,
              stateDataTyped.licence_required,
              stateDataTyped.licence_note || ''
            );

            const savedCategoryState = await this.licenceRequirementRepository.saveCategoryState(categoryState);

            // Process ABN conditions
            if (stateDataTyped.abn_conditions) {
              for (const [abnKind, message] of Object.entries(stateDataTyped.abn_conditions)) {
                if (message && (abnKind === 'company' || abnKind === 'individual' || abnKind === 'partnership' || abnKind === 'trust' || abnKind === 'other')) {
                  const abnCondition = this.licenceRequirementDomainService.createAbnCondition(
                    savedCategoryState.id!,
                    abnKind as AbnConditionKind,
                    message as string
                  );
                  await this.licenceRequirementRepository.saveAbnCondition(abnCondition);
                }
              }
            }

            processed++;
          }
        }
      } catch (error) {
        const categoryData = category as any;
        this.logger.error(`Error processing category ${categoryData.name}: ${(error as any).message}`);
        missing.push({
          name: category.name,
          sub_category_name: category.sub_category_name,
          reason: `Processing error: ${(error as any).message}`,
          type: category.is_parent ? 'parent' : 'sub'
        });
      }
    }

    this.logger.log(`Category states loaded successfully. Processed: ${processed}, Missing: ${missing.length}`);
    return { processed, missing };
  }

  async clearExistingData(): Promise<void> {
    this.logger.log('Clearing existing data...');
    
    // Clear linking tables first (they have foreign key references)
    await this.licenceRequirementRepository.clearAllCategoryStateLicenceGroups();
    await this.licenceRequirementRepository.clearAllLicenceRequirementGroupLicences(); // Clear before licence types!
    await this.licenceRequirementRepository.clearAllAbnConditions();
    await this.licenceRequirementRepository.clearAllCategoryStates();
    await this.licenceRequirementRepository.clearAllLicenceRequirementGroups(); // Clear before licence types!
    
    // Clear base entities last (they are referenced by others)
    await this.licenceRequirementRepository.clearAllLicenceTypes();
    await this.licenceRequirementRepository.clearAllAuthorities();
    
    this.logger.log('Existing data cleared successfully');
  }
}
