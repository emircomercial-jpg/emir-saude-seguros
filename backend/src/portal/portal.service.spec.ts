import { ForbiddenException } from '@nestjs/common';
import { PortalService } from './portal.service';

// Portal de auto-serviço: o acesso é sempre restrito à entidade ligada à
// própria conta autenticada — nunca a outro segurado/prestador.
describe('PortalService', () => {
  let service: PortalService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      insuredMember: { findUnique: jest.fn() },
      policyMember: { findMany: jest.fn() },
      claim: { findMany: jest.fn() },
      reimbursement: { findMany: jest.fn() },
      authorization: { findMany: jest.fn() },
      premium: { findMany: jest.fn() },
      provider: { findUnique: jest.fn() },
      invoice: { findMany: jest.fn() },
    };
    service = new PortalService(prismaMock);
  });

  it('rejects insured portal access when the account has no insured member linked', async () => {
    await expect(service.getInsuredProfile(null)).rejects.toThrow(ForbiddenException);
    await expect(service.getInsuredClaims(undefined)).rejects.toThrow(ForbiddenException);
  });

  it('rejects provider portal access when the account has no provider linked', async () => {
    await expect(service.getProviderProfile(null)).rejects.toThrow(ForbiddenException);
    await expect(service.getProviderInvoices(undefined)).rejects.toThrow(ForbiddenException);
  });

  it('only queries data scoped to the linked insured member', async () => {
    prismaMock.claim.findMany.mockResolvedValue([{ id: 'claim-1' }]);

    const result = await service.getInsuredClaims('insured-1');

    expect(result).toEqual([{ id: 'claim-1' }]);
    expect(prismaMock.claim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { insuredMemberId: 'insured-1' } }),
    );
  });

  it('only queries data scoped to the linked provider', async () => {
    prismaMock.invoice.findMany.mockResolvedValue([{ id: 'invoice-1' }]);

    const result = await service.getProviderInvoices('provider-1');

    expect(result).toEqual([{ id: 'invoice-1' }]);
    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerId: 'provider-1' } }),
    );
  });
});
