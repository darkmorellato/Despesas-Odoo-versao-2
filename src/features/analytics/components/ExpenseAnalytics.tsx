import React, { useMemo, useState, useEffect, memo } from 'react';
import type { Expense } from '@/shared/types';
import { STORE_IMAGES } from '@/config/constants';
import { formatCurrency, formatMonthBR } from '@/shared/utils/formatters';
import { BarChart2, TrendingUp, TrendingDown, DollarSign, Calendar, Tag, Store, ChevronLeft, ChevronRight, PieChart } from '@/shared/components/icons';
import { generateAnalyticsStats } from '../utils/analyticsEngine';

interface ExpenseAnalyticsProps {
  expenses: Expense[];
  currency: string;
}

type ViewMode = 'monthly' | 'yearly';

// Palette matching the reference image's soft pastel/tech tones
const CATEGORY_COLORS = [
  '#C29B9B', // dusty rose
  '#B8A99A', // taupe / sand
  '#9AB3C2', // soft slate blue
  '#ACC29B', // sage green
  '#B89AC2', // soft lilac
  '#C2B09A', // warm sand
  '#9AC2BE', // soft seafoam
  '#C2A49A', // terracotta pastel
  '#A0AEC0', // slate
  '#D69E2E', // soft amber
];

export const ExpenseAnalytics: React.FC<ExpenseAnalyticsProps> = memo(({ expenses, currency }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const allStats = useMemo(() => generateAnalyticsStats(expenses), [expenses]);

  // Valores defensivos: garantem que TODOS os hooks rodem antes de qualquer
  // retorno condicional (Rules of Hooks), mesmo sem dados disponíveis.
  const monthlyData = allStats?.monthlyData ?? [];
  const years = allStats?.years ?? [];

  // Inicializa/ressincroniza o ano selecionado com os anos disponíveis
  useEffect(() => {
    if (viewMode === 'yearly' && years.length > 0 && (!selectedYear || !years.includes(selectedYear))) {
      setSelectedYear(years[0]);
    }
  }, [viewMode, selectedYear, years]);

  // Sanea o índice do mês: mantém selectedMonthIndex dentro do intervalo válido
  // de monthlyData (evita índice órfão quando os dados mudam/filtram)
  useEffect(() => {
    if (monthlyData.length > 0 && (selectedMonthIndex < 0 || selectedMonthIndex >= monthlyData.length)) {
      setSelectedMonthIndex(Math.min(Math.max(selectedMonthIndex, 0), monthlyData.length - 1));
    }
  }, [monthlyData.length, selectedMonthIndex]);

  if (!allStats) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center fade-in border border-slate-200/90 shadow-sm">
        <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600">
          <BarChart2 className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Sem Dados para Análise</h3>
        <p className="text-slate-500 text-xs mt-1">Adicione despesas para visualizar os gráficos</p>
      </div>
    );
  }

  const currentYearData = selectedYear 
    ? allStats.yearlyData.find(y => y.year === selectedYear) 
    : null;
  const currentMonthData = viewMode === 'monthly' 
    ? allStats.monthlyData[selectedMonthIndex] 
    : null;
  // Pode estar indefinido enquanto o índice/ano é saneado ou quando não há dados
  // no período selecionado — nesse caso renderizamos a UI de estado vazio abaixo.
  const activeData = viewMode === 'monthly' ? currentMonthData : currentYearData;
  const maxStoreAmount = activeData?.sortedStores[0]?.amount || 1;
  const maxCategoryAmount = activeData?.sortedCategories[0]?.amount || 1;

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

  // SVG Donut Calculations
  const radius = 68;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const donutSegments = ((activeData?.sortedCategories ?? []) as Array<{ category: string; amount: number; percentage: number }>).map((cat, idx) => {
    const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += cat.percentage;
    return {
      category: cat.category,
      amount: cat.amount,
      percentage: cat.percentage,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Header da Análise */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Dashboard Analítico</h3>
              <p className="text-xs text-slate-500">
                {allStats.count} lançamentos em {allStats.monthsCount} mês(es)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex bg-slate-200/80 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'monthly'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setViewMode('yearly')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'yearly'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Anual
              </button>
            </div>

            {viewMode === 'monthly' ? (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={handlePrevMonth}
                  disabled={selectedMonthIndex >= allStats.monthlyData.length - 1}
                  className="p-1.5 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-800 px-2 min-w-[110px] text-center text-xs capitalize">
                  {currentMonthData ? formatMonthBR(currentMonthData.month) : '—'}
                </span>
                <button
                  onClick={handleNextMonth}
                  disabled={selectedMonthIndex <= 0}
                  className="p-1.5 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={handlePrevYear}
                  disabled={allStats.years.indexOf(selectedYear || allStats.years[0]) >= allStats.years.length - 1}
                  className="p-1.5 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-800 px-2 min-w-[80px] text-center text-xs">
                  {selectedYear || allStats.years[0] || '—'}
                </span>
                <button
                  onClick={handleNextYear}
                  disabled={allStats.years.indexOf(selectedYear || allStats.years[0]) <= 0}
                  className="p-1.5 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sem dados no período selecionado: mantém a navegação visível */}
        {!activeData && (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600">
              <BarChart2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Sem Dados no Período Selecionado</h3>
            <p className="text-slate-500 text-xs mt-1">Use a navegação acima para escolher outro mês/ano</p>
          </div>
        )}

        {activeData && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* Top 3 KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total {viewMode === 'monthly' ? 'Mensal' : 'Anual'}</p>
                  <h3 className="text-2xl sm:text-3xl font-bold mt-1 text-slate-950 tabular-nums">
                    {currency} {formatCurrency(activeData.total)}
                  </h3>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60 font-medium">
                {activeData.count} lançamentos computados
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loja Top 1</p>
                  <h3 className="text-base font-bold mt-1 text-slate-900">
                    {activeData.sortedStores[0]?.store || "N/A"}
                  </h3>
                  <p className="text-lg font-bold text-amber-600 tabular-nums mt-0.5">
                    {currency} {formatCurrency(activeData.sortedStores[0]?.amount || 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-emerald-700 mt-3 pt-2.5 border-t border-slate-200/60 font-semibold">
                Maior representatividade no período
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoria Top 1</p>
                  <h3 className="text-base font-bold mt-1 text-slate-900 truncate max-w-[170px]">
                    {activeData.sortedCategories[0]?.category || "N/A"}
                  </h3>
                  <p className="text-lg font-bold text-cyan-700 tabular-nums mt-0.5">
                    {currency} {formatCurrency(activeData.sortedCategories[0]?.amount || 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-100 text-cyan-700">
                  <Tag className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-cyan-700 mt-3 pt-2.5 border-t border-slate-200/60 font-semibold">
                {activeData.sortedCategories[0]?.percentage.toFixed(0) || 0}% do valor total
              </p>
            </div>
          </div>

          {/* Yearly Bar Evolution Chart */}
          {viewMode === 'yearly' && currentYearData && 'monthlyBreakdown' in currentYearData && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Evolução Mensal ({selectedYear})</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Histórico de Gastos por Mês</p>
                </div>
              </div>
              
              <div className="flex items-end gap-2 h-40 pt-4">
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const monthStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`;
                  const monthData = currentYearData.monthlyBreakdown.find((m: any) => m.month === monthStr);
                  const hasData = !!monthData;
                  const total = monthData?.total || 0;
                  const maxTotal = Math.max(...currentYearData.monthlyBreakdown.map((m: any) => m.total), 1);
                  const heightPercent = hasData ? (total / maxTotal) * 100 : 0;
                  
                  return (
                    <div key={monthIndex} className="flex-1 flex flex-col items-center group">
                      <div className="w-full flex flex-col items-center justify-end h-28 relative">
                        <div 
                          className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 relative ${
                            hasData 
                              ? 'bg-[#B8A99A] hover:bg-[#A8998A] cursor-pointer shadow-xs' 
                              : 'bg-slate-100'
                          }`}
                          style={{ height: `${Math.max(heightPercent, 4)}%` }}
                        >
                          {hasData && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg pointer-events-none">
                              {currency} {formatCurrency(total)}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase mt-2">
                        {monthNames[monthIndex].substring(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gráfico de Donut & Ranking de Lojas (Matches Reference Image) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Donut (Distribuição do Mix / Categorias) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-base">Distribuição por Categoria</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Participação por Categoria</p>
              </div>

              {/* Donut Ring with Central Consolidated Total */}
              <div className="relative flex items-center justify-center my-6">
                <svg className="w-52 h-52 -rotate-90 transform" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {/* Donut Segments */}
                  {donutSegments.map((seg, i) => (
                    <circle
                      key={i}
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke={seg.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-700"
                    />
                  ))}
                </svg>
                {/* Center Consolidated Info */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-950 tabular-nums font-serif">
                    {currency} {formatCurrency(activeData.total)}
                  </span>
                </div>
              </div>

              {/* 2-Column Grid Legend */}
              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
                {donutSegments.slice(0, 6).map((seg, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: seg.color }} />
                      <span className="text-slate-700 truncate font-medium">{seg.category}</span>
                    </div>
                    <span className="text-slate-500 font-bold tabular-nums shrink-0">{seg.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranking de Lojas (Top Performers - Matches Reference Image Chart) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-base">Ranking de Lojas</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Ranking por Volume de Despesas</p>
              </div>

              <div className="space-y-4 my-4">
                {activeData.sortedStores.slice(0, 5).map((item: any, idx: number) => {
                  const barColor = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  return (
                    <div key={item.store} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                          <img
                            src={STORE_IMAGES[item.store] || STORE_IMAGES["default"]}
                            alt={item.store}
                            className="w-4 h-4 rounded object-cover"
                          />
                          <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                            {item.store}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 tabular-nums">
                          {currency} {formatCurrency(item.amount)}
                        </span>
                      </div>
                      {/* Bar Track */}
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden ml-6">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(item.amount / maxStoreAmount) * 100}%`,
                            backgroundColor: barColor
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Top performer: <strong className="text-slate-900">{activeData.sortedStores[0]?.store || "N/A"}</strong></span>
                <span className="text-amber-600 font-bold tabular-nums">
                  {currency} {formatCurrency(activeData.sortedStores[0]?.amount || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Maiores Despesas Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-slate-600" />
              <div>
                <h4 className="font-bold text-slate-900 text-base">Maiores Despesas</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Lançamentos Individuais</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-200 bg-slate-50/50">
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3">Loja</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activeData.topExpenses.map((exp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{exp.description}</td>
                      <td className="py-2.5 px-3 text-slate-500">{exp.store}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-950 tabular-nums">
                        {currency} {formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Metric Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Geral</p>
              <p className="text-base font-bold text-slate-950 tabular-nums">{currency} {formatCurrency(allStats.total)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                {viewMode === 'monthly' ? 'Média Mensal' : 'Média por Mês'}
              </p>
              <p className="text-base font-bold text-slate-950 tabular-nums">
                {currency} {formatCurrency(viewMode === 'monthly' ? allStats.avgPerMonth : (currentYearData?.avgPerMonth || 0))}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Média por Lançamento</p>
              <p className="text-base font-bold text-slate-950 tabular-nums">{currency} {formatCurrency(allStats.avgPerExpense)}</p>
            </div>
            <div className={`rounded-xl p-4 border ${allStats.monthChange >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {allStats.monthChange >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <p className="text-[10px] font-bold text-slate-600 uppercase">
                  {allStats.hasPrevMonth ? 'vs Mês Anterior' : 'Sem Mês Anterior'}
                </p>
              </div>
              <p className={`text-base font-bold tabular-nums ${allStats.monthChange >= 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                {allStats.hasPrevMonth
                  ? `${allStats.monthChange >= 0 ? '+' : ''}${allStats.monthChange.toFixed(1)}%`
                  : '—'}
              </p>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
});

export default ExpenseAnalytics;
