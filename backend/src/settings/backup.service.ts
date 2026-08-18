import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

// Cópia de segurança manual, exportável a pedido — uma rede de protecção
// adicional para além da recuperação automática da base de dados (que, no
// plano gratuito do Neon, só cobre as últimas 6 horas). Não substitui uma
// cópia de segurança automática a sério, mas garante que os dados
// principais do negócio ficam sempre disponíveis para restaurar
// manualmente, mesmo que algo corra mal fora dessa janela de 6 horas.
//
// Inclui apenas dados de NEGÓCIO (segurados, apólices, sinistros, etc.) —
// nunca senhas, tokens de sessão, ou chaves de integração, que nunca
// deveriam sair do sistema num ficheiro descarregável.
@Injectable()
export class BackupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async generateBackup(organizationId: string, requestedBy: string) {
    const where = { organizationId };
    const whereActive = { organizationId, deletedAt: null };

    const [
      insuredMembers,
      dependents,
      companies,
      healthPlans,
      policies,
      providers,
      authorizations,
      consultations,
      claims,
      reimbursements,
      premiums,
      invoices,
      agreements,
      externalInvoices,
    ] = await Promise.all([
      this.prisma.insuredMember.findMany({ where: whereActive }),
      this.prisma.dependent.findMany({ where: { insuredMember: { organizationId } } }),
      this.prisma.company.findMany({ where: whereActive }),
      this.prisma.healthPlan.findMany({ where }),
      this.prisma.policy.findMany({ where }),
      this.prisma.provider.findMany({ where }),
      this.prisma.authorization.findMany({ where }),
      this.prisma.consultation.findMany({ where }),
      this.prisma.claim.findMany({ where }),
      this.prisma.reimbursement.findMany({ where }),
      this.prisma.premium.findMany({ where }),
      this.prisma.invoice.findMany({ where }),
      this.prisma.insuranceAgreement.findMany({ where: whereActive }),
      this.prisma.externalInvoice.findMany({ where }),
    ]);

    const backup = {
      generatedAt: new Date().toISOString(),
      organizationId,
      counts: {
        insuredMembers: insuredMembers.length,
        dependents: dependents.length,
        companies: companies.length,
        healthPlans: healthPlans.length,
        policies: policies.length,
        providers: providers.length,
        authorizations: authorizations.length,
        consultations: consultations.length,
        claims: claims.length,
        reimbursements: reimbursements.length,
        premiums: premiums.length,
        invoices: invoices.length,
        agreements: agreements.length,
        externalInvoices: externalInvoices.length,
      },
      data: {
        insuredMembers,
        dependents,
        companies,
        healthPlans,
        policies,
        providers,
        authorizations,
        consultations,
        claims,
        reimbursements,
        premiums,
        invoices,
        agreements,
        externalInvoices,
      },
    };

    await this.auditService.log({
      organizationId,
      userId: requestedBy,
      action: 'backup.export',
      module: 'settings',
      entity: 'Backup',
      description: `Cópia de segurança manual gerada e descarregada (${Object.values(backup.counts).reduce((a, b) => a + b, 0)} registos no total).`,
    });

    return backup;
  }
}
