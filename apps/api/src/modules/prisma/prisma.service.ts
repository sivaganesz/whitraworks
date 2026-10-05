import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, createTenantPrismaClient, ExtendedPrismaClient } from '@whitraworks/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public readonly base: PrismaClient;
  public readonly client: ExtendedPrismaClient;

  constructor() {
    this.base = new PrismaClient({
      log: process.env['NODE_ENV'] === 'development' ? ['warn', 'error'] : ['error'],
    });
    this.client = createTenantPrismaClient(this.base);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.base.$connect();
      this.logger.log('Connected to PostgreSQL database');
    } catch (err) {
      this.logger.error('Failed to connect to database', err);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.base.$disconnect();
    this.logger.log('Disconnected from database');
  }
}
