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
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Só autentica se não houver sessão ativa — evita autenticação dupla
        // (consumia cota extra do plano Spark desnecessariamente)
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
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
      }
    });

    initAuth();

    return () => unsubAuth();
  }, []);

  return { user, syncStatus, error };
};
