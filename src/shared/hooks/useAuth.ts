import { useState, useEffect } from 'react';
import { auth, signInAnonymously, onAuthStateChanged } from '@/config/firebase';
import type { User } from 'firebase/auth';
import type { SyncStatus } from '@/shared/types';

/**
 * Return type for useAuth hook
 * @interface UseAuthReturn
 */
interface UseAuthReturn {
  /** Authenticated Firebase user */
  user: User | null;
  /** Current authentication sync status */
  syncStatus: SyncStatus;
  /** Error message if authentication failed */
  error: string | null;
}

/**
 * Hook para gerenciar autenticação anônima com Firebase
 * 
 * Automaticamente autentica o usuário de forma anônima ao carregar
 * e mantém o estado de sincronização.
 * 
 * @returns Objeto com usuário, status e erro
 * 
 * @example
 * ```tsx
 * const { user, syncStatus, error } = useAuth();
 * 
 * if (syncStatus === 'synced' && user) {
 *   // Usuário autenticado, pode usar o sistema
 * }
 * 
 * if (error) {
 *   // Mostrar erro de autenticação
 * }
 * ```
 */
// Singleton de sign-in anônimo: todas as instâncias do hook compartilham a
// MESMA tentativa — sem isso, App + Dashboard + FixedPayments disparavam 2-3
// signInAnonymously concorrentes no primeiro mount, criando contas anônimas
// extras e consumindo cota desnecessariamente (o oposto do comentário abaixo).
let anonSignInPromise: Promise<unknown> | null = null;

const ensureAnonSignIn = async (): Promise<void> => {
  if (auth.currentUser) return;
  if (!anonSignInPromise) {
    const p = Promise.resolve().then(() => signInAnonymously(auth));
    anonSignInPromise = p;
    // Libera a referência ao terminar (sucesso ou erro) para permitir retry
    p.finally(() => {
      if (anonSignInPromise === p) anonSignInPromise = null;
    }).catch(() => { /* rejeição tratada por quem awaits */ });
  }
  await anonSignInPromise;
};

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Só autentica se não houver sessão ativa — evita autenticação dupla
        // (consumia cota extra do plano Spark desnecessariamente)
        await ensureAnonSignIn();
      } catch (err) {
        console.error("Erro auth:", err);
        setSyncStatus('error');
        setError("Erro ao conectar ao servidor.");
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (u: User | null) => {
      if (u) {
        setUser(u);
        setSyncStatus('synced');
        setError(null); // sucesso anterior não deixa erro antigo na UI
      } else {
        // Sessão encerrada/expirada: antes este caso era IGNORADO e o hook
        // continuava reportando o usuário antigo como autenticado.
        setUser(null);
        setSyncStatus('offline');
      }
    });

    initAuth();

    return () => unsubAuth();
  }, []);

  return { user, syncStatus, error };
};
