import { ConflictException } from '@nestjs/common';
import { BillingService } from './billing.service';

// Detecção de facturas duplicadas (secção 17, regra 9 da secção 32).
describe('BillingService', () => {
  let service: BillingService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      invoice: { findUnique: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      invoiceItem: { update: jest.fn(), findMany: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new BillingService(prismaMock, auditMock);
  });

  it('rejects a new invoice with the same provider and invoice number', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({ id: 'existing-invoice' });

    await expect(
      service.create('org-1', {
        providerId: 'provider-1', invoiceNumber: 'FAT-2026-001',
        periodStart: '2026-06-01', periodEnd: '2026-06-30',
        items: [{ description: 'Consulta', value: 5000 }],
      } as any, 'admin-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a new invoice and sums the gross value from its items', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null);
    prismaMock.invoice.create.mockResolvedValue({
      id: 'invoice-1', invoiceNumber: 'FAT-2026-002', grossValue: 8000, provider: { name: 'Clínica X' },
    });

    const invoice = await service.create('org-1', {
      providerId: 'provider-1', invoiceNumber: 'FAT-2026-002',
      periodStart: '2026-06-01', periodEnd: '2026-06-30',
      items: [{ description: 'Consulta', value: 5000 }, { description: 'Exame', value: 3000 }],
    } as any, 'admin-1');

    expect(invoice.grossValue).toBe(8000);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'billing.invoice_created' }));
  });
});
