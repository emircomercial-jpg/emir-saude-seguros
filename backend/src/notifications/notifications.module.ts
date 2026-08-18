import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsCronGuard } from './notifications-cron.guard';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [WhatsAppModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsCronGuard],
})
export class NotificationsModule {}
