import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';

// Verificação de permissão (RBAC real — secção 29 e secção 13 do briefing).
describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflectorMock: any;
  let prismaMock: any;

  function makeContext(user: any) {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  beforeEach(() => {
    reflectorMock = { getAllAndOverride: jest.fn() };
    prismaMock = { permission: { findMany: jest.fn() } };
    guard = new PermissionsGuard(reflectorMock, prismaMock);
  });

  it('allows access when no permissions are required on the route', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(makeContext({ userId: 'user-1' }));
    expect(result).toBe(true);
  });

  it('allows access when the user has all required permissions', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['users.create']);
    prismaMock.permission.findMany.mockResolvedValue([{ code: 'users.create' }, { code: 'users.view' }]);

    const result = await guard.canActivate(makeContext({ userId: 'user-1' }));
    expect(result).toBe(true);
  });

  it('denies access when the user is missing a required permission', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['users.delete']);
    prismaMock.permission.findMany.mockResolvedValue([{ code: 'users.view' }]);

    await expect(guard.canActivate(makeContext({ userId: 'user-1' }))).rejects.toThrow(ForbiddenException);
  });

  it('denies access when there is no authenticated user on the request', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['users.view']);
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(ForbiddenException);
  });
});
