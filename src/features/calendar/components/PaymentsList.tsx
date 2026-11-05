import React from 'react';
import type { FixedNotification } from '@/shared/types';
import { Calendar, Check, CheckSquare } from '@/shared/components/icons';
import { getDueDateBadgeColor, isPaymentChecked } from '../utils/calendarView';

interface PaymentsListProps {
  /** 'all' acrescenta o subtítulo "Pagamentos Fixos" */
  activeTab: 'payments' | 'todos' | 'all';
  filteredNotifications: FixedNotification[];
  pendingNotifications: FixedNotification[];
  checkedState: Record<string, boolean>;
  year: number;
  month: number;
  selectedDayFilter: number | null;
  initiatePayment: (description: string) => void;
  initiateFix: (description: string) => void;
  initiateSelectAll: () => void;
}

/** Cartões dos pagamentos fixos do mês + rodapé com "Selecionar Todos" */
export const PaymentsList: React.FC<PaymentsListProps> = ({
  activeTab,
  filteredNotifications,
  pendingNotifications,
  checkedState,
  year,
  month,
  selectedDayFilter,
  initiatePayment,
  initiateFix,
  initiateSelectAll,
}) => (
  <div className="space-y-3">
    {activeTab === 'all' && (
      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <CheckSquare className="w-3.5 h-3.5 text-amber-500" /> Pagamentos Fixos
      </h5>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {filteredNotifications.map((item) => {
        const isChecked = isPaymentChecked(checkedState, year, month, item.description);

        return (
          <div
            key={item.id ?? `${item.day}-${item.description}`}
            className={`flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200 border ${
              isChecked
                ? 'bg-slate-50 border-slate-200 opacity-60'
                : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div 
              className="relative flex items-center shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                if (!isChecked) {
                  initiatePayment(item.description);
                }
              }}
            >
              <div
                className={`w-5 h-5 rounded-md transition-all cursor-pointer flex items-center justify-center border ${
                  !isChecked
                    ? 'border-slate-300 bg-slate-50 hover:border-amber-500'
                    : 'bg-emerald-500 border-emerald-500 text-white'
                }`}
              >
                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
            <div
              className="flex-1 min-w-0 cursor-pointer select-none"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isChecked) {
                  initiatePayment(item.description);
                }
              }}
            >
              <p className={`font-medium text-xs truncate ${
                isChecked ? "text-slate-400 line-through" : "text-slate-900 font-semibold"
              }`}>
                {item.description}
              </p>
              <span className={`text-[10px] mt-1 font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                getDueDateBadgeColor(item.day, isChecked)
              }`}>
                <Calendar className="w-2.5 h-2.5" /> Dia {item.day}
              </span>
            </div>
            {isChecked && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Pago
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    initiateFix(item.description);
                  }}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                >
                  Corrigir
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Botão Selecionar Todos Abaixo dos Pagamentos */}
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-slate-200">
      <div className="text-xs text-slate-500 font-medium">
        {pendingNotifications.length > 0 ? (
          <span>
            <strong className="text-slate-900 font-bold">{pendingNotifications.length}</strong> de <strong className="text-slate-900 font-bold">{filteredNotifications.length}</strong> pagamentos pendentes {selectedDayFilter ? `no Dia ${selectedDayFilter}` : 'neste filtro'}.
          </span>
        ) : (
          <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            Todos os {filteredNotifications.length} pagamentos do período estão confirmados!
          </span>
        )}
      </div>

      <button
        onClick={initiateSelectAll}
        disabled={pendingNotifications.length === 0}
        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
          pendingNotifications.length > 0
            ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-emerald-600/20 cursor-pointer'
            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
        }`}
        title={
          pendingNotifications.length > 0
            ? `Marcar todos os ${pendingNotifications.length} pagamentos pendentes como pagos`
            : 'Nenhum pagamento pendente para confirmar'
        }
      >
        <Check className="w-4 h-4 stroke-[3]" />
        <span>
          Selecionar Todos {selectedDayFilter ? `(Dia ${selectedDayFilter})` : '(Todos)'}
        </span>
      </button>
    </div>
  </div>
);
