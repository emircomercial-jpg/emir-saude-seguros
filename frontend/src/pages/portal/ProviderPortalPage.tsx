import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, ClipboardList, Receipt } from 'lucide-react';
import { getProviderPortalProfile, getProviderPortalAuthorizations, getProviderPortalInvoices } from '@/services/portalService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Tab = 'perfil' | 'autorizacoes' | 'facturas';

export default function ProviderPortalPage() {
  const [tab, setTab] = useState<Tab>('perfil');
  const { data: profile } = useQuery({ queryKey: ['portal-provider-profile'], queryFn: getProviderPortalProfile });
  const { data: authorizations } = useQuery({
    queryKey: ['portal-provider-authorizations'], queryFn: getProviderPortalAuthorizations, enabled: tab === 'autorizacoes',
  });
  const { data: invoices } = useQuery({
    queryKey: ['portal-provider-invoices'], queryFn: getProviderPortalInvoices, enabled: tab === 'facturas',
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">Portal do Prestador</h1>

      <div className="flex gap-1 mb-5 border-b">
        {[
          { key: 'perfil', label: 'Perfil', icon: Building2 },
          { key: 'autorizacoes', label: 'Autorizações Recebidas', icon: ClipboardList },
          { key: 'facturas', label: 'Minhas Facturas', icon: Receipt },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px ${
              tab === key ? 'border-institutional text-institutional font-medium' : 'border-transparent text-text-secondary'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && profile && (
        <Card>
          <CardHeader><CardTitle>Dados do Prestador</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Nome:</strong> {profile.name}</p>
            <p><strong>NIF:</strong> {profile.nif}</p>
            <p><strong>Tipo:</strong> {profile.type}</p>
            <p><strong>Estado:</strong> <Badge>{profile.status}</Badge></p>
          </CardContent>
        </Card>
      )}

      {tab === 'autorizacoes' && (
        <Card>
          <CardContent className="space-y-2 pt-5">
            {authorizations?.length === 0 && <p className="text-text-secondary text-sm">Nenhuma autorização recebida.</p>}
            {authorizations?.map((a: any) => (
              <div key={a.id} className="text-sm border-b pb-2 flex justify-between">
                <span>{a.requestNumber} — {a.insuredMember.fullName}</span>
                <Badge>{a.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === 'facturas' && (
        <Card>
          <CardContent className="space-y-2 pt-5">
            {invoices?.length === 0 && <p className="text-text-secondary text-sm">Nenhuma factura submetida.</p>}
            {invoices?.map((inv: any) => (
              <div key={inv.id} className="text-sm border-b pb-2 flex justify-between">
                <span>{inv.invoiceNumber} — {Number(inv.grossValue).toLocaleString()} Kz</span>
                <Badge>{inv.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
