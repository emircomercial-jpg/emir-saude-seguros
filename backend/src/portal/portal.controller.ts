import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

// Estas rotas propositadamente NÃO usam @RequirePermissions — o acesso é
// concedido a qualquer utilizador autenticado cuja conta esteja ligada a um
// segurado/prestador (verificado dentro do PortalService a partir do
// próprio token, nunca de um parâmetro na URL). Isto é diferente do resto
// do sistema, que usa sempre permissões RBAC explícitas — aqui a "permissão"
// é ser o próprio dono dos dados.
@ApiTags('portal')
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('insured/profile')
  async insuredProfile(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.portalService.getInsuredProfile(user.insuredMemberId);
    return { data, message: 'Perfil do segurado.' };
  }

  @Get('insured/policies')
  async insuredPolicies(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.portalService.getInsuredPolicies(user.insuredMemberId);
    return { data, message: 'Apólices do segurado.' };
  }

  @Get('insured/claims')
  async insuredClaims(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.portalService.getInsuredClaims(user.insuredMemberId);
    return { data, message: 'Sinistros do segurado.' };
  }

  @Get('insured/reimbursements')
  async insuredReimbursements(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.portalService.getInsuredReimbursements(user.insuredMemberId);
    return { data, message: 'Reembolsos do segurado.' };
  }

  @Get('insured/authorizations')
  async insuredAuthorizations(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.portalService.getInsuredAuthorizations(user.insuredMemberId);
    return { data, message: 'Autorizações do segurado.' };
  }

  @Get('insured/premiums')
  async insuredPremiums(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.portalService.getInsuredPremiums(user.insuredMemberId);
    return { data, message: 'Mensalidades do segurado.' };
  }

  @Get('provider/profile')
  async providerProfile(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.portalService.getProviderProfile(user.providerId);
    return { data, message: 'Perfil do prestador.' };
  }

  @Get('provider/authorizations')
  async providerAuthorizations(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.portalService.getProviderAuthorizations(user.providerId);
    return { data, message: 'Autorizações recebidas pelo prestador.' };
  }

  @Get('provider/invoices')
  async providerInvoices(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.portalService.getProviderInvoices(user.providerId);
    return { data, message: 'Facturas do prestador.' };
  }
}
