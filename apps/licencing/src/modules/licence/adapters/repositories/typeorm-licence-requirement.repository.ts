import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicenceRequirementRepository } from '../../ports/licence-requirement.repository.port';
import { CategoryState } from '../../domain/entities/category-state.entity';
import { AbnCondition, AbnConditionKind } from '../../domain/entities/abn-condition.entity';
import { LicenceRequirementGroup } from '../../domain/entities/licence-requirement-group.entity';
import { CategoryStateEntity } from '../../entities/category-state.entity';
import { CategoryStateAbnConditionEntity } from '../../entities/category-state-abn-condition.entity';
import { LicenceRequirementGroupEntity } from '../../entities/licence-requirement-group.entity';
import { CategoryStateLicenceGroupEntity } from '../../entities/category-state-licence-group.entity';
import { LicenceRequirementGroupLicenceEntity } from '../../entities/licence-requirement-group-licence.entity';
import { LicenceTypeEntity } from '../../entities/licence-type.entity';
import { AuthorityEntity } from '../../entities/authority.entity';
import { ParentCategoryEntity } from '../../../shared/entities/parent-category.entity';
import { SubCategoryEntity } from '../../../shared/entities/sub-category.entity';

@Injectable()
export class TypeOrmLicenceRequirementRepository implements LicenceRequirementRepository {
  constructor(
    @InjectRepository(CategoryStateEntity)
    private readonly categoryStateRepo: Repository<CategoryStateEntity>,
    @InjectRepository(CategoryStateAbnConditionEntity)
    private readonly categoryStateAbnConditionRepo: Repository<CategoryStateAbnConditionEntity>,
    @InjectRepository(LicenceRequirementGroupEntity)
    private readonly licenceRequirementGroupRepo: Repository<LicenceRequirementGroupEntity>,
    @InjectRepository(CategoryStateLicenceGroupEntity)
    private readonly categoryStateLicenceGroupRepo: Repository<CategoryStateLicenceGroupEntity>,
    @InjectRepository(LicenceRequirementGroupLicenceEntity)
    private readonly licenceRequirementGroupLicenceRepo: Repository<LicenceRequirementGroupLicenceEntity>,
    @InjectRepository(LicenceTypeEntity)
    private readonly licenceTypeRepo: Repository<LicenceTypeEntity>,
    @InjectRepository(AuthorityEntity)
    private readonly authorityRepo: Repository<AuthorityEntity>,
    @InjectRepository(ParentCategoryEntity)
    private readonly parentCategoryRepo: Repository<ParentCategoryEntity>,
    @InjectRepository(SubCategoryEntity)
    private readonly subCategoryRepo: Repository<SubCategoryEntity>,
  ) {}

  // Category State operations
  async findCategoryState(parentId: number, subId: number, state: string): Promise<CategoryState | null> {
    const entity = await this.categoryStateRepo.findOne({
      where: { parentCategoryId: parentId, subCategoryId: subId, state },
      relations: ['parentCategory', 'subCategory']
    });

    return entity ? this.mapCategoryStateToDomain(entity) : null;
  }

  // Category State operations with full entity data (for name resolution)
  async findCategoryStateWithRelations(parentId: number, subId: number, state: string): Promise<any | null> {
    return await this.categoryStateRepo.findOne({
      where: { parentCategoryId: parentId, subCategoryId: subId, state },
      relations: ['parentCategory', 'subCategory']
    });
  }

  async saveCategoryState(categoryState: CategoryState): Promise<CategoryState> {
    const entity = this.mapCategoryStateToEntity(categoryState);
    const savedEntity = await this.categoryStateRepo.save(entity);
    return this.mapCategoryStateToDomain(savedEntity);
  }

  async findCategoryStatesByParent(parentId: number): Promise<CategoryState[]> {
    const entities = await this.categoryStateRepo.find({
      where: { parentCategoryId: parentId },
      relations: ['parentCategory']
    });

    return entities.map(entity => this.mapCategoryStateToDomain(entity));
  }

  async findCategoryStatesBySubCategory(subId: number): Promise<CategoryState[]> {
    const entities = await this.categoryStateRepo.find({
      where: { subCategoryId: subId },
      relations: ['subCategory']
    });

    return entities.map(entity => this.mapCategoryStateToDomain(entity));
  }

  async deleteCategoryState(id: number): Promise<void> {
    await this.categoryStateRepo.delete(id);
  }

  async clearAllCategoryStates(): Promise<void> {
    await this.categoryStateRepo.delete({});
  }

  // ABN Condition operations
  async findAbnConditions(categoryStateId: number): Promise<AbnCondition[]> {
    const entities = await this.categoryStateAbnConditionRepo.find({
      where: { categoryStateId }
    });

    return entities.map(entity => this.mapAbnConditionToDomain(entity));
  }

