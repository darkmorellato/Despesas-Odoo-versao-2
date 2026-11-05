import { useState, useMemo, useEffect, useCallback } from 'react';
import { formatDateBR, formatMonthBR } from '@/shared/utils/formatters';
import type { Expense, FilterMode, GroupByMode } from '@/shared/types';
import {
  filterExpenses,
  groupAndSortExpenses,
  totalsByStore as sumByStore,
  sumAmounts,
  type SortField,
  type SortOrder,
} from '../utils/expenseFilters';

/**
 * Estado e derivados da listagem de despesas: filtro (dia/mês/busca),
 * agrupamento, ordenação, totais e rótulo do período.
 */
export const useExpenseFilters = (expenses: Expense[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('day');
  const [groupBy, setGroupBy] = useState<GroupByMode>('date');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const availableDates = useMemo(
    () => [...new Set(expenses.map(e => e.date))].sort((a, b) => a.localeCompare(b)),
    [expenses]
  );
  const availableMonths = useMemo(
    () => [...new Set(expenses.map(e => e.date.substring(0, 7)))].sort((a, b) => a.localeCompare(b)),
    [expenses]
  );

  // Auto-seleciona o dia/mês mais recente quando a seleção some ou é inválida
  useEffect(() => {
    if (availableDates.length > 0 && (!selectedDate || !availableDates.includes(selectedDate))) {
      setSelectedDate(availableDates[availableDates.length - 1]);
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (availableMonths.length > 0 && (!selectedMonth || !availableMonths.includes(selectedMonth))) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // Após salvar, salta o filtro para a data/mês do lançamento — senão a
  // despesa recém-salva não aparece na lista (dia anterior ainda selecionado).
  const revealSavedExpense = useCallback((savedDate: string) => {
    setSelectedDate(savedDate);
    setSelectedMonth(savedDate.substring(0, 7));
  }, []);

  const filteredExpenses = useMemo(
    () => filterExpenses(expenses, { searchTerm, filterMode, selectedDate, selectedMonth }),
    [expenses, searchTerm, filterMode, selectedDate, selectedMonth]
  );

  const groupedExpenses = useMemo(
    () => groupAndSortExpenses(filteredExpenses, groupBy, sortField, sortOrder),
    [filteredExpenses, groupBy, sortField, sortOrder]
  );

  const totalsByStore = useMemo(() => sumByStore(filteredExpenses), [filteredExpenses]);
  const totalGeneral = useMemo(() => sumAmounts(filteredExpenses), [filteredExpenses]);

  // Clique no cabeçalho: mesma coluna inverte a ordem; outra coluna começa crescente
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField]);

  const currentPeriodLabel = useMemo(() => {
    if (searchTerm) return `Busca: "${searchTerm}"`;
    if (filterMode === 'month' && selectedMonth) return formatMonthBR(selectedMonth);
    if (filterMode === 'day' && selectedDate) return formatDateBR(selectedDate);
    return 'Consolidado';
  }, [searchTerm, filterMode, selectedMonth, selectedDate]);

  /** Rótulo usado nos PDFs ("Mês: …" / "Dia: …") */
  const pdfPeriodLabel = useMemo(() => {
    if (searchTerm) return `Busca: "${searchTerm}"`;
    return filterMode === 'month'
      ? `Mês: ${formatMonthBR(selectedMonth)}`
      : `Dia: ${formatDateBR(selectedDate)}`;
  }, [searchTerm, filterMode, selectedMonth, selectedDate]);

  return {
    searchTerm, setSearchTerm,
    filterMode, setFilterMode,
    groupBy, setGroupBy,
    selectedDate, setSelectedDate,
    selectedMonth, setSelectedMonth,
    sortField, sortOrder, handleSort,
    availableDates, availableMonths,
    revealSavedExpense,
    filteredExpenses, groupedExpenses, totalsByStore, totalGeneral,
    currentPeriodLabel, pdfPeriodLabel,
  };
};
