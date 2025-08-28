import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ParentCategoryEntity } from '../../category/entity/parent-category.entity';

@Entity({ name: 'licence_requirement_group' })
export class LicenceRequirementGroupEntity {
  @PrimaryGeneratedColumn('identity', { name: 'licence_requirement_group_id' })
  id!: number;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'min_required', type: 'integer', default: 1 })
  minRequired!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'parent_category_id', type: 'integer', nullable: true })
  parentCategoryId!: number | null;

  @Column({ name: 'sub_category_id', type: 'integer', nullable: true })
  subCategoryId!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ParentCategoryEntity)
  @JoinColumn({ name: 'parent_category_id' })
  parentCategory!: ParentCategoryEntity;
}
