import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ParentCategoryEntity } from '../../shared/entities/parent-category.entity';
import { SubCategoryEntity } from '../../shared/entities/sub-category.entity';

@Entity({ name: 'category_states' })
export class CategoryStateEntity {
  @PrimaryGeneratedColumn('identity', { name: 'category_state_id' })
  id!: number;

  @Column({ name: 'parent_category_id', type: 'integer', nullable: true })
  parentCategoryId!: number | null;

  @Column({ name: 'sub_category_id', type: 'integer', nullable: true })
  subCategoryId!: number | null;

  @Column({ type: 'varchar', length: 10 })
  state!: string;

  @Column({ name: 'licence_required', type: 'boolean', nullable: true })
  licenceRequired!: boolean | null;

  @Column({ name: 'licence_note', type: 'text', nullable: true })
  licenceNote!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ParentCategoryEntity, { nullable: true })
  @JoinColumn({ name: 'parent_category_id' })
  parentCategory!: ParentCategoryEntity | null;

  @ManyToOne(() => SubCategoryEntity, { nullable: true })
  @JoinColumn({ name: 'sub_category_id' })
  subCategory!: SubCategoryEntity | null;
}
