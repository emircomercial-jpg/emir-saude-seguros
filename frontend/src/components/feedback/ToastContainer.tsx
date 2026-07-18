import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/utils/cn';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const STYLES = {
  success: 'bg-vital/10 text-vital border-vital/20',
  error: 'bg-alert/10 text-alert border-alert/20',
  info: 'bg-skyline/10 text-institutional border-skyline/20',
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div
            key={t.id}
            className={cn('flex items-start gap-2 rounded-lg border p-3 shadow-lg text-sm', STYLES[t.variant])}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <p className="flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
