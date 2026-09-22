import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getFirebaseRefs } from '@/config/firebase';
import type { FixedNotification } from '@/shared/types';
import type { User } from 'firebase/auth';
import {
  onSnapshot,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type QuerySnapshot,
  type DocumentData,
  type FirestoreError,
} from 'firebase/firestore';

// Helper para formatar mensagem de erro amigável
const getErrorMessage = (e: unknown, acao: string): string => {
  const msg = e instanceof Error ? e.message : String(e);
  if (
    msg.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('RESOURCE_EXHAUSTED')
  ) {
    return `⚠️ Cota do Firebase excedida. NÃO foi possível ${acao}. Tente novamente após as 04:00 da manhã (horário de Brasília).`;
  }
  return `Erro ao ${acao}: ${msg}`;
};

const STORAGE_KEY = 'fixed_payments_v1';

function loadFromLocalStorage(): FixedNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
  }
  return [];
}

function saveToLocalStorage(payments: FixedNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
  } catch {
  }
}

export interface UseFixedPaymentsReturn {
  payments: FixedNotification[];
  isLoading: boolean;
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  addPayment: (payment: Omit<FixedNotification, 'id'>) => Promise<void>;
  updatePayment: (id: string, payment: Partial<FixedNotification>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  getPaymentsByDay: (day: number) => FixedNotification[];
  getUniqueDays: () => number[];
  refresh: () => void;
}

export const useFixedPayments = (user: User | null): UseFixedPaymentsReturn => {
  const [payments, setPayments] = useState<FixedNotification[]>(() => loadFromLocalStorage());
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('offline');

  const firebaseRefs = useMemo(() => getFirebaseRefs(), []);

  // Espelho síncrono do estado: permite rollback pontual sem closure obsoleto
  const paymentsRef = useRef(payments);
  useEffect(() => {
    paymentsRef.current = payments;
  }, [payments]);

  // Persistência centralizada: um único caminho de gravação no localStorage
  // (antes cada handler gravava à parte e um rollback podia regravar estado velho)
  useEffect(() => {
    saveToLocalStorage(payments);
  }, [payments]);

  useEffect(() => {
    if (!user) {
      // Mantém o cache local visível (modo offline) — limpar aqui apagaria o
      // cache no mount, antes do sign-in anônimo resolver.
      setIsLoading(false);
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    setIsLoading(true);

    const unsubscribe = onSnapshot(
      firebaseRefs.fixedPaymentsRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const loadedPayments = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() || {}),
          id: docSnap.id
        })) as FixedNotification[];

        // Exibe estritamente o que está no Firestore (o efeito [payments]
        // cuida do cache local)
        setPayments(loadedPayments);
        setSyncStatus('synced');
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        console.error("❌ Erro ao carregar pagamentos fixos:", err);
        setSyncStatus('error');
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, firebaseRefs.fixedPaymentsRef]);

  const addPayment = useCallback(async (payment: Omit<FixedNotification, 'id'>) => {
    const docId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPayment = { id: docId, ...payment } as FixedNotification;

    // Otimista com FUNCTIONAL update — não fecha sobre o estado do render,
    // então duas operações no mesmo tick não se sobrescrevem
    setPayments(prev => [...prev, newPayment]);

    try {
      setSyncStatus('syncing');
      const docRef = doc(firebaseRefs.fixedPaymentsRef, docId);
      await setDoc(docRef, {
        ...payment,
        createdAt: serverTimestamp()
      });
      setSyncStatus('synced');
    } catch (e: unknown) {
      console.error('❌ Erro ao adicionar pagamento:', e);
      // Rollback cirúrgico: remove SÓ o item que falhou (o rollback antigo
      // restaurava o closure inteiro e desfazia operações concorrentes boas)
      setPayments(prev => prev.filter(p => p.id !== docId));
      setSyncStatus('error');
      throw new Error(getErrorMessage(e, 'adicionar pagamento'));
    }
  }, [firebaseRefs.fixedPaymentsRef]);

  const updatePayment = useCallback(async (id: string, updates: Partial<FixedNotification>) => {
    // Snapshot dos valores antigos (apenas para rollback pontual)
    const before = paymentsRef.current.find(p => p.id === id);

    setPayments(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p)) as FixedNotification[]
    );

    try {
      setSyncStatus('syncing');
      const docRef = doc(firebaseRefs.fixedPaymentsRef, id);
      await setDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSyncStatus('synced');
    } catch (e: unknown) {
      console.error('❌ Erro ao atualizar pagamento:', e);
      // Reverte apenas os campos alterados DESTE item
      if (before) {
        setPayments(prev =>
          prev.map(p => (p.id === id ? { ...p, ...before } : p)) as FixedNotification[]
        );
      }
      setSyncStatus('error');
      throw new Error(getErrorMessage(e, 'atualizar pagamento'));
    }
  }, [firebaseRefs.fixedPaymentsRef]);

  const deletePayment = useCallback(async (id: string) => {
    const before = paymentsRef.current.find(p => p.id === id);

    // Remove APENAS pelo id. A exclusão em cascata por dia+descrição (local
    // normalizado × query exata no servidor) foi removida: destruía
    // duplicatas legítimas sem confirmação e, pela divergência de
    // normalização, o item "voltava da morte" no próximo snapshot.
    setPayments(prev => prev.filter(p => p.id !== id));

    try {
      setSyncStatus('syncing');
      const docRef = doc(firebaseRefs.fixedPaymentsRef, id);
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (e: unknown) {
      console.error('❌ Erro ao excluir pagamento:', e);
      // Restaura somente o item removido (ordem é reconciliada pelo snapshot)
      if (before) {
        setPayments(prev => [...prev, before]);
      }
      setSyncStatus('error');
      throw new Error(getErrorMessage(e, 'excluir pagamento'));
    }
  }, [firebaseRefs.fixedPaymentsRef]);

  const getPaymentsByDay = useCallback((day: number): FixedNotification[] => {
    return payments.filter(p => p.day === day);
  }, [payments]);

  const getUniqueDays = useCallback((): number[] => {
    const days: number[] = [...new Set(payments.map((p: FixedNotification) => p.day))];
    return days.sort((a: number, b: number) => a - b);
  }, [payments]);

  const refresh = useCallback(() => {
    setPayments(loadFromLocalStorage());
  }, []);

  return {
    payments,
    isLoading,
    syncStatus,
    addPayment,
    updatePayment,
    deletePayment,
    getPaymentsByDay,
    getUniqueDays,
    refresh,
  };
};

export const getFixedPayments = (): FixedNotification[] => {
  return loadFromLocalStorage();
};