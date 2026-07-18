import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Stethoscope } from 'lucide-react';
import { checkCoverage, createConsultation, listConsultations } from '@/services/consultationService';
import { listInsured } from '@/services/insuredService';
import { listProviders } from '@/services/providerService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

// Atendimento clínico — Consultas (secção 11 do briefing original). Ao
// seleccionar o segurado, o sistema verifica automaticamente a cobertura
// (apólice activa, carência, suspensão) antes de confirmar o atendimento.
export default function ConsultationsPage() {
  const [insuredMemberId, setInsuredMemberId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [consultationType, setConsultationType] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const queryClient = useQueryClient();

  const { data: insuredResult } = useQuery({ queryKey: ['insured-select'], queryFn: () => listInsured({}) });
  const { data: providers } = useQuery({ queryKey: ['providers'], queryFn: () => listProviders() });

  const { data: coverage } = useQuery({
    queryKey: ['coverage-check', insuredMemberId, consultationType],
    queryFn: () => checkCoverage(insuredMemberId, consultationType || undefined),
    enabled: !!insuredMemberId,
  });

  const { data: consultations } = useQuery({
    queryKey: ['consultations', insuredMemberId],
    queryFn: () => listConsultations(insuredMemberId || undefined),
  });

  const mutation = useMutation({
    mutationFn: () => createConsultation({
      insuredMemberId,
      providerId: providerId || undefined,
      consultationType: consultationType || undefined,
      totalValue: totalValue ? Number(totalValue) : undefined,
    }),
    onSuccess: () => {
      toast.success('Consulta registada com sucesso.');
      setTotalValue('');
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1">Consultas</h1>
      <p className="text-text-secondary text-sm mb-6">
        Registo de consultas com verificação automática de cobertura.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Registar Consulta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Segurado</Label>
              <Select className="mt-1" value={insuredMemberId} onChange={(e) => setInsuredMemberId(e.target.value)}>
                <option value="">Seleccionar…</option>
                {insuredResult?.items.map((i) => <option key={i.id} value={i.id}>{i.fullName} ({i.internalNumber})</option>)}
              </Select>
            </div>
            <div>
              <Label>Prestador</Label>
              <Select className="mt-1" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
                <option value="">Não especificado</option>
                {providers?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Tipo de consulta</Label>
              <Input className="mt-1" placeholder="Ex: consulta de clínica geral"
                value={consultationType} onChange={(e) => setConsultationType(e.target.value)} />
            </div>
            <div>
              <Label>Valor total (Kz)</Label>
              <Input type="number" className="mt-1" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} />
            </div>

            {coverage?.alerts && coverage.alerts.length > 0 && (
              <div className="bg-warning/10 text-warning text-xs rounded p-3 flex gap-2 items-start">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <ul className="list-disc list-inside space-y-0.5">
                  {coverage.alerts.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!insuredMemberId || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'A registar…' : 'Registar Consulta'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Consultas Recentes</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {consultations?.length === 0 && <p className="text-sm text-text-secondary">Sem registos.</p>}
            {consultations?.map((c) => (
              <div key={c.id} className="border-b pb-2 text-sm flex items-start gap-2">
                <Stethoscope size={14} className="text-text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-text-primary">{c.insuredMember.fullName}</p>
                  <p className="text-text-secondary text-xs">
                    {c.consultationType || 'Consulta'} · {new Date(c.date).toLocaleDateString('pt-PT')}
                    {c.totalValue && ` · ${Number(c.totalValue).toLocaleString()} Kz`}
                    {c.copayment !== undefined && c.copayment !== null && ` · Copagamento: ${Number(c.copayment).toLocaleString()} Kz`}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
