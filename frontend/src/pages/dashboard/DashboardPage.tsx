import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, UserCheck, Building2, FileText, ClipboardList, AlertCircle,
  History, AlertTriangle, Server, CloudOff,
} from 'lucide-react';
import {
  getSummary, getRevenueExpenses, getMemberGrowth, getPlanUsage,
  getAuthorizationStatus, getRecentActivities, getAlerts, getSystemStatus,
} from '@/services/dashboardService';
import { getCachedDashboard } from '@/offline/cacheService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#0F4C81', '#5BB6E6', '#4CAF50', '#F2B134'];

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="w-11 h-11 rounded-lg bg-institutional flex items-center justify-center shrink-0">
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-text-primary">{value}</p>
          <p className="text-sm text-text-secondary">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [cachedFallback, setCachedFallback] = useState<{ data: any; updatedAt: string } | null>(null);

  const { data: summary, isLoading: loadingSummary, isError: summaryError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getSummary,
    retry: 1,
  });

  // Sem internet ou sem resposta do servidor: recorre ao último cache local
  // (secção 22 do briefing: "o dashboard pode mostrar o último cache quando
  // ficar offline").
  useEffect(() => {
    if (summaryError) {
      getCachedDashboard().then((cached) => {
        if (cached) setCachedFallback({ data: cached.data, updatedAt: cached.updatedAt });
      });
    }
  }, [summaryError]);

  const effectiveSummary = summary || cachedFallback?.data;
  const { data: revenueExpenses } = useQuery({ queryKey: ['dashboard-revenue'], queryFn: getRevenueExpenses });
  const { data: memberGrowth } = useQuery({ queryKey: ['dashboard-growth'], queryFn: getMemberGrowth });
  const { data: planUsage } = useQuery({ queryKey: ['dashboard-plan-usage'], queryFn: getPlanUsage });
  const { data: authStatus } = useQuery({ queryKey: ['dashboard-auth-status'], queryFn: getAuthorizationStatus });
  const { data: activities } = useQuery({ queryKey: ['dashboard-activities'], queryFn: getRecentActivities });
  const { data: alerts } = useQuery({ queryKey: ['dashboard-alerts'], queryFn: getAlerts });
  const { data: systemStatus } = useQuery({ queryKey: ['dashboard-system-status'], queryFn: getSystemStatus, refetchInterval: 30_000 });

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1">Dashboard</h1>
      <p className="text-text-secondary text-sm mb-6">
        Visão geral do sistema, com dados reais de todos os módulos implementados.
      </p>

      {cachedFallback && !summary && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-warning/10 text-warning text-xs px-3 py-2">
          <CloudOff size={14} />
          A mostrar dados em cache de {new Date(cachedFallback.updatedAt).toLocaleString('pt-PT')} (sem ligação ao servidor).
        </div>
      )}

      {loadingSummary ? (
        <p className="text-text-secondary text-sm">A carregar indicadores…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={Users} label="Utilizadores activos" value={effectiveSummary?.activeUsers ?? '—'} />
          <KpiCard icon={UserCheck} label="Segurados activos" value={effectiveSummary?.activeInsuredMembers ?? '—'} />
          <KpiCard icon={Building2} label="Empresas clientes" value={effectiveSummary?.clientCompanies ?? '—'} />
          <KpiCard icon={FileText} label="Apólices activas" value={effectiveSummary?.activePolicies ?? '—'} />
          <KpiCard icon={ClipboardList} label="Autorizações pendentes" value={effectiveSummary?.pendingAuthorizations ?? '—'} />
          <KpiCard icon={AlertCircle} label="Mensalidades em atraso" value={effectiveSummary?.overduePremiums ?? '—'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle>Receitas e Despesas</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueExpenses?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#4CAF50" name="Receita" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#D64545" name="Despesa" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Evolução de Segurados</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={memberGrowth?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0F4C81" name="Segurados" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Utilização por Plano</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planUsage?.series || []} dataKey="percentage" nameKey="plan" outerRadius={80} label>
                  {(planUsage?.series || []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Autorizações por Estado</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={authStatus?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#5BB6E6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Actividades Recentes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activities?.length === 0 && <p className="text-sm text-text-secondary">Sem actividade registada.</p>}
            {activities?.map((a: any) => (
              <div key={a.id} className="flex items-start gap-2 text-sm border-b pb-2 last:border-0">
                <History size={14} className="text-text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-text-primary">{a.description || a.action}</p>
                  <p className="text-xs text-text-secondary">
                    {a.userName} · {new Date(a.createdAt).toLocaleString('pt-PT')}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Alertas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {alerts?.items?.map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                  <span>{a.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Estado do Servidor</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Server size={14} /> Base de dados</span>
                <Badge variant={systemStatus?.database === 'up' ? 'success' : 'destructive'}>
                  {systemStatus?.database || '—'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <span>Ambiente</span>
                <span>{systemStatus?.environment || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <span>Tempo activo</span>
                <span>{systemStatus ? `${Math.floor(systemStatus.uptimeSeconds / 60)} min` : '—'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
