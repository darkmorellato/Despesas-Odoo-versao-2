import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getFirebaseRefs } from '@/config/firebase';
import { FIXED_NOTIFICATIONS_DEFAULT } from '@/config/constants';
import type { FixedNotification } from '@/shared/types';
import type { User } from 'firebase/auth';
import { onSnapshot, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

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

function deduplicatePayments(rawPayments: FixedNotification[]): FixedNotification[] {
  const seen = new Set<string>();
  const deduplicated: FixedNotification[] = [];

  for (const item of rawPayments) {
    const key = `${item.day}|${item.description.trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(item);
    }
  }
  return deduplicated;
}

function loadFromLocalStorage(): FixedNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return deduplicatePayments(parsed);
    }
  } catch {
  }
  return [];
}

function saveToLocalStorage(payments: FixedNotification[]): void {
  const clean = deduplicatePayments(payments);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
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
        const loadedPayments = snapshot.docs.map((docSnap: any) => ({
          ...(docSnap.data() || {}),
          id: docSnap.id
        })) as FixedNotification[];

        console.log(`🟢 Pagamentos: Recebidos ${loadedPayments.length} documentos do Firestore`);

        if (loadedPayments.length === 0 && !isPopulating.current) {
          console.log('📝 Pagamentos: Firestore vazio - Populando com defaults sem duplicatas...');
          isPopulating.current = true;
          Promise.all(
            FIXED_NOTIFICATIONS_DEFAULT.map((payment) => {
              const docRef = doc(firebaseRefs.fixedPaymentsRef, payment.id);
              return setDoc(docRef, {
                day: payment.day,
                description: payment.description,
                ...(payment.months ? { months: payment.months } : {})
              });
            })
          ).catch((err) => {
            console.error('❌ Erro ao popular defaults:', err);
            isPopulating.current = false;
          });
        } else if (loadedPayments.length > 0) {
          isPopulating.current = false;
          const cleanPayments = deduplicatePayments(loadedPayments);
          setPayments(cleanPayments);
          saveToLocalStorage(cleanPayments);
          setSyncStatus('synced');
          setIsLoading(false);
          console.log(`✅ Pagamentos: Sincronização completa sem duplicatas! (${cleanPayments.length} itens)`, cleanPayments);
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
  }, [user, firebaseRefs.fixedPaymentsRef]);

  const addPayment = useCallback(async (payment: Omit<FixedNotification, 'id'>) => {
    const docId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPayment = { id: docId, ...payment } as FixedNotification;
    const previousPayments = payments;
    const updatedPayments = deduplicatePayments([...payments, newPayment]);

    setPayments(updatedPayments);
    saveToLocalStorage(updatedPayments);

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
      setPayments(previousPayments);
      saveToLocalStorage(previousPayments);
      setSyncStatus('error');
      throw new Error(getErrorMessage(e, 'adicionar pagamento'));
    }
  }, [payments, firebaseRefs.fixedPaymentsRef]);

  const updatePayment = useCallback(async (id: string, updates: Partial<FixedNotification>) => {
    const previousPayments = payments;
    const updatedPayments = deduplicatePayments(
      payments.map(p => p.id === id ? { ...p, ...updates } : p) as FixedNotification[]
    );

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
    const previousPayments = payments;
    const updatedPayments = deduplicatePayments(payments.filter(p => p.id !== id));
    setPayments(updatedPayments);
    saveToLocalStorage(updatedPayments);

    try {
      setSyncStatus('syncing');
      const docRef = doc(firebaseRefs.fixedPaymentsRef, id);
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (e: unknown) {
      console.error('❌ Erro ao excluir pagamento:', e);
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