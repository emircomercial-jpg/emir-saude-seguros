import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Users2, FileText, FileHeart, Undo2, ClipboardList, Wallet, CreditCard } from 'lucide-react';
import {
  getInsuredPortalProfile, getInsuredPortalPolicies, getInsuredPortalClaims,
  getInsuredPortalReimbursements, getInsuredPortalAuthorizations, getInsuredPortalPremiums,
} from '@/services/portalService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Tab = 'perfil' | 'apolices' | 'sinistros' | 'reembolsos' | 'autorizacoes' | 'mensalidades';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'perfil', label: 'Meu Perfil', icon: User },
  { key: 'apolices', label: 'Apólices', icon: FileText },
  { key: 'sinistros', label: 'Sinistros', icon: FileHeart },
  { key: 'reembolsos', label: 'Reembolsos', icon: Undo2 },
  { key: 'autorizacoes', label: 'Autorizações', icon: ClipboardList },
  { key: 'mensalidades', label: 'Mensalidades', icon: Wallet },
];

function ProfileTab() {
  const { data, isLoading } = useQuery({ queryKey: ['portal-insured-profile'], queryFn: getInsuredPortalProfile });
  if (isLoading) return <p className="text-text-secondary text-sm">A carregar…</p>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Os meus dados</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>Nome:</strong> {data.fullName}</p>
          <p><strong>Nº interno:</strong> {data.internalNumber}</p>
          <p><strong>Estado:</strong> <Badge>{data.status}</Badge></p>
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
          <CreditCard size={16} /> <CardTitle>Cartões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {data.cards.length === 0 && <p className="text-text-secondary">Nenhum cartão emitido.</p>}
          {data.cards.map((c: any) => (
            <p key={c.id}>{c.cardNumber} — <Badge variant={c.status === 'active' ? 'success' : 'muted'}>{c.status}</Badge></p>
          ))}
        </CardContent>
      </Card>
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

export default function InsuredPortalPage() {
  const [tab, setTab] = useState<Tab>('perfil');

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">Portal do Segurado</h1>

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

      {tab === 'apolices' && (
        <GenericListTab
          queryKey={['portal-insured-policies']}
          queryFn={getInsuredPortalPolicies}
          emptyLabel="Nenhuma apólice associada."
          renderItem={(pm: any) => (
            <div key={pm.id} className="text-sm border-b pb-2">
              {pm.policy.policyNumber} — {pm.policy.plan.name} (vence em {new Date(pm.policy.endDate).toLocaleDateString('pt-PT')})
            </div>
          )}
        />
      )}

      {tab === 'sinistros' && (
        <GenericListTab
          queryKey={['portal-insured-claims']}
          queryFn={getInsuredPortalClaims}
          emptyLabel="Nenhum sinistro submetido."
          renderItem={(c: any) => (
            <div key={c.id} className="text-sm border-b pb-2 flex justify-between">
              <span>{c.claimNumber}</span><Badge>{c.status}</Badge>
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
            <div key={r.id} className="text-sm border-b pb-2 flex justify-between">
              <span>{r.reimbursementNumber}</span><Badge>{r.status}</Badge>
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
            <div key={a.id} className="text-sm border-b pb-2 flex justify-between">
              <span>{a.requestNumber}</span><Badge>{a.status}</Badge>
            </div>
          )}
        />
      )}

      {tab === 'mensalidades' && (
        <GenericListTab
          queryKey={['portal-insured-premiums']}
          queryFn={getInsuredPortalPremiums}
          emptyLabel="Nenhuma mensalidade gerada."
          renderItem={(p: any) => (
            <div key={p.id} className="text-sm border-b pb-2 flex justify-between">
              <span>{new Date(p.dueDate).toLocaleDateString('pt-PT')} — {Number(p.value).toLocaleString()} Kz</span>
              <Badge>{p.status}</Badge>
            </div>
          )}
        />
      )}
    </div>
  );
}
