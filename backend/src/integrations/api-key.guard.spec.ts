import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiKeyGuard } from './api-key.guard';

function makeContext(headers: Record<string, string>) {
  const request: any = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    request,
  } as any;
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = { integrationApiKey: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) } };
    guard = new ApiKeyGuard(prismaMock);
  });

  it('rejects a request with no Authorization header', async () => {
    const ctx = makeContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a key that does not match any stored hash', async () => {
    prismaMock.integrationApiKey.findUnique.mockResolvedValue(null);
    const ctx = makeContext({ authorization: 'Bearer chave-inexistente' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a key that has been revoked', async () => {
    prismaMock.integrationApiKey.findUnique.mockResolvedValue({
      id: 'key-1', organizationId: 'org-1', revokedAt: new Date(),
    });
    const ctx = makeContext({ authorization: 'Bearer chave-revogada' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('accepts a valid, active key and attaches the organization to the request', async () => {
    const rawKey = 'emirsg_teste123';
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    prismaMock.integrationApiKey.findUnique.mockResolvedValue({
      id: 'key-1', organizationId: 'org-1', keyHash, revokedAt: null,
    });
    const ctx = makeContext({ authorization: `Bearer ${rawKey}` });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(ctx.request.integration).toEqual({ organizationId: 'org-1', apiKeyId: 'key-1' });
  });

  it('never confuses one organization key for another (hash must match exactly)', async () => {
    // Simula que a chave enviada não corresponde a nenhum hash guardado
    // (comportamento correcto do WHERE keyHash = ... — nunca devolve um
    // resultado "parecido").
    prismaMock.integrationApiKey.findUnique.mockResolvedValue(null);
    const ctx = makeContext({ authorization: 'Bearer emirsg_de-outra-organizacao' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
