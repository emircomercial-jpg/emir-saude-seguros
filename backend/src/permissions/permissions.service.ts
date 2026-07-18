import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Catálogo global de permissões (secção 11 do briefing: matriz por módulo e acção).
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  }

  // Agrupa por módulo — usado pelo frontend para construir a matriz de
  // permissões (secção 11: "Módulo Utilizadores: Visualizar, Criar, ...").
  async findGrouped() {
    const permissions = await this.findAll();
    const grouped: Record<string, { module: string; permissions: typeof permissions }> = {};

    for (const permission of permissions) {
      if (!grouped[permission.module]) {
        grouped[permission.module] = { module: permission.module, permissions: [] };
      }
      grouped[permission.module].permissions.push(permission);
    }

    return Object.values(grouped);
  }
}
