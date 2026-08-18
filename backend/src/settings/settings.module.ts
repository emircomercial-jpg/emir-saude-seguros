import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { BackupService } from './backup.service';
import { SettingsController } from './settings.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService, BackupService],
})
export class SettingsModule {}
