import React, { memo } from 'react';
import type { Expense } from '@/shared/types';
import { STORE_IMAGES } from '@/config/constants';
import { formatDateBR, formatCurrency } from '@/shared/utils/formatters';
import { Edit, Trash2, Paperclip, FileText } from '@/shared/components/icons';

interface ExpenseTableRowProps {
  expense: Expense;
  groupBy: 'date' | 'store';
  defaultEmployeeName: string;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onViewReceipt?: (expense: Expense) => void;
}

export const ExpenseTableRow: React.FC<ExpenseTableRowProps> = memo(({
  expense,
  groupBy,
  defaultEmployeeName,
  onEdit,
  onDelete,
  onViewReceipt
}) => {
  return (
    <tr className="hover:bg-slate-50/80 transition-colors group">
      {groupBy === 'date' && (
        <td className="px-6 py-3.5 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <img
              src={STORE_IMAGES[expense.store] || STORE_IMAGES["default"]}
              alt={expense.store}
              className="w-4 h-4 rounded object-cover"
            />
            <span className="font-semibold text-slate-900">{expense.store}</span>
          </div>
        </td>
      )}
      <td className="px-6 py-3.5 text-slate-500 font-medium whitespace-nowrap">
        {expense.employeeName || defaultEmployeeName}
      </td>
      <td className="px-6 py-3.5 whitespace-nowrap">
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          {expense.category}
        </span>
      </td>
      <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 font-medium">
        {formatDateBR(expense.date)}
      </td>
      <td className="px-6 py-3.5">
        <div className="font-medium text-slate-900 leading-tight flex items-center gap-1.5 flex-wrap">
          <span>{expense.description}</span>
          {expense.receiptUrl && onViewReceipt && (
            <button
              type="button"
              onClick={() => onViewReceipt(expense)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
              title="Ver comprovante anexado"
            >
              <Paperclip className="w-2.5 h-2.5" />
              <span>Anexo</span>
            </button>
          )}
        </div>
        {expense.notes && (
          <div className="text-[11px] text-slate-400 mt-0.5 italic">{expense.notes}</div>
        )}
      </td>
      <td className="px-6 py-3.5 text-right font-bold text-slate-950 tabular-nums whitespace-nowrap">
        <div>{formatCurrency(expense.amount)}</div>
        {expense.originalTotal && (
          <div className="text-[9px] text-slate-400 font-normal">
            Orig: {formatCurrency(expense.originalTotal)}
          </div>
        )}
      </td>
      <td className="px-6 py-3.5 text-center no-print">
        <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
          {expense.receiptUrl && onViewReceipt && (
            <button
              onClick={() => onViewReceipt(expense)}
              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all cursor-pointer"
              title="Visualizar Comprovante"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
            </button>
          )}
          <button
            onClick={() => onEdit(expense)}
            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
            title="Editar Lançamento"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(expense)}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
            title="Excluir Lançamento"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default ExpenseTableRow;
