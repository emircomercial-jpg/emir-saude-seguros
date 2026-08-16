import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';

// Autenticação por chave de API — usada pelos endpoints que sistemas
// EXTERNOS chamam directamente (ex: o webhook de facturas de um sistema de
// facturação separado). É deliberadamente independente do JwtAuthGuard
// (que exige login de utilizador humano): um sistema externo não tem
// conta de utilizador, só uma chave de integração de longa duração.
//
// A chave é enviada como "Authorization: Bearer <chave>". Nunca se guarda
// a chave em texto simples na base de dados — só o seu hash SHA-256 — por
// isso a validação aqui também gera o hash do valor recebido e compara.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Chave de integração em falta.');
    }

    const rawKey = authHeader.slice('Bearer '.length).trim();
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.integrationApiKey.findUnique({ where: { keyHash } });

    if (!apiKey || apiKey.revokedAt) {
      throw new UnauthorizedException('Chave de integração inválida ou revogada.');
    }

    // Regista a organização autenticada no pedido, para os controllers
    // saberem a que organização associar os dados recebidos — o
    // equivalente ao "req.user" do JwtAuthGuard, mas para chamadas de
    // sistema, nunca de uma pessoa.
    request.integration = { organizationId: apiKey.organizationId, apiKeyId: apiKey.id };

    // Não bloqueia o pedido se a actualização do "último uso" falhar —
    // é só informativo, nunca deve impedir a integração de funcionar.
    this.prisma.integrationApiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return true;
  }
}
