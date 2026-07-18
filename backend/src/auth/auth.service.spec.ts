import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

// Testes do fluxo de autenticação (secção 29 do briefing): login correcto,
// login incorrecto, bloqueio por tentativas, refresh token e logout.
describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: any;
  let jwtMock: any;
  let configMock: any;
  let auditMock: any;
  let emailMock: any;

  const CONFIG_VALUES: Record<string, any> = {
    'security.maxLoginAttempts': 5,
    'security.loginLockMinutes': 15,
    'jwt.accessSecret': 'access-secret',
    'jwt.accessExpiresIn': '15m',
    'jwt.refreshExpiresIn': '7d',
  };

  beforeEach(() => {
    prismaMock = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      refreshToken: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      device: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      userRole: { findMany: jest.fn().mockResolvedValue([]) },
      passwordResetToken: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    jwtMock = { sign: jest.fn().mockReturnValue('signed-token') };
    configMock = { get: jest.fn((key: string) => CONFIG_VALUES[key]) };
    auditMock = { log: jest.fn() };
    emailMock = { sendPasswordReset: jest.fn() };

    service = new AuthService(prismaMock, jwtMock, configMock, auditMock, emailMock);
  });

  const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest-test-agent' };

  it('logs in successfully with correct credentials (login correcto)', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1', organizationId: 'org-1', email: 'user@test.com', passwordHash,
      status: 'active', failedLoginAttempts: 0, lockedUntil: null, deletedAt: null,
    });
    prismaMock.device.findFirst.mockResolvedValue(null);
    prismaMock.device.create.mockResolvedValue({ id: 'device-1' });

    const result = await service.login({ email: 'user@test.com', password: 'correct-password' } as any, ctx);

    expect(result.accessToken).toBe('signed-token');
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 0 }) }),
    );
  });

  it('rejects login with an incorrect password (login incorrecto)', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1', organizationId: 'org-1', email: 'user@test.com', passwordHash,
      status: 'active', failedLoginAttempts: 0, lockedUntil: null, deletedAt: null,
    });

    await expect(
      service.login({ email: 'user@test.com', password: 'wrong-password' } as any, ctx),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('locks the account after reaching the maximum number of failed attempts (bloqueio por tentativas)', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1', organizationId: 'org-1', email: 'user@test.com', passwordHash,
      status: 'active', failedLoginAttempts: 4, lockedUntil: null, deletedAt: null,
    });

    await expect(
      service.login({ email: 'user@test.com', password: 'wrong-password' } as any, ctx),
    ).rejects.toThrow(UnauthorizedException);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lockedUntil: expect.any(Date) }) }),
    );
  });

  it('rejects login while the account is still locked', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1', organizationId: 'org-1', email: 'user@test.com', passwordHash: 'x',
      status: 'active', failedLoginAttempts: 5, lockedUntil: new Date(Date.now() + 60_000), deletedAt: null,
    });

    await expect(
      service.login({ email: 'user@test.com', password: 'anything' } as any, ctx),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rotates the refresh token on refresh (refresh token)', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      id: 'rt-1', deviceId: 'device-1',
      user: { id: 'user-1', organizationId: 'org-1', email: 'user@test.com', status: 'active', deletedAt: null },
    });

    const result = await service.refresh('some-raw-token', ctx);

    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rt-1' }, data: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
    );
    expect(result.accessToken).toBe('signed-token');
  });

  it('rejects refresh with an invalid or expired token', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue(null);
    await expect(service.refresh('invalid-token', ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('revokes the refresh token on logout (logout)', async () => {
    await service.logout('some-raw-token', 'user-1', ctx);
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
    );
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'logout' }));
  });
});
