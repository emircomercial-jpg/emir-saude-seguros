import { Controller, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { NotificationsCronGuard } from './notifications-cron.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Verificação manual, disparada por um administrador na própria
  // aplicação — sempre limitada à SUA organização.
  @Post('run-checks')
  @RequirePermissions('settings.update')
  async runChecks(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.notificationsService.runChecks(user.organizationId);
    return {
      data,
      message: `Verificação concluída — ${data.renewalRemindersSent} lembrete(s) de renovação e ${data.overduePremiumRemindersSent} aviso(s) de atraso enviados.`,
    };
  }

  // Gatilho externo, para ser chamado uma vez por dia por um serviço de
  // cron gratuito (ex: cron-job.org) — corre para TODAS as organizações
  // activas. Protegido por uma chave secreta própria (NOTIFICATIONS_CRON_SECRET),
  // nunca pela sessão de um utilizador, já que quem chama é um serviço
  // externo, não uma pessoa autenticada.
  @Post('run-scheduled-checks')
  @UseGuards(NotificationsCronGuard)
  async runScheduledChecks() {
    const data = await this.notificationsService.runChecksForAllOrganizations();
    return { data, message: 'Verificação agendada concluída para todas as empresas.' };
  }
}
