import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('permissions.view')
  async findAll() {
    const data = await this.permissionsService.findAll();
    return { data, message: 'Catálogo de permissões.' };
  }

  @Get('grouped')
  @RequirePermissions('permissions.view')
  async findGrouped() {
    const data = await this.permissionsService.findGrouped();
    return { data, message: 'Permissões agrupadas por módulo.' };
  }
}
