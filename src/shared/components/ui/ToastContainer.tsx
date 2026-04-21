import React from 'react';
import { AlertCircle, Check, X, AlertTriangle } from '@/shared/components/icons/Icons';
import type { Toast } from '@/shared/types';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: number) => void;
}

/** Separa a mensagem em título + detalhe usando o separador ": " */
function parseMessage(message: string): { title: string; detail?: string } {
  // Detecta padrão "⚠️ Cota..." ou "Erro ao excluir..." com detalhe após ponto
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
  <div className="fixed top-4 right-4 z-[60] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '360px' }}>
    {toasts.map(toast => {
      const { title, detail } = parseMessage(toast.message);
      const isError = toast.type === 'error';
      const isSuccess = toast.type === 'success';
      return (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 animate-in slide-in-from-right fade-in shadow-lg border ${isError
              ? 'bg-[#1A1A1A] text-white border-red-800'
              : isSuccess
                ? 'bg-[#FDB827] text-[#1A1A1A] border-[#FDB827]'
                : 'bg-[#7C5CFC] text-white border-[#7C5CFC]'
            }`}
        >
          {/* Ícone */}
          <div className={`p-1.5 rounded-full flex-shrink-0 mt-0.5 ${isError ? 'bg-red-600/30' : 'bg-white/20'}`}>
            {isError ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : isSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug">{title}</p>
            {detail && (
              <p className={`text-xs mt-1 leading-snug ${isError ? 'text-gray-400' : 'text-current opacity-70'}`}>
                {detail}
              </p>
            )}
          </div>

          {/* Fechar */}
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-50 hover:opacity-100 flex-shrink-0 transition-opacity mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    })}
  </div>
);
