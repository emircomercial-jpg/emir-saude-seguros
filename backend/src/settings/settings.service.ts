import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

// Configurações do sistema (secção 20 do briefing): dados da organização,
// localização, moeda, idioma, fuso horário, segurança e sessão. Guardadas
// como pares chave/valor (system_settings), agrupadas por categoria.
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string) {
    const settings = await this.prisma.systemSetting.findMany({ where: { organizationId } });
    return this.groupByCategory(settings);
  }

  async findByCategory(organizationId: string, category: string) {
    const settings = await this.prisma.systemSetting.findMany({
      where: { organizationId, category },
    });
    return settings;
  }

  private groupByCategory(settings: { category: string | null; key: string; value: any }[]) {
    const grouped: Record<string, { key: string; value: any }[]> = {};
    for (const setting of settings) {
      const category = setting.category || 'general';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push({ key: setting.key, value: setting.value });
    }
    return grouped;
  }

  async update(
    organizationId: string,
    settings: { key: string; value: unknown }[],
    updatedBy: string,
  ) {
    await this.prisma.$transaction(
      settings.map((s) =>
        this.prisma.systemSetting.upsert({
          where: { organizationId_key: { organizationId, key: s.key } },
          update: { value: s.value as any },
          create: { organizationId, key: s.key, value: s.value as any },
        }),
      ),
    );

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'settings.update',
      module: 'settings',
      description: `${settings.length} configuração(ões) actualizada(s).`,
      newValues: settings,
    });

    return this.findAll(organizationId);
  }
}
