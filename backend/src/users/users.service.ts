import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EMAIL_SERVICE, EmailService } from '../email/email.service.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { normalizePagination, buildPaginationMeta } from '../common/utils/pagination.util';

// Gestão de utilizadores (secções 9 e 10 do briefing).
// A eliminação é sempre lógica — nunca se remove um utilizador da base de
// dados, apenas se marca deletedAt e o estado passa a "inactive".
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  async findAll(organizationId: string, query: QueryUsersDto) {
    const { page, pageSize, skip, take } = normalizePagination(query);
    const sortBy = query.sortBy || 'fullName';
    const sortOrder = query.sortOrder || 'asc';

    const where = {
      organizationId,
      deletedAt: null,
      status: (query.status as any) || undefined,
      ...(query.roleId ? { roles: { some: { roleId: query.roleId } } } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { roles: { include: { role: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => this.sanitize(u)),
      meta: buildPaginationMeta(page, pageSize, totalItems),
    };
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    return this.sanitize(user);
  }

  // Nunca devolver o hash da palavra-passe ao cliente.
  private sanitize(user: any) {
    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      roles: user.roles?.map((r: any) => ({ id: r.role.id, name: r.role.name, code: r.role.code })),
    };
  }

  async create(organizationId: string, dto: CreateUserDto, createdBy: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Já existe um utilizador com este e-mail.');

    const roles = await this.prisma.role.findMany({ where: { id: { in: dto.roleIds }, organizationId } });
    if (roles.length !== dto.roleIds.length) {
      throw new BadRequestException('Um ou mais perfis indicados não existem nesta organização.');
    }

    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        passwordHash,
        mustChangePassword: dto.mustChangePassword ?? true,
        createdBy,
        roles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: { include: { role: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'user.create',
      module: 'users',
      entity: 'User',
      entityId: user.id,
      description: `Utilizador "${user.fullName}" criado.`,
      newValues: { fullName: user.fullName, email: user.email, roleIds: dto.roleIds },
    });

    return this.sanitize(user);
  }

  async update(id: string, organizationId: string, dto: UpdateUserDto, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);

    const user = await this.prisma.user.update({
      where: { id },
      data: { ...dto, updatedBy },
      include: { roles: { include: { role: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'user.update',
      module: 'users',
      entity: 'User',
      entityId: id,
      description: `Dados do utilizador "${user.fullName}" actualizados.`,
      oldValues: { fullName: existing.fullName, phone: existing.phone },
      newValues: dto,
    });

    return this.sanitize(user);
  }

  // Actualiza o meu próprio perfil (secção 21) — apenas campos não sensíveis,
  // nunca permissões ou perfis.
  async updateOwnProfile(userId: string, organizationId: string, dto: UpdateUserDto) {
    return this.update(userId, organizationId, dto, userId);
  }

  async softDelete(id: string, organizationId: string, updatedBy: string) {
    await this.findOne(id, organizationId);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive', updatedBy },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'user.delete',
      module: 'users',
      entity: 'User',
      entityId: id,
      description: 'Utilizador eliminado (eliminação lógica).',
    });

    return { message: 'Utilizador eliminado com sucesso.' };
  }

  private async setStatus(
    id: string,
    organizationId: string,
    status: 'active' | 'suspended' | 'blocked' | 'inactive',
    updatedBy: string,
    action: string,
  ) {
    await this.findOne(id, organizationId);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status, updatedBy, ...(status === 'active' ? { failedLoginAttempts: 0, lockedUntil: null } : {}) },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action,
      module: 'users',
      entity: 'User',
      entityId: id,
      description: `Estado do utilizador alterado para "${status}".`,
    });

    return this.sanitize(user);
  }

  activate(id: string, organizationId: string, updatedBy: string) {
    return this.setStatus(id, organizationId, 'active', updatedBy, 'user.activate');
  }

  suspend(id: string, organizationId: string, updatedBy: string) {
    return this.setStatus(id, organizationId, 'suspended', updatedBy, 'user.suspend');
  }

  block(id: string, organizationId: string, updatedBy: string) {
    return this.setStatus(id, organizationId, 'blocked', updatedBy, 'user.block');
  }

  async restore(id: string, organizationId: string, updatedBy: string) {
    const exists = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!exists) throw new NotFoundException('Utilizador não encontrado.');

    const user = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null, status: 'active', updatedBy },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'user.restore',
      module: 'users',
      entity: 'User',
      entityId: id,
      description: 'Utilizador restaurado.',
    });

    return this.sanitize(user);
  }

  async assignRoles(id: string, organizationId: string, roleIds: string[], updatedBy: string) {
    await this.findOne(id, organizationId);

    const roles = await this.prisma.role.findMany({ where: { id: { in: roleIds }, organizationId } });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('Um ou mais perfis indicados não existem nesta organização.');
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) }),
    ]);

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'user.roles_updated',
      module: 'users',
      entity: 'User',
      entityId: id,
      description: 'Perfis atribuídos ao utilizador actualizados.',
      newValues: { roleIds },
    });

    return this.findOne(id, organizationId);
  }

  // Redefinição de palavra-passe pelo administrador (gera uma nova palavra-passe
  // temporária e força a alteração no próximo acesso).
  async resetPassword(id: string, organizationId: string, updatedBy: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');

    const temporaryPassword = crypto.randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true, updatedBy },
    });

    await this.emailService.sendPasswordReset(user.email, user.fullName, temporaryPassword);

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'user.password_reset_by_admin',
      module: 'users',
      entity: 'User',
      entityId: id,
      description: 'Palavra-passe redefinida por um administrador.',
    });

    return { message: 'Nova palavra-passe temporária gerada e enviada ao utilizador.' };
  }

  async auditLogs(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.auditLog.findMany({
      where: { entity: 'User', entityId: id, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async devices(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.device.findMany({ where: { userId: id }, orderBy: { lastAccessAt: 'desc' } });
  }

  // Ligação de uma conta a um Segurado ou Prestador, para acesso ao portal
  // de auto-serviço. Uma conta só pode estar ligada a um dos dois (nunca
  // ambos), e a entidade precisa de pertencer à mesma organização.
  async linkToInsured(id: string, organizationId: string, insuredMemberId: string | null, updatedBy: string) {
    const user = await this.findOne(id, organizationId);

    if (insuredMemberId) {
      const insured = await this.prisma.insuredMember.findFirst({ where: { id: insuredMemberId, organizationId, deletedAt: null } });
      if (!insured) throw new NotFoundException('Segurado não encontrado.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { insuredMemberId, providerId: null, updatedBy },
      include: { roles: { include: { role: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'user.linked_to_insured',
      module: 'users',
      entity: 'User',
      entityId: id,
      description: insuredMemberId
        ? `Conta de "${user.fullName}" ligada ao segurado para acesso ao portal.`
        : `Ligação da conta de "${user.fullName}" a segurado removida.`,
    });

    return this.sanitize(updated);
  }

  async linkToProvider(id: string, organizationId: string, providerId: string | null, updatedBy: string) {
    const user = await this.findOne(id, organizationId);

    if (providerId) {
      const provider = await this.prisma.provider.findFirst({ where: { id: providerId, organizationId, deletedAt: null } });
      if (!provider) throw new NotFoundException('Prestador não encontrado.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { providerId, insuredMemberId: null, updatedBy },
      include: { roles: { include: { role: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'user.linked_to_provider',
      module: 'users',
      entity: 'User',
      entityId: id,
      description: providerId
        ? `Conta de "${user.fullName}" ligada ao prestador para acesso ao portal.`
        : `Ligação da conta de "${user.fullName}" a prestador removida.`,
    });

    return this.sanitize(updated);
  }
}
