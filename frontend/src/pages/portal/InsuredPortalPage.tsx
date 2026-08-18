import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  User, Users2, FileText, FileHeart, Undo2, ClipboardList, Wallet, CreditCard,
  Download, Loader2, AlertTriangle, CalendarClock, Info,
} from 'lucide-react';
import {
  getInsuredPortalProfile, getInsuredPortalPolicies, getInsuredPortalClaims,
  getInsuredPortalReimbursements, getInsuredPortalAuthorizations, getInsuredPortalPremiums,
  downloadOwnInsuranceCard, downloadOwnPolicyContract,
} from '@/services/portalService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

type Tab = 'perfil' | 'apolices' | 'sinistros' | 'reembolsos' | 'autorizacoes' | 'mensalidades';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'perfil', label: 'Meu Perfil', icon: User },
  { key: 'apolices', label: 'Apólices', icon: FileText },
  { key: 'sinistros', label: 'Sinistros', icon: FileHeart },
  { key: 'reembolsos', label: 'Reembolsos', icon: Undo2 },
  { key: 'autorizacoes', label: 'Autorizações', icon: ClipboardList },
  { key: 'mensalidades', label: 'Mensalidades', icon: Wallet },
];

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submetido', triage: 'Em triagem', in_review: 'Em análise',
  clinical_audit: 'Auditoria clínica', financial_audit: 'Auditoria financeira',
  approved: 'Aprovado', rejected: 'Rejeitado', paid: 'Pago', closed: 'Encerrado',
  awaiting_documents: 'A aguardar documentos', under_validation: 'Em validação',
  partially_approved: 'Parcialmente aprovado', pending: 'Pendente', overdue: 'Em atraso',
  active: 'Activo', cancelled: 'Cancelado', expired: 'Expirado',
};
const STATUS_VARIANT: Record<string, any> = {
  approved: 'success', paid: 'success', active: 'success',
  rejected: 'destructive', overdue: 'destructive', cancelled: 'destructive', expired: 'destructive',
  pending: 'warning', submitted: 'warning', awaiting_documents: 'warning',
};

// Dias antes do vencimento de uma apólice a partir dos quais mostramos um
// lembrete de renovação, bem visível — para o cliente nunca ser apanhado
// de surpresa com a cobertura a terminar sem se aperceber.
const RENEWAL_REMINDER_DAYS = 45;

