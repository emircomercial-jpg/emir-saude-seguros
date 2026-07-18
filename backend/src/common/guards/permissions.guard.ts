import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma.service';

// Guard de autorização (RBAC real — secção 13). Valida se o utilizador
// autenticado possui, através dos seus perfis, todas as permissões exigidas
// pela rota (@RequirePermissions(...)). Corre sempre depois do JwtAuthGuard.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilizador não autenticado.');
    }

    const permissions = await this.prisma.permission.findMany({
      where: {
        roles: {
          some: {
            role: {
              status: 'active',
              users: { some: { userId: user.userId } },
            },
          },
        },
      },
      select: { code: true },
    });

    const codes = new Set(permissions.map((p) => p.code));
    const hasAll = required.every((code) => codes.has(code));

    if (!hasAll) {
      throw new ForbiddenException('Permissões insuficientes para esta operação.');
    }

    return true;
  }
}
