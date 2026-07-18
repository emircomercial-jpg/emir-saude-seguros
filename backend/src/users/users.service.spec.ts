import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

// Testes de gestão de utilizadores (secção 29): criação, e-mail duplicado,
// suspensão e isolamento entre organizações.
describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: any;
  let auditMock: any;
  let emailMock: any;

  beforeEach(() => {
    prismaMock = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      role: { findMany: jest.fn() },
      insuredMember: { findFirst: jest.fn() },
      provider: { findFirst: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    emailMock = { sendPasswordReset: jest.fn() };
    service = new UsersService(prismaMock, auditMock, emailMock);
  });

  it('rejects creating a user with an e-mail that already exists (validação de e-mail duplicado)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.create(
        'org-1',
        { fullName: 'Maria', email: 'maria@test.com', temporaryPassword: 'TempPass123', roleIds: [] } as any,
        'admin-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a user successfully with valid roles', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.role.findMany.mockResolvedValue([{ id: 'role-1' }]);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1', fullName: 'João', email: 'joao@test.com', passwordHash: 'hash',
      roles: [{ role: { id: 'role-1', name: 'Auditor', code: 'auditor' } }],
    });

    const result = await service.create(
      'org-1',
      { fullName: 'João', email: 'joao@test.com', temporaryPassword: 'TempPass123', roleIds: ['role-1'] } as any,
      'admin-1',
    );

    expect(result.email).toBe('joao@test.com');
    expect((result as any).passwordHash).toBeUndefined(); // nunca devolver o hash da senha
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.create' }));
  });

  it('suspends a user (suspensão de utilizador)', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1', roles: [], fullName: 'Ana', email: 'ana@test.com',
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1', status: 'suspended', roles: [], fullName: 'Ana', email: 'ana@test.com',
    });

    const result = await service.suspend('user-1', 'org-1', 'admin-1');

    expect(result.status).toBe('suspended');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.suspend' }));
  });

  it('assigns roles to a user (atribuição de perfil)', async () => {
    prismaMock.user.findFirst
      .mockResolvedValueOnce({ id: 'user-1', roles: [], fullName: 'Carlos', email: 'carlos@test.com' }) // findOne (existence check)
      .mockResolvedValueOnce({
        id: 'user-1', roles: [{ role: { id: 'role-2', name: 'Auditor', code: 'auditor' } }],
        fullName: 'Carlos', email: 'carlos@test.com',
      }); // findOne (after reassignment)
    prismaMock.role.findMany.mockResolvedValue([{ id: 'role-2' }]);
    prismaMock.userRole = { deleteMany: jest.fn(), createMany: jest.fn() };
    prismaMock.$transaction = jest.fn((ops) => Promise.all(ops));

    const result = await service.assignRoles('user-1', 'org-1', ['role-2'], 'admin-1');

    expect(prismaMock.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(prismaMock.userRole.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', roleId: 'role-2' }],
    });
    expect(result.roles).toEqual([{ id: 'role-2', name: 'Auditor', code: 'auditor' }]);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.roles_updated' }));
  });

  it('does not find a user that belongs to a different organization (acesso entre organizações)', async () => {
    // findOne sempre filtra por organizationId — um utilizador de outra
    // organização nunca deve ser encontrado, mesmo conhecendo o seu ID.
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(service.findOne('user-from-another-org', 'org-1')).rejects.toThrow(NotFoundException);
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'user-from-another-org', organizationId: 'org-1' }) }),
    );
  });

  it('links a user account to an insured member for portal access', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'user-1', fullName: 'Carlos', roles: [] });
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1' });
    prismaMock.user.update.mockResolvedValue({ id: 'user-1', fullName: 'Carlos', insuredMemberId: 'insured-1', roles: [] });

    const result = await service.linkToInsured('user-1', 'org-1', 'insured-1', 'admin-1');

    expect(result.insuredMemberId).toBe('insured-1');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.linked_to_insured' }));
  });

  it('rejects linking to an insured member that does not exist', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'user-1', fullName: 'Carlos', roles: [] });
    prismaMock.insuredMember.findFirst.mockResolvedValue(null);

    await expect(service.linkToInsured('user-1', 'org-1', 'nonexistent', 'admin-1')).rejects.toThrow(NotFoundException);
  });
});
