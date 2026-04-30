import { Module } from '@nestjs/common';
import { KafkaLoggerService } from './kafka-logger.service';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  providers: [KafkaLoggerService, AuditInterceptor],
  exports:   [KafkaLoggerService, AuditInterceptor],
})
export class KafkaLoggerModule {}
