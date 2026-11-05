import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { getFirebaseRefs } from '@/config/firebase';
import { validateAnyAdminPassword } from '@/features/auth';
import type { Expense, SyncStatus, StoreSplit, StoreName } from '@/shared/types';
import { GROUP_STORES_MAP, STORE_GROUP_CONFIGS, LEGACY_TODAS_MEMBERS, isStoreGroupName } from '@/config/stores';
import type { StoreGroupName } from '@/config/stores';
import { serverTimestamp, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, writeBatch, Timestamp } from 'firebase/firestore';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { getRecentWindowStart } from '../utils/historyWindow';

import { logger } from '@/shared/utils/logger';
/**
 * Plano de alterações de um lançamento rateado (grupo de lojas). Tudo é
 * gravado numa ÚNICA operação atômica: ou o grupo inteiro muda, ou nada muda.
 */
export interface ExpenseGroupPlan {
  /** Parcelas existentes a atualizar */
  updates: Array<{ id: string; data: Partial<Expense> }>;
  /** Parcelas novas (loja que passou a fazer parte do grupo) */
  adds: Array<Omit<Expense, 'id'>>;
  /** Parcelas a excluir logicamente (loja que saiu do grupo) */
  removes: Array<{ id: string; reason?: string; deletedBy?: string }>;
  /**
   * Id do grupo gravado nas parcelas mantidas/novas.
   * `undefined` = gera um novo (ex.: edição de lançamento antigo sem groupId);
   * `null` = desagrupa (a parcela mantida vira lançamento individual).
   */
  groupId?: string | null | undefined;
}

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
  /** true quando TODO o histórico está carregado (false = só a janela recente) */
  isFullHistory: boolean;
  /** true enquanto o histórico completo é baixado após ser pedido */
  isLoadingHistory: boolean;
  /** Primeiro dia (YYYY-MM-DD) da janela recente carregada por padrão */
  recentWindowStart: string;
  /**
   * Pede o histórico completo e resolve (com as despesas ativas de TODO o
   * período) só quando o servidor confirmou. Rejeita com HistoryLoadError se não
   * conseguir (ex.: sem conexão) — nunca devolve lista parcial como se fosse completa.
   */
  loadFullHistory: () => Promise<Expense[]>;
  /** Current sync status with Firebase */
  syncStatus: SyncStatus;
  /** Add a new expense to Firebase */
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  /** Cria todas as parcelas de um rateio de forma atômica (writeBatch) e devolve o groupId */
  addExpenseGroup: (entries: Array<Omit<Expense, 'id'>>) => Promise<string>;
  /** Aplica a edição de um grupo (update/add/remove) de forma atômica */
  saveExpenseGroup: (plan: ExpenseGroupPlan) => Promise<void>;
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

/** Falha ao obter o histórico completo (sem conexão / servidor indisponível) */
export class HistoryLoadError extends Error {
  constructor(message = 'Não foi possível carregar o histórico completo. Verifique a conexão.') {
    super(message);
    this.name = 'HistoryLoadError';
  }
}

/** Tempo máximo esperando o servidor confirmar o histórico completo */
export const FULL_HISTORY_TIMEOUT_MS = 20000;

interface HistoryWaiter {
  resolve: (expenses: Expense[]) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Hook para gerenciar despesas com Firebase Firestore
 *
 * Por padrão carrega só a janela recente (últimos meses). O histórico completo
 * é pedido sob demanda com `loadFullHistory()`.
 */
export const useExpenses = (user: User | null): UseExpensesReturn => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [historyScope, setHistoryScope] = useState<'recent' | 'all'>('recent');
  const [historyReady, setHistoryReady] = useState(false);

  const firebaseRefs = useMemo(() => getFirebaseRefs(), []);
  const recentWindowStart = useMemo(() => getRecentWindowStart(), []);

  // Histórico completo confirmado pelo servidor + quem aguarda por ele
  const fullHistoryRef = useRef<{ ready: boolean; list: Expense[] }>({ ready: false, list: [] });
  const waitersRef = useRef<HistoryWaiter[]>([]);

  const settleWaiters = useCallback((outcome: { ok: true; list: Expense[] } | { ok: false; error: Error }) => {
    for (const w of waitersRef.current.splice(0)) {
      clearTimeout(w.timer);
      if (outcome.ok) w.resolve(outcome.list);
      else w.reject(outcome.error);
    }
  }, []);

