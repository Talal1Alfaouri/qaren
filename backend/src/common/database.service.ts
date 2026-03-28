import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import postgres from 'postgres';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public sql: postgres.Sql;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const connectionString = this.config.get<string>('DATABASE_URL');
    this.sql = postgres(connectionString, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 10,
      transform: postgres.camel,
    });
    
    // Test connection
    try {
      await this.sql`SELECT 1`;
      this.logger.log('✅ Database connected');
    } catch (err) {
      this.logger.error('❌ Database connection failed', err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.sql.end();
  }
}
