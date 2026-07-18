import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  async findAll(@Query() query: QueryAuditLogsDto, @CurrentUser() user: CurrentUserPayload) {
    const { items, meta } = await this.auditService.findAll(user.organizationId, query);
    return { data: items, meta, message: 'Registos de auditoria.' };
  }

  @Get(':id')
  @RequirePermissions('audit.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.auditService.findOne(id, user.organizationId);
    return { data, message: 'Registo de auditoria encontrado.' };
  }
}
