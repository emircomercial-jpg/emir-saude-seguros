import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReimbursementsService } from './reimbursements.service';
import { CreateReimbursementDto } from './dto/create-reimbursement.dto';
import { UpdateReimbursementStatusDto } from './dto/update-reimbursement-status.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('reimbursements')
@Controller('reimbursements')
export class ReimbursementsController {
  constructor(private readonly reimbursementsService: ReimbursementsService) {}

  @Get()
  @RequirePermissions('reimbursements.view')
  async findAll(@Query('status') status: string | undefined, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.reimbursementsService.findAll(user.organizationId, status);
    return { data, message: 'Lista de reembolsos.' };
  }

  @Get(':id')
  @RequirePermissions('reimbursements.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.reimbursementsService.findOne(id, user.organizationId);
    return { data, message: 'Reembolso encontrado.' };
  }

  @Post()
  @RequirePermissions('reimbursements.create')
  async create(@Body() dto: CreateReimbursementDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.reimbursementsService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Reembolso submetido com sucesso.' };
  }

  @Patch(':id/status')
  @RequirePermissions('reimbursements.approve')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReimbursementStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.reimbursementsService.updateStatus(id, user.organizationId, dto, user.userId);
    return { data, message: 'Estado do reembolso actualizado.' };
  }
}
