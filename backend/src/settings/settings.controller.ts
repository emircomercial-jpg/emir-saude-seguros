import { Body, Controller, Get, Param, Patch, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { BackupService } from './backup.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly backupService: BackupService,
  ) {}

  @Get()
  @RequirePermissions('settings.view')
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.settingsService.findAll(user.organizationId);
    return { data, message: 'Configurações do sistema.' };
  }

  @Get(':category')
  @RequirePermissions('settings.view')
  async findByCategory(@Param('category') category: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.settingsService.findByCategory(user.organizationId, category);
    return { data, message: `Configurações da categoria "${category}".` };
  }

  @Patch()
  @RequirePermissions('settings.update')
  async update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.settingsService.update(user.organizationId, dto.settings, user.userId);
    return { data, message: 'Configurações actualizadas com sucesso.' };
  }

  // Cópia de segurança manual de todos os dados de negócio (nunca senhas,
  // tokens, ou chaves de integração) — descarregável como ficheiro JSON,
  // como rede de protecção adicional para além da recuperação automática
  // da base de dados.
  @Get('backup/export')
  @RequirePermissions('settings.update')
  async exportBackup(@CurrentUser() user: CurrentUserPayload, @Res() res: Response) {
    const backup = await this.backupService.generateBackup(user.organizationId, user.userId);
    const filename = `emir-saude-seguros-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  }
}
