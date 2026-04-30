import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function dbConfig(cfg: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'mssql',
    host:     cfg.get<string>('DB_HOST', 'localhost'),
    port:     cfg.get<number>('DB_PORT', 1433),
    username: cfg.get<string>('DB_USER'),
    password: cfg.get<string>('DB_PASS'),
    database: cfg.get<string>('DB_NAME'),
    options: {
      encrypt:                false,
      trustServerCertificate: true,
      connectTimeout:         30000,
      instanceName: cfg.get<string>('DB_INSTANCE', 'INST01'),
    },
    pool: { max: 10, min: 0 },
    autoLoadEntities: true,
    synchronize: false,
    logging: cfg.get('NODE_ENV') === 'development',
  };
}
