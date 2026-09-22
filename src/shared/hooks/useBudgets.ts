import { useState, useEffect, useRef, useCallback } from 'react';
import type { CategoryName, Expense } from '@/shared/types';

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

// Chave com namespace do app (a antiga 'budgets' era genérica demais e
// podia colidir com outros códigos no mesmo domínio)
const STORAGE_KEY = 'miplace_budgets_v1';
const LEGACY_STORAGE_KEY = 'budgets';

export const useBudgets = (expenses: Expense[]): UseBudgetsReturn => {
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // JSON válido mas não-array quebrava .find/.reduce no render
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (b): b is Budget =>
              !!b && typeof b === 'object' && typeof b.category === 'string' && typeof b.limit === 'number'
          );
        }
      }
    } catch (e) {
      // JSON corrompido: NÃO regrava por cima nesta etapa — o primeiro save
      // é pulado abaixo, preservando o valor original para diagnóstico.
      console.warn('Orçamentos locais inválidos — usando lista vazia:', e);
    }
    return [];
  });

  // Evita que o efeito de save sobrescreva o storage logo no mount
  // (destruiria um settings corrompido com o valor padrão)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
    } catch {
      // storage cheio/indisponível — ignora
    }
  }, [budgets]);

  const setBudget = useCallback((category: CategoryName, limit: number) => {
    setBudgets(prev => {
      const existing = prev.find(b => b.category === category);
      if (existing) {
        return prev.map(b => b.category === category ? { ...b, limit } : b);
      }
      return [...prev, { category, limit, spent: 0 }];
    });
  }, []);

  const getBudgetStatus = useCallback((category: CategoryName): 'ok' | 'warning' | 'exceeded' => {
    const budget = budgets.find(b => b.category === category);
    // Sem orçamento OU limite 0: tratado como "sem alerta" — antes a divisão
    // por zero gerava Infinity/NaN e `NaN >= 100` caía em 'ok' escondendo
    // um estouro real.
    if (!budget || !(budget.limit > 0)) return 'ok';

    const spent = expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const percentage = (spent / budget.limit) * 100;

    if (percentage >= 100) return 'exceeded';
    if (percentage >= 80) return 'warning';
    return 'ok';
    // NOTA (decisão de produto): `spent` soma TODO o histórico, não só o mês.
    // Se o limite for mensal, trate como orçamento acumulado — revisar com o time.
  }, [budgets, expenses]);

  const getTotalSpent = useCallback(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const getTotalBudget = useCallback(() => {
    return budgets.reduce((sum, b) => sum + b.limit, 0);
  }, [budgets]);

  return {
    budgets,
    setBudget,
    getBudgetStatus,
    getTotalSpent,
    getTotalBudget
  };
};
