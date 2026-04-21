import type { Expense } from '@/shared/types';

export interface AnalyticsStats {
  total: number;
  avgPerExpense: number;
  avgPerMonth: number;
  count: number;
  monthlyData: any[];
  yearlyData: any[];
  years: string[];
  monthChange: number;
  monthsCount: number;
}

export const generateAnalyticsStats = (expenses: Expense[]): AnalyticsStats | null => {
  if (expenses.length === 0) return null;

  const byMonth: Record<string, { expenses: Expense[]; total: number }> = {};
  
  expenses.forEach(exp => {
    const month = exp.date.substring(0, 7);
    if (!byMonth[month]) {
      byMonth[month] = { expenses: [], total: 0 };
    }
    byMonth[month].expenses.push(exp);
    byMonth[month].total += exp.amount;
  });

  const sortedMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
  const years = [...new Set(expenses.map(e => e.date.substring(0, 4)))].sort((a, b) => b.localeCompare(a));
  
  const yearlyData = years.map(year => {
    const yearExpenses = expenses.filter(e => e.date.startsWith(year));
    const total = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthsCount = new Set(yearExpenses.map(e => e.date.substring(0, 7))).size;
    
    const byStore: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    yearExpenses.forEach(exp => {
      byStore[exp.store] = (byStore[exp.store] || 0) + exp.amount;
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    });

    const sortedStores = Object.entries(byStore)
      .sort((a, b) => b[1] - a[1])
      .map(([store, amount]) => ({
        store,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }));

    const sortedCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }));

    const sortedByAmount = [...yearExpenses].sort((a, b) => b.amount - a.amount);
    const topExpenses = sortedByAmount.slice(0, 5).map(exp => ({
      description: exp.description,
      store: exp.store,
      amount: exp.amount
    }));

    const monthlyBreakdown = sortedMonths
      .filter(m => m.startsWith(year))
      .map(month => ({
        month,
        total: byMonth[month].total,
        count: byMonth[month].expenses.length
      }));

    return {
      year,
      total,
      count: yearExpenses.length,
      monthsCount,
      avgPerMonth: monthsCount > 0 ? total / monthsCount : 0,
      sortedStores,
      sortedCategories,
      topExpenses,
      monthlyBreakdown
    };
  });

  const monthlyData = sortedMonths.map(month => {
    const monthExpenses = byMonth[month].expenses;
    const total = byMonth[month].total;
    
    const byStore: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    monthExpenses.forEach(exp => {
      byStore[exp.store] = (byStore[exp.store] || 0) + exp.amount;
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    });

    const sortedStores = Object.entries(byStore)
      .sort((a, b) => b[1] - a[1])
      .map(([store, amount]) => ({
        store,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }));

    const sortedCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }));

    const sortedByAmount = [...monthExpenses].sort((a, b) => b.amount - a.amount);
    const topExpenses = sortedByAmount.slice(0, 5).map(exp => ({
      description: exp.description,
      store: exp.store,
      amount: exp.amount
    }));

    return {
      month,
      total,
      count: monthExpenses.length,
      sortedStores,
      sortedCategories,
      topExpenses
    };
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgPerExpense = expenses.length > 0 ? total / expenses.length : 0;
  const months = Object.keys(byMonth);
  const avgPerMonth = months.length > 0 ? total / months.length : 0;

  const lastMonthData = monthlyData[0];
  const prevMonthData = monthlyData[1];
  const monthChange = prevMonthData?.total > 0
    ? ((lastMonthData.total - prevMonthData.total) / prevMonthData.total) * 100
    : 0;

  return {
    total,
    avgPerExpense,
    avgPerMonth,
    count: expenses.length,
    monthlyData,
    yearlyData,
    years,
    monthChange,
    monthsCount: months.length
  };
};