  async findAbnCondition(categoryStateId: number, kind: AbnConditionKind): Promise<AbnCondition | null> {
    const entity = await this.categoryStateAbnConditionRepo.findOne({
      where: { categoryStateId, kind }
    });

    return entity ? this.mapAbnConditionToDomain(entity) : null;
  }

  async saveAbnCondition(abnCondition: AbnCondition): Promise<AbnCondition> {
    const entity = this.mapAbnConditionToEntity(abnCondition);
    const savedEntity = await this.categoryStateAbnConditionRepo.save(entity);
    return this.mapAbnConditionToDomain(savedEntity);
  }

  async deleteAbnConditions(categoryStateId: number): Promise<void> {
    await this.categoryStateAbnConditionRepo.delete({ categoryStateId });
  }

  async clearAllAbnConditions(): Promise<void> {
    await this.categoryStateAbnConditionRepo.delete({});
  }

  // Licence Requirement Group operations
  async findLicenceRequirementGroup(key: string): Promise<LicenceRequirementGroup | null> {
    const entity = await this.licenceRequirementGroupRepo.findOne({
      where: { key }
    });

    return entity ? this.mapLicenceRequirementGroupToDomain(entity) : null;
  }

  async findLicenceRequirementGroupById(id: number): Promise<LicenceRequirementGroup | null> {
    const entity = await this.licenceRequirementGroupRepo.findOne({
      where: { id }
    });

    return entity ? this.mapLicenceRequirementGroupToDomain(entity) : null;
  }

  async saveLicenceRequirementGroup(group: LicenceRequirementGroup): Promise<LicenceRequirementGroup> {
    const entity = this.mapLicenceRequirementGroupToEntity(group);
    const savedEntity = await this.licenceRequirementGroupRepo.save(entity);
    return this.mapLicenceRequirementGroupToDomain(savedEntity);
  }

  async findLicenceRequirementGroupsByCategory(parentId: number, subId?: number): Promise<LicenceRequirementGroup[]> {
    const where: any = { parentCategoryId: parentId };
    if (subId !== undefined) {
      where.subCategoryId = subId;
    }

    const entities = await this.licenceRequirementGroupRepo.find({ where });
    return entities.map(entity => this.mapLicenceRequirementGroupToDomain(entity));
  }

  async deleteLicenceRequirementGroup(id: number): Promise<void> {
    await this.licenceRequirementGroupRepo.delete(id);
  }

  async clearAllLicenceRequirementGroups(): Promise<void> {
    await this.licenceRequirementGroupRepo.delete({});
  }

  // Category State Licence Group operations
  async findCategoryStateLicenceGroups(categoryStateId: number): Promise<any[]> {
    return await this.categoryStateLicenceGroupRepo.find({
      where: { categoryStateId },
      relations: ['licenceRequirementGroup']
    });
  }

  async saveCategoryStateLicenceGroup(categoryStateId: number, groupId: number): Promise<void> {
    const entity = this.categoryStateLicenceGroupRepo.create({
      categoryStateId,
      licenceRequirementGroupId: groupId
    });
    await this.categoryStateLicenceGroupRepo.save(entity);
  }

  async deleteCategoryStateLicenceGroups(categoryStateId: number): Promise<void> {
    await this.categoryStateLicenceGroupRepo.delete({ categoryStateId });
  }

  async clearAllCategoryStateLicenceGroups(): Promise<void> {
    await this.categoryStateLicenceGroupRepo.delete({});
  }

  // Licence Type operations
  async findLicenceType(name: string): Promise<any | null> {
    return await this.licenceTypeRepo.findOne({
      where: { name },
      relations: ['authority']
    });
  }

  async saveLicenceType(licenceType: any): Promise<any> {
    return await this.licenceTypeRepo.save(licenceType);
  }

  async findLicenceTypesByGroup(groupId: number, state?: string): Promise<any[]> {
    // Use the actual database relationships from licence_requirement_group_licence table
    const groupLicenceLinks = await this.licenceRequirementGroupLicenceRepo.find({
      where: { licenceRequirementGroupId: groupId },
      relations: ['licenceType', 'licenceType.authority']
    });

    // Filter by state if provided, or include 'National' licences for any state
    const filteredLinks = state 
      ? groupLicenceLinks.filter(link => 
          link.licenceType.state === state || 
          link.licenceType.state === 'National'
        )
      : groupLicenceLinks;

    // Map the filtered licence types to the response format
    return filteredLinks.map(link => ({
      name: link.licenceType.name,
      state: link.licenceType.state,
      authority: link.licenceType.authority?.authorityName || link.licenceType.authority?.authority || 'Unknown'
    }));
  }

