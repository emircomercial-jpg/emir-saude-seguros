import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CardsService } from './cards.service';

// Emissão, bloqueio e validação rápida do cartão de seguro (secções 8 e 9).
describe('CardsService', () => {
  let service: CardsService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      insuredMember: { findFirst: jest.fn() },
      insuranceCard: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new CardsService(prismaMock, auditMock);
  });

  it('rejects issuing a card for an insured member that does not exist', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue(null);

    await expect(service.issue('nonexistent', 'org-1', 'admin-1')).rejects.toThrow(NotFoundException);
  });

  it('issues a card with a generated card number and expiry date', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria' });
    prismaMock.insuranceCard.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'card-1', ...data }));

    const card = await service.issue('insured-1', 'org-1', 'admin-1');

    expect(card.cardNumber).toMatch(/^EMIR-\d{9}$/);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'card.issue' }));
  });

  it('rejects validation when the card is not active', async () => {
    prismaMock.insuranceCard.findUnique.mockResolvedValue({
      id: 'card-1', insuredMemberId: 'insured-1', status: 'blocked', expiryDate: new Date(Date.now() + 100000),
    });
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', status: 'active', dependents: [] });

    await expect(
      service.validate('org-1', { cardNumber: 'EMIR-123456789' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('validates successfully and returns only non-clinical data', async () => {
    prismaMock.insuranceCard.findUnique.mockResolvedValue({
      id: 'card-1', insuredMemberId: 'insured-1', status: 'active', expiryDate: new Date(Date.now() + 100000),
    });
    prismaMock.insuredMember.findFirst.mockResolvedValue({
      id: 'insured-1', fullName: 'Maria', status: 'active', dependents: [{ id: 'dep-1' }],
    });

    const result = await service.validate('org-1', { cardNumber: 'EMIR-123456789' });

    expect(result.fullName).toBe('Maria');
    expect(result.dependentsCount).toBe(1);
    expect((result as any).idDocumentNumber).toBeUndefined();
  });
});
