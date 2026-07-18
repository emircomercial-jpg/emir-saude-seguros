import { NotFoundException } from '@nestjs/common';
import { ClaimsService } from './claims.service';

// Numeração automática e submissão de sinistros (secção 18).
describe('ClaimsService', () => {
  let service: ClaimsService;
  let prismaMock: any;
  let auditMock: any;
  let emailMock: any;
  let whatsappMock: any;

  beforeEach(() => {
    prismaMock = {
      insuredMember: { findFirst: jest.fn() },
      claim: { count: jest.fn().mockResolvedValue(0), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    emailMock = { sendClaimDecisionNotification: jest.fn() };
    whatsappMock = { sendClaimDecisionNotification: jest.fn() };
    service = new ClaimsService(prismaMock, auditMock, emailMock, whatsappMock);
  });

  it('rejects submitting a claim for an insured member that does not exist', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue(null);

    await expect(
      service.create('org-1', { insuredMemberId: 'nonexistent' } as any, 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('generates a sequential claim number and logs the action', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria' });
    prismaMock.claim.count.mockResolvedValue(1);
    prismaMock.claim.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'claim-1', ...data }));

    const result = await service.create('org-1', { insuredMemberId: 'insured-1', requestedValue: 5000 } as any, 'admin-1');

    expect(result.claimNumber).toMatch(/^SIN-\d{4}-000002$/);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'claim.create' }));
  });

  it('updates the claim status and logs the decision', async () => {
    prismaMock.claim.findFirst.mockResolvedValue({
      id: 'claim-1', claimNumber: 'SIN-2026-000001', insuredMember: { fullName: 'Maria', email: null },
    });
    prismaMock.claim.update.mockResolvedValue({ id: 'claim-1', status: 'approved' });

    const result = await service.updateStatus('claim-1', 'org-1', { status: 'approved' } as any, 'auditor-1');

    expect(result.status).toBe('approved');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'claim.status_update' }));
  });

  it('notifies by WhatsApp when the insured member opted in and has a phone number', async () => {
    prismaMock.claim.findFirst.mockResolvedValue({
      id: 'claim-1', claimNumber: 'SIN-2026-000001',
      insuredMember: { fullName: 'Maria', email: null, whatsappOptIn: true, phone: '923456789' },
    });
    prismaMock.claim.update.mockResolvedValue({ id: 'claim-1', status: 'approved' });

    await service.updateStatus('claim-1', 'org-1', { status: 'approved' } as any, 'auditor-1');

    expect(whatsappMock.sendClaimDecisionNotification).toHaveBeenCalledWith(
      '923456789', 'Maria', 'SIN-2026-000001', 'approved',
    );
  });

  it('does not notify by WhatsApp when the insured member has not opted in', async () => {
    prismaMock.claim.findFirst.mockResolvedValue({
      id: 'claim-1', claimNumber: 'SIN-2026-000001',
      insuredMember: { fullName: 'Maria', email: null, whatsappOptIn: false, phone: '923456789' },
    });
    prismaMock.claim.update.mockResolvedValue({ id: 'claim-1', status: 'approved' });

    await service.updateStatus('claim-1', 'org-1', { status: 'approved' } as any, 'auditor-1');

    expect(whatsappMock.sendClaimDecisionNotification).not.toHaveBeenCalled();
  });
});
