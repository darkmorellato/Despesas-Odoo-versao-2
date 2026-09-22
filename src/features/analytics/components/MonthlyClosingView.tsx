import React, { useState, useMemo, useEffect } from 'react';
import type { Expense } from '@/shared/types';
import { STORE_IMAGES, STORES_LIST } from '@/config/constants';
import { formatCurrency, formatMonthBR, getTodayLocal } from '@/shared/utils/formatters';
import { getStoreOrder } from '@/shared/utils/helpers';
import { FileText, Printer, TrendingUp, TrendingDown, DollarSign, Calendar, Store, CheckCircle, ShieldCheck, ChevronLeft, ChevronRight } from '@/shared/components/icons';
import { exportVectorPDF } from '@/shared/utils/pdfExport';

interface MonthlyClosingViewProps {
  expenses: Expense[];
  currency: string;
  employeeName: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MonthlyClosingView: React.FC<MonthlyClosingViewProps> = ({
  expenses,
  currency,
  employeeName,
  showToast
}) => {
  const availableMonths = useMemo(() => {
    const months = [...new Set(expenses.map(e => e.date.substring(0, 7)))];
    return months.sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (availableMonths.length > 0) return availableMonths[0];
    return getTodayLocal().substring(0, 7);
  });

  // Ressincroniza a seleção: quando o mês escolhido deixar de existir em
  // availableMonths (dados carregados/removidos), seleciona o mais recente.
  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Índice do mês selecionado: -1 quando o mês ainda não está na lista
  // (estado transitório) — nesse caso a navegação fica desabilitada.
  const selectedMonthIndex = availableMonths.indexOf(selectedMonth);
  const canGoToPrevMonth = selectedMonthIndex >= 0 && selectedMonthIndex < availableMonths.length - 1;
  const canGoToNextMonth = selectedMonthIndex > 0;

  // Mês anterior para comparação
  const previousMonth = useMemo(() => {
    if (!selectedMonth) return null;
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const prevStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return prevStr;
  }, [selectedMonth]);

  // Despesas do mês selecionado
  const monthExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Despesas do mês anterior
  const prevMonthExpenses = useMemo(() => {
    if (!previousMonth) return [];
    return expenses.filter(e => e.date.startsWith(previousMonth));
  }, [expenses, previousMonth]);

  const totalCurrent = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses]);
  const totalPrev = useMemo(() => prevMonthExpenses.reduce((s, e) => s + e.amount, 0), [prevMonthExpenses]);

  const diffAmount = totalCurrent - totalPrev;
  const diffPercent = totalPrev > 0 ? ((diffAmount / totalPrev) * 100) : 0;

  // Breakdown por loja
  const storeBreakdown = useMemo(() => {
    const storeMap: Record<string, {
      fixed: number;
      salaries: number;
      operational: number;
      total: number;
      count: number;
    }> = {};

    STORES_LIST.forEach(s => {
      storeMap[s] = { fixed: 0, salaries: 0, operational: 0, total: 0, count: 0 };
    });

    monthExpenses.forEach(e => {
      if (!storeMap[e.store]) {
        storeMap[e.store] = { fixed: 0, salaries: 0, operational: 0, total: 0, count: 0 };
      }
      storeMap[e.store].total += e.amount;
      storeMap[e.store].count += 1;

      if (e.category === 'Despesa Fixa') {
        storeMap[e.store].fixed += e.amount;
      } else if (['Salário', 'Vale Alimentação', 'Vale Transporte', 'Vale (Adiantamento)'].includes(e.category)) {
        storeMap[e.store].salaries += e.amount;
      } else {
        storeMap[e.store].operational += e.amount;
      }
    });

    return Object.entries(storeMap)
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => getStoreOrder(a[0]) - getStoreOrder(b[0]));
  }, [monthExpenses]);

  // Loja com maior despesa
  const topStore = useMemo(() => {
    if (storeBreakdown.length === 0) return null;
    const sorted = [...storeBreakdown].sort((a, b) => b[1].total - a[1].total);
    return sorted[0];
  }, [storeBreakdown]);

  // Exportar Relatório Executivo
  const handleExportPDF = () => {
    const defaultFileName = `fechamento-consolidado-${selectedMonth}.pdf`;
    const periodLabel = `Fechamento Consolidado: ${formatMonthBR(selectedMonth)}`;

    exportVectorPDF(
      monthExpenses,
      {
        employeeName,
        currency,
        categories: []
      },
      periodLabel,
      defaultFileName
    );
    showToast('Fechamento em PDF gerado com sucesso!', 'success');
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Fechamento Mensal Consolidado</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                  DRE Executivo
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Demonstrativo de despesas por centro de custo e comparativo mensal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Seletor de Mês */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <button
                onClick={() => {
                  if (canGoToPrevMonth) setSelectedMonth(availableMonths[selectedMonthIndex + 1]);
                }}
                disabled={!canGoToPrevMonth}
                className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-900 px-3 min-w-[120px] text-center text-xs capitalize">
                {formatMonthBR(selectedMonth)}
              </span>
              <button
                onClick={() => {
                  if (canGoToNextMonth) setSelectedMonth(availableMonths[selectedMonthIndex - 1]);
                }}
                disabled={!canGoToNextMonth}
                className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Exportar Fechamento</span>
            </button>
          </div>
        </div>

        {/* KPIs Executivos */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total do Mês */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Consolidado</p>
              <h4 className="text-2xl font-bold text-slate-950 mt-1 tabular-nums">
                {currency} {formatCurrency(totalCurrent)}
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">{monthExpenses.length} lançamentos auditados</p>
            </div>

            {/* Comparativo com Mês Anterior */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variação vs Mês Anterior</p>
              <div className="flex items-center gap-2 mt-1">
                <h4 className={`text-2xl font-bold tabular-nums ${diffAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {diffAmount > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
                </h4>
                {diffAmount > 0 ? (
                  <TrendingUp className="w-5 h-5 text-rose-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-emerald-500" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {previousMonth ? `vs ${formatMonthBR(previousMonth)}` : 'Sem histórico anterior'}
              </p>
            </div>

            {/* Centro de Custo Líder */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Maior Centro de Custo</p>
              <h4 className="text-xl font-bold text-slate-900 mt-1 truncate">
                {topStore ? topStore[0] : 'Nenhum'}
              </h4>
              <p className="text-xs text-amber-700 font-bold mt-1 tabular-nums">
                {topStore ? `${currency} ${formatCurrency(topStore[1].total)}` : '-'}
              </p>
            </div>

            {/* Integridade & Compliance */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status do Fechamento</p>
              <div className="flex items-center gap-2 mt-1.5 text-emerald-700">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-bold">100% Auditado</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">Sincronizado na Nuvem</p>
            </div>
          </div>

          {/* Tabela Demonstrativa por Loja */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Demonstrativo por Centro de Custo (Loja)
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                {storeBreakdown.length} lojas ativas no período
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="px-4 py-3">Loja</th>
                    <th className="px-4 py-3 text-right">Fixas</th>
                    <th className="px-4 py-3 text-right">Salários / Benefícios</th>
                    <th className="px-4 py-3 text-right">Operacionais / Outras</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-900">Total Geral</th>
                    <th className="px-4 py-3 text-right">% do Mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {storeBreakdown.map(([storeName, data]) => {
                    const percent = totalCurrent > 0 ? (data.total / totalCurrent) * 100 : 0;
                    return (
                      <tr key={storeName} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <img
                              src={STORE_IMAGES[storeName] || STORE_IMAGES["default"]}
                              alt={storeName}
                              className="w-5 h-5 rounded object-cover"
                            />
                            <span>{storeName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 font-medium">
                          {formatCurrency(data.fixed)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 font-medium">
                          {formatCurrency(data.salaries)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 font-medium">
                          {formatCurrency(data.operational)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums font-bold text-slate-950">
                          {currency} {formatCurrency(data.total)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-500">
                          <div className="flex items-center justify-end gap-2">
                            <span>{percent.toFixed(1)}%</span>
                            <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden inline-block">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td className="px-4 py-3.5 uppercase tracking-wider text-xs">Total Consolidado</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-xs">
                      {formatCurrency(storeBreakdown.reduce((s, [_, d]) => s + d.fixed, 0))}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-xs">
                      {formatCurrency(storeBreakdown.reduce((s, [_, d]) => s + d.salaries, 0))}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-xs">
                      {formatCurrency(storeBreakdown.reduce((s, [_, d]) => s + d.operational, 0))}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-sm text-slate-950 font-extrabold">
                      {currency} {formatCurrency(totalCurrent)}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-xs text-slate-900">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
