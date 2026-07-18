import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ShieldPlus, Loader2, Trash2 } from 'lucide-react';
import {
  listPlans, createPlan, setPlanStatus, deletePlan, addCoverage, removeCoverage, type HealthPlan,
} from '@/services/planService';
import { createPlanSchema, type CreatePlanFormValues } from '@/schemas/planSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

function CreatePlanDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema),
  });

  const mutation = useMutation({
    mutationFn: (v: CreatePlanFormValues) => createPlan({
      ...v,
      annualLimit: v.annualLimit ? Number(v.annualLimit) : undefined,
      maxDependents: v.maxDependents ? Number(v.maxDependents) : undefined,
      waitingPeriodDays: v.waitingPeriodDays ? Number(v.waitingPeriodDays) : undefined,
    }),
    onSuccess: () => {
      toast.success('Plano criado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Plano de Saúde</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome do plano</Label>
                <Input className="mt-1" placeholder="Ex: Plano Familiar" {...register('name')} />
                {errors.name && <p className="text-alert text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Código</Label>
                <Input className="mt-1" placeholder="Ex: FAM-01" {...register('code')} />
                {errors.code && <p className="text-alert text-xs mt-1">{errors.code.message}</p>}
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input className="mt-1" {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor mensal (Kz)</Label>
                <Input type="number" className="mt-1" {...register('monthlyValue')} />
                {errors.monthlyValue && <p className="text-alert text-xs mt-1">{errors.monthlyValue.message}</p>}
              </div>
              <div>
                <Label>Limite anual (Kz)</Label>
                <Input type="number" className="mt-1" {...register('annualLimit')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nº máx. dependentes</Label>
                <Input type="number" className="mt-1" {...register('maxDependents')} />
              </div>
              <div>
                <Label>Carência (dias)</Label>
                <Input type="number" className="mt-1" {...register('waitingPeriodDays')} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CoveragesDialog({ plan, onClose }: { plan: HealthPlan | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', coveredPercentage: '80', requiresAuthorization: false });

  const addMutation = useMutation({
    mutationFn: () => addCoverage(plan!.id, { ...form, coveredPercentage: Number(form.coveredPercentage) }),
    onSuccess: () => {
      toast.success('Cobertura adicionada.');
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setForm({ name: '', coveredPercentage: '80', requiresAuthorization: false });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const removeMutation = useMutation({
    mutationFn: (coverageId: string) => removeCoverage(plan!.id, coverageId),
    onSuccess: () => { toast.success('Cobertura removida.'); queryClient.invalidateQueries({ queryKey: ['plans'] }); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (!plan) return null;

  return (
    <Dialog open={!!plan} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Coberturas — {plan.name}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {plan.coverages.length === 0 && <p className="text-sm text-text-secondary">Nenhuma cobertura configurada.</p>}
            {plan.coverages.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm border-b pb-2">
                <span>{c.name} <span className="text-text-secondary">({c.coveredPercentage}%{c.requiresAuthorization ? ' · requer autorização' : ''})</span></span>
                <button onClick={() => removeMutation.mutate(c.id)} className="text-alert p-1 rounded hover:bg-alert/10">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="grid grid-cols-2 gap-3 border-t pt-4">
            <div className="col-span-2">
              <Label>Nome da cobertura</Label>
              <Input required className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Consultas de clínica geral" />
            </div>
            <div>
              <Label>% coberta</Label>
              <Input type="number" className="mt-1" value={form.coveredPercentage} onChange={(e) => setForm((f) => ({ ...f, coveredPercentage: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" checked={form.requiresAuthorization} onChange={(e) => setForm((f) => ({ ...f, requiresAuthorization: e.target.checked }))} />
              Requer autorização prévia
            </label>
            <div className="col-span-2">
              <Button type="submit" size="sm" disabled={addMutation.isPending}>Adicionar Cobertura</Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default function PlansPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [coveragesPlan, setCoveragesPlan] = useState<HealthPlan | null>(null);
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({ queryKey: ['plans'], queryFn: listPlans });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['plans'] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) => setPlanStatus(id, status),
    onSuccess: () => { toast.success('Estado do plano actualizado.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => { toast.success('Plano eliminado.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  // Ao actualizar as coberturas, o diálogo precisa de reflectir o plano actualizado.
  const freshCoveragesPlan = plans?.find((p) => p.id === coveragesPlan?.id) || coveragesPlan;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Planos de Saúde</h1>
          <p className="text-text-secondary text-sm">Configuração de planos, limites e coberturas.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1.5" /> Novo Plano</Button>
      </div>

      {isLoading && <p className="text-text-secondary text-sm">A carregar…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans?.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldPlus size={18} className="text-institutional" />
                <h3 className="font-medium text-text-primary">{plan.name}</h3>
              </div>
              <p className="text-xs text-text-secondary mb-3">Código: {plan.code}</p>
              <p className="text-sm text-text-primary mb-1">
                Mensalidade: <span className="font-medium">{Number(plan.monthlyValue).toLocaleString()} Kz</span>
              </p>
              <div className="flex items-center gap-2 my-3">
                <Badge variant={plan.status === 'active' ? 'success' : 'muted'}>
                  {plan.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
                <span className="text-xs text-text-secondary">{plan.coverages.length} coberturas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setCoveragesPlan(plan)}>Coberturas</Button>
                <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: plan.id, status: plan.status === 'active' ? 'inactive' : 'active' })}>
                  {plan.status === 'active' ? 'Desactivar' : 'Activar'}
                </Button>
                <Button size="sm" variant="outline" className="text-alert hover:bg-alert/10" onClick={() => {
                  if (window.confirm(`Eliminar o plano "${plan.name}"?`)) deleteMutation.mutate(plan.id);
                }}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreatePlanDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <CoveragesDialog plan={freshCoveragesPlan} onClose={() => setCoveragesPlan(null)} />
    </div>
  );
}
