import { Body, Controller, Delete, Get, Ip, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { generatePolicyContractPdf } from './policy-contract.util';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('policies')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @RequirePermissions('policies.view')
  async findAll(@Query('status') status: string | undefined, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.policiesService.findAll(user.organizationId, status);
    return { data, message: 'Lista de apólices.' };
  }

  @Get(':id')
  @RequirePermissions('policies.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.policiesService.findOne(id, user.organizationId);
    return { data, message: 'Apólice encontrada.' };
  }

  @Post()
  @RequirePermissions('policies.create')
  async create(@Body() dto: CreatePolicyDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.policiesService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Apólice emitida com sucesso.' };
  }

  @Patch(':id')
  @RequirePermissions('policies.update')
  async update(@Param('id') id: string, @Body() dto: UpdatePolicyDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.policiesService.update(id, user.organizationId, dto, user.userId);
    return { data, message: 'Apólice actualizada com sucesso.' };
  }

  @Patch(':id/renew')
  @RequirePermissions('policies.update')
  async renew(
    @Param('id') id: string,
    @Body() body: { endDate: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.policiesService.renew(id, user.organizationId, body.endDate, user.userId);
    return { data, message: 'Apólice renovada com sucesso.' };
  }

  @Patch(':id/status')
  @RequirePermissions('policies.update')
  async setStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.policiesService.setStatus(id, user.organizationId, body.status, user.userId);
    return { data, message: 'Estado da apólice actualizado.' };
  }

  @Post(':id/members')
  @RequirePermissions('policies.update')
  async addMember(
    @Param('id') id: string,
    @Body() body: { insuredMemberId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.policiesService.addMember(id, user.organizationId, body.insuredMemberId, user.userId);
    return { data, message: 'Beneficiário adicionado com sucesso.' };
  }

  @Delete(':id/members/:insuredMemberId')
  @RequirePermissions('policies.update')
  async removeMember(
    @Param('id') id: string,
    @Param('insuredMemberId') insuredMemberId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.policiesService.removeMember(id, user.organizationId, insuredMemberId, user.userId);
    return { data, message: 'Beneficiário removido com sucesso.' };
  }

  @Post(':id/sign')
  @RequirePermissions('policies.update')
  async sign(
    @Param('id') id: string,
    @Body() body: { signedByName: string },
    @Ip() ip: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.policiesService.sign(id, user.organizationId, body.signedByName, ip, user.userId);
    return { data, message: 'Apólice assinada digitalmente com sucesso.' };
  }

  @Get(':id/verify-signature')
  @RequirePermissions('policies.view')
  async verifySignature(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.policiesService.verifySignature(id, user.organizationId);
    return { data, message: 'Verificação de assinatura concluída.' };
  }

  @Get(':id/contract.pdf')
  @RequirePermissions('policies.view')
  async contractPdf(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Res() res: Response) {
    const policy = await this.policiesService.findOne(id, user.organizationId);
    const buffer = await generatePolicyContractPdf(policy as any);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="apolice-${policy.policyNumber}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
