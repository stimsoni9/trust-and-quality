import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'authorities' })
export class AuthorityEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  authority!: string;

  @Column({ name: 'authority_name', type: 'varchar', length: 255 })
  authorityName!: string;

  @Column({ type: 'varchar', length: 255 })
  state!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  link!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}



