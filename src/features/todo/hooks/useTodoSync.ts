import { useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, doc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import type { TodoItem } from '../types';
import { deduplicateTodos, parseTodoDoc, sortByCreatedAtDesc } from '../utils/todoDocument';

interface UseTodoSyncParams {
  enabled: boolean;
  /** Só assina depois do login (ver useTodoAuthReady) */
  authReady: boolean;
  /** Recebe a lista do servidor: traduzida, ordenada e sem duplicados */
  onData: (todos: TodoItem[]) => void;
  /** Falha ao assinar/ler: o chamador volta ao cache local */
  onFallback: () => void;
}

/** Escuta em tempo real a coleção de tarefas (as 300 mais recentes) */
export const useTodoSync = ({ enabled, authReady, onData, onFallback }: UseTodoSyncParams): void => {
  useEffect(() => {
    if (!enabled || !authReady) return;
    let unsubscribe: (() => void) | undefined;

    try {
      const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
      const todoColl = collection(dataDoc, 'todo_tasks_v1');
      const q = query(todoColl, orderBy('createdAt', 'desc'), limit(300));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: TodoItem[] = [];
          snapshot.forEach((docSnap) => {
            fetched.push(parseTodoDoc(docSnap.id, docSnap.data()));
          });
          onData(deduplicateTodos(sortByCreatedAtDesc(fetched)));
        },
        (error) => {
          console.warn('Falha na escuta do Firestore para To-Do, usando cache local:', error);
          onFallback();
        }
      );
    } catch (e) {
      console.warn('Erro ao conectar ao Firestore To-Do:', e);
      onFallback();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [enabled, authReady, onData, onFallback]);
};
