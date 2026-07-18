import { Module } from '@nestjs/common';
import { ReimbursementsService } from './reimbursements.service';
import { ReimbursementsController } from './reimbursements.controller';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [AuditModule, EmailModule, WhatsAppModule],
  controllers: [ReimbursementsController],
  providers: [ReimbursementsService],
  exports: [ReimbursementsService],
})
export class ReimbursementsModule {}
