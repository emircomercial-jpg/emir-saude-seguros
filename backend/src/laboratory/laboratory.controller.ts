import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LaboratoryService } from './laboratory.service';
import { CreateLabRequestDto } from './dto/create-lab-request.dto';
import { AttachResultDto } from './dto/attach-result.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('laboratory')
@Controller('laboratory')
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @Get('requests')
  @RequirePermissions('laboratory.view')
  async findAll(@Query('status') status: string | undefined, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.laboratoryService.findAll(user.organizationId, status);
    return { data, message: 'Lista de solicitações de exame.' };
  }

  @Post('requests')
  @RequirePermissions('laboratory.create')
  async createRequest(@Body() dto: CreateLabRequestDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.laboratoryService.createRequest(user.organizationId, dto, user.userId);
    return { data, message: 'Exame solicitado com sucesso.' };
  }

  @Patch('requests/:id/status')
  @RequirePermissions('laboratory.update')
  async setStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.laboratoryService.setStatus(id, user.organizationId, body.status, user.userId);
    return { data, message: 'Estado do exame actualizado.' };
  }

  @Post('requests/:id/result')
  @RequirePermissions('laboratory.update')
  async attachResult(
    @Param('id') id: string,
    @Body() dto: AttachResultDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.laboratoryService.attachResult(id, user.organizationId, dto, user.userId);
    return { data, message: 'Resultado anexado com sucesso.' };
  }
}
