import { useState, useEffect } from 'react';
import { auth, signOut, onAuthStateChanged } from '@/config/firebase';
import type { User } from 'firebase/auth';
import type { SyncStatus } from '@/shared/types';

import { logger } from '@/shared/utils/logger';
/**
 * Return type for useAuth hook
 * @interface UseAuthReturn
 */
interface UseAuthReturn {
  /** Usuário Firebase autenticado (e-mail/senha). Nunca anônimo. */
  user: User | null;
  /** true depois que o Firebase informou o estado inicial da sessão */
  authReady: boolean;
  /** Status de sincronização da autenticação */
  syncStatus: SyncStatus;
  /** Mensagem de erro, se a observação da sessão falhou */
  error: string | null;
}

/**
 * Observa a sessão do Firebase Auth (login por e-mail/senha).
 *
 * O login em si acontece em `authenticateUser` (LoginScreen); este hook apenas
 * reflete o estado. Não existe mais login anônimo: as firestore.rules exigem
 * uma conta de e-mail/senha da equipe, e uma sessão anônima antiga que ainda
 * esteja salva no navegador é encerrada aqui.
 *
 * @example
 * ```tsx
 * const { user, authReady, syncStatus } = useAuth();
 * if (authReady && !user) // sessão expirada → voltar para a tela de login
 * ```
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;
    try {
      unsubAuth = onAuthStateChanged(auth, (u: User | null) => {
        if (u && u.isAnonymous) {
          // Sessão anônima legada (versão antiga do app): descarta. Sem isto o
          // usuário ficaria "logado" sem permissão de leitura nas regras novas.
          void signOut(auth).catch(() => { /* melhor esforço */ });
          setUser(null);
          setSyncStatus('offline');
          setAuthReady(true);
          return;
        }
        if (u) {
          setUser(u);
          setSyncStatus('synced');
          setError(null);
        } else {
          setUser(null);
          setSyncStatus('offline');
        }
        setAuthReady(true);
      });
    } catch (err) {
      logger.error('Erro auth:', err);
      setSyncStatus('error');
      setError('Erro ao conectar ao servidor.');
      setAuthReady(true);
    }

    return () => unsubAuth?.();
  }, []);

  return { user, authReady, syncStatus, error };
};
