import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AuthorityEntity } from './authority.entity';

@Entity({ name: 'licence_type' })
export class LicenceTypeEntity {
  @PrimaryGeneratedColumn('identity', { name: 'licence_type_id' })
  id!: number;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text' })
  state!: string;

  @Column({ name: 'licence_type', type: 'text' })
  licenceType!: string;
  
  @Column({ name: 'authority_id', type: 'integer', nullable: true })
  authorityId!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => AuthorityEntity, { nullable: true })
  @JoinColumn({ name: 'authority_id' })
  authority!: AuthorityEntity | null;
}
