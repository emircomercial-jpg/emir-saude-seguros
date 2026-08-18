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

// Dias de tolerância depois da data de vencimento da assinatura antes do
// acesso ser bloqueado automaticamente — dá tempo para o pagamento ser
// processado/confirmado sem cortar o acesso no preciso dia do vencimento.
const SUBSCRIPTION_GRACE_PERIOD_DAYS = 5;

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
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException(`Conta com estado "${user.status}" — acesso negado.`);
    }

    // O administrador da plataforma nunca é bloqueado por causa do estado
    // da assinatura da SUA PRÓPRIA organização — precisa de acesso
    // garantido para gerir todas as empresas clientes, mesmo que algo
    // corra mal com os dados de facturação da sua própria conta.
    if (!user.isPlatformAdmin) {
      const org = user.organization;

      if (org.status === 'suspended') {
        throw new UnauthorizedException('O acesso desta empresa está suspenso. Contacte o administrador do sistema.');
      }
      if (org.status === 'inactive') {
        throw new UnauthorizedException('Esta empresa já não está activa no sistema.');
      }

      // Bloqueio automático por atraso de pagamento — verificado a cada
      // pedido, sem depender de nenhuma tarefa agendada em segundo plano
      // (que seria pouco fiável com o servidor a adormecer por
      // inactividade no plano gratuito).
      if (org.subscriptionNextDueDate) {
        const graceDeadline = new Date(org.subscriptionNextDueDate);
        graceDeadline.setDate(graceDeadline.getDate() + SUBSCRIPTION_GRACE_PERIOD_DAYS);
        if (graceDeadline < new Date()) {
          throw new UnauthorizedException(
            'O acesso foi suspenso automaticamente por atraso no pagamento da assinatura. Contacte o fornecedor do sistema para regularizar.',
          );
        }
      }
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
