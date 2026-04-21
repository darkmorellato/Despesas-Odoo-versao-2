import { useState, useEffect, useMemo, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { getFirebaseRefs } from '@/config/firebase';
import { ADMIN_PASSWORD } from '@/config/constants';
import type { Expense, SyncStatus, StoreSplit, StoreName } from '@/shared/types';
import { serverTimestamp, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';

/**
 * Return type for useExpenses hook
 * @interface UseExpensesReturn
 */
interface UseExpensesReturn {
  /** Array of expenses from Firebase */
  expenses: Expense[];
  /** Loading state indicator */
  isLoading: boolean;
  /** Current sync status with Firebase */
  syncStatus: SyncStatus;
  /** Add a new expense to Firebase */
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  /** Update an existing expense */
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  /** Delete an expense from Firebase */
  deleteExpense: (id: string) => Promise<void>;
  /** Check if an expense can be deleted (24h rule) */
  canDelete: (id: string) => { allowed: boolean; reason?: string };
}

/**
 * Hook para gerenciar despesas com Firebase Firestore
 * 
 * Fornece CRUD completo com sincronização em tempo real e verificação
 * de permissão de exclusão (limite de 24h).
 * 
 * @param user - Usuário autenticado do Firebase (null se não autenticado)
 * @returns Objeto com despesas, estados e funções CRUD
 * 
 * @example
 * ```tsx
 * const { expenses, addExpense, deleteExpense, isLoading } = useExpenses(user);
 * 
 * // Adicionar despesa
 * await addExpense({
 *   date: '2026-01-15',
 *   description: 'Aluguel',
 *   store: 'Premium',
 *   category: 'Despesa Fixa',
 *   amount: 5000,
 *   quantity: 1,
 *   employeeName: 'João'
 * });
 * 
 * // Verificar se pode excluir
 * const { allowed, reason } = canDelete('expense-id');
 * if (allowed) await deleteExpense('expense-id');
 * ```
 */
export const useExpenses = (user: User | null): UseExpensesReturn => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');

  const firebaseRefs = useMemo(() => getFirebaseRefs(), []);

  // Read expenses from Firebase
  useEffect(() => {
    if (!user) return;
    
    setSyncStatus('syncing');

    const q = query(firebaseRefs.expensesRef, orderBy('date', 'desc'));
    
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const loadedExpenses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() || {})
      })) as Expense[];
      setExpenses(loadedExpenses);
      setSyncStatus('synced');
      setIsLoading(false);
    },
    (err) => {
      console.error("Erro leitura despesas:", err);
      setSyncStatus('error');
      setIsLoading(false);
    }
  );

    return () => unsubscribe();
  }, [user, firebaseRefs.expensesRef]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    try {
      await addDoc(firebaseRefs.expensesRef, {
        ...expense,
        createdAt: serverTimestamp()
      });
      setSyncStatus('synced');
    } catch (e) {
      console.error("Erro ao adicionar:", e);
      setSyncStatus('error');
      throw e;
    }
  }, [firebaseRefs.expensesRef]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    try {
      const docRef = doc(firebaseRefs.expensesRef, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      setSyncStatus('synced');
    } catch (e) {
      console.error("Erro update:", e);
      setSyncStatus('error');
      throw e;
    }
  }, [firebaseRefs.expensesRef]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      const docRef = doc(firebaseRefs.expensesRef, id);
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (e) {
      console.error("Erro delete:", e);
      setSyncStatus('error');
      throw e;
    }
  }, [firebaseRefs.expensesRef]);

  const canDelete = useCallback((id: string): { allowed: boolean; reason?: string } => {
    const expense = expenses.find(ex => ex.id === id);
    if (expense && expense.createdAt) {
      let createdDate: Date;
      if (expense.createdAt instanceof Date) {
        createdDate = expense.createdAt;
      } else if (typeof expense.createdAt === 'object' && 'seconds' in expense.createdAt) {
        createdDate = new Date((expense.createdAt as Timestamp).seconds * 1000);
      } else if (typeof expense.createdAt === 'string' || typeof expense.createdAt === 'number') {
        createdDate = new Date(expense.createdAt);
      } else {
        return { allowed: true };
      }
      if (isNaN(createdDate.getTime())) {
        return { allowed: true };
      }
      if (Date.now() - createdDate.getTime() > 24 * 60 * 60 * 1000) {
        return { allowed: false, reason: "Exclusão não permitida após 1 dia do lançamento." };
      }
    }
    return { allowed: true };
  }, [expenses]);

  return {
    expenses,
    isLoading,
    syncStatus,
    addExpense,
    updateExpense,
    deleteExpense,
    canDelete
  };
};

/**
 * Divide o valor total de uma despesa entre múltiplas lojas
 * 
 * Usado quando uma despesa deve ser rateada entre lojas de uma região.
 * 
 * @param store - Nome da loja ou região
 * @param totalAmount - Valor total a ser dividido
 * @returns Array com divisão por loja
 * 
 * @example
 * ```ts
 * // Divisão Piracicaba (3 lojas)
 * const splits = splitExpense("Piracicaba (DP - Realme - XV)", 3000);
 * // Retorna: [{ s: "Dom Pedro II", v: 1000 }, { s: "Realme", v: 1000 }, { s: "Xv de Novembro", v: 1000 }]
 * 
 * // Divisão Todas (5 lojas)
 * const allSplits = splitExpense("Todas", 5000);
 * // Retorna divisão igual entre as 5 lojas
 * ```
 */
export const splitExpense = (store: StoreName, totalAmount: number): StoreSplit[] => {
  const entries: StoreSplit[] = [];

  if (store === "Piracicaba (DP - Realme - XV)") {
    ["Dom Pedro II", "Realme", "Xv de Novembro"].forEach(s => {
      entries.push({ s: s as StoreName, v: totalAmount / 3 });
    });
  } else if (store === "Amparo (Premium - Kassouf)") {
    ["Premium", "Kassouf"].forEach(s => {
      entries.push({ s: s as StoreName, v: totalAmount / 2 });
    });
  } else if (store === "Todas") {
    ["Dom Pedro II", "Realme", "Xv de Novembro", "Premium", "Kassouf"].forEach(s => {
      entries.push({ s: s as StoreName, v: totalAmount / 5 });
    });
  } else {
    entries.push({ s: store, v: totalAmount });
  }

  return entries;
};

/**
 * Valida a senha de administrador para operações restritas
 * 
 * Usado para autorizar exclusão de despesas após 24h e correções
 * no calendário de pagamentos.
 * 
 * @param password - Senha fornecida pelo usuário
 * @returns true se a senha está correta, false caso contrário
 * 
 * @example
 * ```ts
 * if (validateAdminPassword(userInput)) {
 *   await deleteExpense(id);
 * }
 * ```
 */
export const validateAdminPassword = (password: string): boolean => {
  return password === ADMIN_PASSWORD;
};
