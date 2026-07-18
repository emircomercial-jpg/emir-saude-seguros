import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermissions('dashboard.view')
  async summary(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.summary(user.organizationId);
    return { data, message: 'Resumo do dashboard.' };
  }

  @Get('revenue-expenses')
  @RequirePermissions('dashboard.view')
  async revenueExpenses(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.revenueExpenses(user.organizationId);
    return { data, message: 'Receitas e despesas.' };
  }

  @Get('member-growth')
  @RequirePermissions('dashboard.view')
  async memberGrowth(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.memberGrowth(user.organizationId);
    return { data, message: 'Evolução de segurados.' };
  }

  @Get('plan-usage')
  @RequirePermissions('dashboard.view')
  async planUsage(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.planUsage(user.organizationId);
    return { data, message: 'Utilização por plano.' };
  }

  @Get('authorization-status')
  @RequirePermissions('dashboard.view')
  async authorizationStatus(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.authorizationStatus(user.organizationId);
    return { data, message: 'Autorizações por estado.' };
  }

  @Get('recent-activities')
  @RequirePermissions('dashboard.view')
  async recentActivities(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.recentActivities(user.organizationId);
    return { data, message: 'Actividades recentes.' };
  }

  @Get('alerts')
  @RequirePermissions('dashboard.view')
  async alerts(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.dashboardService.alerts(user.organizationId);
    return { data, message: 'Alertas do sistema.' };
  }

  @Get('system-status')
  @RequirePermissions('dashboard.view')
  async systemStatus() {
    const data = await this.dashboardService.systemStatus();
    return { data, message: 'Estado do servidor.' };
  }
}
