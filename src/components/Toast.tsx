import React, { useState } from 'react';

export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let counter = 0;
export const makeToast = (type: ToastItem['type'], message: string): ToastItem => ({
  id: ++counter,
  type,
  message,
});

const STYLES: Record<ToastItem['type'], string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-sky-700 text-white',
};

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

/** Contenedor de notificaciones tipo toast (Fase 2.2). */
export const ToastStack: React.FC<Props> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const Toast: React.FC<{ toast: ToastItem; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const [leaving, setLeaving] = useState(false);

  React.useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 4200);
    const t2 = setTimeout(() => onDismiss(toast.id), 4600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [toast.id, onDismiss]);

  return (
    <button
      onClick={() => onDismiss(toast.id)}
      className={`text-left text-xs font-semibold px-4 py-3 rounded-xl shadow-lg transition-all duration-300 cursor-pointer ${
        STYLES[toast.type]
      } ${leaving ? 'opacity-0 translate-y-1' : 'opacity-100'}`}
    >
      {toast.message}
    </button>
  );
};
