import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Trash2, Loader2, Users2 } from 'lucide-react';
import { listInsured, addDependent, removeDependent, type InsuredMember } from '@/services/insuredService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/stores/toastStore';
import { getApiErrorMessage } from '@/services/apiClient';

// Página dedicada a Dependentes — construída sobre os dados já devolvidos
// pela lista de Segurados (cada registo já inclui os seus dependentes), em
// vez de exigir um novo endpoint no backend. Junta-os aqui numa única
// tabela pesquisável, com o nome do titular sempre visível ao lado.

const relationshipLabels: Record<string, string> = {
  spouse: 'Cônjuge', child: 'Filho(a)', parent: 'Pai/Mãe', sibling: 'Irmão/Irmã', other: 'Outro',
};

const addDependentSchema = z.object({
  fullName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other']),
  birthDate: z.string().min(1, 'Indique a data de nascimento.'),
  sex: z.enum(['M', 'F']),
});
type AddDependentFormValues = z.infer<typeof addDependentSchema>;

export default function DependentsPage() {
  const [search, setSearch] = useState('');
  const [addingFor, setAddingFor] = useState<InsuredMember | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['insured-for-dependents'],
    queryFn: () => listInsured({ pageSize: 200 }),
  });

  const rows = useMemo(() => {
    const list: { dependent: InsuredMember['dependents'][number]; insured: InsuredMember }[] = [];
    for (const insured of data?.items ?? []) {
      for (const dependent of insured.dependents) {
        list.push({ dependent, insured });
      }
    }
    const term = search.trim().toLowerCase();
    return term
      ? list.filter(
          (r) => r.dependent.fullName.toLowerCase().includes(term) || r.insured.fullName.toLowerCase().includes(term),
        )
      : list;
  }, [data, search]);

  const removeMutation = useMutation({
    mutationFn: removeDependent,
    onSuccess: () => {
      toast.success('Dependente removido.');
      queryClient.invalidateQueries({ queryKey: ['insured-for-dependents'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<AddDependentFormValues>({ resolver: zodResolver(addDependentSchema) });

  const addMutation = useMutation({
    mutationFn: (v: AddDependentFormValues) => addDependent(addingFor!.id, v),
    onSuccess: () => {
      toast.success('Dependente incluído com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['insured-for-dependents'] });
      reset();
      setAddingFor(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Users2 size={20} /> Dependentes
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Todos os dependentes de todos os segurados, num só sítio.
          </p>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <Input
          placeholder="Pesquisar por dependente ou titular..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Dependente</th>
              <th className="px-4 py-3 font-medium">Parentesco</th>
              <th className="px-4 py-3 font-medium">Nascimento</th>
              <th className="px-4 py-3 font-medium">Titular</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acções</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                <Loader2 className="animate-spin inline" size={18} /> A carregar...
              </td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                Nenhum dependente encontrado.
              </td></tr>
            )}
            {rows.map(({ dependent, insured }) => (
              <tr key={dependent.id} className="border-t">
                <td className="px-4 py-3">{dependent.fullName}</td>
                <td className="px-4 py-3">{relationshipLabels[dependent.relationship] || dependent.relationship}</td>
                <td className="px-4 py-3">{new Date(dependent.birthDate).toLocaleDateString('pt-PT')}</td>
                <td className="px-4 py-3">
                  <span className="text-institutional">{insured.fullName}</span>
                  <span className="text-text-secondary text-xs ml-1">({insured.internalNumber})</span>
                </td>
                <td className="px-4 py-3"><Badge>{dependent.status}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeMutation.mutate(dependent.id)}
                    className="text-alert hover:opacity-70 p-1"
                    title="Remover dependente"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <p className="text-sm text-text-secondary mb-2">Incluir um novo dependente para um segurado existente:</p>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-card"
          onChange={(e) => {
            const insured = data?.items.find((i) => i.id === e.target.value);
            if (insured) setAddingFor(insured);
            e.target.value = '';
          }}
          defaultValue=""
        >
          <option value="" disabled>Escolher segurado...</option>
          {data?.items.map((i) => (
            <option key={i.id} value={i.id}>{i.fullName} ({i.internalNumber})</option>
          ))}
        </select>
      </div>

      <Dialog open={!!addingFor} onOpenChange={(open) => !open && setAddingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus size={16} /> Novo dependente de {addingFor?.fullName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => addMutation.mutate(v))} className="space-y-3 px-6 py-4">
            <div>
              <Label>Nome completo</Label>
              <Input className="mt-1" {...register('fullName')} />
              {errors.fullName && <p className="text-alert text-xs mt-1">{errors.fullName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Parentesco</Label>
                <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card" {...register('relationship')}>
                  <option value="spouse">Cônjuge</option>
                  <option value="child">Filho(a)</option>
                  <option value="parent">Pai/Mãe</option>
                  <option value="sibling">Irmão/Irmã</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div>
                <Label>Sexo</Label>
                <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card" {...register('sex')}>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input type="date" className="mt-1" {...register('birthDate')} />
              {errors.birthDate && <p className="text-alert text-xs mt-1">{errors.birthDate.message}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddingFor(null)}>Cancelar</Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Incluir'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
