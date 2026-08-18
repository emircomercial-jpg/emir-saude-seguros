import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import PortalLayout from '@/components/portal/PortalLayout';

// Todas as páginas são carregadas "à demanda" (lazy) — cada uma só é
// descarregada pelo browser quando o utilizador de facto a visita, em vez
// de tudo vir junto num único ficheiro grande logo no primeiro acesso.
// Isto reduz drasticamente o tamanho do primeiro carregamento (importante
// para velocidade e consumo de dados, especialmente em ligações móveis
// mais lentas) — o "shell" da aplicação (login, layout, menu) carrega
// quase instantaneamente, e cada módulo chega só quando é preciso.
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const UsersPage = lazy(() => import('@/pages/users/UsersPage'));
const InsuredPage = lazy(() => import('@/pages/insured/InsuredPage'));
const PlansPage = lazy(() => import('@/pages/plans/PlansPage'));
const InsurancePage = lazy(() => import('@/pages/insurance/InsurancePage'));
const DependentsPage = lazy(() => import('@/pages/dependents/DependentsPage'));
const CompaniesPage = lazy(() => import('@/pages/companies/CompaniesPage'));
const PoliciesPage = lazy(() => import('@/pages/policies/PoliciesPage'));
const CardsPage = lazy(() => import('@/pages/cards/CardsPage'));
const ProvidersPage = lazy(() => import('@/pages/providers/ProvidersPage'));
const AuthorizationsPage = lazy(() => import('@/pages/authorizations/AuthorizationsPage'));
const ConsultationsPage = lazy(() => import('@/pages/consultations/ConsultationsPage'));
const PharmacyPage = lazy(() => import('@/pages/pharmacy/PharmacyPage'));
const LaboratoryPage = lazy(() => import('@/pages/laboratory/LaboratoryPage'));
const ClaimsReimbursementsPage = lazy(() => import('@/pages/claims/ClaimsReimbursementsPage'));
const FinancePage = lazy(() => import('@/pages/finance/FinancePage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const IntegrationsPage = lazy(() => import('@/pages/integrations/IntegrationsPage'));
const AgreementsPage = lazy(() => import('@/pages/agreements/AgreementsPage'));
const PlatformPage = lazy(() => import('@/pages/platform/PlatformPage'));
const InsuredPortalPage = lazy(() => import('@/pages/portal/InsuredPortalPage'));
const ProviderPortalPage = lazy(() => import('@/pages/portal/ProviderPortalPage'));
const RolesPage = lazy(() => import('@/pages/roles/RolesPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const AuditPage = lazy(() => import('@/pages/audit/AuditPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'));
const ForbiddenPage = lazy(() => import('@/pages/errors/ForbiddenPage'));

// Indicador simples mostrado por instantes enquanto o pedaço da página
// pedida ainda está a chegar (normalmente imperceptível em boa ligação).
function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="animate-spin text-institutional" size={28} />
    </div>
  );
}

// Árvore de rotas (secção 3 do briefing). Todas as rotas protegidas partilham
// o layout administrativo (menu lateral + cabeçalho + breadcrumb + rodapé).
export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/portal/segurado" element={<PortalLayout title="Portal do Segurado" />}>
            <Route index element={<InsuredPortalPage />} />
          </Route>
          <Route path="/portal/prestador" element={<PortalLayout title="Portal do Prestador" />}>
            <Route index element={<ProviderPortalPage />} />
          </Route>

          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/segurados" element={<InsuredPage />} />
            <Route path="/planos" element={<PlansPage />} />
            <Route path="/seguros" element={<InsurancePage />} />
            <Route path="/dependentes" element={<DependentsPage />} />
            <Route path="/empresas" element={<CompaniesPage />} />
            <Route path="/apolices" element={<PoliciesPage />} />
            <Route path="/cartoes" element={<CardsPage />} />
            <Route path="/prestadores" element={<ProvidersPage />} />
            <Route path="/autorizacoes" element={<AuthorizationsPage />} />
            <Route path="/consultas" element={<ConsultationsPage />} />
            <Route path="/farmacia" element={<PharmacyPage />} />
            <Route path="/laboratorio" element={<LaboratoryPage />} />
            <Route path="/sinistros" element={<ClaimsReimbursementsPage />} />
            <Route path="/reembolsos" element={<ClaimsReimbursementsPage />} />
            <Route path="/facturacao" element={<FinancePage />} />
            <Route path="/pagamentos" element={<FinancePage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route path="/integracoes" element={<IntegrationsPage />} />
            <Route path="/convenios" element={<AgreementsPage />} />
            <Route path="/plataforma" element={<PlatformPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
