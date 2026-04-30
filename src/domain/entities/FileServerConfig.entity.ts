import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'cfg', name: 'file_server_config' })
export class FileServerConfig {
  @PrimaryGeneratedColumn({ name: 'config_id' })
  config_id!: number;

  @Column({ type: 'nvarchar', length: 500 })
  base_url!: string;

  @Column({ type: 'bit', default: true })
  is_active!: boolean;
}
