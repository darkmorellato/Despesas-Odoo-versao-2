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
      className="fixed bottom-24 left-6 z-[80] bg-black p-4 rounded-[32px] max-w-xs cursor-pointer hover:scale-105 transition-transform alert-slide-up group text-white"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute -top-2 -right-2 bg-[#FDB827] text-[#1A1A1A] rounded-full p-1 shadow-md hover:bg-[#E5A71F] transition-colors opacity-0 group-hover:opacity-100"
        title="Fechar Alerta"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="flex items-start gap-3">
        <div className="bg-[#FDB827] text-[#1A1A1A] p-2 rounded-xl animate-pulse">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-sm">Atenção!</h4>
          <p className="text-xs mt-1 font-medium opacity-80">
            Você tem <span className="font-black text-[#FDB827]">{items.length}</span> contas para pagar hoje ou atrasadas.
          </p>
          <p className="text-[10px] text-[#FDB827] mt-2 font-bold uppercase tracking-wider hover:underline">
            Clique para ver no calendário &rarr;
          </p>
        </div>
      </div>
    </div>
  );
};
