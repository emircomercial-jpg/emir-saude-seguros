import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthorizationsService } from './authorizations.service';

// Fluxo de pré-autorização (secção 10): numeração automática, bloqueio de
// segurados inactivos, e histórico completo de decisões.
describe('AuthorizationsService', () => {
  let service: AuthorizationsService;
  let prismaMock: any;
  let auditMock: any;
  let emailMock: any;
  let whatsappMock: any;

  beforeEach(() => {
    prismaMock = {
      insuredMember: { findFirst: jest.fn() },
      authorization: { count: jest.fn().mockResolvedValue(0), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      authorizationHistory: { create: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    emailMock = { sendAuthorizationDecisionNotification: jest.fn() };
    whatsappMock = { sendAuthorizationDecisionNotification: jest.fn() };
    service = new AuthorizationsService(prismaMock, auditMock, emailMock, whatsappMock);
  });

  it('rejects a request for an insured member that is not active', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria', status: 'suspended' });

    await expect(
      service.create('org-1', { insuredMemberId: 'insured-1', type: 'exame' } as any, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a request for an insured member that does not exist', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue(null);

    await expect(
      service.create('org-1', { insuredMemberId: 'nonexistent', type: 'exame' } as any, 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates a submitted authorization with a sequential number and initial history entry', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria', status: 'active' });
    prismaMock.authorization.count.mockResolvedValue(2);
    prismaMock.authorization.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'auth-1', ...data }));

    const result = await service.create('org-1', { insuredMemberId: 'insured-1', type: 'exame' } as any, 'admin-1');

    expect(result.requestNumber).toMatch(/^AUT-\d{4}-000003$/);
    expect(result.status).toBe('submitted');
    expect(prismaMock.authorizationHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'submitted' }) }),
    );
  });

  it('records a decision and appends it to the history', async () => {
    prismaMock.authorization.findFirst.mockResolvedValue({
      id: 'auth-1', requestNumber: 'AUT-2026-000001', insuredMember: { fullName: 'Maria', email: null },
    });
    prismaMock.authorization.update.mockResolvedValue({ id: 'auth-1', status: 'approved' });

    const result = await service.decide('auth-1', 'org-1', { status: 'approved' } as any, 'auditor-1');

    expect(result.status).toBe('approved');
    expect(prismaMock.authorizationHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'approved', changedBy: 'auditor-1' }) }),
    );
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'authorization.decision' }));
  });
});
