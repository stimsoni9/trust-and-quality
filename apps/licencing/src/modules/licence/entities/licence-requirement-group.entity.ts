import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ParentCategoryEntity } from '../../shared/entities/parent-category.entity';

@Entity({ name: 'licence_requirement_group' })
export class LicenceRequirementGroupEntity {
  @PrimaryGeneratedColumn('identity', { name: 'licence_requirement_group_id' })
  id!: number;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', unique: true })
  key!: string;

  @Column({ name: 'min_required', type: 'integer', default: 1 })
  minRequired!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'parent_category_id', type: 'integer', nullable: true })
  parentCategoryId!: number | null;

  @Column({ name: 'sub_category_id', type: 'integer', nullable: true })
  subCategoryId!: number | null;

  // NEW SCHEMA: State and Authority moved to group level
  @Column({ type: 'varchar', length: 10, nullable: false })
  state!: string;

  @Column({ name: 'authority_name', type: 'text', nullable: false })
  authorityName!: string;

  // NEW SCHEMA: ABN Conditions moved to group level
  @Column({ name: 'abn_company', type: 'text', nullable: true })
  abnCompany!: string | null;

  @Column({ name: 'abn_individual', type: 'text', nullable: true })
  abnIndividual!: string | null;

  @Column({ name: 'abn_partnership', type: 'text', nullable: true })
  abnPartnership!: string | null;

  @Column({ name: 'abn_trust', type: 'text', nullable: true })
  abnTrust!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ParentCategoryEntity)
  @JoinColumn({ name: 'parent_category_id' })
  parentCategory!: ParentCategoryEntity;
}
