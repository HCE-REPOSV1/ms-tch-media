import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'practitioner', name: 'practitioner_media' })
export class PractitionerMedia {
  @PrimaryGeneratedColumn({ name: 'media_id' })
  media_id!: number;

  @Column()
  practitioner_id!: number;

  @Column({ type: 'smallint' })
  file_server_config_id!: number;

  @Column({ length: 30, default: 'completed' })
  fhir_status!: string;

  @Column({ length: 10, default: 'image' })
  fhir_media_type!: string;

  @Column({ length: 30, default: 'profile_photo' })
  media_category!: string;

  @Column({ length: 100, default: 'image/jpeg' })
  content_type!: string;

  @Column({ type: 'nvarchar', length: 255 })
  media_file_name!: string;

  @Column({ type: 'nvarchar', length: 1000 })
  relative_path!: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  media_title?: string;

  @Column({ type: 'bigint', nullable: true })
  file_size_bytes?: string;

  @Column({ length: 128, nullable: true })
  file_hash?: string;

  @Column({ length: 20, nullable: true, default: 'SHA-256' })
  hash_algorithm?: string;

  @Column({ type: 'smallint', nullable: true })
  width_pixels?: number;

  @Column({ type: 'smallint', nullable: true })
  height_pixels?: number;

  @Column({ type: 'bit', default: false })
  is_primary!: boolean;

  @Column({ type: 'datetime2', nullable: true })
  attachment_date?: Date;

  @Column({ type: 'nvarchar', length: 100 })
  user_create!: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  user_modify?: string;

  @Column({ type: 'datetime2' })
  date_create!: Date;

  @Column({ type: 'datetime2', nullable: true })
  date_modify?: Date;

  @Column({ type: 'bit', default: true })
  is_active!: boolean;
}
