import { create } from 'zustand';

export interface Toast {
  id: string;
  variant: 'success' | 'error' | 'info';
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (variant: Toast['variant'], message: string) => void;
  dismiss: (id: string) => void;
}

// Mensagens de sucesso e erro (regra obrigatória da secção 1 do briefing).
// Um único store simples é suficiente — evita depender de uma biblioteca
// adicional apenas para toasts.
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (variant, message) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, variant, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show('success', message),
  error: (message: string) => useToastStore.getState().show('error', message),
  info: (message: string) => useToastStore.getState().show('info', message),
};
