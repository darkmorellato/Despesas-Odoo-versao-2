import { useState, useEffect } from 'react';
import type { CategoryName } from '@/shared/types';

interface Budget {
  category: CategoryName;
  limit: number;
  spent: number;
}

interface UseBudgetsReturn {
  budgets: Budget[];
  setBudget: (category: CategoryName, limit: number) => void;
  getBudgetStatus: (category: CategoryName) => 'ok' | 'warning' | 'exceeded';
  getTotalSpent: () => number;
  getTotalBudget: () => number;
}

export const useBudgets = (expenses: any[]): UseBudgetsReturn => {
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('budgets');
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
  }, [budgets]);

  const setBudget = (category: CategoryName, limit: number) => {
    setBudgets(prev => {
      const existing = prev.find(b => b.category === category);
      if (existing) {
        return prev.map(b => b.category === category ? { ...b, limit } : b);
      }
      return [...prev, { category, limit, spent: 0 }];
    });
  };

  const getBudgetStatus = (category: CategoryName): 'ok' | 'warning' | 'exceeded' => {
    const budget = budgets.find(b => b.category === category);
    if (!budget) return 'ok';

    const spent = expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);

    const percentage = (spent / budget.limit) * 100;

    if (percentage >= 100) return 'exceeded';
    if (percentage >= 80) return 'warning';
    return 'ok';
  };

  const getTotalSpent = () => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  };

  const getTotalBudget = () => {
    return budgets.reduce((sum, b) => sum + b.limit, 0);
  };

  return {
    budgets,
    setBudget,
    getBudgetStatus,
    getTotalSpent,
    getTotalBudget
  };
};
