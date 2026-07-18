import { AuditService } from './audit.service';

// Registo de auditoria (secção 29 do briefing).
describe('AuditService', () => {
  let service: AuditService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      auditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    };
    service = new AuditService(prismaMock);
  });

  it('records an audit log entry (registo de auditoria)', async () => {
    prismaMock.auditLog.create.mockResolvedValue({ id: 'log-1' });

    await service.log({
      organizationId: 'org-1',
      userId: 'user-1',
      action: 'login',
      module: 'auth',
      description: 'Início de sessão bem-sucedido.',
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'login', module: 'auth' }),
    });
  });

  it('lists audit logs filtered by organization with pagination', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }]);
    prismaMock.auditLog.count.mockResolvedValue(1);

    const result = await service.findAll('org-1', { page: 1, pageSize: 10 } as any);

    expect(result.items).toHaveLength(1);
    expect(result.meta.totalItems).toBe(1);
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) }),
    );
  });
});
