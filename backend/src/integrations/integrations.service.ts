import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReceiveInvoiceDto } from './dto/receive-invoice.dto';

const SOURCE_DEFAULT = 'sistema-facturacao';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------- Chaves de API (geridas por um administrador autenticado) ----------

  async createApiKey(organizationId: string, name: string, createdBy: string) {
    // A chave real só existe uma vez, aqui — nunca é guardada nem pode
    // ser recuperada de novo depois deste momento (só o hash fica na
    // base de dados). É responsabilidade de quem a cria copiá-la agora.
    const rawKey = `emirsg_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.integrationApiKey.create({
      data: { organizationId, name, keyHash, createdBy },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'integration.api_key_created',
      module: 'integrations',
      entity: 'IntegrationApiKey',
      entityId: apiKey.id,
      description: `Chave de integração "${name}" criada.`,
    });

    return { id: apiKey.id, name: apiKey.name, key: rawKey, createdAt: apiKey.createdAt };
  }

  async listApiKeys(organizationId: string) {
    const keys = await this.prisma.integrationApiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    // A chave em si nunca é devolvida depois de criada — só metadados.
    return keys.map(({ keyHash, ...rest }) => rest);
  }

  async revokeApiKey(organizationId: string, id: string, revokedBy: string) {
    const key = await this.prisma.integrationApiKey.findFirst({ where: { id, organizationId } });
    if (!key) throw new NotFoundException('Chave de integração não encontrada.');

    const updated = await this.prisma.integrationApiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    await this.auditService.log({
      organizationId,
      userId: revokedBy,
      action: 'integration.api_key_revoked',
      module: 'integrations',
      entity: 'IntegrationApiKey',
      entityId: id,
      description: `Chave de integração "${key.name}" revogada.`,
    });

    const { keyHash, ...rest } = updated;
    return rest;
  }

  // ---------- Facturas externas ----------

  // Recebida via webhook, autenticado por ApiKeyGuard (nunca por um
  // utilizador humano). Idempotente: reenviar o mesmo externalId
  // actualiza o registo existente, nunca duplica (upsert pela chave
  // composta organizationId+source+externalId).
  async receiveInvoice(organizationId: string, dto: ReceiveInvoiceDto, source = SOURCE_DEFAULT) {
    // Cruzamento automático pelo NIF do cliente: se corresponder a um
    // Segurado ou a uma Empresa Cliente já existente, a factura fica
    // ligada a esse registo — sem o sistema externo precisar de saber
    // nada sobre os IDs internos do EMIR SAÚDE SEGUROS.
    let insuredMemberId: string | null = null;
    let companyId: string | null = null;
    if (dto.customerTaxId) {
      const [insured, company] = await Promise.all([
        this.prisma.insuredMember.findFirst({ where: { organizationId, nif: dto.customerTaxId, deletedAt: null } }),
        this.prisma.company.findFirst({ where: { organizationId, nif: dto.customerTaxId, deletedAt: null } }),
      ]);
      insuredMemberId = insured?.id ?? null;
      companyId = company?.id ?? null;
    }

    const invoice = await this.prisma.externalInvoice.upsert({
      where: {
        organizationId_source_externalId: { organizationId, source, externalId: dto.externalId },
      },
      update: {
        invoiceNumber: dto.invoiceNumber,
        customerName: dto.customerName,
        customerTaxId: dto.customerTaxId,
        issueDate: new Date(dto.issueDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        totalValue: dto.totalValue,
        status: dto.status,
        items: (dto.items as any) ?? undefined,
        receivedAt: new Date(),
        insuredMemberId,
        companyId,
      },
      create: {
        organizationId,
        source,
        externalId: dto.externalId,
        invoiceNumber: dto.invoiceNumber,
        customerName: dto.customerName,
        customerTaxId: dto.customerTaxId,
        issueDate: new Date(dto.issueDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        totalValue: dto.totalValue,
        status: dto.status,
        items: (dto.items as any) ?? undefined,
        insuredMemberId,
        companyId,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: undefined,
      action: 'integration.invoice_received',
      module: 'integrations',
      entity: 'ExternalInvoice',
      entityId: invoice.id,
      description: `Factura externa "${dto.invoiceNumber}" recebida de "${source}" (estado: ${dto.status}).`,
    });

    return invoice;
  }

  async listExternalInvoices(organizationId: string, params: { status?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where = { organizationId, ...(params.status ? { status: params.status } : {}) };

    const [items, total] = await Promise.all([
      this.prisma.externalInvoice.findMany({
        where,
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.externalInvoice.count({ where }),
    ]);

    return { items, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getExternalInvoice(organizationId: string, externalId: string) {
    const invoice = await this.prisma.externalInvoice.findFirst({ where: { organizationId, externalId } });
    if (!invoice) throw new NotFoundException('Factura externa não encontrada.');
    return invoice;
  }
}
