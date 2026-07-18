import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Serviço central de acesso à base de dados via Prisma. Injectado em todos
// os módulos que precisem de persistência (secção 4: backend/src/database).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Ligação à base de dados PostgreSQL estabelecida.');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
