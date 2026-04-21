import React, { useMemo, useState, useEffect, memo, useCallback } from 'react';
import type { Expense } from '@/shared/types';
import { STORE_IMAGES } from '@/config/constants';
import { formatCurrency, formatMonthBR } from '@/shared/utils/formatters';
import { BarChart2, TrendingUp, TrendingDown, DollarSign, Calendar, Tag, Store, ChevronLeft, ChevronRight } from '@/shared/components/icons';

/**
 * Props para o componente ExpenseAnalytics
 * @interface ExpenseAnalyticsProps
 */
interface ExpenseAnalyticsProps {
  /** Array de despesas para análise */
  expenses: Expense[];
  /** Símbolo da moeda (ex: 'R$') */
  currency: string;
}

type ViewMode = 'monthly' | 'yearly';

import { generateAnalyticsStats } from '../utils/analyticsEngine';

/**
 * Componente de Dashboard Analítico de Despesas
 * 
 * Exibe gráficos e estatísticas detalhadas das despesas com:
 * - Visualização mensal ou anual
 * - Ranking de lojas por valor
 * - Distribuição por categoria
 * - Top 5 maiores despesas
 * - Comparação com período anterior
 * 
 * @param props - Props do componente
 * @returns Componente de dashboard analítico
 * 
 * @example
 * ```tsx
 * <ExpenseAnalytics 
 *   expenses={expenses} 
 *   currency="R$" 
 * />
 * ```
 */
