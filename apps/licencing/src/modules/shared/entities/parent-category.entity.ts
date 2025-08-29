import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'parent_categories' })
export class ParentCategoryEntity {
  @PrimaryColumn('int', { name: 'parent_category_id' })
  id!: number; // practice_id

  @Column({ type: 'varchar', length: 255 })
  name!: string; // practice_seo_name

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
