import { ConflictException } from '@nestjs/common';
import { ProvidersService } from './providers.service';

// Regra de negócio: impede duplicação de NIF no cadastro de prestadores.
describe('ProvidersService', () => {
  let service: ProvidersService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      provider: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new ProvidersService(prismaMock, auditMock);
  });

  it('rejects creating a provider with a NIF that already exists', async () => {
    prismaMock.provider.findUnique.mockResolvedValue({ id: 'existing-provider' });

    await expect(
      service.create('org-1', { name: 'Clínica Central', nif: '5001234567', type: 'clinic' } as any, 'admin-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a provider successfully and logs the action', async () => {
    prismaMock.provider.findUnique.mockResolvedValue(null);
    prismaMock.provider.create.mockResolvedValue({ id: 'provider-1', name: 'Clínica Central', nif: '5001234567' });

    const result = await service.create('org-1', { name: 'Clínica Central', nif: '5001234567', type: 'clinic' } as any, 'admin-1');

    expect(result.name).toBe('Clínica Central');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'provider.create' }));
  });

  it('changes the provider status and logs the action', async () => {
    prismaMock.provider.findFirst.mockResolvedValue({ id: 'provider-1', name: 'Clínica Central', status: 'active' });
    prismaMock.provider.update.mockResolvedValue({ id: 'provider-1', name: 'Clínica Central', status: 'suspended' });

    const result = await service.setStatus('provider-1', 'org-1', 'suspended', 'admin-1');

    expect(result.status).toBe('suspended');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'provider.status_update' }));
  });
});
