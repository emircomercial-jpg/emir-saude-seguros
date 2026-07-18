import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileHeart, Undo2, Plus, Check, XCircle } from 'lucide-react';
import { listClaims, createClaim, updateClaimStatus } from '@/services/claimService';
import { listReimbursements, createReimbursement, updateReimbursementStatus } from '@/services/reimbursementService';
import { listInsured } from '@/services/insuredService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

type Tab = 'sinistros' | 'reembolsos';

const CLAIM_STATUS_LABELS: Record<string, string> = {
  submitted: 'Submetido', triage: 'Triagem', in_review: 'Em análise',
  clinical_audit: 'Auditoria clínica', financial_audit: 'Auditoria financeira',
  approved: 'Aprovado', rejected: 'Rejeitado', paid: 'Pago', closed: 'Encerrado',
};

const REIMB_STATUS_LABELS: Record<string, string> = {
  submitted: 'Submetido', under_validation: 'Em validação', awaiting_documents: 'Aguardando documentos',
  in_review: 'Em análise', approved: 'Aprovado', partially_approved: 'Aprovado parcialmente',
  rejected: 'Rejeitado', paid: 'Pago', closed: 'Encerrado',
};

function InsuredPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data: insuredResult } = useQuery({ queryKey: ['insured-select'], queryFn: () => listInsured({}) });
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Seleccionar segurado…</option>
      {insuredResult?.items.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
    </Select>
  );
}

function NewClaimDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [insuredMemberId, setInsuredMemberId] = useState('');
  const [occurrenceType, setOccurrenceType] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [requestedValue, setRequestedValue] = useState('');

  const mutation = useMutation({
    mutationFn: () => createClaim({
      insuredMemberId, occurrenceType: occurrenceType || undefined,
      diagnosis: diagnosis || undefined, requestedValue: requestedValue ? Number(requestedValue) : undefined,
    }),
    onSuccess: () => {
      toast.success('Sinistro submetido com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Sinistro</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <DialogBody className="space-y-3">
            <InsuredPicker value={insuredMemberId} onChange={setInsuredMemberId} />
            <Input placeholder="Tipo de ocorrência" value={occurrenceType} onChange={(e) => setOccurrenceType(e.target.value)} />
            <Input placeholder="Diagnóstico" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            <div>
              <Label>Valor solicitado (Kz)</Label>
              <Input type="number" className="mt-1" value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!insuredMemberId || mutation.isPending}>Submeter Sinistro</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClaimsTab() {
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: claims, isLoading } = useQuery({ queryKey: ['claims', status], queryFn: () => listClaims(status || undefined) });

  const decisionMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) => updateClaimStatus(id, { status: newStatus }),
    onSuccess: () => { toast.success('Estado do sinistro actualizado.'); queryClient.invalidateQueries({ queryKey: ['claims'] }); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-64">
          <option value="">Todos os estados</option>
          {Object.entries(CLAIM_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <Button onClick={() => setShowForm(true)}><Plus size={16} className="mr-1.5" /> Novo Sinistro</Button>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nº Sinistro</th>
              <th className="text-left px-4 py-3">Segurado</th>
              <th className="text-left px-4 py-3">Valor solicitado</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={5} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && claims?.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-text-secondary">Nenhum sinistro registado.</td></tr>
            )}
            {claims?.map((c) => (
              <tr key={c.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 font-mono text-xs flex items-center gap-2">
                  <FileHeart size={14} className="text-text-secondary" /> {c.claimNumber}
                </td>
                <td className="px-4 py-3 text-text-primary">{c.insuredMember.fullName}</td>
                <td className="px-4 py-3 text-text-secondary">{c.requestedValue ? `${Number(c.requestedValue).toLocaleString()} Kz` : '—'}</td>
                <td className="px-4 py-3"><Badge>{CLAIM_STATUS_LABELS[c.status] || c.status}</Badge></td>
                <td className="px-4 py-3">
                  {['submitted', 'triage', 'in_review'].includes(c.status) && (
                    <div className="flex gap-2">
                      <button onClick={() => decisionMutation.mutate({ id: c.id, newStatus: 'approved' })} className="flex items-center gap-1 text-vital text-xs hover:underline">
                        <Check size={14} /> Aprovar
                      </button>
                      <button onClick={() => decisionMutation.mutate({ id: c.id, newStatus: 'rejected' })} className="flex items-center gap-1 text-alert text-xs hover:underline">
                        <XCircle size={14} /> Rejeitar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewClaimDialog open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}

function NewReimbursementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [insuredMemberId, setInsuredMemberId] = useState('');
  const [description, setDescription] = useState('');
  const [requestedValue, setRequestedValue] = useState('');

  const mutation = useMutation({
    mutationFn: () => createReimbursement({ insuredMemberId, description, requestedValue: Number(requestedValue) }),
    onSuccess: () => {
      toast.success('Reembolso submetido com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Reembolso</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <DialogBody className="space-y-3">
            <InsuredPicker value={insuredMemberId} onChange={setInsuredMemberId} />
            <Input placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div>
              <Label>Valor solicitado (Kz)</Label>
              <Input required type="number" className="mt-1" value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!insuredMemberId || mutation.isPending}>Submeter Reembolso</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReimbursementsTab() {
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: reimbursements, isLoading } = useQuery({
    queryKey: ['reimbursements', status], queryFn: () => listReimbursements(status || undefined),
  });

  const decisionMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) => updateReimbursementStatus(id, newStatus),
    onSuccess: () => { toast.success('Estado do reembolso actualizado.'); queryClient.invalidateQueries({ queryKey: ['reimbursements'] }); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-64">
          <option value="">Todos os estados</option>
          {Object.entries(REIMB_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <Button onClick={() => setShowForm(true)}><Plus size={16} className="mr-1.5" /> Novo Reembolso</Button>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nº Reembolso</th>
              <th className="text-left px-4 py-3">Segurado</th>
              <th className="text-left px-4 py-3">Solicitado</th>
              <th className="text-left px-4 py-3">Valor elegível</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && reimbursements?.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-text-secondary">Nenhum reembolso submetido.</td></tr>
            )}
            {reimbursements?.map((r) => (
              <tr key={r.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 font-mono text-xs flex items-center gap-2">
                  <Undo2 size={14} className="text-text-secondary" /> {r.reimbursementNumber}
                </td>
                <td className="px-4 py-3 text-text-primary">{r.insuredMember.fullName}</td>
                <td className="px-4 py-3 text-text-secondary">{Number(r.requestedValue).toLocaleString()} Kz</td>
                <td className="px-4 py-3 text-text-primary">
                  {r.eligibleValue ? `${Number(r.eligibleValue).toLocaleString()} Kz` : '—'}
                </td>
                <td className="px-4 py-3"><Badge>{REIMB_STATUS_LABELS[r.status] || r.status}</Badge></td>
                <td className="px-4 py-3">
                  {['submitted', 'under_validation', 'in_review'].includes(r.status) && (
                    <div className="flex gap-2">
                      <button onClick={() => decisionMutation.mutate({ id: r.id, newStatus: 'approved' })} className="flex items-center gap-1 text-vital text-xs hover:underline">
                        <Check size={14} /> Aprovar
                      </button>
                      <button onClick={() => decisionMutation.mutate({ id: r.id, newStatus: 'rejected' })} className="flex items-center gap-1 text-alert text-xs hover:underline">
                        <XCircle size={14} /> Rejeitar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewReimbursementDialog open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}

export default function ClaimsReimbursementsPage() {
  const [tab, setTab] = useState<Tab>('sinistros');

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1">Sinistros e Reembolsos</h1>
      <p className="text-text-secondary text-sm mb-4">Submissão, análise e decisão de sinistros e pedidos de reembolso.</p>

      <div className="flex gap-2 mb-5 border-b">
        <button onClick={() => setTab('sinistros')}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px ${
            tab === 'sinistros' ? 'border-institutional text-institutional font-medium' : 'border-transparent text-text-secondary'
          }`}>
          <FileHeart size={16} /> Sinistros
        </button>
        <button onClick={() => setTab('reembolsos')}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px ${
            tab === 'reembolsos' ? 'border-institutional text-institutional font-medium' : 'border-transparent text-text-secondary'
          }`}>
          <Undo2 size={16} /> Reembolsos
        </button>
      </div>

      {tab === 'sinistros' && <ClaimsTab />}
      {tab === 'reembolsos' && <ReimbursementsTab />}
    </div>
  );
}
