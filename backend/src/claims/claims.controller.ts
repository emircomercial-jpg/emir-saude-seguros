import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimStatusDto } from './dto/update-claim-status.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('claims')
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Get()
  @RequirePermissions('claims.view')
  async findAll(@Query('status') status: string | undefined, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.claimsService.findAll(user.organizationId, status);
    return { data, message: 'Lista de sinistros.' };
  }

  @Get(':id')
  @RequirePermissions('claims.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.claimsService.findOne(id, user.organizationId);
    return { data, message: 'Sinistro encontrado.' };
  }

  @Post()
  @RequirePermissions('claims.create')
  async create(@Body() dto: CreateClaimDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.claimsService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Sinistro submetido com sucesso.' };
  }

  @Patch(':id/status')
  @RequirePermissions('claims.approve')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateClaimStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.claimsService.updateStatus(id, user.organizationId, dto, user.userId);
    return { data, message: 'Estado do sinistro actualizado.' };
  }
}
