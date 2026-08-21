import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ApplyDeductionsDto } from './dto/apply-deductions.dto';

// Ciclo completo de facturação dos prestadores (secção 17 do briefing
// original): submissão, detecção de duplicações, aprovação/glosa e cálculo
// do valor a pagar.
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(organizationId: string, dto: CreateInvoiceDto, createdBy: string) {
    // Detecção de facturas duplicadas: mesmo prestador + mesmo número de factura.
    const duplicate = await this.prisma.invoice.findUnique({
      where: { providerId_invoiceNumber: { providerId: dto.providerId, invoiceNumber: dto.invoiceNumber } },
    });
    if (duplicate) throw new ConflictException('Factura duplicada para este prestador (mesmo número).');

    const grossValue = dto.items.reduce((sum, item) => sum + item.value, 0);

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        providerId: dto.providerId,
        invoiceNumber: dto.invoiceNumber,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        grossValue,
        createdBy,
        items: { create: dto.items },
      },
      include: { items: true, provider: true },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'billing.invoice_created',
      module: 'billing',
      entity: 'Invoice',
      entityId: invoice.id,
      description: `Factura "${invoice.invoiceNumber}" submetida por "${invoice.provider.name}".`,
    });

    return invoice;
  }

  async findAll(organizationId: string, status?: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId, status: status || undefined },
      include: { provider: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 1000, // limite de seguranca (auditoria) - evita devolver toda a tabela de uma vez
    });
  }

  async findOne(id: string, organizationId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: { provider: true, items: { include: { insuredMember: true } } },
    });
    if (!invoice) throw new NotFoundException('Factura não encontrada.');
    return invoice;
  }

  // Auditor aplica glosas item a item; o valor aprovado é recalculado automaticamente.
  async applyDeductions(id: string, organizationId: string, dto: ApplyDeductionsDto, updatedBy: string) {
    const invoice = await this.findOne(id, organizationId);

    for (const d of dto.deductions) {
      const item = invoice.items.find((i) => i.id === d.itemId);
      if (!item) throw new BadRequestException(`Item ${d.itemId} não pertence a esta factura.`);
      await this.prisma.invoiceItem.update({
        where: { id: d.itemId },
        data: {
          deduction: d.deduction,
          deductionReason: d.reason,
          approvedValue: Number(item.value) - d.deduction,
        },
      });
    }

    const updatedItems = await this.prisma.invoiceItem.findMany({ where: { invoiceId: id } });
    const totalDeductions = updatedItems.reduce((sum, i) => sum + Number(i.deduction || 0), 0);
    const approvedValue = updatedItems.reduce((sum, i) => sum + Number(i.approvedValue ?? i.value), 0);
    const status = totalDeductions > 0 ? 'partially_approved' : 'approved';

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { deductions: totalDeductions, approvedValue, netValue: approvedValue, status, updatedBy },
      include: { items: true, provider: true },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'billing.deductions_applied',
      module: 'billing',
      entity: 'Invoice',
      entityId: id,
      description: `Glosas aplicadas à factura "${invoice.invoiceNumber}" (total: ${totalDeductions}).`,
    });

    return updated;
  }

  async setStatus(id: string, organizationId: string, status: string, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);
    const data: any = { status, updatedBy };
    if (status === 'paid') data.paidAt = new Date();

    const invoice = await this.prisma.invoice.update({ where: { id }, data });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'billing.status_update',
      module: 'billing',
      entity: 'Invoice',
      entityId: id,
      description: `Estado da factura "${existing.invoiceNumber}" alterado para "${status}".`,
    });

    return invoice;
  }
}
