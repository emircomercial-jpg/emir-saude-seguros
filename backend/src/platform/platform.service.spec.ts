import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  let service: PlatformService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      organization: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    auditMock = { log: jest.fn() };
    service = new PlatformService(prismaMock, auditMock);
  });

  describe('createOrganization', () => {
    const dto = {
      name: 'Segunda Seguradora', adminFullName: 'Admin Teste',
      adminEmail: 'admin@segunda.co.ao', adminPassword: 'SenhaForte123!',
    };

    it('rejects when the admin email is already used anywhere in the system', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-user' });
      await expect(service.createOrganization(dto as any, 'platform-admin-1')).rejects.toThrow(ConflictException);
    });

    it('creates the organization, roles, permissions, and first admin atomically', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const txMock = {
        organization: { create: jest.fn().mockResolvedValue({ id: 'org-2', name: dto.name }) },
        permission: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'perm-1', code: 'dashboard.view' }) },
        role: { create: jest.fn().mockResolvedValue({ id: 'role-superadmin' }) },
        rolePermission: { create: jest.fn().mockResolvedValue({}) },
        user: { create: jest.fn().mockResolvedValue({ id: 'user-1', email: dto.adminEmail, fullName: dto.adminFullName }) },
        userRole: { create: jest.fn().mockResolvedValue({}) },
      };
      prismaMock.$transaction = jest.fn((callback: any) => callback(txMock));

      const result = await service.createOrganization(dto as any, 'platform-admin-1');

      expect(txMock.organization.create).toHaveBeenCalled();
      expect(txMock.user.create).toHaveBeenCalled();
      expect(txMock.userRole.create).toHaveBeenCalled();
      expect(result.organization.id).toBe('org-2');
      expect(result.admin.email).toBe(dto.adminEmail);
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'platform.organization_created' }));
    });
  });

  describe('updateOrganizationStatus', () => {
    it('rejects updating a non-existent organization', async () => {
      prismaMock.organization.findUnique.mockResolvedValue(null);
      await expect(service.updateOrganizationStatus('org-x', 'suspended', 'platform-admin-1')).rejects.toThrow(NotFoundException);
    });

    it('updates the status and logs the action', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Empresa Teste' });
      prismaMock.organization.update.mockResolvedValue({ id: 'org-1', status: 'suspended' });

      const result = await service.updateOrganizationStatus('org-1', 'suspended', 'platform-admin-1');

      expect(result.status).toBe('suspended');
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'platform.organization_status_changed' }));
    });
  });
});
