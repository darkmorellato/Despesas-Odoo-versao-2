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

const DESCRIPTION_MAP: Record<string, string> = {
  "Energia Loja Kassouf": "Energia Kassouf",
  "ENERGIA CPFL LOJA KASSOUF": "Energia Kassouf",
  "Energia Loja Dom Pedro": "Energia Dom Pedro",
  "ENERGIA CPFL LOJA DOM PEDRO": "Energia Dom Pedro",
  "Energia Loja Premium": "Energia Premium",
  "ENERGIA CPFL LOJA PREMIUM": "Energia Premium",
  "Energia Loja Realme": "Energia Realme",
  "ENERGIA CPFL LOJA REALME": "Energia Realme",
  "Energia Loja Xv (nova)": "Energia Xv Prime",
  "Energia Loja Xv (velha)": "Energia Xv Prime",
  "ENERGIA CPFL LOJA XV VELHA": "Energia Xv Prime",
  "ENERGIA CPFL XV NOVA": "Energia Xv Prime",
  "ENERGIA XV NOVA": "Energia Xv Prime",
  "Energia Miori": "Energia Miori ap 131",
  "ENERGIA CPFL MIORI - ALUGUEL": "Energia Miori ap 131",
  "Aluguel Loja Kassouf": "Aluguel Kassouf",
  "Aluguel Loja Realme": "Aluguel Realme",
  "Aluguel Loja Dom Pedro": "Aluguel Dom Pedro",
  "Aluguel Loja Xv (nova)": "Aluguel Xv Prime",
  "Aluguel Loja Xv (velha)": "Aluguel Xv Prime",
  "ALUGUEL LOJA XV NOVA": "Aluguel Xv Prime",
  "ALUGUEL LOJA XV VELHA": "Aluguel Xv Prime",
  "Aluguel AP. MIORI": "Aluguel Miori ap 131",
  "Aluguel Miori": "Aluguel Miori ap 131",
  "Semae Loja Dom Pedro": "Semae Dom Pedro",
  "ÁGUA SEMAE LOJA DOM PEDRO": "Semae Dom Pedro",
  "Semae Loja Xv (Nova)": "Semae Xv Prime",
  "ÁGUA SEMAE LOJA XV NOVA": "Semae Xv Prime",
  "Internet Loja Dom Pedro": "Internet Dom Pedro Claro",
  "INTERNET LOJA DOM PEDRO - CLARO": "Internet Dom Pedro Claro",
  "Internet Xv (nova)": "Internet Xv Prime",
  "Internet Xv (velha)": "Internet Xv Prime",
  "INTERNET LOJA XV NOVA - CLARO": "Internet Xv Prime",
  "Internet Loja Kassouf": "Internet Kassouf",
  "INTERNET LOJA KASSOUF - CLARO": "Internet Kassouf",
  "Internet Loja Premium": "Internet Premium",
  "INTERNET LOJA PREMIUM - VIVO": "Internet Premium",
  "Internet Loja Realme": "Internet Realme",
  "INTERNET LOJA REALME - CLARO": "Internet Realme",
  "Condominio Loja Kassouf": "Condominio Kassouf",
  "Condominio Miori": "Condominio Miori ap 131",
  "CONDOMINIO MIORI - CASA JAQUE": "Condominio Miori ap 131",
  "Marketing Comercio Central": "Comercio Central",
  "COMÉRCIO CENTRAL": "Comercio Central",
  "Mesalidade Odoo": "Mensalidade Odoo",
  "MENSALIDADE ODOO": "Mensalidade Odoo",
  "IPTU Loja Dom Pedro": "IPTU Dom Pedro",
  "Recebeimento Aluguel Americana": "Recebimento Aluguel Americana"
};

export const normalizeTaskDescription = (desc: string): string => {
  return DESCRIPTION_MAP[desc] || desc;
};

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

  const firebaseRefs = useMemo(() => getFirebaseRefs(), []);

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

          setChecks(firebaseChecks);
          saveToLocalStorage(firebaseChecks);
          console.log('📥 Calendário: Dados sincronizados do Firebase —', Object.keys(firebaseChecks).length, 'checks');
        } else {
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

  const toggleCheck = useCallback(async (key: string, status: boolean) => {
    const parts = key.split('-');
    let additionalKey: string | null = null;
    if (parts.length >= 3) {
      const year = parts[0];
      const month = parts[1];
      const desc = parts.slice(2).join('-');
      const normDesc = normalizeTaskDescription(desc);
      if (normDesc !== desc) {
        additionalKey = `${year}-${month}-${normDesc}`;
      }
    }

    const newChecks = {
      ...checks,
      [key]: status,
      ...(additionalKey ? { [additionalKey]: status } : {})
    };
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
      const rawKey = `${currentYear}-${currentMonth}-${task.description}`;
      const normalizedDesc = normalizeTaskDescription(task.description);
      const normKey = `${currentYear}-${currentMonth}-${normalizedDesc}`;
      const isChecked = !!(checks[rawKey] || checks[normKey]);
      return !isChecked;
    });
  }, [checks]);

  return { checks, isLoading, toggleCheck, getPendingPayments, syncError };
};