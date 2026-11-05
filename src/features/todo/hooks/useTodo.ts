import { useState, useCallback, useRef } from 'react';
import type { TodoItem } from '../types';
import { getCachedTodos, saveCachedTodos } from '../services/todoService';
import { deduplicateTodos } from '../utils/todoDocument';
import { useTodoAuthReady } from './useTodoAuthReady';
import { useTodoSync } from './useTodoSync';
import { useTodoReminders } from './useTodoReminders';
import { useTodoMutations } from './useTodoMutations';

// Reexportados: fazem parte da API pública da feature (via index.ts)
export { getNextRecurrenceDate } from '../utils/todoRecurrence';
export { deduplicateTodos } from '../utils/todoDocument';

/**
 * Tarefas do To-Do: lista em tempo real (com cache local), lembretes sonoros e as
 * operações (adicionar, concluir, editar, excluir, etapas). Este hook só compõe
 * as partes: escuta em `useTodoSync`, lembretes em `useTodoReminders`, operações
 * em `useTodoMutations` e regras em `utils/todo*`.
 *
 * `enabled=false` desliga escuta, lembretes e gesto de permissão (usado quando os
 * dados já vêm de um `useTodo` de nível superior, evitando listeners e bips duplicados).
 */
export const useTodo = (employeeName: string, userEmail: string, enabled: boolean = true) => {
  const [todos, setTodos] = useState<TodoItem[]>(() => deduplicateTodos(getCachedTodos()));
  const [isLoading, setIsLoading] = useState(true);

  // Ref sempre atualizado com a lista mais recente (evita closure obsoleta)
  const todosRef = useRef<TodoItem[]>(todos);
  todosRef.current = todos;

  // Aplica uma edição à lista mantendo o ref e o cache local em dia
  const commit = useCallback((updater: (list: TodoItem[]) => TodoItem[]) => {
    setTodos((prev) => {
      const updated = updater(prev);
      todosRef.current = updated;
      saveCachedTodos(updated);
      return updated;
    });
  }, []);

  const onData = useCallback((list: TodoItem[]) => {
    setTodos(list);
    todosRef.current = list;
    saveCachedTodos(list);
    setIsLoading(false);
  }, []);

  const onFallback = useCallback(() => {
    setTodos(deduplicateTodos(getCachedTodos()));
    setIsLoading(false);
  }, []);

  const authReady = useTodoAuthReady(enabled);
  useTodoSync({ enabled, authReady, onData, onFallback });
  useTodoReminders(todos, enabled);
  const mutations = useTodoMutations({ todosRef, commit, employeeName, userEmail });

  return { todos, isLoading, ...mutations };
};
