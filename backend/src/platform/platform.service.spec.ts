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

    it('creates the organization, roles, permissions, and first admin atomically, using batched queries', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const txMock = {
        organization: { create: jest.fn().mockResolvedValue({ id: 'org-2', name: dto.name }) },
        permission: {
          findMany: jest.fn().mockResolvedValue([{ id: 'perm-1', code: 'dashboard.view' }]),
          createMany: jest.fn().mockResolvedValue({ count: 84 }),
        },
        role: {
          createMany: jest.fn().mockResolvedValue({ count: 16 }),
          findMany: jest.fn().mockResolvedValue([{ id: 'role-superadmin', code: 'superadmin' }, { id: 'role-admin', code: 'admin' }]),
        },
        rolePermission: { createMany: jest.fn().mockResolvedValue({ count: 85 }) },
        user: { create: jest.fn().mockResolvedValue({ id: 'user-1', email: dto.adminEmail, fullName: dto.adminFullName }) },
        userRole: { create: jest.fn().mockResolvedValue({}) },
      };
      prismaMock.$transaction = jest.fn((callback: any) => callback(txMock));

      const result = await service.createOrganization(dto as any, 'platform-admin-1');

      expect(txMock.organization.create).toHaveBeenCalled();
      expect(txMock.permission.createMany).toHaveBeenCalled();
      expect(txMock.role.createMany).toHaveBeenCalled();
      expect(txMock.rolePermission.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ roleId: 'role-superadmin' })]) }),
      );
      expect(txMock.user.create).toHaveBeenCalled();
      expect(txMock.userRole.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: 'user-1', roleId: 'role-superadmin' } }),
      );
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

  describe('recordSubscriptionPayment', () => {
    it('advances the due date by one month and reactivates a suspended organization', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Empresa Atrasada', status: 'suspended' });
      prismaMock.organization.update.mockImplementation(({ data }: any) => Promise.resolve({ id: 'org-1', ...data }));

      const result = await service.recordSubscriptionPayment('org-1', 'platform-admin-1');

      expect(result.status).toBe('active');
      expect(result.subscriptionLastPaymentAt).toBeInstanceOf(Date);
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'platform.subscription_payment_recorded' }));
    });

    it('does not change the status of an organization that was never suspended', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Empresa Ok', status: 'active' });
      prismaMock.organization.update.mockImplementation(({ data }: any) => Promise.resolve({ id: 'org-1', ...data }));

      const result = await service.recordSubscriptionPayment('org-1', 'platform-admin-1');

      expect(result.status).toBe('active');
    });
  });

  describe('listOrganizations — cálculo automático de atraso', () => {
    it('flags an organization as overdue once past the grace period', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      prismaMock.organization.findMany.mockResolvedValue([
        { id: 'org-1', name: 'Empresa Atrasada', subscriptionNextDueDate: eightDaysAgo, status: 'active', _count: { users: 1, insuredMembers: 0, policies: 0 } },
      ]);

      const result = await service.listOrganizations();

      expect(result[0].isOverdue).toBe(true);
    });

    it('does not flag an organization still within the grace period', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      prismaMock.organization.findMany.mockResolvedValue([
        { id: 'org-1', name: 'Empresa Recente', subscriptionNextDueDate: twoDaysAgo, status: 'active', _count: { users: 1, insuredMembers: 0, policies: 0 } },
      ]);

      const result = await service.listOrganizations();

      expect(result[0].isOverdue).toBe(false);
    });
  });
});
