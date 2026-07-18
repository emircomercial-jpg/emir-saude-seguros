import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import UsersPage from '@/pages/users/UsersPage';
import InsuredPage from '@/pages/insured/InsuredPage';
import PlansPage from '@/pages/plans/PlansPage';
import CompaniesPage from '@/pages/companies/CompaniesPage';
import PoliciesPage from '@/pages/policies/PoliciesPage';
import CardsPage from '@/pages/cards/CardsPage';
import ProvidersPage from '@/pages/providers/ProvidersPage';
import AuthorizationsPage from '@/pages/authorizations/AuthorizationsPage';
import ConsultationsPage from '@/pages/consultations/ConsultationsPage';
import PharmacyPage from '@/pages/pharmacy/PharmacyPage';
import LaboratoryPage from '@/pages/laboratory/LaboratoryPage';
import ClaimsReimbursementsPage from '@/pages/claims/ClaimsReimbursementsPage';
import FinancePage from '@/pages/finance/FinancePage';
import ReportsPage from '@/pages/reports/ReportsPage';
import PortalLayout from '@/components/portal/PortalLayout';
import InsuredPortalPage from '@/pages/portal/InsuredPortalPage';
import ProviderPortalPage from '@/pages/portal/ProviderPortalPage';
import RolesPage from '@/pages/roles/RolesPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import AuditPage from '@/pages/audit/AuditPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import NotFoundPage from '@/pages/errors/NotFoundPage';
import ForbiddenPage from '@/pages/errors/ForbiddenPage';

// Árvore de rotas (secção 3 do briefing). Todas as rotas protegidas partilham
// o layout administrativo (menu lateral + cabeçalho + breadcrumb + rodapé).
export default function AppRoutes() {
  return (
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
  );
}
