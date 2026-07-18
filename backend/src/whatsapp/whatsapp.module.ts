import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WHATSAPP_SERVICE } from './whatsapp.service.interface';
import { DevWhatsAppService } from './dev-whatsapp.service';
import { WhatsAppCloudApiService } from './whatsapp-cloud-api.service';

// Selecciona automaticamente a implementação de WhatsApp: real (Meta Cloud
// API) quando WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID estão
// configurados, ou de desenvolvimento (apenas terminal) caso contrário —
// exactamente o mesmo padrão do EmailModule.
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: WHATSAPP_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiToken = config.get<string>('whatsapp.apiToken');
        const phoneNumberId = config.get<string>('whatsapp.phoneNumberId');
        return apiToken && phoneNumberId ? new WhatsAppCloudApiService(config) : new DevWhatsAppService();
      },
    },
  ],
  exports: [WHATSAPP_SERVICE],
})
export class WhatsAppModule {}
