import React from 'react';
import { X, Download, FileText, Image as ImageIcon } from '@/shared/components/icons';
import { formatCurrency, formatDateBR } from '@/shared/utils/formatters';
import type { Expense } from '@/shared/types';

interface ReceiptModalProps {
  expense: Expense | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ expense, onClose }) => {
  if (!expense || !expense.receiptUrl) return null;

  const isPdf = expense.receiptUrl.startsWith('data:application/pdf');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = expense.receiptUrl!;
    link.download = `comprovante-${expense.description.replace(/\s+/g, '_')}-${expense.date}.${isPdf ? 'pdf' : 'jpg'}`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in no-print"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Comprovante: {expense.description}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {expense.store} • {formatDateBR(expense.date)} • {formatCurrency(expense.amount)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Baixar comprovante"
            >
              <Download className="w-4 h-4" />
              <span>Baixar</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Fechar visualizador"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-slate-900/5">
          {isPdf ? (
            <iframe
              src={expense.receiptUrl}
              className="w-full h-[60vh] rounded-xl border border-slate-200"
              title="Visualizador de PDF"
            />
          ) : (
            <img
              src={expense.receiptUrl}
              alt={`Comprovante de ${expense.description}`}
              className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-md"
            />
          )}
        </div>
      </div>
    </div>
  );
};
