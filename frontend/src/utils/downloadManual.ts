// Descarrega um ficheiro de forma explícita e forçada — em vez de "abrir
// numa aba nova" (que pode falhar ou comportar-se de forma inconsistente
// quando a aplicação está instalada como aplicativo, em modo standalone),
// pede o ficheiro directamente e força o browser a gravá-lo, tal como já
// acontece com a impressão dos cartões.
async function downloadFile(path: string, filename: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Não foi possível descarregar o ficheiro.');
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export function downloadManual() {
  return downloadFile('/manual/manual-utilizador.pdf', 'EMIR-SAUDE-SEGUROS-Manual-do-Utilizador.pdf');
}

export function downloadPrivacyPolicy() {
  return downloadFile('/manual/politica-de-privacidade.pdf', 'EMIR-SAUDE-SEGUROS-Politica-de-Privacidade.pdf');
}
