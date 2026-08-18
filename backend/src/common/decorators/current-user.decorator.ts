import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  organizationId: string;
  email: string;
  // Preenchidos apenas para contas de portal (segurado/prestador) ligadas
  // a uma entidade específica — ver secção "Portal de auto-serviço".
  insuredMemberId?: string | null;
  providerId?: string | null;
  // Acesso especial, independente da organização — permite criar e gerir
  // novas empresas clientes. Ver PlatformAdminGuard.
  isPlatformAdmin?: boolean;
}

// Extrai o utilizador autenticado directamente do pedido, já validado pelo
// JwtAuthGuard. Uso: @CurrentUser() user: CurrentUserPayload
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
