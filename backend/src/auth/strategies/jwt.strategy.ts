import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../database/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret'),
    });
  }

  // Executado em cada pedido autenticado — confirma que o utilizador ainda
  // existe, não foi eliminado e não está suspenso/bloqueado, mesmo que o
  // access token em si ainda seja válido (ex: conta suspensa a meio da sessão).
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException(`Conta com estado "${user.status}" — acesso negado.`);
    }

    return {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      insuredMemberId: user.insuredMemberId,
      providerId: user.providerId,
      isPlatformAdmin: user.isPlatformAdmin,
    };
  }
}
