import React, { memo } from 'react';
import { DollarSign, TrendingUp, BarChart2, Store } from '@/shared/components/icons';
import { formatCurrency } from '@/shared/utils/formatters';
import { STORE_IMAGES } from '@/config/constants';
import type { Expense } from '@/shared/types';

interface ExpenseSummaryCardsProps {
  expenses: Expense[];
  filteredExpenses: Expense[];
  totalsByStore: Record<string, number>;
  totalGeneral: number;
  currency: string;
}

export const ExpenseSummaryCards: React.FC<ExpenseSummaryCardsProps> = memo(({
  expenses,
  filteredExpenses,
  totalsByStore,
  totalGeneral,
  currency
}) => {
  return (
    <div className="space-y-5 no-print">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Volume Total */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="border border-slate-200 bg-slate-50 text-slate-600 rounded px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
              Volume Total
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Filtrado</p>
            <h3 className="text-3xl sm:text-4xl font-bold mt-1 text-slate-950 tabular-nums tracking-tight">
              {currency} {formatCurrency(totalGeneral)}
            </h3>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {filteredExpenses.length} Lançamentos
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Base Ativa
            </span>
          </div>
        </div>

        {/* Card 2: Mix Ativo / Histórico */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <span className="border border-slate-200 bg-slate-50 text-slate-600 rounded px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
              Mix Ativo
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volume Geral Acumulado</p>
            <h3 className="text-3xl sm:text-4xl font-bold mt-1 text-slate-950 tabular-nums tracking-tight">
              {currency} {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
            </h3>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {expenses.length} Total Geral
            </span>
            <span className="text-xs text-cyan-600 font-semibold">
              Histórico Completo
            </span>
          </div>
        </div>

        {/* Card 3: Top Performer / Lojas */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <span className="border border-slate-200 bg-slate-50 text-slate-600 rounded px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
              Top Performer
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lojas Ativas</p>
            <h3 className="text-3xl sm:text-4xl font-bold mt-1 text-slate-950 tabular-nums tracking-tight">
              {Object.keys(totalsByStore).length} Lojas
            </h3>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              Centros de Custo
            </span>
            <span className="text-xs text-purple-600 font-semibold">
              Em Operação
            </span>
          </div>
        </div>
      </div>

      {/* Store Breakdown Horizontal Bar Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
        {Object.entries(totalsByStore).sort((a, b) => b[1] - a[1]).map(([storeName, val]) => (
          <div
            key={storeName}
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <img
                src={STORE_IMAGES[storeName] || STORE_IMAGES["default"]}
                alt={storeName}
                className="w-5 h-5 rounded object-cover"
              />
              <span className="text-[10px] uppercase font-bold text-slate-500 truncate block tracking-wider">
                {storeName}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-900 block tabular-nums">
              {currency} {formatCurrency(val)}
            </span>
            <div className="h-1.5 w-full rounded-full bg-slate-100 mt-2.5 overflow-hidden border border-slate-100">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${totalGeneral > 0 ? Math.min((val / totalGeneral) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
