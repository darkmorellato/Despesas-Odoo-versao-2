import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getFirebaseRefs } from '@/config/firebase';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { CalendarCheck, FixedNotification } from '@/shared/types';

export interface CalendarCheckEntry {
  key: string;
  status: boolean;
}

interface UseCalendarReturn {
  checks: CalendarCheck;
  isLoading: boolean;
  toggleCheck: (key: string, status: boolean) => void;
  setManyChecks: (entries: CalendarCheckEntry[]) => void;
  getPendingPayments: (payments: FixedNotification[]) => FixedNotification[];
  syncError: string | null;
}

type BatchWriter = (entries: CalendarCheckEntry[]) => void;

// Escritor em lote registrado pela instância ativa do hook. Permite que
// componentes (ex.: ExpenseCalendar — "Selecionar Todos") executem UMA única
// escrita no Firestore sem precisar receber a função por props (o App.tsx não
// precisa ser alterado).
let registeredBatchWriter: BatchWriter | null = null;

const registerBatchWriter = (writer: BatchWriter | null) => {
  registeredBatchWriter = writer;
};

export const getCalendarBatchWriter = (): BatchWriter | null => registeredBatchWriter;

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

/**
 * Normaliza uma chave de check para o formato canônico
 * `${ano}-${mês}-${descrição normalizada}`. Chaves antigas já normalizadas
 * (ou sem descrição reconhecida) são devolvidas inalteradas.
 */
export const normalizeCheckKey = (key: string): string => {
  const parts = key.split('-');
  if (parts.length < 3) return key;
  const [year, month, ...rest] = parts;
  const desc = rest.join('-');
  return `${year}-${month}-${normalizeTaskDescription(desc)}`;
};

/**
 * Monta o field path de um check para updateDoc(). As chaves podem conter
 * pontuação (ex.: "2026-0-Comgás - Débito aut." termina em ponto) — nesse caso
 * o segmento precisa ser escapado com crases, senão o Firestore interpreta
 * como caminho aninhado e rejeita o update ("Invalid field path").
 */
const checksFieldPath = (key: string): string =>
  /[.`\n]/.test(key) ? `checks.\`${key.replace(/`/g, '``')}\`` : `checks.${key}`;

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

  // Espelho síncrono do estado: usado para capturar o valor ANTERIOR de cada
  // chave (rollback por chave) sem depender do `checks` do closure do render.
  const checksRef = useRef<CalendarCheck>(checks);

  useEffect(() => {
    checksRef.current = checks;
  }, [checks]);

  // Persiste localmente sempre que o mapa de checks muda
  // (sincronização do Firebase, otimismo local e rollback)
  useEffect(() => {
    saveToLocalStorage(checks);
  }, [checks]);

  useEffect(() => {
    if (!user) {
      // Sem autenticação não há checklist a exibir/persistir
      setChecks({});
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

  // Aplica as entradas no estado (otimista) e grava em UMA única escrita no
  // Firestore, atualizando somente os campos `checks.<chave>` alterados.
  // Em caso de erro, restaura APENAS as chaves modificadas nesta operação.
  const applyEntries = useCallback(async (entries: CalendarCheckEntry[]) => {
    if (entries.length === 0) return;

    // Captura o valor anterior de cada chave ANTES da sobrescrita (rollback)
    const previous: Record<string, boolean | undefined> = {};
    const optimistic: CalendarCheck = { ...checksRef.current };
    entries.forEach(({ key, status }) => {
      if (!(key in previous)) previous[key] = checksRef.current[key];
      optimistic[key] = status;
    });

    checksRef.current = optimistic;
    // Update funcional: nunca usa o `checks` do closure do render
    setChecks(prev => {
      const next = { ...prev };
      entries.forEach(({ key, status }) => {
        next[key] = status;
      });
      return next;
    });

    if (!user) {
      console.warn('⚠️ Calendário: Usuário não autenticado — alteração salva apenas localmente');
      return;
    }

    try {
      // Objeto de update multi-campo: só as chaves alteradas (nunca o mapa
      // inteiro); chaves com ponto escapadas com crases (ver checksFieldPath)
      const update: Record<string, boolean> = {};
      entries.forEach(({ key, status }) => {
        update[checksFieldPath(key)] = status;
      });
      await updateDoc(firebaseRefs.checksRef, update);
      console.log('✅ Calendário: Check confirmado pelo servidor —', entries);
      setSyncError(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('❌ Calendário: Erro ao salvar no Firebase:', err);
      // Rollback por chave: restaura somente o que foi alterado nesta operação
      const restored: CalendarCheck = { ...checksRef.current };
      entries.forEach(({ key }) => {
        const before = previous[key];
        if (before === undefined) delete restored[key];
        else restored[key] = before;
      });
      checksRef.current = restored;
      setChecks(prev => {
        const next = { ...prev };
        entries.forEach(({ key }) => {
          const before = previous[key];
          if (before === undefined) delete next[key];
          else next[key] = before;
        });
        return next;
      });
      if (errorMsg.includes('quota') || errorMsg.includes('resource-exhausted') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        setSyncError('⚠️ Cota do Firebase excedida. Tente novamente após as 04:00 da manhã (horário de Brasília).');
      } else {
        setSyncError('Erro ao salvar: ' + errorMsg);
      }
    }
  }, [user, firebaseRefs.checksRef]);

  // Uma escrita por toggle: normalização acontece apenas aqui no hook
  const toggleCheck = useCallback((key: string, status: boolean) => {
    void applyEntries([{ key: normalizeCheckKey(key), status }]);
  }, [applyEntries]);

  // Vários checks em UMA única escrita (ex.: "Selecionar Todos")
  const setManyChecks = useCallback((entries: CalendarCheckEntry[]) => {
    void applyEntries(entries.map(entry => ({
      key: normalizeCheckKey(entry.key),
      status: entry.status
    })));
  }, [applyEntries]);

  // Registra o escritor em lote para o ExpenseCalendar usar sem props extras
  useEffect(() => {
    registerBatchWriter(setManyChecks);
    return () => registerBatchWriter(null);
  }, [setManyChecks]);

  const getPendingPayments = useCallback((payments: FixedNotification[]) => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    // Último dia REAL do mês corrente (ex.: fevereiro tem 28/29 dias)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    return payments.filter(task => {
      if (task.months && !task.months.includes(currentMonth + 1)) return false;

      let dueDay = task.day;
      if (task.customDate) {
        const [cy, cm, cd] = task.customDate.split('-').map(Number);
        if (!isNaN(cy) && !isNaN(cm) && !isNaN(cd)) {
          // Data personalizada fora do mês corrente não vence agora
          if (cy !== currentYear || cm !== currentMonth + 1) return false;
          dueDay = cd;
        }
      }

      // Trunca para o último dia real do mês: um vencimento dia 30 em fevereiro
      // passa a vencer dia 28/29 (senão nunca ficaria pendente no mês)
      const effectiveDay = Math.min(dueDay, lastDayOfMonth);
      if (effectiveDay > currentDay) return false;

      const rawKey = `${currentYear}-${currentMonth}-${task.description}`;
      const normKey = normalizeCheckKey(rawKey);
      // Compat com dados antigos: a chave normalizada tem precedência e a
      // chave "crua" (legada) entra como fallback
      return !(checks[normKey] ?? checks[rawKey]);
    });
  }, [checks]);

  return { checks, isLoading, toggleCheck, setManyChecks, getPendingPayments, syncError };
};