export const ExpenseAnalytics: React.FC<ExpenseAnalyticsProps> = memo(({ expenses, currency }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const allStats = useMemo(() => generateAnalyticsStats(expenses), [expenses]);

  if (!allStats) {
    return (
      <div className="bg-white rounded-[40px] p-12 text-center fade-in border border-gray-100">
        <div className="w-16 h-16 bg-[#EBE7D9] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BarChart2 className="w-8 h-8 text-[#7C5CFC]" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Sem Dados para Análise</h2>
        <p className="text-gray-400 mt-2">Adicione despesas para visualizar os gráficos</p>
      </div>
    );
  }

  const currentYearData = selectedYear 
    ? allStats.yearlyData.find(y => y.year === selectedYear) 
    : null;
  const currentMonthData = viewMode === 'monthly' 
    ? allStats.monthlyData[selectedMonthIndex] 
    : null;

  useEffect(() => {
    if (viewMode === 'yearly' && !selectedYear && allStats.years.length > 0) {
      setSelectedYear(allStats.years[0]);
    }
  }, [viewMode, selectedYear, allStats.years]);

  if (viewMode === 'monthly' && !currentMonthData) return null;
  if (viewMode === 'yearly' && !currentYearData) return null;

  const activeData = viewMode === 'monthly' ? currentMonthData! : currentYearData!;
  const maxStoreAmount = activeData.sortedStores[0]?.amount || 1;
  const maxCategoryAmount = activeData.sortedCategories[0]?.amount || 1;

  const getBarColor = (index: number) => {
    const colors = [
      'from-blue-500 to-blue-400',
      'from-emerald-500 to-emerald-400',
      'from-purple-500 to-purple-400',
      'from-orange-500 to-orange-400',
      'from-pink-500 to-pink-400',
      'from-cyan-500 to-cyan-400',
      'from-amber-500 to-amber-400',
      'from-indigo-500 to-indigo-400',
    ];
    return colors[index % colors.length];
  };

  const handlePrevMonth = () => {
    if (selectedMonthIndex < allStats.monthlyData.length - 1) {
      setSelectedMonthIndex(prev => prev + 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex > 0) {
      setSelectedMonthIndex(prev => prev - 1);
    }
  };

  const handlePrevYear = () => {
    const currentIdx = allStats.years.indexOf(selectedYear || allStats.years[0]);
    if (currentIdx < allStats.years.length - 1) {
      setSelectedYear(allStats.years[currentIdx + 1]);
    }
  };

  const handleNextYear = () => {
    const currentIdx = allStats.years.indexOf(selectedYear || allStats.years[0]);
    if (currentIdx > 0) {
      setSelectedYear(allStats.years[currentIdx - 1]);
    }
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-white rounded-[40px] p-8 border border-gray-100">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#7C5CFC] rounded-xl text-white">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Dashboard Analítico</h2>
              <p className="text-xs text-gray-400 font-medium">
                {allStats.count} lançamentos em {allStats.monthsCount} mês(es)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
<div className="flex bg-[#EBE7D9] p-1 rounded-xl">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'monthly'
                  ? 'bg-black text-white'
                  : 'text-gray-500 hover:bg-white'
                }`}
              >
                Mensal
              </button>
<button
                onClick={() => setViewMode('yearly')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'yearly'
                  ? 'bg-black text-white'
                  : 'text-gray-500 hover:bg-white'
                }`}
              >
                Anual
              </button>
            </div>

            {viewMode === 'monthly' ? (
              <div className="flex items-center gap-2 bg-[#EBE7D9] p-1 rounded-xl">
                <button
                  onClick={handlePrevMonth}
                  disabled={selectedMonthIndex >= allStats.monthlyData.length - 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-[#1A1A1A] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-[#1A1A1A] px-3 min-w-[120px] text-center capitalize">
                  {formatMonthBR(currentMonthData!.month)}
                </span>
                <button
                  onClick={handleNextMonth}
                  disabled={selectedMonthIndex <= 0}
                  className="p-2 rounded-lg text-gray-400 hover:text-[#1A1A1A] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-[#EBE7D9] p-1 rounded-xl">
                <button
                  onClick={handlePrevYear}
                  disabled={allStats.years.indexOf(selectedYear || allStats.years[0]) >= allStats.years.length - 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-[#1A1A1A] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-slate-700 px-3 min-w-[80px] text-center">
                  {selectedYear || allStats.years[0]}
                </span>
                <button
                  onClick={handleNextYear}
                  disabled={allStats.years.indexOf(selectedYear || allStats.years[0]) <= 0}
                  className="p-2 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-5 border border-blue-200/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                Total {viewMode === 'monthly' ? 'Mensal' : 'Anual'}
              </span>
            </div>
            <p className="text-3xl font-extrabold text-blue-700">
              {currency} {formatCurrency(activeData.total)}
            </p>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              {activeData.count} lançamentos
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-5 border border-emerald-200/50">
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Loja Top 1</span>
            </div>
            <div className="flex items-center gap-2">
              <img
                src={STORE_IMAGES[activeData.sortedStores[0]?.store] || STORE_IMAGES["default"]}
                alt={activeData.sortedStores[0]?.store}
                className="w-6 h-6 rounded-full"
              />
              <div>
                <p className="text-sm font-bold text-emerald-800">
                  {activeData.sortedStores[0]?.store}
                </p>
                <p className="text-lg font-extrabold text-emerald-700">
                  {currency} {formatCurrency(activeData.sortedStores[0]?.amount || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-5 border border-purple-200/50">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-purple-600" />
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Categoria Top 1</span>
            </div>
            <div>
              <p className="text-sm font-bold text-purple-800">
                {activeData.sortedCategories[0]?.category}
              </p>
              <p className="text-lg font-extrabold text-purple-700">
                {currency} {formatCurrency(activeData.sortedCategories[0]?.amount || 0)}
              </p>
            </div>
          </div>
        </div>

        {viewMode === 'yearly' && currentYearData && 'monthlyBreakdown' in currentYearData && (
          <div className="bg-white/50 rounded-2xl p-5 border border-white/60 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                <h3 className="font-bold text-slate-700">Evolução Mensal ({selectedYear})</h3>
              </div>
            </div>
            
            <div className="flex items-end gap-1.5 h-36">
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const monthStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`;
                const monthData = currentYearData.monthlyBreakdown.find((m: any) => m.month === monthStr);
                const hasData = !!monthData;
                const total = monthData?.total || 0;
                const maxTotal = Math.max(...currentYearData.monthlyBreakdown.map((m: any) => m.total), 1);
                const heightPercent = hasData ? (total / maxTotal) * 100 : 0;
                
                return (
                  <div key={monthIndex} className="flex-1 flex flex-col items-center group">
                    <div className="w-full flex flex-col items-center justify-end h-24 relative">
                      <div 
                        className={`w-full max-w-[24px] rounded-t transition-all duration-500 relative ${
                          hasData 
                            ? `bg-gradient-to-t ${getBarColor(monthIndex)} cursor-pointer hover:opacity-80` 
                            : 'bg-slate-200'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        {hasData && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                            {currency} {formatCurrency(total)}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase mt-1.5">
                      {monthNames[monthIndex].substring(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/50 rounded-2xl p-5 border border-white/60">
            <div className="flex items-center gap-2 mb-4">
              <Store className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-700">Ranking de Lojas</h3>
            </div>
            <div className="space-y-3">
              {activeData.sortedStores.slice(0, 5).map((item: any, idx: number) => (
                <div key={item.store} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                      <img
                        src={STORE_IMAGES[item.store] || STORE_IMAGES["default"]}
                        alt={item.store}
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                        {item.store}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      {currency} {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden ml-6">
                    <div
                      className={`h-full bg-gradient-to-r ${getBarColor(idx)} rounded-full transition-all duration-500`}
                      style={{ width: `${(item.amount / maxStoreAmount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/50 rounded-2xl p-5 border border-white/60">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-slate-700">Maiores Despesas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase font-bold">
                    <th className="pb-2">Descrição</th>
                    <th className="pb-2">Loja</th>
                    <th className="pb-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeData.topExpenses.map((exp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 font-medium text-slate-700">{exp.description}</td>
                      <td className="py-2 text-slate-600">{exp.store}</td>
                      <td className="py-2 text-right font-bold text-slate-800">
                        {currency} {formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white/50 rounded-2xl p-5 border border-white/60">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-700">Distribuição por Categoria</h3>
          </div>
          <div className="space-y-3">
            {activeData.sortedCategories.map((item: any, idx: number) => (
              <div key={item.category} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{item.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800">
                      {currency} {formatCurrency(item.amount)}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${getBarColor(idx + 2)} rounded-full transition-all duration-500`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Geral</p>
            <p className="text-lg font-bold text-slate-700">{currency} {formatCurrency(allStats.total)}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              {viewMode === 'monthly' ? 'Média Mensal' : 'Média por Mês'}
            </p>
            <p className="text-lg font-bold text-slate-700">
              {currency} {formatCurrency(viewMode === 'monthly' ? allStats.avgPerMonth : (currentYearData?.avgPerMonth || 0))}
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Média por Lançamento</p>
            <p className="text-lg font-bold text-slate-700">{currency} {formatCurrency(allStats.avgPerExpense)}</p>
          </div>
          <div className={`rounded-xl p-4 border ${allStats.monthChange >= 0 ? 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200' : 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200'}`}>
            <div className="flex items-center gap-1 mb-1">
              {allStats.monthChange >= 0 ? (
                <TrendingUp className="w-3 h-3 text-orange-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-green-600" />
              )}
              <p className="text-[10px] font-bold text-slate-400 uppercase">vs Mês Anterior</p>
            </div>
            <p className={`text-lg font-bold ${allStats.monthChange >= 0 ? 'text-orange-700' : 'text-green-700'}`}>
              {allStats.monthChange >= 0 ? '+' : ''}{allStats.monthChange.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
