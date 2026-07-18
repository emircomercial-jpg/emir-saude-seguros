import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ScanLine, ShieldCheck, ShieldAlert } from 'lucide-react';
import { validateCard } from '@/services/cardService';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/services/apiClient';

// Validação rápida do segurado (secção 9 do briefing original): pesquisa por
// número de cartão ou Bilhete de Identidade e mostra apenas os dados
// necessários ao atendimento — nunca informação clínica.
export default function CardsPage() {
  const [cardNumber, setCardNumber] = useState('');
  const [idDocumentNumber, setIdDocumentNumber] = useState('');

  const mutation = useMutation({
    mutationFn: () => validateCard({ cardNumber: cardNumber || undefined, idDocumentNumber: idDocumentNumber || undefined }),
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1">Validação de Cartão</h1>
      <p className="text-text-secondary text-sm mb-6">
        Confirme rapidamente a cobertura de um segurado através do número do cartão ou do Bilhete de Identidade.
      </p>

      <Card className="max-w-md mb-6">
        <CardContent className="p-5">
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
            <div>
              <Label>Número do cartão</Label>
              <Input className="mt-1" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Ex: EMIR-123456789" />
            </div>
            <div className="text-center text-xs text-text-secondary">ou</div>
            <div>
              <Label>Bilhete de Identidade</Label>
              <Input className="mt-1" value={idDocumentNumber} onChange={(e) => setIdDocumentNumber(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending || (!cardNumber && !idDocumentNumber)}>
              <ScanLine size={16} className="mr-1.5" /> {mutation.isPending ? 'A validar…' : 'Validar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {mutation.isSuccess && (
        <Card className="max-w-md">
          <CardContent className="p-5 flex items-start gap-3">
            <ShieldCheck className="text-vital shrink-0" size={24} />
            <div>
              <p className="font-medium text-text-primary">{mutation.data.fullName}</p>
              <p className="text-sm text-text-secondary">Estado: {mutation.data.status}</p>
              <p className="text-sm text-text-secondary">Dependentes: {mutation.data.dependentsCount}</p>
              {mutation.data.cardValidUntil && (
                <p className="text-sm text-text-secondary">
                  Cartão válido até: {new Date(mutation.data.cardValidUntil).toLocaleDateString('pt-PT')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {mutation.isError && (
        <Card className="max-w-md">
          <CardContent className="p-5 flex items-start gap-3">
            <ShieldAlert className="text-alert shrink-0" size={24} />
            <p className="text-sm text-alert">{getApiErrorMessage(mutation.error)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
