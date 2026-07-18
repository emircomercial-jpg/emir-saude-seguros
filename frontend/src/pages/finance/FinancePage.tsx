import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, Wallet, Plus } from 'lucide-react';
import { listPremiums, createPremium, registerPayment } from '@/services/paymentService';
import { listInvoices, createInvoice, setInvoiceStatus } from '@/services/billingService';
import { listInsured } from '@/services/insuredService';
import { listProviders } from '@/services/providerService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

type Tab = 'mensalidades' | 'facturacao';

const PREMIUM_STATUS_LABELS: Record<string, string> = {
  paid: 'Pago', partially_paid: 'Parcialmente pago', pending: 'Pendente',
  overdue: 'Vencido', cancelled: 'Cancelado', exempt: 'Isento',
};
const PREMIUM_STATUS_VARIANT: Record<string, any> = {
  paid: 'success', partially_paid: 'warning', pending: 'default',
  overdue: 'destructive', cancelled: 'muted', exempt: 'muted',
};

function NewPremiumDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: insuredResult } = useQuery({ queryKey: ['insured-select'], queryFn: () => listInsured({}), enabled: open });
  const [form, setForm] = useState({ insuredMemberId: '', referenceMonth: '', dueDate: '', value: '' });

  const mutation = useMutation({
    mutationFn: () => createPremium({ ...form, value: Number(form.value) }),
    onSuccess: () => {
      toast.success('Mensalidade gerada com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['premiums'] });
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Mensalidade</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <DialogBody className="space-y-3">
            <Select required value={form.insuredMemberId} onChange={(e) => setForm((f) => ({ ...f, insuredMemberId: e.target.value }))}>
              <option value="">Seleccionar segurado…</option>
              {insuredResult?.items.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mês de referência</Label>
                <Input required type="date" className="mt-1" value={form.referenceMonth} onChange={(e) => setForm((f) => ({ ...f, referenceMonth: e.target.value }))} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input required type="date" className="mt-1" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Valor (Kz)</Label>
              <Input required type="number" className="mt-1" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>Gerar Mensalidade</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PremiumsTab() {
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: premiums, isLoading } = useQuery({
    queryKey: ['premiums', status], queryFn: () => listPremiums({ status: status || undefined }),
  });

  const payMutation = useMutation({
    mutationFn: () => registerPayment({ premiumId: payingId as string, amount: Number(payAmount), method: 'transfer' }),
    onSuccess: () => {
      toast.success('Pagamento registado com sucesso.');
      setPayingId(null);
      setPayAmount('');
      queryClient.invalidateQueries({ queryKey: ['premiums'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-56">
          <option value="">Todos os estados</option>
          {Object.entries(PREMIUM_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <Button onClick={() => setShowForm(true)}><Plus size={16} className="mr-1.5" /> Nova Mensalidade</Button>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Segurado/Empresa</th>
              <th className="text-left px-4 py-3">Vencimento</th>
              <th className="text-left px-4 py-3">Valor</th>
              <th className="text-left px-4 py-3">Pago</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && premiums?.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-text-secondary">Nenhuma mensalidade gerada.</td></tr>
            )}
            {premiums?.map((p) => (
              <tr key={p.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 text-text-primary">{p.insuredMember?.fullName || p.company?.legalName || '—'}</td>
                <td className="px-4 py-3 text-text-secondary">{new Date(p.dueDate).toLocaleDateString('pt-PT')}</td>
                <td className="px-4 py-3 text-text-primary">{Number(p.value).toLocaleString()} Kz</td>
                <td className="px-4 py-3 text-text-secondary">
                  {p.payments.reduce((s, x) => s + Number(x.amount), 0).toLocaleString()} Kz
                </td>
                <td className="px-4 py-3">
                  <Badge variant={PREMIUM_STATUS_VARIANT[p.status]}>{PREMIUM_STATUS_LABELS[p.status] || p.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {['pending', 'overdue', 'partially_paid'].includes(p.status) && (
                    payingId === p.id ? (
                      <form className="flex gap-1 items-center" onSubmit={(e) => { e.preventDefault(); payMutation.mutate(); }}>
                        <Input autoFocus required type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Valor" className="w-24 h-8 text-xs" />
                        <button type="submit" className="text-vital text-xs hover:underline">Confirmar</button>
                        <button type="button" onClick={() => setPayingId(null)} className="text-text-secondary text-xs hover:underline">Cancelar</button>
                      </form>
                    ) : (
                      <button onClick={() => { setPayingId(p.id); setPayAmount(''); }} className="text-institutional text-xs hover:underline">
                        Registar pagamento
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewPremiumDialog open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}

function NewInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: providers } = useQuery({ queryKey: ['providers'], queryFn: () => listProviders(), enabled: open });
  const [form, setForm] = useState({ providerId: '', invoiceNumber: '', periodStart: '', periodEnd: '', description: '', value: '' });

  const mutation = useMutation({
    mutationFn: () => createInvoice({
      providerId: form.providerId, invoiceNumber: form.invoiceNumber,
      periodStart: form.periodStart, periodEnd: form.periodEnd,
      items: [{ description: form.description, value: Number(form.value) }],
    }),
    onSuccess: () => {
      toast.success('Factura submetida com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Factura de Prestador</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <DialogBody className="space-y-3">
            <Select required value={form.providerId} onChange={(e) => setForm((f) => ({ ...f, providerId: e.target.value }))}>
              <option value="">Seleccionar prestador…</option>
              {providers?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input required placeholder="Número da factura" value={form.invoiceNumber} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input required type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} />
              <Input required type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} />
            </div>
            <Input required placeholder="Descrição do serviço" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Input required type="number" placeholder="Valor" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>Submeter Factura</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const INVOICE_STATUS_VARIANT: Record<string, any> = {
  submitted: 'default', under_review: 'warning', approved: 'success',
  partially_approved: 'success', rejected: 'destructive', paid: 'muted',
};

function BillingTab() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { data: invoices, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => listInvoices() });

  const payMutation = useMutation({
    mutationFn: (id: string) => setInvoiceStatus(id, 'paid'),
    onSuccess: () => { toast.success('Factura marcada como paga.'); queryClient.invalidateQueries({ queryKey: ['invoices'] }); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowForm(true)}><Plus size={16} className="mr-1.5" /> Nova Factura</Button>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Prestador</th>
              <th className="text-left px-4 py-3">Nº Factura</th>
              <th className="text-left px-4 py-3">Valor bruto</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={5} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && invoices?.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-text-secondary">Nenhuma factura submetida.</td></tr>
            )}
            {invoices?.map((inv) => (
              <tr key={inv.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 text-text-primary">{inv.provider.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                <td className="px-4 py-3 text-text-primary">{Number(inv.grossValue).toLocaleString()} Kz</td>
                <td className="px-4 py-3"><Badge variant={INVOICE_STATUS_VARIANT[inv.status]}>{inv.status}</Badge></td>
                <td className="px-4 py-3">
                  {inv.status === 'approved' && (
                    <button onClick={() => payMutation.mutate(inv.id)} className="text-vital text-xs hover:underline">
                      Marcar como pago
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewInvoiceDialog open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('mensalidades');

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1">Mensalidades e Facturação</h1>
      <p className="text-text-secondary text-sm mb-4">
        Gestão de mensalidades dos segurados e facturação submetida pelos prestadores.
      </p>

      <div className="flex gap-2 mb-5 border-b">
        <button onClick={() => setTab('mensalidades')}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px ${
            tab === 'mensalidades' ? 'border-institutional text-institutional font-medium' : 'border-transparent text-text-secondary'
          }`}>
          <Wallet size={16} /> Mensalidades
        </button>
        <button onClick={() => setTab('facturacao')}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px ${
            tab === 'facturacao' ? 'border-institutional text-institutional font-medium' : 'border-transparent text-text-secondary'
          }`}>
          <Receipt size={16} /> Facturação de Prestadores
        </button>
      </div>

      {tab === 'mensalidades' && <PremiumsTab />}
      {tab === 'facturacao' && <BillingTab />}
    </div>
  );
}
