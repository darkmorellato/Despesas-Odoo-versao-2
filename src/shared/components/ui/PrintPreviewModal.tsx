import React, { useMemo } from 'react';
import { Printer, X, Store, FileText } from '@/shared/components/icons';
import { formatDateBR, formatMonthBR, formatCurrency, getTodayLocal } from '@/shared/utils/formatters';
import { getStoreOrder } from '@/shared/utils/helpers';
import { STORE_IMAGES } from '@/config/constants';
import type { Expense, Settings, FilterMode } from '@/shared/types';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  totalsByStore: Record<string, number>;
  totalGeneral: number;
  settings: Settings;
  filterMode: FilterMode;
  selectedDate: string;
  selectedMonth: string;
  searchTerm: string;
  onPrintDirect: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  expenses,
  totalsByStore,
  totalGeneral,
  settings,
  filterMode,
  selectedDate,
  selectedMonth,
  searchTerm,
  onPrintDirect,
}) => {
  if (!isOpen) return null;

  const emissionDate = formatDateBR(getTodayLocal());
  const periodLabel = searchTerm
    ? `Busca: "${searchTerm}"`
    : filterMode === 'month'
    ? `Mês: ${formatMonthBR(selectedMonth)}`
    : `Dia: ${formatDateBR(selectedDate)}`;

  // Group expenses cleanly by Store in the printed document
  const storeGroupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    expenses.forEach((ex) => {
      const stName = ex.store || 'Outros';
      if (!groups[stName]) groups[stName] = [];
      groups[stName].push(ex);
    });

    const sortedStoreNames = Object.keys(groups).sort((a, b) => {
      const orderA = getStoreOrder(a);
      const orderB = getStoreOrder(b);
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });

    return sortedStoreNames.map((storeName) => {
      const items = [...groups[storeName]].sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.description.localeCompare(b.description);
      });

      const total = items.reduce((sum, item) => sum + item.amount, 0);

      return {
        storeName,
        items,
        total,
      };
    });
  }, [expenses]);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-slate-900/75 backdrop-blur-sm overflow-hidden animate-in fade-in">
      {/* Top Fixed Action Bar */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 shadow-xl shrink-0 no-print z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">Pré-visualização do Relatório</h2>
            <p className="text-xs text-slate-400">
              {expenses.length} lançamento(s) • Total: {settings.currency} {formatCurrency(totalGeneral)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onPrintDirect}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Imprimir relatório"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Fechar pré-visualização"
          >
            <X className="w-4 h-4" /> Fechar
          </button>
        </div>
      </header>

      {/* Preview Content Area with smooth scrolling */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 bg-slate-950/40 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
        {/* Printable White Sheet */}
        <div
          id="printable-report"
          className="w-full max-w-4xl bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-10 md:p-12 mb-10 print:shadow-none print:rounded-none print:p-0 print:max-w-none print:m-0"
        >
          {/* Corporate White Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-md text-[11px] font-extrabold uppercase tracking-widest text-slate-700 mb-2">
                  <span>MIPLACE</span>
                  <span>•</span>
                  <span>EQUIPE GLOBAL</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                  Relatório de Despesas
                </h1>
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  Período: <span className="text-slate-900 font-bold">{periodLabel}</span>
                </p>
              </div>

              <div className="text-left md:text-right bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[220px]">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Geral</div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  <span className="text-sm text-slate-500 mr-1">{settings.currency}</span>
                  {formatCurrency(totalGeneral)}
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-1">
                  Emissor: <strong className="text-slate-800">{settings.employeeName}</strong>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Emitido em: {emissionDate}
                </div>
              </div>
            </div>
          </div>

          {/* Grouped Tables by Store */}
          <div className="space-y-8">
            {storeGroupedExpenses.map((group) => (
              <section key={group.storeName} className="print-break-inside-avoid">
                {/* Store Header */}
                <div className="flex items-center justify-between bg-slate-100 px-4 py-2.5 rounded-lg mb-2 border border-slate-200 print:bg-slate-50">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
                    {STORE_IMAGES[group.storeName] ? (
                      <img
                        src={STORE_IMAGES[group.storeName]}
                        alt={group.storeName}
                        className="w-5 h-5 rounded-full object-cover border border-slate-300"
                      />
                    ) : (
                      <Store className="w-4 h-4 text-slate-500" />
                    )}
                    <span>{group.storeName}</span>
                  </h2>
                  <span className="text-xs font-extrabold text-slate-900 bg-white px-3 py-1 rounded border border-slate-200 shadow-2xs">
                    Subtotal Loja: {settings.currency} {formatCurrency(group.total)}
                  </span>
                </div>

                {/* Store Table */}
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                        <th className="px-4 py-3 font-bold">Quem</th>
                        <th className="px-4 py-3 font-bold">Categoria</th>
                        <th className="px-4 py-3 font-bold">Data</th>
                        <th className="px-4 py-3 font-bold">Descrição</th>
                        <th className="px-4 py-3 font-bold text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {group.items.map((ex) => (
                        <tr key={ex.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                            {ex.employeeName || settings.employeeName}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-700">
                              {ex.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {formatDateBR(ex.date)}
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            <div className="font-semibold leading-tight">{ex.description}</div>
                            {ex.notes && (
                              <div className="text-[11px] text-slate-400 mt-0.5 italic">{ex.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            <div>{formatCurrency(ex.amount)}</div>
                            {ex.originalTotal && (
                              <div className="text-[9px] text-slate-400 font-normal">
                                Orig: {formatCurrency(ex.originalTotal)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>

          {/* Document Footer */}
          <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2 print:mt-8">
            <div>Despesas Miplace • Documento gerado pelo sistema</div>
            <div>Página 1 de 1</div>
          </div>
        </div>
      </div>
    </div>
  );
};
