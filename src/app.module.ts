import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { multerConfig } from './config/multer.config';
import { dbConfig } from './config/db.config';
import { PractitionerMedia } from './domain/entities/PractitionerMedia.entity';
import { FileServerConfig } from './domain/entities/FileServerConfig.entity';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { KafkaLoggerModule } from './logger/kafka-logger.module';
import { AuditInterceptor } from './logger/audit.interceptor';
import { KafkaLoggerService } from './logger/kafka-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => dbConfig(cfg),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([PractitionerMedia, FileServerConfig]),
    MulterModule.register(multerConfig),
    KafkaLoggerModule,
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    KafkaLoggerService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
