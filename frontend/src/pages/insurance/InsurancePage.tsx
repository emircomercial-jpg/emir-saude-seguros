import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Shield, ShieldPlus, FileText, Building2, AlertTriangle, TrendingUp } from 'lucide-react';
import { listPlans } from '@/services/planService';
import { listPolicies } from '@/services/policyService';
import { listCompanies } from '@/services/companyService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// "Seguros" — visão geral consolidada do lado comercial do negócio (Planos,
// Apólices, Empresas), reunindo dados já existentes nos três módulos numa
// única página de arranque rápido, sem duplicar nenhuma funcionalidade já
// coberta em Planos/Apólices/Empresas (essas continuam a ser as páginas de
// gestão detalhada — esta é o "painel de controlo" comercial).

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function InsurancePage() {
  const { data: plans, isLoading: loadingPlans } = useQuery({ queryKey: ['insurance-plans'], queryFn: listPlans });
  const { data: policies, isLoading: loadingPolicies } = useQuery({ queryKey: ['insurance-policies'], queryFn: () => listPolicies() });
  const { data: companiesResult, isLoading: loadingCompanies } = useQuery({
    queryKey: ['insurance-companies'], queryFn: () => listCompanies({ pageSize: 200 }),
  });

  const isLoading = loadingPlans || loadingPolicies || loadingCompanies;
  const companies = companiesResult?.items ?? [];

  const stats = useMemo(() => {
    const activePlans = (plans ?? []).filter((p) => p.status === 'active').length;
    const activePolicies = (policies ?? []).filter((p) => p.status === 'active').length;
    const activeCompanies = companies.filter((c) => c.status === 'active').length;
    const totalMonthlyValue = (policies ?? [])
      .filter((p) => p.status === 'active')
      .reduce((sum, p) => sum + Number(p.value || 0), 0);
    const expiringPolicies = (policies ?? []).filter(
      (p) => p.status === 'active' && daysUntil(p.endDate) <= 30 && daysUntil(p.endDate) >= 0,
    );
    return { activePlans, activePolicies, activeCompanies, totalMonthlyValue, expiringPolicies };
  }, [plans, policies, companies]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1 flex items-center gap-2">
        <Shield size={20} /> Seguros — Visão Geral
      </h1>
      <p className="text-sm text-text-secondary mb-5">
        Resumo comercial: planos, apólices e empresas clientes. Para gerir em detalhe, usa as páginas
        {' '}<Link to="/planos" className="text-institutional underline">Planos</Link>,
        {' '}<Link to="/apolices" className="text-institutional underline">Apólices</Link> ou
        {' '}<Link to="/empresas" className="text-institutional underline">Empresas</Link>.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
              <ShieldPlus size={15} /> Planos activos
            </div>
            <p className="text-2xl font-semibold text-text-primary">{isLoading ? '—' : stats.activePlans}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
              <FileText size={15} /> Apólices activas
            </div>
            <p className="text-2xl font-semibold text-text-primary">{isLoading ? '—' : stats.activePolicies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
              <Building2 size={15} /> Empresas activas
            </div>
            <p className="text-2xl font-semibold text-text-primary">{isLoading ? '—' : stats.activeCompanies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
              <TrendingUp size={15} /> Valor mensal em vigor
            </div>
            <p className="text-2xl font-semibold text-text-primary">
              {isLoading ? '—' : `${stats.totalMonthlyValue.toLocaleString()} Kz`}
            </p>
          </CardContent>
        </Card>
      </div>

      {!isLoading && stats.expiringPolicies.length > 0 && (
        <Card className="mb-6 border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning text-base">
              <AlertTriangle size={16} /> Apólices a vencer nos próximos 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.expiringPolicies.map((p) => (
              <div key={p.id} className="flex justify-between text-sm border-b pb-2 last:border-b-0">
                <span>{p.policyNumber} — {p.plan.name}{p.company ? ` (${p.company.legalName})` : ''}</span>
                <Badge variant="warning">{daysUntil(p.endDate)} dias</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Planos por adesão</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(plans ?? []).length === 0 && <p className="text-text-secondary text-sm">Nenhum plano criado ainda.</p>}
            {(plans ?? []).map((plan) => {
              const companiesOnPlan = companies.filter((c) => c.planId === plan.id).length;
              return (
                <div key={plan.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-b-0">
                  <span>{plan.name} <span className="text-text-secondary">({plan.monthlyValue.toLocaleString()} Kz/mês)</span></span>
                  <Badge variant={plan.status === 'active' ? 'success' : 'muted'}>{companiesOnPlan} empresa(s)</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Últimas apólices emitidas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(policies ?? []).length === 0 && <p className="text-text-secondary text-sm">Nenhuma apólice emitida ainda.</p>}
            {(policies ?? []).slice(0, 8).map((p) => (
              <div key={p.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-b-0">
                <span>{p.policyNumber} — {p.plan.name}</span>
                <Badge variant={p.status === 'active' ? 'success' : 'muted'}>{p.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
