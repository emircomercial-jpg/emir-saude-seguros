import { useEffect, useState } from 'react';

// Captura o evento nativo do browser que pergunta se a aplicação pode ser
// instalada como aplicativo — o browser só o dispara quando decide, por si
// só, que a aplicação cumpre os requisitos de instalação (manifesto,
// Service Worker, HTTPS). Guardamos o evento para o accionar nós próprios,
// a partir de um botão bem visível dentro da aplicação, em vez de
// dependermos do pequeno ícone (por vezes escondido) na barra de endereço
// do browser, que muitos utilizadores nunca reparam que existe.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches ?? false,
  );

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function handleInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const canInstall = !!deferredPrompt && !installed;

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return { canInstall, installed, promptInstall };
}
