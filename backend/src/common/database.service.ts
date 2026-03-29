import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public pool: Pool;
  public sql: any;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const connectionString = this.config.get<string>('DATABASE_URL');
    this.pool = new Pool({ connectionString, max: 20 });
    this.sql = async (strings: TemplateStringsArray, ...values: any[]) => {
      let query = '';
      strings.forEach((str, i) => { query += str + (values[i] !== undefined ? '$' + (i + 1) : ''); });
      const result = await this.pool.query(query, values);
      return result.rows;
    };
    this.sql.unsafe = (str: string) => ({ __unsafe: str });
    try {
      await this.pool.query('SELECT 1');
      this.logger.log('✅ Database connected');
    } catch (err) {
      this.logger.error('❌ Database connection failed', err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
