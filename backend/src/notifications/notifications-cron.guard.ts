import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Protege o gatilho externo de verificação agendada — só aceita pedidos
// que incluam a chave secreta correcta no cabeçalho, definida em
// NOTIFICATIONS_CRON_SECRET. É deliberadamente diferente de um login de
// utilizador, porque quem chama este endpoint é um serviço de cron
// externo (ex: cron-job.org), não uma pessoa.
@Injectable()
export class NotificationsCronGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedSecret = request.headers['x-cron-secret'];
    const expectedSecret = this.config.get<string>('notifications.cronSecret');

    if (!expectedSecret) {
      throw new UnauthorizedException('NOTIFICATIONS_CRON_SECRET não está configurado no servidor.');
    }
    if (providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Chave de verificação agendada inválida.');
    }
    return true;
  }
}
