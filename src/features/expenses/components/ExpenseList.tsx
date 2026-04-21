import { useState, useMemo } from 'react';
import { Edit, Trash2, Search, Filter } from 'lucide-react';
import { useExpenses } from '@/features/expenses';
import { formatCurrency, formatDateBR } from '@/shared/utils/formatters';
import { getStoreColorClass } from '@/shared/utils/helpers';
import type { User } from 'firebase/auth';
import type { Expense, FilterMode, GroupByMode } from '@/shared/types';

interface ExpenseListProps {
  user: User | null;
  searchTerm: string;
  filterMode: FilterMode;
  groupBy: GroupByMode;
  selectedDate: string;
  selectedMonth: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ExpenseList = ({
  user,
  searchTerm,
  filterMode,
  groupBy,
  selectedDate,
  selectedMonth,
  onEdit,
  onDelete
}: ExpenseListProps) => {
  const { expenses, canDelete } = useExpenses(user);

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.store.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterMode === 'day' && selectedDate) {
      filtered = filtered.filter(e => e.date === selectedDate);
    }

    if (filterMode === 'month' && selectedMonth) {
      filtered = filtered.filter(e => e.date.startsWith(selectedMonth));
    }

    return filtered;
  }, [expenses, searchTerm, filterMode, selectedDate, selectedMonth]);

  const groupedExpenses = useMemo(() => {
    if (groupBy === 'date') {
      const groups = filteredExpenses.reduce((acc, expense) => {
        const key = expense.date;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, Expense[]>);

      return Object.entries(groups).map(([date, items]) => ({
        key: date,
        label: formatDateBR(date),
        items,
        total: items.reduce((sum, e) => sum + e.amount, 0)
      }));
    } else {
      const groups = filteredExpenses.reduce((acc, expense) => {
        const key = expense.store;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, Expense[]>);

      return Object.entries(groups).map(([store, items]) => ({
        key: store,
        label: store,
        items,
        total: items.reduce((sum, e) => sum + e.amount, 0)
      }));
    }
  }, [filteredExpenses, groupBy]);

  const handleDelete = (id: string) => {
    const { allowed, reason } = canDelete(id);
    if (!allowed) {
      alert(reason || 'Não é possível excluir esta despesa');
      return;
    }

    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      onDelete(id);
    }
  };

  if (filteredExpenses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchTerm || filterMode !== 'day'
            ? 'Nenhuma despesa encontrada'
            : 'Nenhuma despesa registrada'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedExpenses.map((group) => (
        <div key={group.key} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {group.label}
              </h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {formatCurrency(group.total)}
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {group.items.map((expense) => (
              <div
                key={expense.id}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {expense.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <span className={getStoreColorClass(expense.store)}>
                        {expense.store}
                      </span>
                      <span>•</span>
                      <span>{expense.category}</span>
                      {expense.quantity > 1 && (
                        <>
                          <span>•</span>
                          <span>Qtd: {expense.quantity}</span>
                        </>
                      )}
                    </div>
                    {expense.employeeName && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        Funcionário: {expense.employeeName}
                      </p>
                    )}
                    {expense.notes && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        {expense.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </p>
                    <button
                      onClick={() => onEdit(expense.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