  async clearAllLicenceTypes(): Promise<void> {
    await this.licenceTypeRepo.delete({});
  }

  // Authority operations
  async findAuthority(authority: string): Promise<any | null> {
    return await this.authorityRepo.findOne({
      where: { authority }
    });
  }

  async saveAuthority(authority: any): Promise<any> {
    return await this.authorityRepo.save(authority);
  }

  async clearAllAuthorities(): Promise<void> {
    await this.authorityRepo.delete({});
  }

  // Parent/Sub Category operations
  async findParentCategory(name: string): Promise<any | null> {
    return await this.parentCategoryRepo.findOne({
      where: { name }
    });
  }

  async findParentCategoryById(id: number): Promise<any | null> {
    return await this.parentCategoryRepo.findOne({
      where: { id: id }
    });
  }

  async findSubCategory(id: number): Promise<any | null> {
    return await this.subCategoryRepo.findOne({
      where: { id }
    });
  }



  // Mapping methods
  private mapCategoryStateToDomain(entity: CategoryStateEntity): CategoryState {
    return new CategoryState(
      entity.parentCategoryId,
      entity.subCategoryId,
      entity.state,
      entity.licenceRequired,
      entity.licenceNote,
      entity.id
    );
  }

  private mapCategoryStateToEntity(domain: CategoryState): CategoryStateEntity {
    const entity = new CategoryStateEntity();
    if (domain.id !== undefined) {
      entity.id = domain.id;
    }
    entity.parentCategoryId = domain.parentCategoryId;
    entity.subCategoryId = domain.subCategoryId;
    entity.state = domain.state;
    entity.licenceRequired = domain.licenceRequired;
    entity.licenceNote = domain.licenceNote;
    return entity;
  }

  async saveLicenceRequirementGroupLicence(groupId: number, licenceTypeId: number): Promise<void> {
    const existingLink = await this.licenceRequirementGroupLicenceRepo
      .findOne({ where: { licenceRequirementGroupId: groupId, licenceTypeId: licenceTypeId } });
    
    if (!existingLink) {
      const linkEntity = this.licenceRequirementGroupLicenceRepo.create({
        licenceRequirementGroupId: groupId,
        licenceTypeId: licenceTypeId
      });
      await this.licenceRequirementGroupLicenceRepo.save(linkEntity);
    }
  }

  async deleteLicenceRequirementGroupLicences(groupId: number): Promise<void> {
    await this.licenceRequirementGroupLicenceRepo
      .delete({ licenceRequirementGroupId: groupId });
  }

  async clearAllLicenceRequirementGroupLicences(): Promise<void> {
    await this.licenceRequirementGroupLicenceRepo.delete({});
  }

  private mapAbnConditionToDomain(entity: CategoryStateAbnConditionEntity): AbnCondition {
    return new AbnCondition(
      entity.categoryStateId,
      entity.kind as AbnConditionKind,
      entity.message,
      entity.id
    );
  }

  private mapAbnConditionToEntity(domain: AbnCondition): CategoryStateAbnConditionEntity {
    const entity = new CategoryStateAbnConditionEntity();
    entity.id = domain.id;
    entity.categoryStateId = domain.categoryStateId;
    entity.kind = domain.kind;
    entity.message = domain.message;
    return entity;
  }

  private mapLicenceRequirementGroupToDomain(entity: LicenceRequirementGroupEntity): LicenceRequirementGroup {
    return new LicenceRequirementGroup(
      entity.name,
      entity.key,
      entity.minRequired,
      entity.state,
      entity.authorityName,
      entity.abnCompany,
      entity.abnIndividual,
      entity.abnPartnership,
      entity.abnTrust,
      entity.isActive,
      entity.parentCategoryId,
      entity.subCategoryId,
      entity.id
    );
  }

  private mapLicenceRequirementGroupToEntity(domain: LicenceRequirementGroup): LicenceRequirementGroupEntity {
    const entity = new LicenceRequirementGroupEntity();
    if (domain.id !== undefined) {
      entity.id = domain.id;
    }
    entity.name = domain.name;
    entity.key = domain.key;
    entity.minRequired = domain.minRequired;
    entity.state = domain.state;
    entity.authorityName = domain.authorityName;
    entity.abnCompany = domain.abnCompany;
    entity.abnIndividual = domain.abnIndividual;
    entity.abnPartnership = domain.abnPartnership;
    entity.abnTrust = domain.abnTrust;
    entity.isActive = domain.isActive;
    entity.parentCategoryId = domain.parentCategoryId;
    entity.subCategoryId = domain.subCategoryId;
    return entity;
  }

  async findSubCategoryByShortName(shortName: string): Promise<SubCategoryEntity | null> {
    return this.subCategoryRepo.findOne({ where: { shortName } });
  }
}
