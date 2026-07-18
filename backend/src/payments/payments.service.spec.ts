import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

// Regras de negócio das mensalidades (secção 16, regra 5 da secção 32):
// nenhum pagamento pode exceder o valor em dívida.
describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaMock: any;
  let auditMock: any;
  let emailMock: any;
  let whatsappMock: any;

  beforeEach(() => {
    prismaMock = {
      premium: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
      payment: { create: jest.fn() },
      insuredMember: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    emailMock = { sendOverduePremiumNotification: jest.fn() };
    whatsappMock = { sendOverduePremiumNotification: jest.fn() };
    service = new PaymentsService(prismaMock, auditMock, emailMock, whatsappMock);
  });

  it('rejects a payment that exceeds the amount due', async () => {
    prismaMock.premium.findFirst.mockResolvedValue({
      id: 'premium-1', value: 10000, lateFee: 0, discount: 0, payments: [], insuredMemberId: 'insured-1',
    });

    await expect(
      service.registerPayment('org-1', { premiumId: 'premium-1', amount: 15000, method: 'transfer' } as any, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks the premium as paid and reactivates a blocked insured member once fully paid', async () => {
    prismaMock.premium.findFirst.mockResolvedValue({
      id: 'premium-1', value: 10000, lateFee: 0, discount: 0, payments: [], insuredMemberId: 'insured-1',
    });
    prismaMock.payment.create.mockResolvedValue({ id: 'payment-1' });
    prismaMock.insuredMember.findUnique.mockResolvedValue({ id: 'insured-1', status: 'blocked_nonpayment' });

    await service.registerPayment('org-1', { premiumId: 'premium-1', amount: 10000, method: 'transfer' } as any, 'admin-1');

    expect(prismaMock.premium.update).toHaveBeenCalledWith({ where: { id: 'premium-1' }, data: { status: 'paid' } });
    expect(prismaMock.insuredMember.update).toHaveBeenCalledWith({ where: { id: 'insured-1' }, data: { status: 'active' } });
  });

  it('marks the premium as partially paid when the amount does not cover the full value', async () => {
    prismaMock.premium.findFirst.mockResolvedValue({
      id: 'premium-1', value: 10000, lateFee: 0, discount: 0, payments: [], insuredMemberId: 'insured-1',
    });
    prismaMock.payment.create.mockResolvedValue({ id: 'payment-1' });

    await service.registerPayment('org-1', { premiumId: 'premium-1', amount: 4000, method: 'cash' } as any, 'admin-1');

    expect(prismaMock.premium.update).toHaveBeenCalledWith({ where: { id: 'premium-1' }, data: { status: 'partially_paid' } });
  });

  it('notifies the insured member by e-mail and suspends coverage when overdue beyond the grace period', async () => {
    const dueDate = new Date('2026-05-01');
    prismaMock.premium.findMany.mockResolvedValue([
      {
        id: 'premium-1', dueDate, value: 10000, insuredMemberId: 'insured-1',
        insuredMember: { fullName: 'Maria', email: 'maria@example.com' },
      },
    ]);
    prismaMock.insuredMember.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.suspendOverdue('org-1', 30);

    expect(emailMock.sendOverduePremiumNotification).toHaveBeenCalledWith('maria@example.com', 'Maria', dueDate, 10000);
    expect(prismaMock.insuredMember.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['insured-1'] }, status: 'active' }, data: { status: 'blocked_nonpayment' },
    });
    expect(result.suspended).toBe(1);
  });
});
