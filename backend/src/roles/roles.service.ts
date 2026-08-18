import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

// Perfis (roles) e a sua matriz de permissões (secção 11 do briefing).
// Perfis de sistema (isSystem = true, ex: Superadministrador, Administrador)
// nunca podem ser eliminados nem ter o estado alterado pela aplicação.
@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string) {
    const roles = await this.prisma.role.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((r) => this.present(r));
  }

  async findOne(id: string, organizationId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Perfil não encontrado.');
    return this.present(role);
  }

  private present(role: any) {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      isSystem: role.isSystem,
      status: role.status,
      userCount: role._count?.users ?? 0,
      permissions: role.permissions.map((p: any) => ({
        id: p.permission.id,
        code: p.permission.code,
        module: p.permission.module,
        action: p.permission.action,
      })),
    };
  }

  async create(organizationId: string, dto: CreateRoleDto, createdBy: string) {
    const existing = await this.prisma.role.findUnique({
      where: { organizationId_code: { organizationId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Já existe um perfil com este código.');

    const role = await this.prisma.role.create({
      data: { organizationId, ...dto, isSystem: false },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'role.create',
      module: 'roles',
      entity: 'Role',
      entityId: role.id,
      description: `Perfil "${role.name}" criado.`,
    });

    return this.present(role);
  }

  async update(id: string, organizationId: string, dto: UpdateRoleDto, updatedBy: string) {
    await this.findOne(id, organizationId);

    const role = await this.prisma.role.update({
      where: { id },
      data: dto,
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'role.update',
      module: 'roles',
      entity: 'Role',
      entityId: id,
      description: `Perfil "${role.name}" actualizado.`,
      newValues: dto,
    });

    return this.present(role);
  }

  async remove(id: string, organizationId: string, updatedBy: string) {
    const role = await this.prisma.role.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!role) throw new NotFoundException('Perfil não encontrado.');
    if (role.isSystem) throw new ForbiddenException('Perfis de sistema não podem ser eliminados.');

    await this.prisma.role.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'role.delete',
      module: 'roles',
      entity: 'Role',
      entityId: id,
      description: `Perfil "${role.name}" eliminado.`,
    });

    return { message: 'Perfil eliminado com sucesso.' };
  }

  async setStatus(id: string, organizationId: string, status: 'active' | 'inactive', updatedBy: string) {
    const role = await this.prisma.role.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!role) throw new NotFoundException('Perfil não encontrado.');
    if (role.isSystem) throw new ForbiddenException('O estado de perfis de sistema não pode ser alterado.');

    const updated = await this.prisma.role.update({
      where: { id },
      data: { status },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'role.status_update',
      module: 'roles',
      entity: 'Role',
      entityId: id,
      description: `Estado do perfil "${role.name}" alterado para "${status}".`,
    });

    return this.present(updated);
  }

  async assignPermissions(id: string, organizationId: string, permissionIds: string[], updatedBy: string) {
    const role = await this.prisma.role.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!role) throw new NotFoundException('Perfil não encontrado.');

    const permissions = await this.prisma.permission.findMany({ where: { id: { in: permissionIds } } });
    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('Uma ou mais permissões indicadas não existem.');
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      }),
    ]);

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'role.permissions_updated',
      module: 'roles',
      entity: 'Role',
      entityId: id,
      description: `Permissões do perfil "${role.name}" actualizadas.`,
      newValues: { permissionIds },
    });

    return this.findOne(id, organizationId);
  }
}
