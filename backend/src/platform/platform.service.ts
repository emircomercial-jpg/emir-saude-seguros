import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OrganizationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PERMISSIONS, ROLES } from './platform-defaults';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listOrganizations() {
    const organizations = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, insuredMembers: true, policies: true } } },
    });
    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      legalName: org.legalName,
      nif: org.nif,
      email: org.email,
      phone: org.phone,
      status: org.status,
      createdAt: org.createdAt,
      userCount: org._count.users,
      insuredCount: org._count.insuredMembers,
      policyCount: org._count.policies,
    }));
  }

  // Cria uma empresa cliente nova, completa e pronta a usar: a própria
  // organização, todas as permissões e perfis padrão (partilhados com o
  // seed original — ver platform-defaults.ts), o perfil Superadministrador
  // com acesso total, e o primeiro utilizador administrador dessa empresa.
  // Tudo numa única transacção — ou fica tudo criado, ou nada fica.
  async createOrganization(dto: CreateOrganizationDto, createdByPlatformAdminId: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
    if (existingUser) throw new ConflictException('Já existe um utilizador com este e-mail no sistema.');

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          legalName: dto.legalName,
          nif: dto.nif,
          phone: dto.phone,
          email: dto.adminEmail,
          status: 'active',
        },
      });

      // Permissões (catálogo global — cria só as que ainda não existirem).
      const permissionRecords: { id: string; code: string }[] = [];
      for (const perm of PERMISSIONS) {
        const code = `${perm.module}.${perm.action}`;
        let record = await tx.permission.findUnique({ where: { code } });
        if (!record) {
          record = await tx.permission.create({ data: { module: perm.module, action: perm.action, code } });
        }
        permissionRecords.push(record);
      }

      // Perfis (agora só únicos DENTRO desta organização — outra empresa
      // pode ter perfis com os mesmos códigos, sem conflito).
      let superadminRoleId = '';
      for (const role of ROLES) {
        const record = await tx.role.create({
          data: { organizationId: organization.id, name: role.name, code: role.code, isSystem: role.isSystem },
        });
        if (role.code === 'superadmin') superadminRoleId = record.id;
      }

      // Superadministrador desta nova empresa recebe todas as permissões.
      for (const perm of permissionRecords) {
        await tx.rolePermission.create({ data: { roleId: superadminRoleId, permissionId: perm.id } });
      }

      // Primeiro utilizador administrador desta empresa.
      const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
      const adminUser = await tx.user.create({
        data: {
          organizationId: organization.id,
          fullName: dto.adminFullName,
          email: dto.adminEmail,
          passwordHash,
          status: 'active',
        },
      });
      await tx.userRole.create({ data: { userId: adminUser.id, roleId: superadminRoleId } });

      return { organization, adminUser };
    });

    await this.auditService.log({
      organizationId: result.organization.id,
      userId: createdByPlatformAdminId,
      action: 'platform.organization_created',
      module: 'platform',
      entity: 'Organization',
      entityId: result.organization.id,
      description: `Nova empresa cliente "${result.organization.name}" criada pelo administrador da plataforma, com o administrador inicial "${result.adminUser.email}".`,
    });

    return {
      organization: result.organization,
      admin: { id: result.adminUser.id, email: result.adminUser.email, fullName: result.adminUser.fullName },
    };
  }

  async updateOrganizationStatus(id: string, status: OrganizationStatus, updatedByPlatformAdminId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) throw new NotFoundException('Empresa não encontrada.');

    const updated = await this.prisma.organization.update({ where: { id }, data: { status } });

    await this.auditService.log({
      organizationId: id,
      userId: updatedByPlatformAdminId,
      action: 'platform.organization_status_changed',
      module: 'platform',
      entity: 'Organization',
      entityId: id,
      description: `Estado da empresa "${organization.name}" alterado para "${status}" pelo administrador da plataforma.`,
    });

    return updated;
  }
}
