import { DashboardService } from './dashboard.service';

// Rotas do dashboard (secção 29 do briefing): confirma que todos os
// indicadores são calculados a partir de dados reais dos módulos
// implementados — não restam indicadores de demonstração.
describe('DashboardService', () => {
  let service: DashboardService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: { count: jest.fn() },
      role: { count: jest.fn() },
      insuredMember: { count: jest.fn().mockResolvedValue(0) },
      dependent: { count: jest.fn().mockResolvedValue(0) },
      company: { count: jest.fn().mockResolvedValue(0) },
      policy: { count: jest.fn().mockResolvedValue(0) },
      authorization: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
      premium: { count: jest.fn().mockResolvedValue(0) },
      payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }) },
      invoice: { aggregate: jest.fn().mockResolvedValue({ _sum: { netValue: null } }) },
      healthPlan: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn() },
      $queryRaw: jest.fn(),
    };
    service = new DashboardService(prismaMock);
  });

  it('combines real counts from every implemented module into the summary', async () => {
    prismaMock.user.count.mockResolvedValueOnce(42).mockResolvedValueOnce(38);
    prismaMock.role.count.mockResolvedValue(16);
    prismaMock.insuredMember.count.mockResolvedValue(120);
    prismaMock.company.count.mockResolvedValue(6);
    prismaMock.policy.count.mockResolvedValue(41);
    prismaMock.premium.count.mockResolvedValue(3);
    prismaMock.payment.aggregate.mockResolvedValue({ _sum: { amount: 2_450_000 } });
    prismaMock.invoice.aggregate.mockResolvedValue({ _sum: { netValue: 1_120_000 } });

    const summary = await service.summary('org-1');

    expect(summary.totalUsers).toBe(42);
    expect(summary.activeUsers).toBe(38);
    expect(summary.totalRoles).toBe(16);
    expect(summary.activeInsuredMembers).toBe(120);
    expect(summary.clientCompanies).toBe(6);
    expect(summary.activePolicies).toBe(41);
    expect(summary.overduePremiums).toBe(3);
    expect(summary.collectedValueAOA).toBe(2_450_000);
    expect(summary.usedValueAOA).toBe(1_120_000);
    expect(summary.isDemoData).toBe(false);
  });

  it('defaults financial sums to zero when there is no data yet', async () => {
    const summary = await service.summary('org-1');
    expect(summary.collectedValueAOA).toBe(0);
    expect(summary.usedValueAOA).toBe(0);
  });

  it('returns real recent activities from the audit log', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([
      { id: 'log-1', action: 'login', module: 'auth', description: 'Login', user: { fullName: 'Ana' }, createdAt: new Date() },
    ]);

    const activities = await service.recentActivities('org-1');

    expect(activities).toHaveLength(1);
    expect(activities[0].userName).toBe('Ana');
  });

  it('generates real alerts when there are overdue premiums', async () => {
    prismaMock.premium.count.mockResolvedValue(2);

    const result = await service.alerts('org-1');

    expect(result.isDemoData).toBe(false);
    expect(result.items.some((i: any) => i.message.includes('mensalidade'))).toBe(true);
  });

  it('returns a neutral alert when there is nothing pending', async () => {
    const result = await service.alerts('org-1');
    expect(result.items).toEqual([{ level: 'info', message: 'Sem alertas de momento.' }]);
  });

  it('reports database status as up when the connectivity check succeeds', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const status = await service.systemStatus();
    expect(status.database).toBe('up');
  });

  it('reports database status as down when the connectivity check fails', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('connection refused'));
    const status = await service.systemStatus();
    expect(status.database).toBe('down');
  });
});
