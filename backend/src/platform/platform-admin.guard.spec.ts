import { ForbiddenException } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';

function makeContext(user: any) {
  const request: any = { user };
  return { switchToHttp: () => ({ getRequest: () => request }) } as any;
}

describe('PlatformAdminGuard', () => {
  const guard = new PlatformAdminGuard();

  it('rejects a normal Superadministrador de empresa cliente (não é administrador da plataforma)', () => {
    const ctx = makeContext({ userId: 'user-1', organizationId: 'org-1', isPlatformAdmin: false });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects a request with no user at all', () => {
    const ctx = makeContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows an actual platform administrator through', () => {
    const ctx = makeContext({ userId: 'user-1', organizationId: 'org-1', isPlatformAdmin: true });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
