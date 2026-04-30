import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, logLevel } from 'kafkajs';

export interface AuditLogEntry {
  traceId?:   string;
  userId?:    string;
  username?:  string;
  sessionId?: string;
  level?:       string;
  eventType?:   string;
  action?:      string;
  outcome?:     string;
  message?:     string;
  payload?:     Record<string, any>;
}

@Injectable()
export class KafkaLoggerService implements OnModuleInit, OnModuleDestroy {
  private producer!: Producer;

  constructor(private readonly cfg: ConfigService) {}

  async onModuleInit() {
    const kafka = new Kafka({
      clientId: 'ms-media-media-service-logger',
      brokers: (this.cfg.get<string>('KAFKA_BROKER', 'localhost:9092')).split(','),
      logLevel: logLevel.ERROR,
    });
    this.producer = kafka.producer();
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.producer.send({
        topic: this.cfg.get<string>('KAFKA_TOPIC', 'platform.logs'),
        messages: [{
          value: JSON.stringify({
            source_system: 'ms-media-media-service',
            event_type:    entry.eventType  ?? 'SERVICE_CALL',
            level:         entry.level      ?? 'INFO',
            trace_id:      entry.traceId,
            user_id:       entry.userId,
            username:      entry.username,
            session_id:    entry.sessionId,
            action:        entry.action     ?? entry.message ?? '',
            outcome:       entry.outcome    ?? 'SUCCESS',
            message:       entry.message    ?? '',
            payload:       entry.payload    ?? {},
            timestamp:     new Date().toISOString(),
          }),
        }],
      });
    } catch {
      // Fire and forget — nunca interrumpe el flujo de negocio
    }
  }

  extractAuditContext(headers: Record<string, any>): Pick<AuditLogEntry, 'traceId' | 'userId' | 'username' | 'sessionId'> {
    return {
      traceId:   headers['x-trace-id']   as string | undefined,
      userId:    headers['x-user-id']    as string | undefined,
      username:  headers['x-username']   as string | undefined,
      sessionId: headers['x-session-id'] as string | undefined,
    };
  }
}
