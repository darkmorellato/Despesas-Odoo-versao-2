import { useState, useEffect, useCallback } from 'react';
import type { TodoItem } from '@/features/todo/types';
import { getCachedTodos, updateTodoDoc } from '@/features/todo/services/todoService';
import { playTodoAlertSound, playSynthesizedBeep } from '@/shared/utils/audio';

interface UseCalendarTodosParams {
  /** Tarefas vindas do App (quando presentes, são a fonte da verdade) */
  propTodos: TodoItem[] | undefined;
  /** Quando informado, a conclusão é delegada (o useTodo já toca o alerta e grava) */
  onToggleTodo: ((id: string) => void) | undefined;
}

/**
 * Tarefas To-Do exibidas no calendário: lista local (sincronizada com a prop),
 * tarefa aberta no modal de detalhes e a ação de concluir/reabrir.
 */
export const useCalendarTodos = ({ propTodos, onToggleTodo }: UseCalendarTodosParams) => {
  const [internalTodos, setInternalTodos] = useState<TodoItem[]>(() => propTodos || getCachedTodos());
  const [selectedTodoModal, setSelectedTodoModal] = useState<TodoItem | null>(null);

  useEffect(() => {
    if (propTodos) {
      setInternalTodos(propTodos);
    }
  }, [propTodos]);

  const handleToggleTodo = useCallback(async (id: string) => {
    const target = internalTodos.find((t) => t.id === id);
    if (!target) return;
    const nextCompleted = !target.completed;
    const completedAt = nextCompleted ? new Date().toISOString() : undefined;

    // Toca o som APENAS no caminho local: quando delegamos para `onToggleTodo`
    // o useTodo.toggleComplete já reproduz o alerta (evita som duplicado)
    if (!onToggleTodo) {
      if (nextCompleted) playTodoAlertSound();
      else playSynthesizedBeep();
    }

    setInternalTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: nextCompleted, completedAt } : t))
    );

    if (onToggleTodo) {
      await onToggleTodo(id);
      return;
    }

    await updateTodoDoc(id, { completed: nextCompleted, completedAt });
  }, [onToggleTodo, internalTodos]);

  return { internalTodos, selectedTodoModal, setSelectedTodoModal, handleToggleTodo };
};
