import { getStoreOrder } from '@/shared/utils/helpers';
import type { Expense, FilterMode, GroupByMode } from '@/shared/types';

export type SortField = 'store' | 'employeeName' | 'category' | 'date' | 'description' | 'amount';
export type SortOrder = 'asc' | 'desc';

export interface ExpenseFilterCriteria {
  searchTerm: string;
  filterMode: FilterMode;
  selectedDate: string;
  selectedMonth: string;
}

export interface ExpenseBucket {
  key: string;
  items: Expense[];
  total: number;
}

/** minúsculas + sem acentos, para busca tolerante ("Salario" acha "Salário") */
const normalize = (str: string): string =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Filtra as despesas. Com termo de busca, a busca vale para TODO o período
 * (ignora dia/mês); sem busca, aplica o filtro de dia ou de mês.
 */
export const filterExpenses = (
  expenses: Expense[],
  { searchTerm, filterMode, selectedDate, selectedMonth }: ExpenseFilterCriteria
): Expense[] => {
  if (searchTerm) {
    const needle = normalize(searchTerm);
    return expenses.filter(ex =>
      normalize(ex.description ?? '').includes(needle) ||
      normalize(ex.category ?? '').includes(needle) ||
      normalize(ex.store ?? '').includes(needle) ||
      normalize(ex.employeeName || '').includes(needle) ||
      (!!ex.notes && normalize(ex.notes).includes(needle))
    );
  }

  if (filterMode === 'month' && selectedMonth) {
    return expenses.filter(ex => ex.date.startsWith(selectedMonth));
  }
  if (filterMode === 'day' && selectedDate) {
    return expenses.filter(ex => ex.date === selectedDate);
  }
  return expenses;
};

const compareBy = (field: SortField, a: Expense, b: Expense): number => {
  switch (field) {
    case 'amount': return a.amount - b.amount;
    case 'store': return (getStoreOrder(a.store) - getStoreOrder(b.store)) || a.store.localeCompare(b.store);
    case 'category': return a.category.localeCompare(b.category);
    case 'date': return a.date.localeCompare(b.date);
    case 'description': return a.description.localeCompare(b.description);
    case 'employeeName': return (a.employeeName || '').localeCompare(b.employeeName || '');
  }
};

/**
 * Agrupa por data (mais recente primeiro) ou por loja (ordem de exibição das
 * lojas) e ordena os itens de cada grupo pelo campo escolhido.
 */
export const groupAndSortExpenses = (
  expenses: Expense[],
  groupBy: GroupByMode,
  sortField: SortField,
  sortOrder: SortOrder
): ExpenseBucket[] => {
  const groups: Record<string, Expense[]> = {};
  expenses.forEach(ex => {
    const key = groupBy === 'date' ? ex.date : ex.store;
    (groups[key] ||= []).push(ex);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) =>
    groupBy === 'date' ? b.localeCompare(a) : getStoreOrder(a) - getStoreOrder(b)
  );

  return sortedKeys.map(key => {
    const items = [...groups[key]].sort((a, b) => {
      const cmp = compareBy(sortField, a, b);
      if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      return a.description.localeCompare(b.description);
    });
    return { key, items, total: items.reduce((sum, item) => sum + item.amount, 0) };
  });
};

/** Soma por loja */
export const totalsByStore = (expenses: Expense[]): Record<string, number> => {
  const acc: Record<string, number> = {};
  expenses.forEach(ex => {
    acc[ex.store] = (acc[ex.store] || 0) + ex.amount;
  });
  return acc;
};

export const sumAmounts = (expenses: Expense[]): number =>
  expenses.reduce((sum, ex) => sum + ex.amount, 0);
