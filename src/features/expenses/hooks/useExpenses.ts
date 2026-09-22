import { useState, useEffect, useMemo, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { getFirebaseRefs } from '@/config/firebase';
import { validateAnyAdminPassword } from '@/features/auth';
import type { Expense, SyncStatus, StoreSplit, StoreName } from '@/shared/types';
import { serverTimestamp, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';

/**
 * Return type for useExpenses hook
 * @interface UseExpensesReturn
 */
interface UseExpensesReturn {
  /** Array of active expenses from Firebase */
  expenses: Expense[];
  /** Array of soft-deleted expenses for trash/recovery */
  deletedExpenses: Expense[];
  /** Loading state indicator */
  isLoading: boolean;
  /** Current sync status with Firebase */
  syncStatus: SyncStatus;
  /** Add a new expense to Firebase */
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  /** Update an existing expense */
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  /** Soft delete an expense from Firebase */
  deleteExpense: (id: string, reason?: string, deletedBy?: string) => Promise<void>;
  /** Restore a soft-deleted expense */
  restoreExpense: (id: string) => Promise<void>;
  /** Hard delete permanently from Firebase */
  hardDeleteExpense: (id: string) => Promise<void>;
  /** Check if an expense can be deleted (24h rule) */
  canDelete: (id: string) => { allowed: boolean; reason?: string };
}

/**
 * Hook para gerenciar despesas com Firebase Firestore
 */
export const useExpenses = (user: User | null): UseExpensesReturn => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');

  const firebaseRefs = useMemo(() => getFirebaseRefs(), []);

  // Read expenses from Firebase
  useEffect(() => {
    if (!user) {
      // Sem usuário: zera loading E estado — antes ficava spinner infinito e
      // as despesas da sessão anterior continuavam visíveis (vazamento).
      setIsLoading(false);
      setAllExpenses([]);
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');

    const q = query(firebaseRefs.expensesRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedExpenses = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() || {})
        })) as Expense[];
        setAllExpenses(loadedExpenses);
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

  // Separa despesas ativas das excluídas logicamente
  const expenses = useMemo(() => allExpenses.filter(e => !e.deleted), [allExpenses]);
  const deletedExpenses = useMemo(() => allExpenses.filter(e => !!e.deleted), [allExpenses]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    try {
      await addDoc(firebaseRefs.expensesRef, {
        ...expense,
        deleted: false,
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

  // Soft Delete com motivo e autor
  const deleteExpense = useCallback(async (id: string, reason?: string, deletedBy?: string) => {
    try {
      const docRef = doc(firebaseRefs.expensesRef, id);
      await updateDoc(docRef, {
        deleted: true,
        // Relógio do servidor: antes usava new Date() do cliente e o "quando
        // foi excluído" ficava inconsistente entre máquinas/fusos
        deletedAt: serverTimestamp(),
        deleteReason: reason || 'Excluído pelo usuário',
        deletedBy: deletedBy || 'Administrador',
        updatedAt: serverTimestamp()
      });
      setSyncStatus('synced');
    } catch (e) {
      console.error("Erro soft delete:", e);
      setSyncStatus('error');
      throw e;
    }
  }, [firebaseRefs.expensesRef]);

  // Restaurar despesa excluída
  const restoreExpense = useCallback(async (id: string) => {
    try {
      const docRef = doc(firebaseRefs.expensesRef, id);
      await updateDoc(docRef, {
        deleted: false,
        deletedAt: null,
        deleteReason: null,
        deletedBy: null,
        updatedAt: serverTimestamp()
      });
      setSyncStatus('synced');
    } catch (e) {
      console.error("Erro ao restaurar despesa:", e);
      setSyncStatus('error');
      throw e;
    }
  }, [firebaseRefs.expensesRef]);

  // Exclusão definitiva permanente
  const hardDeleteExpense = useCallback(async (id: string) => {
    try {
      const docRef = doc(firebaseRefs.expensesRef, id);
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (e) {
      console.error("Erro hard delete:", e);
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
    deletedExpenses,
    isLoading,
    syncStatus,
    addExpense,
    updateExpense,
    deleteExpense,
    restoreExpense,
    hardDeleteExpense,
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
export const GROUP_STORES_MAP: Record<string, StoreName[]> = {
  "Todas": ["Dom Pedro II", "Realme", "Xv de Novembro", "Premium", "Kassouf"],
  "Piracicaba (DP - Realme - XV)": ["Dom Pedro II", "Realme", "Xv de Novembro"],
  "Amparo (Premium - Kassouf)": ["Premium", "Kassouf"]
};

export const splitExpense = (store: StoreName, totalAmount: number): StoreSplit[] => {
  const stores = GROUP_STORES_MAP[store];

  // Loja individual (não é grupo): devolve o valor arredondado a 2 casas
  if (!stores || stores.length === 0) {
    return [{ s: store, v: Math.round(totalAmount * 100) / 100 }];
  }

  // Rateio em CENTAVOS com distribuição do resíduo: a soma das parcelas é
  // sempre exata em relação ao total. Antes, `totalAmount / 3` gerava
  // 33.333333333333336 — gravado no Firestore e os relatórios por loja
  // nunca fechavam com o total (3×33,33 = 99,99 ≠ 100,00).
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / stores.length);
  const remainderCents = totalCents - baseCents * stores.length;

  return stores.map((s, index) => ({
    s,
    v: (baseCents + (index < remainderCents ? 1 : 0)) / 100,
  }));
};

export const isGroupStore = (store: string): store is "Todas" | "Piracicaba (DP - Realme - XV)" | "Amparo (Premium - Kassouf)" => {
  return store === "Todas" || store === "Piracicaba (DP - Realme - XV)" || store === "Amparo (Premium - Kassouf)";
};

export interface DetectedExpenseGroup {
  isGroup: boolean;
  groupName: StoreName | null;
  siblings: Expense[];
  totalAmount: number;
}

/**
 * Detecta se uma despesa faz parte de um grupo rateado (Todas, Piracicaba ou Amparo)
 * e retorna seus irmãos e o valor total acumulado.
 */
export const detectExpenseGroup = (
  expense: Expense,
  allExpenses: Expense[]
): DetectedExpenseGroup => {
  if (!expense) {
    return { isGroup: false, groupName: null, siblings: [], totalAmount: 0 };
  }

  // Se a própria despesa já estiver com o nome do grupo como store
  if (isGroupStore(expense.store)) {
    return {
      isGroup: true,
      groupName: expense.store,
      siblings: [expense],
      totalAmount: expense.originalTotal ?? expense.amount
    };
  }

  // Busca despesas ativas não-deletadas com mesma data, descrição, categoria
  // (guards: doc sem `description` quebrava .trim() com TypeError)
  const targetDescription = (expense.description ?? '').trim().toLowerCase();
  const matchingCandidates = allExpenses.filter(e =>
    !e.deleted &&
    e.date === expense.date &&
    (e.description ?? '').trim().toLowerCase() === targetDescription &&
    e.category === expense.category
  );

  const storesSet = new Set(matchingCandidates.map(e => e.store));

  // Verifica "Todas" (5 lojas)
  const todasStores = GROUP_STORES_MAP["Todas"];
  if (todasStores.every(s => storesSet.has(s))) {
    const siblings = matchingCandidates.filter(e => todasStores.includes(e.store as StoreName));
    const totalAmount = expense.originalTotal ?? siblings.reduce((sum, s) => sum + s.amount, 0);
    return { isGroup: true, groupName: "Todas", siblings, totalAmount };
  }

  // Verifica "Piracicaba (DP - Realme - XV)" (3 lojas)
  const piraStores = GROUP_STORES_MAP["Piracicaba (DP - Realme - XV)"];
  if (piraStores.every(s => storesSet.has(s))) {
    const siblings = matchingCandidates.filter(e => piraStores.includes(e.store as StoreName));
    const totalAmount = expense.originalTotal ?? siblings.reduce((sum, s) => sum + s.amount, 0);
    return { isGroup: true, groupName: "Piracicaba (DP - Realme - XV)", siblings, totalAmount };
  }

  // Verifica "Amparo (Premium - Kassouf)" (2 lojas)
  const amparoStores = GROUP_STORES_MAP["Amparo (Premium - Kassouf)"];
  if (amparoStores.every(s => storesSet.has(s))) {
    const siblings = matchingCandidates.filter(e => amparoStores.includes(e.store as StoreName));
    const totalAmount = expense.originalTotal ?? siblings.reduce((sum, s) => sum + s.amount, 0);
    return { isGroup: true, groupName: "Amparo (Premium - Kassouf)", siblings, totalAmount };
  }

  // Caso padrão: despesa individual
  return {
    isGroup: !!expense.originalTotal,
    groupName: null,
    siblings: [expense],
    totalAmount: expense.originalTotal ?? expense.amount
  };
};

/**
 * Valida a senha de administrador para operações restritas
 * 
 * Usado para autorizar exclusão de despesas após 24h e correções
 * no calendário de pagamentos.
 * 
 * ASSÍNCHRONO: valida contra o Firestore (nenhuma senha vive no cliente).
 * 
 * @param password - Senha fornecida pelo usuário
 * @returns Promise<boolean> — true se a senha está correta
 * 
 * @example
 * ```ts
 * if (await validateAdminPassword(userInput)) {
 *   await deleteExpense(id);
 * }
 * ```
 */
export const validateAdminPassword = (password: string): Promise<boolean> => {
  return validateAnyAdminPassword(password);
};

