import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service.interface';
import { normalizePhoneForWhatsApp } from './whatsapp-link.util';

// Implementação real de envio de mensagens via Meta WhatsApp Cloud API
// (https://developers.facebook.com/docs/whatsapp/cloud-api), activada
// automaticamente quando WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID
// estão configurados.
//
// Requisitos para usar esta implementação em produção:
// 1. Conta Meta for Developers com um "WhatsApp Business Account" activo.
// 2. Um número de telefone verificado ligado a essa conta (dá o
//    WHATSAPP_PHONE_NUMBER_ID).
// 3. Um token de acesso (temporário para testes, permanente via System
//    User para produção) — dá o WHATSAPP_API_TOKEN.
// 4. Para o primeiro contacto com um novo destinatário, a Meta exige o uso
//    de um "modelo de mensagem" (template) pré-aprovado — mensagens de
//    texto livre só são permitidas dentro de uma janela de 24h depois de o
//    destinatário ter escrito primeiro. Os métodos abaixo assumem que os
//    modelos referidos (`claim_decision`, `reimbursement_decision`,
//    `authorization_decision`, `overdue_premium`) foram criados e
//    aprovados no painel da Meta com esses nomes e variáveis equivalentes
//    — ajustar os nomes/parâmetros conforme os modelos reais aprovados.
//
// Falhas de envio nunca devem interromper o fluxo de negócio que
// despoletou a notificação — por isso todos os métodos capturam e
// registam o erro em vez de o propagar (mesma regra do NodemailerEmailService).
@Injectable()
export class WhatsAppCloudApiService implements WhatsAppService {
  private readonly logger = new Logger('WhatsAppService (Cloud API)');
  private readonly apiToken: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string;

  constructor(private readonly config: ConfigService) {
    this.apiToken = this.config.get<string>('whatsapp.apiToken') || '';
    this.phoneNumberId = this.config.get<string>('whatsapp.phoneNumberId') || '';
    this.apiVersion = this.config.get<string>('whatsapp.apiVersion') || 'v20.0';
  }

  private async sendTemplate(phone: string, templateName: string, params: string[]) {
    const to = normalizePhoneForWhatsApp(phone);
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'pt_PT' },
            components: [
              {
                type: 'body',
                parameters: params.map((text) => ({ type: 'text', text })),
              },
            ],
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`WhatsApp Cloud API respondeu ${response.status}: ${body}`);
      }
    } catch (error) {
      // Nunca deixar uma falha de envio de WhatsApp interromper o fluxo
      // principal (ex: uma decisão de sinistro deve ficar registada mesmo
      // que a notificação por WhatsApp falhe).
      this.logger.error(`Falha ao enviar WhatsApp para ${phone}: ${(error as Error).message}`);
    }
  }

  async sendClaimDecisionNotification(phone: string, fullName: string, claimNumber: string, status: string): Promise<void> {
    await this.sendTemplate(phone, 'claim_decision', [fullName, claimNumber, status]);
  }

  async sendReimbursementDecisionNotification(phone: string, fullName: string, reimbursementNumber: string, status: string): Promise<void> {
    await this.sendTemplate(phone, 'reimbursement_decision', [fullName, reimbursementNumber, status]);
  }

  async sendAuthorizationDecisionNotification(phone: string, fullName: string, requestNumber: string, status: string): Promise<void> {
    await this.sendTemplate(phone, 'authorization_decision', [fullName, requestNumber, status]);
  }

  async sendOverduePremiumNotification(phone: string, fullName: string, dueDate: Date, value: number): Promise<void> {
    await this.sendTemplate(phone, 'overdue_premium', [
      fullName,
      value.toLocaleString(),
      dueDate.toLocaleDateString('pt-PT'),
    ]);
  }
}
