import { useState, useEffect, useMemo, useCallback } from 'react';
import { getFirebaseRefs } from '@/config/firebase';
import { onSnapshot, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { CalendarCheck, FixedNotification } from '@/shared/types';


interface UseCalendarReturn {
  checks: CalendarCheck;
  isLoading: boolean;
  toggleCheck: (key: string, status: boolean) => void;
  getPendingPayments: (payments: FixedNotification[]) => FixedNotification[];
  syncError: string | null;
}

const LOCAL_STORAGE_KEY = 'odoo_fast_calendar_checks';

const saveToLocalStorage = (checks: CalendarCheck) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(checks));
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
  }
};

const loadFromLocalStorage = (): CalendarCheck => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error('Erro ao carregar do localStorage:', err);
  }
  return {};
};

export const useCalendar = (user: User | null): UseCalendarReturn => {
  const [checks, setChecks] = useState<CalendarCheck>(() => loadFromLocalStorage());
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // useMemo garante que as refs não são recriadas a cada render
  const firebaseRefs = useMemo(() => getFirebaseRefs(), []);

  // Listener de leitura: recebe dados do Firebase e atualiza local
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      firebaseRefs.checksRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as { checks?: CalendarCheck };
          const firebaseChecks = data.checks || {};

          // Firebase é a fonte da verdade — substituir estado local
          setChecks(firebaseChecks);
          saveToLocalStorage(firebaseChecks);
          console.log('📥 Calendário: Dados sincronizados do Firebase —', Object.keys(firebaseChecks).length, 'checks');
        } else {
          // Documento não existe no Firebase ainda — sem dados
          setChecks({});
          console.log('📋 Calendário: Nenhum dado no Firebase ainda');
        }
        setIsLoading(false);
        setSyncError(null);
      },
      (err: Error) => {
        console.error('Erro ao escutar checklist:', err);
        if (err.message.includes('quota') || err.message.includes('exceeded')) {
          setSyncError('Cota do Firestore excedida. As alterações estão sendo salvas localmente.');
        } else {
          setSyncError('Erro de sincronização: ' + err.message);
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, firebaseRefs.checksRef]);

  /**
   * Marca/desmarca um pagamento E salva imediatamente no Firebase.
   * A sincronização é direta: local → Firebase → onSnapshot atualiza todos os clientes.
   */
  const toggleCheck = useCallback(async (key: string, status: boolean) => {
    // Atualizar estado local imediatamente para UI responsiva
    const newChecks = { ...checks, [key]: status };
    setChecks(newChecks);
    saveToLocalStorage(newChecks);

    if (!user) {
      console.warn('⚠️ Calendário: Usuário não autenticado — alteração salva apenas localmente');
      return;
    }

    try {
      await setDoc(firebaseRefs.checksRef, { checks: newChecks }, { merge: true });
      console.log('✅ Calendário: Check confirmado pelo servidor —', key, '=', status);
      setSyncError(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('❌ Calendário: Erro ao salvar no Firebase:', err);
      // Reverte o estado local para evitar inconsistência com o servidor
      setChecks(checks);
      saveToLocalStorage(checks);
      if (errorMsg.includes('quota') || errorMsg.includes('resource-exhausted') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        setSyncError('⚠️ Cota do Firebase excedida. Tente novamente após as 04:00 da manhã (horário de Brasília).');
      } else {
        setSyncError('Erro ao salvar: ' + errorMsg);
      }
    }
  }, [checks, user, firebaseRefs.checksRef]);


  const getPendingPayments = useCallback((payments: FixedNotification[]) => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return payments.filter(task => {
      if (task.months && !task.months.includes(currentMonth + 1)) return false;
      if (task.day > currentDay) return false;
      const key = `${currentYear}-${currentMonth}-${task.description}`;
      return !checks[key];
    });
  }, [checks]);

  return { checks, isLoading, toggleCheck, getPendingPayments, syncError };
};