import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'fhir', name: 'practitioner_media' })
export class PractitionerMedia {
  @PrimaryGeneratedColumn({ name: 'media_id' })
  media_id!: number;

  @Column()
  practitioner_id!: number;

  @Column({ type: 'smallint' })
  file_server_config_id!: number;

  @Column({ length: 30 })
  fhir_status!: string;

  @Column({ length: 10 })
  fhir_media_type!: string;

  @Column({ length: 30 })
  media_category!: string;

  @Column({ length: 100 })
  content_type!: string;

  @Column({ type: 'nvarchar', length: 255 })
  media_file_name!: string;

  @Column({ type: 'nvarchar', length: 1000 })
  relative_path!: string;

  @Column({ type: 'bit', default: false })
  is_primary!: boolean;

  @Column({ type: 'bit', default: true })
  is_active!: boolean;
}
