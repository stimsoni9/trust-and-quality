import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { LicenceTypeEntity } from './licence-type.entity';
import { LicenceRequirementGroupEntity } from './licence-requirement-group.entity';

@Entity({ name: 'licence_requirement_group_licence' })
export class LicenceRequirementGroupLicenceEntity {
  @PrimaryColumn({ name: 'licence_requirement_group_id', type: 'integer' })
  licenceRequirementGroupId!: number;

  @PrimaryColumn({ name: 'licence_type_id', type: 'integer' })
  licenceTypeId!: number;

  @CreateDateColumn({ name: 'added_at', type: 'timestamp with time zone' })
  addedAt!: Date;

  @ManyToOne(() => LicenceRequirementGroupEntity)
  @JoinColumn({ name: 'licence_requirement_group_id' })
  licenceRequirementGroup!: LicenceRequirementGroupEntity;

  @ManyToOne(() => LicenceTypeEntity)
  @JoinColumn({ name: 'licence_type_id' })
  licenceType!: LicenceTypeEntity;
}
