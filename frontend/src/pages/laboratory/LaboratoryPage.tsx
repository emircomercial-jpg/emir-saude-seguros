import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Upload } from 'lucide-react';
import { listLabRequests, createLabRequest, setLabRequestStatus, attachLabResult } from '@/services/laboratoryService';
import { listInsured } from '@/services/insuredService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

const STATUS_LABELS: Record<string, string> = {
  requested: 'Solicitado', authorization_pending: 'Aguardando autorização',
  collected: 'Colhido', completed: 'Concluído', cancelled: 'Cancelado',
};
const STATUS_VARIANT: Record<string, any> = {
  requested: 'default', authorization_pending: 'warning', collected: 'warning',
  completed: 'success', cancelled: 'destructive',
};

// Laboratório e exames (secção 13 do briefing original): solicitação,
// acompanhamento de estado, e anexação de resultado.
export default function LaboratoryPage() {
  const [insuredMemberId, setInsuredMemberId] = useState('');
  const [examName, setExamName] = useState('');
  const queryClient = useQueryClient();

  const { data: insuredResult } = useQuery({ queryKey: ['insured-select'], queryFn: () => listInsured({}) });
  const { data: requests, isLoading } = useQuery({ queryKey: ['lab-requests'], queryFn: () => listLabRequests() });

  const createMutation = useMutation({
    mutationFn: () => createLabRequest({ insuredMemberId, examName }),
    onSuccess: () => {
      toast.success('Exame solicitado com sucesso.');
      setExamName('');
      queryClient.invalidateQueries({ queryKey: ['lab-requests'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setLabRequestStatus(id, status),
    onSuccess: () => {
      toast.success('Estado do exame actualizado.');
      queryClient.invalidateQueries({ queryKey: ['lab-requests'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const resultMutation = useMutation({
    mutationFn: (id: string) => {
      const url = window.prompt('URL do ficheiro de resultado:');
      if (!url) return Promise.reject(new Error('Cancelado'));
      return attachLabResult(id, { resultAttachmentUrl: url });
    },
    onSuccess: () => {
      toast.success('Resultado anexado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['lab-requests'] });
    },
    onError: (err: any) => {
      if (err?.message !== 'Cancelado') toast.error(getApiErrorMessage(err));
    },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1">Laboratório</h1>
      <p className="text-text-secondary text-sm mb-6">Solicitação e acompanhamento de exames laboratoriais.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Solicitar Exame</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Segurado</Label>
              <Select className="mt-1" value={insuredMemberId} onChange={(e) => setInsuredMemberId(e.target.value)}>
                <option value="">Seleccionar…</option>
                {insuredResult?.items.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
              </Select>
            </div>
            <div>
              <Label>Nome do exame</Label>
              <Input className="mt-1" value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Ex: Hemograma completo" />
            </div>
            <Button
              className="w-full"
              disabled={!insuredMemberId || !examName || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'A solicitar…' : 'Solicitar Exame'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Solicitações Recentes</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading && <p className="text-sm text-text-secondary">A carregar…</p>}
            {!isLoading && requests?.length === 0 && <p className="text-sm text-text-secondary">Sem registos.</p>}
            {requests?.map((r) => (
              <div key={r.id} className="border-b pb-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical size={14} className="text-text-secondary" />
                    <div>
                      <p className="font-medium text-text-primary">{r.examName}</p>
                      <p className="text-text-secondary text-xs">{r.insuredMember.fullName}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABELS[r.status] || r.status}</Badge>
                </div>
                <div className="flex gap-3 mt-2 ml-6">
                  {r.status === 'requested' && (
                    <button onClick={() => statusMutation.mutate({ id: r.id, status: 'collected' })} className="text-xs text-institutional hover:underline">
                      Marcar como colhido
                    </button>
                  )}
                  {r.status !== 'completed' && r.status !== 'cancelled' && (
                    <button onClick={() => resultMutation.mutate(r.id)} className="flex items-center gap-1 text-xs text-vital hover:underline">
                      <Upload size={12} /> Anexar resultado
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
