import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

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
}
