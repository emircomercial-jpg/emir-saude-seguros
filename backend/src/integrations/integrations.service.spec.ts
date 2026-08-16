import { NotFoundException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      integrationApiKey: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      externalInvoice: { upsert: jest.fn(), findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new IntegrationsService(prismaMock, auditMock);
  });

  describe('createApiKey', () => {
    it('creates a key and returns the raw value only this once', async () => {
      prismaMock.integrationApiKey.create.mockResolvedValue({
        id: 'key-1', name: 'teste', keyHash: 'hash', createdAt: new Date(),
      });

      const result = await service.createApiKey('org-1', 'teste', 'user-1');

      expect(result.key).toMatch(/^emirsg_/);
      expect(result).not.toHaveProperty('keyHash');
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'integration.api_key_created' }));
    });
  });

  describe('listApiKeys', () => {
    it('never includes the key hash in the listing (only metadata)', async () => {
      prismaMock.integrationApiKey.findMany.mockResolvedValue([
        { id: 'key-1', name: 'teste', keyHash: 'super-secret-hash', createdAt: new Date() },
      ]);

      const result = await service.listApiKeys('org-1');

      expect(result[0]).not.toHaveProperty('keyHash');
    });
  });

  describe('revokeApiKey', () => {
    it('rejects revoking a key that does not exist in this organization', async () => {
      prismaMock.integrationApiKey.findFirst.mockResolvedValue(null);
      await expect(service.revokeApiKey('org-1', 'key-x', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('receiveInvoice', () => {
    const dto = {
      externalId: 'FAT-001', invoiceNumber: 'FAT-2026-001', customerName: 'Cliente Teste',
      issueDate: '2026-08-16', totalValue: 15000, status: 'issued',
    };

    it('upserts by organization + source + externalId (idempotent, never duplicates)', async () => {
      prismaMock.externalInvoice.upsert.mockResolvedValue({ id: 'inv-1', ...dto });

      await service.receiveInvoice('org-1', dto as any);

      expect(prismaMock.externalInvoice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId_source_externalId: { organizationId: 'org-1', source: 'sistema-facturacao', externalId: 'FAT-001' } },
        }),
      );
    });

    it('logs the receipt in the audit trail without attributing it to a human user', async () => {
      prismaMock.externalInvoice.upsert.mockResolvedValue({ id: 'inv-1', ...dto });

      await service.receiveInvoice('org-1', dto as any);

      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'integration.invoice_received', userId: undefined }),
      );
    });
  });

  describe('getExternalInvoice', () => {
    it('rejects an unknown externalId', async () => {
      prismaMock.externalInvoice.findFirst.mockResolvedValue(null);
      await expect(service.getExternalInvoice('org-1', 'does-not-exist')).rejects.toThrow(NotFoundException);
    });
  });
});
