import React from 'react';
import { AlertCircle, Check, X, AlertTriangle } from '@/shared/components/icons/Icons';
import type { Toast } from '@/shared/types';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: number) => void;
}

/** Separa a mensagem em título + detalhe usando o separador ": " */
function parseMessage(message: string): { title: string; detail?: string } {
  const separators = ['\n', '. Tente', '. O item', ': resource-exhausted'];
  for (const sep of separators) {
    const idx = message.indexOf(sep);
    if (idx > 0) {
      return { title: message.slice(0, idx + (sep === '.' ? 1 : 0)), detail: message.slice(idx + sep.length).trim() };
    }
  }
  return { title: message };
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => (
  <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 pointer-events-none" style={{ maxWidth: '380px' }}>
    {toasts.map(toast => {
      const { title, detail } = parseMessage(toast.message);
      const isError = toast.type === 'error';
      const isSuccess = toast.type === 'success';
      return (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-300 animate-in slide-in-from-right fade-in shadow-xl border ${
            isError
              ? 'bg-white text-rose-900 border-rose-300 shadow-rose-100'
              : isSuccess
                ? 'bg-white text-emerald-900 border-emerald-300 shadow-emerald-100'
                : 'bg-white text-slate-900 border-slate-200'
          }`}
        >
          {/* Ícone */}
          <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
            isError ? 'bg-rose-100 text-rose-600' : isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-700'
          }`}>
            {isError ? (
              <AlertTriangle className="w-4 h-4" />
            ) : isSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xs leading-snug text-slate-900">{title}</p>
            {detail && (
              <p className="text-[11px] mt-0.5 leading-snug text-slate-500 font-medium">
                {detail}
              </p>
            )}
          </div>

          {/* Fechar */}
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-800 flex-shrink-0 transition-opacity p-0.5 rounded hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    })}
  </div>
);

export default ToastContainer;
