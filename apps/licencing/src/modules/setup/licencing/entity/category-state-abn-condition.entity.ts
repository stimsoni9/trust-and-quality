import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CategoryStateEntity } from './category-state.entity';

export enum AbnConditionKind {
  COMPANY = 'company',
  INDIVIDUAL = 'individual',
  PARTNERSHIP = 'partnership',
  TRUST = 'trust',
  OTHER = 'other'
}

@Entity({ name: 'category_state_abn_conditions' })
export class CategoryStateAbnConditionEntity {
  @PrimaryGeneratedColumn('identity', { name: 'category_state_abn_condition_id' })
  id!: number;

  @Column({ name: 'category_state_id', type: 'integer' })
  categoryStateId!: number;

  @Column({ 
    type: 'enum', 
    enum: AbnConditionKind,
    name: 'kind'
  })
  kind!: AbnConditionKind;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'integer', default: 1 })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => CategoryStateEntity)
  @JoinColumn({ name: 'category_state_id' })
  categoryState!: CategoryStateEntity;
}
