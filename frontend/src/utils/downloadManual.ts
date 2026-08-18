// Descarrega o Manual do Utilizador de forma explícita e forçada — em vez
// de "abrir numa aba nova" (que pode falhar ou comportar-se de forma
// inconsistente quando a aplicação está instalada como aplicativo, em
// modo standalone), pede o ficheiro directamente e força o browser a
// gravá-lo, tal como já acontece com a impressão dos cartões.
export async function downloadManual() {
  const response = await fetch('/manual/manual-utilizador.pdf');
  if (!response.ok) throw new Error('Não foi possível descarregar o manual.');
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'EMIR-SAUDE-SEGUROS-Manual-do-Utilizador.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
