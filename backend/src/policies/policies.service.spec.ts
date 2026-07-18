import { BadRequestException } from '@nestjs/common';
import { PoliciesService } from './policies.service';

// Numeração automática e validação de plano/empresa ao emitir uma apólice.
describe('PoliciesService', () => {
  let service: PoliciesService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      policy: { count: jest.fn().mockResolvedValue(0), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      healthPlan: { findFirst: jest.fn() },
      company: { findFirst: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new PoliciesService(prismaMock, auditMock);
  });

  it('rejects creating a policy for a plan that does not exist', async () => {
    prismaMock.healthPlan.findFirst.mockResolvedValue(null);

    await expect(
      service.create('org-1', {
        planId: 'nonexistent-plan', issueDate: '2026-01-01', startDate: '2026-01-01',
        endDate: '2027-01-01', value: 10000, paymentMode: 'monthly',
      } as any, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('generates a sequential policy number and logs the action', async () => {
    prismaMock.healthPlan.findFirst.mockResolvedValue({ id: 'plan-1' });
    prismaMock.policy.count.mockResolvedValue(3);
    prismaMock.policy.create.mockImplementation(({ data }: any) => Promise.resolve(data));

    const result = await service.create('org-1', {
      planId: 'plan-1', issueDate: '2026-01-01', startDate: '2026-01-01',
      endDate: '2027-01-01', value: 15000, paymentMode: 'monthly',
    } as any, 'admin-1');

    expect(result.policyNumber).toMatch(/^AP-\d{4}-000004$/);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'policy.create' }));
  });
});

describe('PoliciesService — digital signature', () => {
  let service: PoliciesService;
  let prismaMock: any;
  let auditMock: any;

  const baseSignedPolicy = {
    id: 'policy-1', policyNumber: 'AP-2026-000001', planId: 'plan-1', companyId: null,
    startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01'), value: 15000, paymentMode: 'monthly',
    signatureHash: null as string | null,
  };

  beforeEach(() => {
    prismaMock = {
      policy: { findFirst: jest.fn(), update: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new PoliciesService(prismaMock, auditMock);
  });

  it('signs an unsigned policy and generates a SHA-256 hash', async () => {
    prismaMock.policy.findFirst.mockResolvedValue({ ...baseSignedPolicy });
    prismaMock.policy.update.mockImplementation(({ data }: any) => Promise.resolve({ ...baseSignedPolicy, ...data }));

    const result = await service.sign('policy-1', 'org-1', 'Ana Segurada', '127.0.0.1', 'admin-1');

    expect(result.signatureHash).toMatch(/^[a-f0-9]{64}$/);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'policy.signed' }));
  });

  it('rejects signing a policy that has already been signed', async () => {
    prismaMock.policy.findFirst.mockResolvedValue({ ...baseSignedPolicy, signatureHash: 'already-signed-hash' });

    await expect(service.sign('policy-1', 'org-1', 'Ana Segurada', '127.0.0.1', 'admin-1')).rejects.toThrow(BadRequestException);
  });

  it('confirms a valid signature when the contract data has not changed', async () => {
    const hash = require('crypto')
      .createHash('sha256')
      .update(['AP-2026-000001', 'plan-1', 'individual', baseSignedPolicy.startDate.toISOString(), baseSignedPolicy.endDate.toISOString(), '15000', 'monthly'].join('|'))
      .digest('hex');
    prismaMock.policy.findFirst.mockResolvedValue({ ...baseSignedPolicy, signatureHash: hash, signedAt: new Date(), signedByName: 'Ana' });

    const result = await service.verifySignature('policy-1', 'org-1');

    expect(result.signed).toBe(true);
    expect(result.valid).toBe(true);
  });

  it('detects tampering when the contract data changed after signing', async () => {
    prismaMock.policy.findFirst.mockResolvedValue({ ...baseSignedPolicy, value: 99999, signatureHash: 'stale-hash-from-before-the-change' });

    const result = await service.verifySignature('policy-1', 'org-1');

    expect(result.signed).toBe(true);
    expect(result.valid).toBe(false);
  });
});
