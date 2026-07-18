import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Pill, Plus } from 'lucide-react';
import { listMedicines, createMedicine, createPrescription, dispenseMedicine } from '@/services/pharmacyService';
import { listInsured } from '@/services/insuredService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

function NewMedicineDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', activeIngredient: '', isGeneric: false, monthlyLimitQuantity: '' });

  const mutation = useMutation({
    mutationFn: () => createMedicine({
      ...form,
      monthlyLimitQuantity: form.monthlyLimitQuantity ? Number(form.monthlyLimitQuantity) : undefined,
    }),
    onSuccess: () => {
      toast.success('Medicamento adicionado ao catálogo.');
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setForm({ name: '', activeIngredient: '', isGeneric: false, monthlyLimitQuantity: '' });
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Medicamento</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <DialogBody className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input required className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Substância activa</Label>
              <Input className="mt-1" value={form.activeIngredient} onChange={(e) => setForm((f) => ({ ...f, activeIngredient: e.target.value }))} />
            </div>
            <div>
              <Label>Limite mensal (unidades, opcional)</Label>
              <Input type="number" className="mt-1" value={form.monthlyLimitQuantity} onChange={(e) => setForm((f) => ({ ...f, monthlyLimitQuantity: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isGeneric} onChange={(e) => setForm((f) => ({ ...f, isGeneric: e.target.checked }))} />
              Medicamento genérico
            </label>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Farmácia e medicamentos (secção 12 do briefing original): catálogo e
// dispensação, com controlo de limite mensal e prevenção de duplicação
// tratados no backend.
export default function PharmacyPage() {
  const [insuredMemberId, setInsuredMemberId] = useState('');
  const [medicineId, setMedicineId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [showNewMedicine, setShowNewMedicine] = useState(false);
  const queryClient = useQueryClient();

  const { data: medicines } = useQuery({ queryKey: ['medicines'], queryFn: () => listMedicines() });
  const { data: insuredResult } = useQuery({ queryKey: ['insured-select'], queryFn: () => listInsured({}) });

  const dispenseMutation = useMutation({
    mutationFn: async () => {
      const prescription = await createPrescription({ insuredMemberId, medicineId, quantity: Number(quantity) });
      return dispenseMedicine({ prescriptionId: prescription.id, quantity: Number(quantity) });
    },
    onSuccess: () => {
      toast.success('Medicamento dispensado com sucesso.');
      setQuantity('1');
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Farmácia</h1>
          <p className="text-text-secondary text-sm">Catálogo de medicamentos e dispensação com controlo de cobertura.</p>
        </div>
        <Button variant="outline" onClick={() => setShowNewMedicine(true)}>
          <Plus size={16} className="mr-1.5" /> Novo Medicamento
        </Button>
      </div>

      <Card className="max-w-lg">
        <CardHeader><CardTitle>Dispensar Medicamento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Segurado</Label>
            <Select className="mt-1" value={insuredMemberId} onChange={(e) => setInsuredMemberId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {insuredResult?.items.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
            </Select>
          </div>
          <div>
            <Label>Medicamento</Label>
            <Select className="mt-1" value={medicineId} onChange={(e) => setMedicineId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {medicines?.map((m) => <option key={m.id} value={m.id}>{m.name}{m.isGeneric ? ' (genérico)' : ''}</option>)}
            </Select>
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input type="number" min={1} className="mt-1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>

          {!medicines?.length && (
            <div className="bg-warning/10 text-warning text-xs rounded p-3 flex gap-2 items-start">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              Nenhum medicamento no catálogo ainda — adicione um antes de dispensar.
            </div>
          )}

          <Button
            className="w-full"
            disabled={!insuredMemberId || !medicineId || dispenseMutation.isPending}
            onClick={() => dispenseMutation.mutate()}
          >
            <Pill size={16} className="mr-1.5" /> {dispenseMutation.isPending ? 'A processar…' : 'Confirmar Dispensação'}
          </Button>
        </CardContent>
      </Card>

      <NewMedicineDialog open={showNewMedicine} onClose={() => setShowNewMedicine(false)} />
    </div>
  );
}
