import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'sub_categories' })
export class SubCategoryEntity {
  @PrimaryColumn('int', { name: 'sub_category_id' })
  id!: number; // practice_id

  @Index()
  @Column('int', { name: 'parent_category_id' })
  parentId!: number; // practice_parent_id

  @Column({ type: 'varchar', length: 255 })
  name!: string; // practice_seo_name

  @Column({ type: 'varchar', length: 255 })
  shortName!: string; // practice_name

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
