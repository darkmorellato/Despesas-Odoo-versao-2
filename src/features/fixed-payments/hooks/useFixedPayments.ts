import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getFirebaseRefs } from '@/config/firebase';
import { FIXED_NOTIFICATIONS_DEFAULT } from '@/config/constants';
import type { FixedNotification } from '@/shared/types';
import type { User } from 'firebase/auth';
import { onSnapshot, addDoc, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

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
      return JSON.parse(stored);
    }
  } catch {
  }
  return [];
}

function saveToLocalStorage(payments: FixedNotification[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
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
  // Flag para evitar popular defaults mais de uma vez (previne loop infinito de escritas)
  const isPopulating = useRef(false);

  const firebaseRefs = useMemo(() => getFirebaseRefs(), []);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setSyncStatus('offline');
      console.log('🔴 Pagamentos: Usuário não autenticado - Modo offline');
      return;
    }

    setSyncStatus('syncing');
    setIsLoading(true);
    console.log('🟡 Pagamentos: Iniciando sincronização com Firestore...');

    const unsubscribe = onSnapshot(
      firebaseRefs.fixedPaymentsRef,
      (snapshot: any) => {
        const loadedPayments = snapshot.docs.map((doc: any) => ({
          ...(doc.data() || {}),
          id: doc.id
        })) as FixedNotification[];

        console.log(`🟢 Pagamentos: Recebidos ${loadedPayments.length} documentos do Firestore`);

        if (loadedPayments.length === 0 && !isPopulating.current) {
          // Popula os defaults UMA ÚNICA VEZ para evitar loop infinito:
          // cada addDoc dispara onSnapshot → sem a flag, criaria escritas infinitas
          console.log('📝 Pagamentos: Firestore vazio - Populando com defaults...');
          isPopulating.current = true;
          Promise.all(
            FIXED_NOTIFICATIONS_DEFAULT.map(({ id: _id, ...payment }) =>
              addDoc(firebaseRefs.fixedPaymentsRef, payment)
            )
          ).catch((err) => {
            console.error('❌ Erro ao popular defaults:', err);
            isPopulating.current = false;
          });
        } else if (loadedPayments.length > 0) {
          isPopulating.current = false;
          setPayments(loadedPayments);
          saveToLocalStorage(loadedPayments);
          setSyncStatus('synced');
          setIsLoading(false);
          console.log('✅ Pagamentos: Sincronização completa!', loadedPayments);
        }
      },
      (err: any) => {
        console.error("❌ Erro ao carregar pagamentos fixos:", err);
        setSyncStatus('error');
        setIsLoading(false);
      }
    );

    return () => {
      console.log('🔌 Pagamentos: Desconectando listener...');
      unsubscribe();
    };
    // Apenas `user` e `firebaseRefs.fixedPaymentsRef` como deps — incluir o objeto
    // `firebaseRefs` inteiro causava reconexão do listener a cada render (Bug 2)
  }, [user, firebaseRefs.fixedPaymentsRef]);

  const addPayment = useCallback(async (payment: Omit<FixedNotification, 'id'>) => {
    const tempId = `default_${Date.now()}`;
    const newPayment = { id: tempId, ...payment } as FixedNotification;
    const previousPayments = payments;
    const updatedPayments = [...payments, newPayment];

    setPayments(updatedPayments);
    saveToLocalStorage(updatedPayments);

    try {
      setSyncStatus('syncing');
      await addDoc(firebaseRefs.fixedPaymentsRef, {
        ...payment,
        createdAt: serverTimestamp()
      });
      setSyncStatus('synced');
    } catch (e: unknown) {
      console.error('❌ Erro ao adicionar pagamento:', e);
      setPayments(previousPayments);
      saveToLocalStorage(previousPayments);
      setSyncStatus('error');
      throw new Error(getErrorMessage(e, 'adicionar pagamento'));
    }
  }, [payments, firebaseRefs.fixedPaymentsRef]);

  const updatePayment = useCallback(async (id: string, updates: Partial<FixedNotification>) => {
    const previousPayments = payments;
    const updatedPayments = payments.map(p => p.id === id ? { ...p, ...updates } : p) as FixedNotification[];

    setPayments(updatedPayments);
    saveToLocalStorage(updatedPayments);

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
      setPayments(previousPayments);
      saveToLocalStorage(previousPayments);
      setSyncStatus('error');
      throw new Error(getErrorMessage(e, 'atualizar pagamento'));
    }
  }, [payments, firebaseRefs.fixedPaymentsRef]);

  const deletePayment = useCallback(async (id: string) => {
    // Remove do estado local e localStorage IMEDIATAMENTE (otimista)
    const previousPayments = payments;
    const updatedPayments = payments.filter(p => p.id !== id);
    setPayments(updatedPayments);
    saveToLocalStorage(updatedPayments);

    try {
      setSyncStatus('syncing');
      const docRef = doc(firebaseRefs.fixedPaymentsRef, id);
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (e: unknown) {
      console.error('❌ Erro ao excluir pagamento:', e);
      // Reverte estado local em caso de erro 
      setPayments(previousPayments);
      saveToLocalStorage(previousPayments);
      setSyncStatus('error');
      throw new Error(getErrorMessage(e, 'excluir pagamento'));
    }
  }, [payments, firebaseRefs.fixedPaymentsRef]);




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