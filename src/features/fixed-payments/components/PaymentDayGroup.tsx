import React from 'react';
import type { FixedNotification } from '@/shared/types';
import { Edit, Trash2, ChevronDown, ChevronRight } from '@/shared/components/icons';
import { getMonthLabel } from '../utils/fixedPaymentsView';

interface PaymentDayGroupProps {
  day: number;
  payments: FixedNotification[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (payment: FixedNotification) => void;
  onDelete: (payment: FixedNotification) => void;
}

/** Um dia de vencimento: cabeçalho recolhível e os pagamentos daquele dia */
export const PaymentDayGroup: React.FC<PaymentDayGroupProps> = ({ day, payments, isExpanded, onToggle, onEdit, onDelete }) => (
  <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shadow-xs">
    {/* Day Header */}
    <button
      onClick={() => onToggle()}
      className="w-full flex items-center justify-between p-4 hover:bg-slate-100/70 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <span className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs">
          Dia {day}
        </span>
        <span className="text-xs font-semibold text-slate-700">
          {payments.length} pagamento{payments.length !== 1 ? 's' : ''}
        </span>
      </div>
      {isExpanded ? (
        <ChevronDown className="w-4 h-4 text-slate-500" />
      ) : (
        <ChevronRight className="w-4 h-4 text-slate-500" />
      )}
    </button>

    {/* Payments for this day */}
    {isExpanded && (
      <div className="p-4 pt-0 space-y-2 border-t border-slate-200/60 bg-white">
        {payments.map(payment => (
          <div
            key={payment.id}
            className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-all"
          >
            <div className="flex-1 min-w-0 pr-4">
              <p className="font-semibold text-xs text-slate-900 truncate">{payment.description}</p>
              {payment.months && payment.months.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {payment.months.map(m => {
                    const monthLabel = getMonthLabel(m);
                    return (
                      <span
                        key={m}
                        className="text-[10px] px-2 py-0.2 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold"
                      >
                        {monthLabel}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onEdit(payment)}
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-200 rounded-lg transition-all"
                title="Editar"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(payment)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
