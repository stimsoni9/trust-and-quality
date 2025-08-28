import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { CategoryStateEntity } from './category-state.entity';
import { LicenceRequirementGroupEntity } from './licence-requirement-group.entity';

@Entity({ name: 'category_state_licence_groups' })
export class CategoryStateLicenceGroupEntity {
  @PrimaryColumn({ name: 'category_state_id', type: 'integer' })
  categoryStateId!: number;

  @PrimaryColumn({ name: 'licence_requirement_group_id', type: 'integer' })
  licenceRequirementGroupId!: number;

  @CreateDateColumn({ name: 'added_at', type: 'timestamp with time zone' })
  addedAt!: Date;

  @ManyToOne(() => CategoryStateEntity)
  @JoinColumn({ name: 'category_state_id' })
  categoryState!: CategoryStateEntity;

  @ManyToOne(() => LicenceRequirementGroupEntity)
  @JoinColumn({ name: 'licence_requirement_group_id' })
  licenceRequirementGroup!: LicenceRequirementGroupEntity;
}
