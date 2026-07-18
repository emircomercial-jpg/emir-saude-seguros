import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Módulo global: qualquer módulo da aplicação pode injectar o PrismaService
// sem precisar de importar explicitamente o DatabaseModule.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
