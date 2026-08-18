import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, DatabaseBackup, Download } from 'lucide-react';
import { getSettings, updateSettings } from '@/services/settingsService';
import { apiClient, getApiErrorMessage } from '@/services/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/stores/toastStore';

const CATEGORY_LABELS: Record<string, string> = {
  organization: 'Dados da Organização',
  localization: 'Localização, Moeda e Idioma',
  security: 'Segurança e Sessão',
  general: 'Outras Configurações',
};

const KEY_LABELS: Record<string, string> = {
  'organization.country': 'País',
  'organization.currency': 'Moeda',
  'organization.language': 'Idioma',
  'organization.timezone': 'Fuso horário',
  'security.max_login_attempts': 'Tentativas de login permitidas',
  'security.login_lock_minutes': 'Tempo de bloqueio (minutos)',
};

function CategorySection({ category, items }: { category: string; items: { key: string; value: unknown }[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.key, String(i.value)])),
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    setValues(Object.fromEntries(items.map((i) => [i.key, String(i.value)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  const mutation = useMutation({
    mutationFn: () =>
      updateSettings(
        items.map((i) => {
          const raw = values[i.key];
          const isNumeric = typeof i.value === 'number';
          return { key: i.key, value: isNumeric ? Number(raw) : raw };
        }),
      ),
    onSuccess: () => {
      toast.success('Configurações actualizadas com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Card>
      <CardHeader><CardTitle>{CATEGORY_LABELS[category] || category}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.key}>
              <Label>{KEY_LABELS[item.key] || item.key}</Label>
              <Input
                className="mt-1"
                value={values[item.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button className="mt-4" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.get('/settings/backup/export', { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `emir-saude-seguros-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    },
    onSuccess: () => toast.success('Cópia de segurança descarregada com sucesso.'),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1">Configurações</h1>
      <p className="text-text-secondary text-sm mb-6">
        Dados da organização, localização, segurança e sessão. Alterações aqui aplicam-se a toda a organização.
      </p>

      {isLoading && <p className="text-text-secondary text-sm">A carregar…</p>}

      <div className="space-y-4">
        {data && Object.entries(data).map(([category, items]) => (
          <CategorySection key={category} category={category} items={items} />
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DatabaseBackup size={18} /> Cópia de Segurança Manual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary mb-4">
              Descarrega um ficheiro com todos os dados de negócio (segurados, apólices, sinistros, convénios, etc.)
              como rede de protecção adicional. Nunca inclui senhas nem chaves de integração. Recomenda-se fazer isto
              regularmente e guardar o ficheiro num sítio seguro, fora do sistema.
            </p>
            <Button size="sm" onClick={() => backupMutation.mutate()} disabled={backupMutation.isPending}>
              {backupMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Download size={14} className="mr-1.5" />}
              Descarregar Cópia de Segurança
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
