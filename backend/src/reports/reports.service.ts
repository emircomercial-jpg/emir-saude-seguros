import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { generateExcelReport, generatePdfReport, type ReportDefinition } from './report-writer.util';

export type ReportKey =
  | 'insured' | 'companies' | 'policies' | 'claims' | 'reimbursements' | 'premiums';

// Catálogo de relatórios exportáveis (secção 24 do briefing original).
// Cada relatório fica definido apenas pela sua consulta e colunas — a
// geração dos ficheiros (Excel/PDF) é centralizada em report-writer.util.ts.
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async buildReport(key: ReportKey, organizationId: string): Promise<ReportDefinition> {
    const generatedAt = new Date();

    switch (key) {
      case 'insured': {
        const rows = await this.prisma.insuredMember.findMany({
          where: { organizationId, deletedAt: null },
          orderBy: { fullName: 'asc' },
        });
        return {
          title: 'Relatório de Segurados',
          generatedAt,
          columns: [
            { key: 'internalNumber', header: 'Nº Interno' },
            { key: 'fullName', header: 'Nome', width: 30 },
            { key: 'idDocumentNumber', header: 'Bilhete de Identidade' },
            { key: 'phone', header: 'Telefone' },
            { key: 'status', header: 'Estado' },
          ],
          rows: rows.map((r) => ({
            internalNumber: r.internalNumber, fullName: r.fullName,
            idDocumentNumber: r.idDocumentNumber, phone: r.phone || '', status: r.status,
          })),
        };
      }

      case 'companies': {
        const rows = await this.prisma.company.findMany({
          where: { organizationId, deletedAt: null },
          include: { plan: true },
          orderBy: { legalName: 'asc' },
        });
        return {
          title: 'Relatório de Empresas Clientes',
          generatedAt,
          columns: [
            { key: 'legalName', header: 'Razão Social', width: 30 },
            { key: 'nif', header: 'NIF' },
            { key: 'plan', header: 'Plano' },
            { key: 'status', header: 'Estado' },
          ],
          rows: rows.map((r) => ({ legalName: r.legalName, nif: r.nif, plan: r.plan?.name || '—', status: r.status })),
        };
      }

      case 'policies': {
        const rows = await this.prisma.policy.findMany({
          where: { organizationId, deletedAt: null },
          include: { plan: true, company: true },
          orderBy: { issueDate: 'desc' },
        });
        return {
          title: 'Relatório de Apólices',
          generatedAt,
          columns: [
            { key: 'policyNumber', header: 'Nº Apólice' },
            { key: 'plan', header: 'Plano', width: 25 },
            { key: 'company', header: 'Empresa', width: 25 },
            { key: 'value', header: 'Valor (Kz)' },
            { key: 'endDate', header: 'Vencimento' },
            { key: 'status', header: 'Estado' },
          ],
          rows: rows.map((r) => ({
            policyNumber: r.policyNumber, plan: r.plan.name, company: r.company?.legalName || 'Individual',
            value: Number(r.value), endDate: r.endDate.toLocaleDateString('pt-PT'), status: r.status,
          })),
        };
      }

      case 'claims': {
        const rows = await this.prisma.claim.findMany({
          where: { organizationId },
          include: { insuredMember: true },
          orderBy: { createdAt: 'desc' },
        });
        return {
          title: 'Relatório de Sinistros',
          generatedAt,
          columns: [
            { key: 'claimNumber', header: 'Nº Sinistro' },
            { key: 'insured', header: 'Segurado', width: 25 },
            { key: 'requestedValue', header: 'Valor Solicitado (Kz)' },
            { key: 'approvedValue', header: 'Valor Aprovado (Kz)' },
            { key: 'status', header: 'Estado' },
          ],
          rows: rows.map((r) => ({
            claimNumber: r.claimNumber, insured: r.insuredMember.fullName,
            requestedValue: r.requestedValue ? Number(r.requestedValue) : '', 
            approvedValue: r.approvedValue ? Number(r.approvedValue) : '', status: r.status,
          })),
        };
      }

      case 'reimbursements': {
        const rows = await this.prisma.reimbursement.findMany({
          where: { organizationId },
          include: { insuredMember: true },
          orderBy: { createdAt: 'desc' },
        });
        return {
          title: 'Relatório de Reembolsos',
          generatedAt,
          columns: [
            { key: 'reimbursementNumber', header: 'Nº Reembolso' },
            { key: 'insured', header: 'Segurado', width: 25 },
            { key: 'requestedValue', header: 'Valor Solicitado (Kz)' },
            { key: 'eligibleValue', header: 'Valor Elegível (Kz)' },
            { key: 'status', header: 'Estado' },
          ],
          rows: rows.map((r) => ({
            reimbursementNumber: r.reimbursementNumber, insured: r.insuredMember.fullName,
            requestedValue: Number(r.requestedValue), eligibleValue: r.eligibleValue ? Number(r.eligibleValue) : '',
            status: r.status,
          })),
        };
      }

      case 'premiums': {
        const rows = await this.prisma.premium.findMany({
          where: { organizationId },
          include: { insuredMember: true, company: true, payments: true },
          orderBy: { dueDate: 'desc' },
        });
        return {
          title: 'Relatório de Mensalidades',
          generatedAt,
          columns: [
            { key: 'target', header: 'Segurado/Empresa', width: 25 },
            { key: 'dueDate', header: 'Vencimento' },
            { key: 'value', header: 'Valor (Kz)' },
            { key: 'paid', header: 'Pago (Kz)' },
            { key: 'status', header: 'Estado' },
          ],
          rows: rows.map((r) => ({
            target: r.insuredMember?.fullName || r.company?.legalName || '—',
            dueDate: r.dueDate.toLocaleDateString('pt-PT'),
            value: Number(r.value),
            paid: r.payments.reduce((sum, p) => sum + Number(p.amount), 0),
            status: r.status,
          })),
        };
      }

      default:
        throw new BadRequestException('Relatório desconhecido.');
    }
  }

  async export(key: string, format: string, organizationId: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const validKeys: ReportKey[] = ['insured', 'companies', 'policies', 'claims', 'reimbursements', 'premiums'];
    if (!validKeys.includes(key as ReportKey)) throw new BadRequestException('Relatório desconhecido.');
    if (!['xlsx', 'pdf'].includes(format)) throw new BadRequestException('Formato inválido — use "xlsx" ou "pdf".');

    const report = await this.buildReport(key as ReportKey, organizationId);
    const dateSuffix = report.generatedAt.toISOString().slice(0, 10);

    if (format === 'xlsx') {
      const buffer = await generateExcelReport(report);
      return {
        buffer,
        filename: `${key}-${dateSuffix}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const buffer = await generatePdfReport(report);
    return { buffer, filename: `${key}-${dateSuffix}.pdf`, contentType: 'application/pdf' };
  }

  listAvailableReports() {
    return [
      { key: 'insured', label: 'Segurados' },
      { key: 'companies', label: 'Empresas Clientes' },
      { key: 'policies', label: 'Apólices' },
      { key: 'claims', label: 'Sinistros' },
      { key: 'reimbursements', label: 'Reembolsos' },
      { key: 'premiums', label: 'Mensalidades' },
    ];
  }
}
