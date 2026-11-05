import { useState, useEffect } from 'react';
import { auth, onAuthStateChanged } from '@/config/firebase';

/**
 * Aguarda o login (e-mail/senha) do Firebase: as firestore.rules exigem uma
 * conta da equipe — se assinarmos o listener antes, o Firestore nega
 * ("Missing or insufficient permissions") e o listener morre, deixando o
 * app preso no cache local (os outros hooks já esperavam o `user`).
 * Sessão anônima NÃO conta como login.
 */
export const useTodoAuthReady = (enabled: boolean): boolean => {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthReady(!!u && !u.isAnonymous);
    });
    return () => unsub();
  }, [enabled]);

  return authReady;
};
