import React from 'react';
import { AlertTriangle, X } from '@/shared/components/icons/Icons';
import type { FixedNotification } from '@/shared/types';

interface PendingPaymentsAlertProps {
  items: FixedNotification[];
  onClick: () => void;
  onClose: () => void;
}

export const PendingPaymentsAlert: React.FC<PendingPaymentsAlertProps> = ({
  items,
  onClick,
  onClose
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[80] bg-white border-2 border-amber-400 p-4 rounded-2xl max-w-xs cursor-pointer hover:shadow-xl transition-all alert-slide-up group text-slate-900 shadow-lg"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 rounded-full p-1 shadow-md hover:bg-amber-500 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
        title="Fechar Alerta"
        aria-label="Fechar alerta de contas pendentes"
      >
        <X className="w-3.5 h-3.5 stroke-[3]" />
      </button>
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 text-amber-800 p-2.5 rounded-xl shrink-0 font-bold">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800">Contas Pendentes</h4>
          <p className="text-xs mt-1 text-slate-600 font-medium">
            Você tem <span className="font-bold text-amber-800">{items.length}</span> conta(s) para pagar hoje ou atrasada(s).
          </p>
          <p className="text-[10px] text-amber-700 mt-2 font-bold uppercase tracking-wider hover:underline">
            Ver no calendário &rarr;
          </p>
        </div>
      </div>
    </div>
  );
};

export default PendingPaymentsAlert;
