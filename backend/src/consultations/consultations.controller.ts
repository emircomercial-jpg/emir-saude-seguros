import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('consultations')
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Get('coverage-check/:insuredMemberId')
  @RequirePermissions('consultations.view')
  async checkCoverage(
    @Param('insuredMemberId') insuredMemberId: string,
    @Query('coverageName') coverageName: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.consultationsService.checkCoverage(insuredMemberId, user.organizationId, coverageName);
    return { data, message: 'Verificação de cobertura.' };
  }

  @Get()
  @RequirePermissions('consultations.view')
  async findAll(@Query('insuredMemberId') insuredMemberId: string | undefined, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.consultationsService.findAll(user.organizationId, insuredMemberId);
    return { data, message: 'Lista de consultas.' };
  }

  @Post()
  @RequirePermissions('consultations.create')
  async create(@Body() dto: CreateConsultationDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.consultationsService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Consulta registada com sucesso.' };
  }
}
