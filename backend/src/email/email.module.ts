import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_SERVICE } from './email.service.interface';
import { DevEmailService } from './dev-email.service';
import { NodemailerEmailService } from './nodemailer-email.service';

// Selecciona automaticamente a implementação de e-mail: real (SMTP) quando
// SMTP_HOST está configurado, ou de desenvolvimento (apenas terminal) caso
// contrário. Nenhum serviço consumidor precisa de saber qual está activa.
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const smtpHost = config.get<string>('email.host');
        return smtpHost ? new NodemailerEmailService(config) : new DevEmailService();
      },
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
