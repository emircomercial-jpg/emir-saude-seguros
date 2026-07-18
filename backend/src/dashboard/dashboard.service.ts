import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Dashboard inicial (secções 17 e 18 do briefing). Todos os indicadores
// já reflectem dados reais dos módulos implementados — não restam
// indicadores de demonstração.
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(organizationId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, activeUsers, totalRoles, activeInsuredMembers, activeDependents,
      clientCompanies, activePolicies, pendingAuthorizations, overduePremiums,
      collectedThisMonth, paidInvoicesThisMonth,
    ] = await Promise.all([
      this.prisma.user.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.user.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      this.prisma.role.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.insuredMember.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      this.prisma.dependent.count({ where: { deletedAt: null, status: 'active', insuredMember: { organizationId } } }),
      this.prisma.company.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      this.prisma.policy.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      this.prisma.authorization.count({ where: { organizationId, status: { in: ['submitted', 'in_review', 'awaiting_documents'] } } }),
      this.prisma.premium.count({
        where: { organizationId, OR: [{ status: 'overdue' }, { status: 'pending', dueDate: { lt: now } }] },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { paidAt: { gte: startOfMonth }, premium: { organizationId } },
      }),
      this.prisma.invoice.aggregate({
        _sum: { netValue: true },
        where: { organizationId, status: 'paid', paidAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalRoles,
      activeInsuredMembers,
      activeDependents,
      clientCompanies,
      activePolicies,
      pendingAuthorizations,
      overduePremiums,
      collectedValueAOA: Number(collectedThisMonth._sum.amount || 0),
      usedValueAOA: Number(paidInvoicesThisMonth._sum.netValue || 0),
      isDemoData: false,
    };
  }

  // Evolução mensal de receitas (mensalidades cobradas) e despesas (facturas
  // pagas a prestadores) — dados REAIS, últimos 6 meses.
  async revenueExpenses(organizationId: string) {
    const months: { month: string; start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({ month: start.toLocaleDateString('pt-PT', { month: 'short' }), start, end });
    }

    const series = await Promise.all(
      months.map(async ({ month, start, end }) => {
        const [revenue, expenses] = await Promise.all([
          this.prisma.payment.aggregate({
            _sum: { amount: true },
            where: { paidAt: { gte: start, lt: end }, premium: { organizationId } },
          }),
          this.prisma.invoice.aggregate({
            _sum: { netValue: true },
            where: { organizationId, status: 'paid', paidAt: { gte: start, lt: end } },
          }),
        ]);
        return {
          month,
          revenue: Number(revenue._sum.amount || 0),
          expenses: Number(expenses._sum.netValue || 0),
        };
      }),
    );

    return { isDemoData: false, series };
  }

  // Evolução mensal do número de segurados — dados REAIS (últimos 6 meses).
  async memberGrowth(organizationId: string) {
    const months: { month: string; start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({ month: start.toLocaleDateString('pt-PT', { month: 'short' }), start, end });
    }

    const counts = await Promise.all(
      months.map(({ start, end }) =>
        this.prisma.insuredMember.count({
          where: { organizationId, deletedAt: null, createdAt: { lt: end } },
        }),
      ),
    );

    return {
      isDemoData: false,
      series: months.map((m, i) => ({ month: m.month, count: counts[i] })),
    };
  }

  // Utilização por plano — dados REAIS, com base no nº de empresas clientes associadas a cada plano.
  async planUsage(organizationId: string) {
    const plans = await this.prisma.healthPlan.findMany({
      where: { organizationId, deletedAt: null },
      select: { name: true, _count: { select: { companies: true } } },
    });

    const total = plans.reduce((sum, p) => sum + p._count.companies, 0) || 1;

    return {
      isDemoData: false,
      series: plans.map((p) => ({
        plan: p.name,
        percentage: Math.round((p._count.companies / total) * 100),
      })),
    };
  }

  // Autorizações por estado — dados REAIS.
  async authorizationStatus(organizationId: string) {
    const grouped = await this.prisma.authorization.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true },
    });

    const STATUS_LABELS: Record<string, string> = {
      draft: 'Rascunho', submitted: 'Submetida', in_review: 'Em análise',
      awaiting_documents: 'Aguardando documentos', approved: 'Aprovada',
      partially_approved: 'Aprovada parcialmente', rejected: 'Rejeitada',
      cancelled: 'Cancelada', expired: 'Expirada', used: 'Utilizada',
    };

    return {
      isDemoData: false,
      series: grouped.map((g) => ({ status: STATUS_LABELS[g.status] || g.status, count: g._count._all })),
    };
  }

  // Actividades recentes — dados REAIS, a partir do registo de auditoria.
  async recentActivities(organizationId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { organizationId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      module: log.module,
      description: log.description,
      userName: log.user?.fullName || 'Sistema',
      createdAt: log.createdAt,
    }));
  }

  // Alertas operacionais — dados REAIS (apólices a vencer, mensalidades em
  // atraso, autorizações pendentes).
  async alerts(organizationId: string) {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const [expiringPolicies, overduePremiums, pendingAuthorizations] = await Promise.all([
      this.prisma.policy.count({
        where: { organizationId, deletedAt: null, status: 'active', endDate: { lte: in30Days, gte: now } },
      }),
      this.prisma.premium.count({
        where: { organizationId, OR: [{ status: 'overdue' }, { status: 'pending', dueDate: { lt: now } }] },
      }),
      this.prisma.authorization.count({
        where: { organizationId, status: { in: ['submitted', 'in_review', 'awaiting_documents'] } },
      }),
    ]);

    const items: { level: 'warning' | 'error' | 'info'; message: string }[] = [];
    if (expiringPolicies > 0) {
      items.push({ level: 'warning', message: `${expiringPolicies} apólice(s) vence(m) nos próximos 30 dias.` });
    }
    if (overduePremiums > 0) {
      items.push({ level: 'error', message: `${overduePremiums} mensalidade(s) encontram-se em atraso.` });
    }
    if (pendingAuthorizations > 0) {
      items.push({ level: 'info', message: `${pendingAuthorizations} autorização(ões) aguardam decisão.` });
    }
    if (items.length === 0) {
      items.push({ level: 'info', message: 'Sem alertas de momento.' });
    }

    return { isDemoData: false, items };
  }

  // Estado do servidor — dados REAIS.
  async systemStatus() {
    let databaseStatus = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'down';
    }

    return {
      database: databaseStatus,
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }
}
