import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service.interface';
import { buildWhatsAppDeepLink } from './whatsapp-link.util';

// Implementação de desenvolvimento: em vez de enviar mensagens reais,
// mostra o conteúdo no terminal do backend, incluindo o link `wa.me`
// equivalente (útil para testar manualmente, abrindo o link no telemóvel).
// Usada sempre que WHATSAPP_API_TOKEN não está configurado — nunca falha,
// nunca bloqueia o fluxo principal.
@Injectable()
export class DevWhatsAppService implements WhatsAppService {
  private readonly logger = new Logger('WhatsAppService (dev)');

  private print(phone: string, message: string) {
    this.logger.log('===================================================');
    this.logger.log(`Para (WhatsApp): ${phone}`);
    this.logger.log(message);
    this.logger.log(`Link equivalente: ${buildWhatsAppDeepLink(phone, message)}`);
    this.logger.log('(WHATSAPP_API_TOKEN não configurado — mensagem não enviada realmente.)');
    this.logger.log('===================================================');
  }

  async sendClaimDecisionNotification(phone: string, fullName: string, claimNumber: string, status: string): Promise<void> {
    this.print(phone, `Olá ${fullName}, o seu sinistro ${claimNumber} foi actualizado para o estado: ${status}.`);
  }

  async sendReimbursementDecisionNotification(phone: string, fullName: string, reimbursementNumber: string, status: string): Promise<void> {
    this.print(phone, `Olá ${fullName}, o seu pedido de reembolso ${reimbursementNumber} foi actualizado para o estado: ${status}.`);
  }

  async sendAuthorizationDecisionNotification(phone: string, fullName: string, requestNumber: string, status: string): Promise<void> {
    this.print(phone, `Olá ${fullName}, a sua autorização ${requestNumber} foi actualizada para o estado: ${status}.`);
  }

  async sendOverduePremiumNotification(phone: string, fullName: string, dueDate: Date, value: number): Promise<void> {
    this.print(
      phone,
      `Olá ${fullName}, a sua mensalidade de ${value.toLocaleString()} Kz, com vencimento em ${dueDate.toLocaleDateString('pt-PT')}, está em atraso. Regularize para evitar a suspensão da sua cobertura.`,
    );
  }
}
