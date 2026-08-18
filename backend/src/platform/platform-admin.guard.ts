import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Bloqueia o acesso a quem não for administrador da plataforma — mesmo que
// seja Superadministrador dentro da sua própria empresa cliente. É um
// nível de acesso completamente à parte do sistema de perfis normal
// (Roles/Permissions), porque diz respeito a GERIR outras empresas
// clientes, não a gerir a própria organização.
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.user?.isPlatformAdmin) {
      throw new ForbiddenException('Acesso restrito ao administrador da plataforma.');
    }
    return true;
  }
}
