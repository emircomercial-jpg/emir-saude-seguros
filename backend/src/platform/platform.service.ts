import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OrganizationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PERMISSIONS, ROLES } from './platform-defaults';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { SetSubscriptionDto } from './dto/set-subscription.dto';

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
    const now = new Date();
    return organizations.map((org) => {
      let isOverdue = false;
      if (org.subscriptionNextDueDate) {
        const graceDeadline = new Date(org.subscriptionNextDueDate);
        graceDeadline.setDate(graceDeadline.getDate() + 5);
        isOverdue = graceDeadline < now;
      }
      return {
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
        subscriptionValue: org.subscriptionValue,
        subscriptionNextDueDate: org.subscriptionNextDueDate,
        subscriptionLastPaymentAt: org.subscriptionLastPaymentAt,
        isOverdue,
      };
    });
  }

  // Cria uma empresa cliente nova, completa e pronta a usar: a própria
  // organização, todas as permissões e perfis padrão (partilhados com o
  // seed original — ver platform-defaults.ts), o perfil Superadministrador
  // com acesso total, e o primeiro utilizador administrador dessa empresa.
  // Tudo numa única transacção — ou fica tudo criado, ou nada fica.
  // Núcleo da criação de uma empresa cliente — organização, permissões,
  // perfis, e primeiro utilizador administrador, tudo numa única
  // transacção. Usado tanto pela criação manual (administrador da
  // plataforma) como pelo auto-registo público (ver selfRegisterOrganization).
  private async createOrganizationCore(dto: CreateOrganizationDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
    if (existingUser) throw new ConflictException('Já existe um utilizador com este e-mail no sistema.');

    return this.prisma.$transaction(async (tx) => {
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
  }

  async createOrganization(dto: CreateOrganizationDto, createdByPlatformAdminId: string) {
    const result = await this.createOrganizationCore(dto);

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

  // Auto-registo público — qualquer empresa interessada pode criar a sua
  // própria conta, imediatamente utilizável, sem precisar de aprovação
  // manual. Regista de forma diferente no histórico (para se distinguir
  // claramente das empresas criadas manualmente pelo administrador da
  // plataforma) e nunca é chamado com uma sessão de utilizador associada.
  async selfRegisterOrganization(dto: CreateOrganizationDto) {
    const result = await this.createOrganizationCore(dto);

    await this.auditService.log({
      organizationId: result.organization.id,
      userId: result.adminUser.id,
      action: 'platform.organization_self_registered',
      module: 'platform',
      entity: 'Organization',
      entityId: result.organization.id,
      description: `Nova empresa cliente "${result.organization.name}" registada por auto-registo público, com o administrador inicial "${result.adminUser.email}".`,
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

  // Define (ou actualiza) o valor e a data de vencimento da assinatura
  // desta empresa cliente ao software.
  async setSubscription(id: string, dto: SetSubscriptionDto, updatedByPlatformAdminId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) throw new NotFoundException('Empresa não encontrada.');

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        subscriptionValue: dto.subscriptionValue as unknown as Prisma.Decimal,
        subscriptionNextDueDate: new Date(dto.subscriptionNextDueDate),
      },
    });

    await this.auditService.log({
      organizationId: id,
      userId: updatedByPlatformAdminId,
      action: 'platform.subscription_set',
      module: 'platform',
      entity: 'Organization',
      entityId: id,
      description: `Assinatura da empresa "${organization.name}" definida: ${dto.subscriptionValue} Kz/mês, vencimento em ${dto.subscriptionNextDueDate}.`,
    });

    return updated;
  }

  // Regista um pagamento da assinatura — avança a data de vencimento em 1
  // mês a partir de hoje, e reactiva automaticamente a empresa se estava
  // suspensa (o acesso volta de imediato, sem precisar de outra acção).
  async recordSubscriptionPayment(id: string, registeredByPlatformAdminId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) throw new NotFoundException('Empresa não encontrada.');

    const now = new Date();
    const nextDueDate = new Date(now);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        subscriptionLastPaymentAt: now,
        subscriptionNextDueDate: nextDueDate,
        status: organization.status === 'suspended' ? 'active' : organization.status,
      },
    });

    await this.auditService.log({
      organizationId: id,
      userId: registeredByPlatformAdminId,
      action: 'platform.subscription_payment_recorded',
      module: 'platform',
      entity: 'Organization',
      entityId: id,
      description: `Pagamento da assinatura da empresa "${organization.name}" registado. Próximo vencimento: ${nextDueDate.toLocaleDateString('pt-PT')}.`,
    });

    return updated;
  }
}