  // Read expenses from Firebase
  useEffect(() => {
    if (!user) {
      // Sem usuário: zera loading E estado — antes ficava spinner infinito e
      // as despesas da sessão anterior continuavam visíveis (vazamento).
      setIsLoading(false);
      setAllExpenses([]);
      setSyncStatus('offline');
      // Nova sessão recomeça pela janela recente
      setHistoryScope('recent');
      setHistoryReady(false);
      fullHistoryRef.current = { ready: false, list: [] };
      settleWaiters({ ok: false, error: new HistoryLoadError('Sessão encerrada.') });
      return;
    }

    setSyncStatus('syncing');

    const isAll = historyScope === 'all';
    const q = isAll
      ? query(firebaseRefs.expensesRef, orderBy('date', 'desc'))
      // Janela recente: um único campo (filtro + ordenação em `date`) — não
      // exige índice composto.
      : query(firebaseRefs.expensesRef, where('date', '>=', recentWindowStart), orderBy('date', 'desc'));

    const onNext = (snapshot: QuerySnapshot<DocumentData>) => {
        const loadedExpenses = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() || {})
        })) as Expense[];
        setAllExpenses(loadedExpenses);
        setSyncStatus('synced');
        setIsLoading(false);

        if (isAll) {
          // Sem conexão o servidor não responde: aceita o cache (comportamento
          // de antes, quando tudo funcionava offline pelo cache persistente).
          const confirmed = !snapshot.metadata?.fromCache || (typeof navigator !== 'undefined' && !navigator.onLine);
          if (confirmed) {
            const active = loadedExpenses.filter(e => !e.deleted);
            fullHistoryRef.current = { ready: true, list: active };
            setHistoryReady(true);
            settleWaiters({ ok: true, list: active });
          }
        }
    };
    const onError = (err: Error) => {
        logger.error("Erro leitura despesas:", err);
        setSyncStatus('error');
        setIsLoading(false);
        if (isAll) settleWaiters({ ok: false, error: new HistoryLoadError() });
    };

    // No histórico completo, também escuta mudança de metadados: o primeiro
    // evento costuma vir do cache local (possivelmente incompleto) e só o
    // evento seguinte, já confirmado pelo servidor, prova que está completo.
    const unsubscribe = isAll
      ? onSnapshot(q, { includeMetadataChanges: true }, onNext, onError)
      : onSnapshot(q, onNext, onError);

    return () => unsubscribe();
  }, [user, firebaseRefs.expensesRef, historyScope, recentWindowStart, settleWaiters]);

  // Cancela pedidos pendentes ao desmontar
  useEffect(() => () => settleWaiters({ ok: false, error: new HistoryLoadError('Cancelado.') }), [settleWaiters]);

  const loadFullHistory = useCallback((): Promise<Expense[]> => {
    if (!user) return Promise.reject(new HistoryLoadError('Faça login para carregar o histórico.'));
    if (fullHistoryRef.current.ready) return Promise.resolve(fullHistoryRef.current.list);

    setHistoryScope('all');
    return new Promise<Expense[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        waitersRef.current = waitersRef.current.filter(w => w.timer !== timer);
        reject(new HistoryLoadError());
      }, FULL_HISTORY_TIMEOUT_MS);
      waitersRef.current.push({ resolve, reject, timer });
    });
  }, [user]);

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
      logger.error("Erro ao adicionar:", e);
      setSyncStatus('error');
      throw e;
    }
  }, [firebaseRefs.expensesRef]);

  const addExpenseGroup = useCallback(async (entries: Array<Omit<Expense, 'id'>>): Promise<string> => {
    try {
      const groupId = doc(firebaseRefs.expensesRef).id;
      const batch = writeBatch(firebaseRefs.expensesRef.firestore);
      for (const entry of entries) {
        batch.set(doc(firebaseRefs.expensesRef), {
          ...entry,
          groupId,
          deleted: false,
          createdAt: serverTimestamp()
        });
      }
      await batch.commit();
      setSyncStatus('synced');
      return groupId;
    } catch (e) {
      logger.error("Erro ao adicionar grupo:", e);
      setSyncStatus('error');
      throw e;
    }
  }, [firebaseRefs.expensesRef]);

  const saveExpenseGroup = useCallback(async (plan: ExpenseGroupPlan): Promise<void> => {
    try {
      const groupId = plan.groupId === undefined ? doc(firebaseRefs.expensesRef).id : plan.groupId;
      const batch = writeBatch(firebaseRefs.expensesRef.firestore);

      for (const { id, data } of plan.updates) {
        batch.update(doc(firebaseRefs.expensesRef, id), {
          ...data,
          groupId,
          updatedAt: serverTimestamp()
        });
      }
      for (const entry of plan.adds) {
        batch.set(doc(firebaseRefs.expensesRef), {
          ...entry,
          groupId,
          deleted: false,
          createdAt: serverTimestamp()
        });
      }
      for (const rem of plan.removes) {
        batch.update(doc(firebaseRefs.expensesRef, rem.id), {
          deleted: true,
          deletedAt: serverTimestamp(),
          deleteReason: rem.reason || 'Excluído pelo usuário',
          deletedBy: rem.deletedBy || 'Administrador',
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      setSyncStatus('synced');
    } catch (e) {
      logger.error("Erro ao salvar grupo:", e);
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
      logger.error("Erro update:", e);
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
      logger.error("Erro soft delete:", e);
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
      logger.error("Erro ao restaurar despesa:", e);
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
      logger.error("Erro hard delete:", e);
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
    isFullHistory: historyReady,
    isLoadingHistory: historyScope === 'all' && !historyReady,
    recentWindowStart,
    loadFullHistory,
    syncStatus,
    addExpense,
    addExpenseGroup,
    saveExpenseGroup,
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
 * // Divisão Todas (4 empresas: Dom Pedro II, Realme, XV e Premium — Kassouf fica de fora)
 * const allSplits = splitExpense("Todas", 4000);
 * // Retorna divisão igual entre as 4 empresas
 * ```
 */
// Composição dos grupos: fonte única em src/config/stores.ts
export { GROUP_STORES_MAP };

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

export const isGroupStore = (store: string): store is StoreGroupName => isStoreGroupName(store);

export interface DetectedExpenseGroup {
  isGroup: boolean;
  groupName: StoreName | null;
  siblings: Expense[];
  totalAmount: number;
}

/**
 * Detecta se uma despesa faz parte de um grupo rateado (Todas [4 empresas], Piracicaba ou Amparo)
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

  // Caminho principal: parcelas ligadas por `groupId` (lançamentos novos).
  // Sem heurística — não confunde duas despesas legítimas parecidas.
  if (expense.groupId) {
    const siblings = allExpenses.filter(e => !e.deleted && e.groupId === expense.groupId);
    if (siblings.length > 1) {
      const siblingStores = new Set(siblings.map(e => e.store));
      const groupName = (Object.keys(GROUP_STORES_MAP) as StoreName[]).find(name => {
        const members = GROUP_STORES_MAP[name];
        return members.length === siblingStores.size && members.every(m => siblingStores.has(m));
      });
      if (groupName) {
        const totalAmount = expense.originalTotal ?? siblings.reduce((sum, s) => sum + s.amount, 0);
        return { isGroup: true, groupName, siblings, totalAmount };
      }
    }
    // Grupo de uma parcela só (as outras foram removidas) ou composição que não
    // corresponde a nenhum grupo: edita como lançamento individual.
    return {
      isGroup: false,
      groupName: null,
      siblings: [expense],
      totalAmount: expense.originalTotal ?? expense.amount
    };
  }

  // Lançamentos antigos (sem groupId): heurística por data + descrição + categoria
  // (guards: doc sem `description` quebrava .trim() com TypeError)
  const targetDescription = (expense.description ?? '').trim().toLowerCase();
  const matchingCandidates = allExpenses.filter(e =>
    !e.deleted &&
    e.date === expense.date &&
    (e.description ?? '').trim().toLowerCase() === targetDescription &&
    e.category === expense.category
  );

  const storesSet = new Set(matchingCandidates.map(e => e.store));

  // Lançamento HISTÓRICO "Todas" de 5 lojas (anterior à saída da Kassouf):
  // o rateio foi gravado com a Kassouf, então NÃO pode ser tratado como grupo
  // — senão uma edição apagaria a parcela da Kassouf. Fica como despesa
  // individual (cada linha é editada isoladamente, o histórico é preservado).
  // Diferencia-se de um "Todas" novo + Kassouf avulsa pelo total: no legado a
  // soma das 5 parcelas fecha com o originalTotal.
  if (LEGACY_TODAS_MEMBERS.every(s => storesSet.has(s))) {
    const legacySum = matchingCandidates
      .filter(e => LEGACY_TODAS_MEMBERS.includes(e.store))
      .reduce((sum, e) => sum + e.amount, 0);
    const legacyTotal = expense.originalTotal;
    if (legacyTotal == null || Math.abs(legacySum - legacyTotal) < 0.015) {
      return {
        isGroup: false,
        groupName: null,
        siblings: [expense],
        totalAmount: expense.originalTotal ?? expense.amount
      };
    }
  }

  // Primeiro grupo (do maior para o menor, ordem em STORE_GROUP_CONFIGS) cujas
  // lojas estejam todas presentes entre os candidatos
  for (const group of STORE_GROUP_CONFIGS) {
    const members: readonly string[] = group.members;
    if (members.every(m => storesSet.has(m))) {
      const siblings = matchingCandidates.filter(e => members.includes(e.store));
      const totalAmount = expense.originalTotal ?? siblings.reduce((sum, s) => sum + s.amount, 0);
      return { isGroup: true, groupName: group.name, siblings, totalAmount };
    }
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

