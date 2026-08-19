import { Module } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { PublicSignupController } from './public-signup.controller';
import { PlatformAdminGuard } from './platform-admin.guard';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AuditModule, EmailModule],
  controllers: [PlatformController, PublicSignupController],
  providers: [PlatformService, PlatformAdminGuard],
})
export class PlatformModule {}