function ProfileTab() {
  const { data, isLoading } = useQuery({ queryKey: ['portal-insured-profile'], queryFn: getInsuredPortalProfile });

  const cardMutation = useMutation({
    mutationFn: downloadOwnInsuranceCard,
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (isLoading) return <p className="text-text-secondary text-sm">A carregar…</p>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Os meus dados</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>Nome:</strong> {data.fullName}</p>
          <p><strong>Nº interno:</strong> {data.internalNumber}</p>
          <p><strong>Estado:</strong> <Badge variant={STATUS_VARIANT[data.status]}>{STATUS_LABELS[data.status] || data.status}</Badge></p>
          <p><strong>Telefone:</strong> {data.phone || '—'}</p>
          <p><strong>E-mail:</strong> {data.email || '—'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Users2 size={16} /> <CardTitle>Dependentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {data.dependents.length === 0 && <p className="text-text-secondary">Nenhum dependente associado.</p>}
          {data.dependents.map((d: any) => <p key={d.id}>{d.fullName} — {d.relationship}</p>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CreditCard size={16} /> <CardTitle>O meu Cartão de Seguro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.cards.length === 0 && <p className="text-text-secondary">Nenhum cartão emitido.</p>}
          {data.cards.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between">
              <span>{c.cardNumber} — <Badge variant={c.status === 'active' ? 'success' : 'muted'}>{c.status === 'active' ? 'Activo' : c.status}</Badge></span>
            </div>
          ))}
          {data.cards.some((c: any) => c.status === 'active') && (
            <Button size="sm" variant="outline" onClick={() => cardMutation.mutate()} disabled={cardMutation.isPending}>
              {cardMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Download size={14} className="mr-1.5" />}
              Descarregar cartão (PDF)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PoliciesTab() {
  const { data, isLoading } = useQuery<any[]>({ queryKey: ['portal-insured-policies'], queryFn: getInsuredPortalPolicies });

  const contractMutation = useMutation({
    mutationFn: ({ id, number }: { id: string; number: string }) => downloadOwnPolicyContract(id, number),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (isLoading) return <p className="text-text-secondary text-sm">A carregar…</p>;

  return (
    <div className="space-y-3">
      {(data?.length ?? 0) === 0 && (
        <Card><CardContent className="pt-5 text-sm text-text-secondary">Nenhuma apólice associada.</CardContent></Card>
      )}
      {data?.map((pm: any) => {
        const endDate = new Date(pm.policy.endDate);
        const daysToExpiry = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const isRenewalDue = daysToExpiry > 0 && daysToExpiry <= RENEWAL_REMINDER_DAYS;
        const isExpired = daysToExpiry <= 0;

        return (
          <Card key={pm.id}>
            <CardContent className="pt-5 space-y-2">
              {isRenewalDue && (
                <div className="flex items-center gap-2 bg-warning/10 text-warning text-xs rounded-md px-3 py-2">
                  <CalendarClock size={14} /> A tua cobertura vence dentro de {daysToExpiry} dias — contacta-nos para renovar.
                </div>
              )}
              {isExpired && (
                <div className="flex items-center gap-2 bg-alert/10 text-alert text-xs rounded-md px-3 py-2">
                  <AlertTriangle size={14} /> Esta apólice já venceu. Contacta-nos para renovar a tua cobertura.
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{pm.policy.policyNumber} — {pm.policy.plan.name}</p>
                  <p className="text-xs text-text-secondary">Válida até {endDate.toLocaleDateString('pt-PT')}</p>
                </div>
                <Button
                  size="sm" variant="outline"
                  onClick={() => contractMutation.mutate({ id: pm.policy.id, number: pm.policy.policyNumber })}
                  disabled={contractMutation.isPending}
                >
                  {contractMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Download size={14} className="mr-1.5" />}
                  Contrato (PDF)
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function GenericListTab({ queryKey, queryFn, renderItem, emptyLabel }: any) {
  const { data, isLoading } = useQuery<any[]>({ queryKey, queryFn });
  if (isLoading) return <p className="text-text-secondary text-sm">A carregar…</p>;
  return (
    <Card>
      <CardContent className="space-y-2 pt-5">
        {data?.length === 0 && <p className="text-text-secondary text-sm">{emptyLabel}</p>}
        {data?.map((item: any) => renderItem(item))}
      </CardContent>
    </Card>
  );
}

function PremiumsTab() {
  const { data, isLoading } = useQuery<any[]>({ queryKey: ['portal-insured-premiums'], queryFn: getInsuredPortalPremiums });
  if (isLoading) return <p className="text-text-secondary text-sm">A carregar…</p>;

  const overdue = data?.filter((p) => p.status === 'overdue' || p.status === 'pending') ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 bg-muted/50 text-text-secondary text-xs rounded-md px-3 py-2.5">
        <Info size={14} className="shrink-0 mt-0.5" />
        O pagamento online directo ainda não está disponível nesta versão do sistema — para pagares uma mensalidade,
        contacta a nossa equipa através dos canais habituais, indicando o valor e a data em baixo.
      </div>
      <Card>
        <CardContent className="space-y-2 pt-5">
          {data?.length === 0 && <p className="text-text-secondary text-sm">Nenhuma mensalidade gerada.</p>}
          {data?.map((p: any) => (
            <div key={p.id} className="text-sm border-b py-2 last:border-b-0 flex justify-between items-center">
              <span>{new Date(p.dueDate).toLocaleDateString('pt-PT')} — {Number(p.value).toLocaleString()} Kz</span>
              <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABELS[p.status] || p.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      {overdue.length > 0 && (
        <div className="flex items-center gap-2 bg-alert/10 text-alert text-xs rounded-md px-3 py-2">
          <AlertTriangle size={14} /> Tens {overdue.length} mensalidade(s) por regularizar.
        </div>
      )}
    </div>
  );
}

export default function InsuredPortalPage() {
  const [tab, setTab] = useState<Tab>('perfil');

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">Portal do Cliente</h1>

      <div className="flex gap-1 mb-5 border-b overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap ${
              tab === key ? 'border-institutional text-institutional font-medium' : 'border-transparent text-text-secondary'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && <ProfileTab />}
      {tab === 'apolices' && <PoliciesTab />}

      {tab === 'sinistros' && (
        <GenericListTab
          queryKey={['portal-insured-claims']}
          queryFn={getInsuredPortalClaims}
          emptyLabel="Nenhum sinistro submetido."
          renderItem={(c: any) => (
            <div key={c.id} className="text-sm border-b py-2 last:border-b-0 flex justify-between">
              <span>{c.claimNumber}</span><Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABELS[c.status] || c.status}</Badge>
            </div>
          )}
        />
      )}

      {tab === 'reembolsos' && (
        <GenericListTab
          queryKey={['portal-insured-reimbursements']}
          queryFn={getInsuredPortalReimbursements}
          emptyLabel="Nenhum reembolso submetido."
          renderItem={(r: any) => (
            <div key={r.id} className="text-sm border-b py-2 last:border-b-0 flex justify-between">
              <span>{r.reimbursementNumber}</span><Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABELS[r.status] || r.status}</Badge>
            </div>
          )}
        />
      )}

      {tab === 'autorizacoes' && (
        <GenericListTab
          queryKey={['portal-insured-authorizations']}
          queryFn={getInsuredPortalAuthorizations}
          emptyLabel="Nenhuma autorização solicitada."
          renderItem={(a: any) => (
            <div key={a.id} className="text-sm border-b py-2 last:border-b-0 flex justify-between">
              <span>{a.requestNumber}</span><Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABELS[a.status] || a.status}</Badge>
            </div>
          )}
        />
      )}

      {tab === 'mensalidades' && <PremiumsTab />}
    </div>
  );
}
