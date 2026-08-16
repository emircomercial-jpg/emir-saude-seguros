import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { ApiKeyGuard } from './api-key.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, ApiKeyGuard],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
