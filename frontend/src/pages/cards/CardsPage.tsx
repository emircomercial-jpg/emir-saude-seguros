import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ScanLine, ShieldCheck, ShieldAlert, Printer, Loader2 } from 'lucide-react';
import { validateCard, listCardsByInsured, printCardPdf } from '@/services/cardService';
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

  // Imprimir directamente a partir do resultado da validação — vai buscar
  // o cartão activo mais recente da pessoa validada e abre logo o PDF.
  const printMutation = useMutation({
    mutationFn: async (insuredMemberId: string) => {
      const cards = await listCardsByInsured(insuredMemberId);
      const activeCard = cards.find((c) => c.status === 'active') ?? cards[0];
      if (!activeCard) throw new Error('Esta pessoa ainda não tem nenhum cartão emitido.');
      await printCardPdf(activeCard.id);
    },
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
            <div className="flex-1">
              <p className="font-medium text-text-primary">{mutation.data.fullName}</p>
              <p className="text-sm text-text-secondary">Estado: {mutation.data.status}</p>
              <p className="text-sm text-text-secondary">Dependentes: {mutation.data.dependentsCount}</p>
              {mutation.data.cardValidUntil && (
                <p className="text-sm text-text-secondary">
                  Cartão válido até: {new Date(mutation.data.cardValidUntil).toLocaleDateString('pt-PT')}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => printMutation.mutate(mutation.data.insuredMemberId)}
                disabled={printMutation.isPending}
              >
                {printMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Printer size={14} className="mr-1.5" />}
                Imprimir cartão
              </Button>
              {printMutation.isError && (
                <p className="text-alert text-xs mt-1">{printMutation.error instanceof Error ? printMutation.error.message : 'Erro ao imprimir.'}</p>
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
