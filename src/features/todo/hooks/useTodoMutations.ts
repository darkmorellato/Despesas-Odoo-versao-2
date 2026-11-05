import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { TodoItem, TodoRepeat, TodoStep } from '../types';
import { addTodoDoc, updateTodoDoc, deleteTodoDoc } from '../services/todoService';
import { playTodoAlertSound, playSynthesizedBeep } from '@/shared/utils/audio';
import { getNextRecurrenceDate, hasNextOccurrence } from '../utils/todoRecurrence';
import { patchTodo, removeTodo } from '../utils/todoDocument';

interface UseTodoMutationsParams {
  /** Lista mais recente (lida sem depender de renderização) */
  todosRef: MutableRefObject<TodoItem[]>;
  /** Aplica uma edição à lista, atualizando também o cache local */
  commit: (updater: (list: TodoItem[]) => TodoItem[]) => void;
  employeeName: string;
  userEmail: string;
}

/**
 * Operações sobre as tarefas. Todas seguem o mesmo padrão: aplicam a mudança na
 * tela na hora (otimista), gravam no Firestore e, se a gravação falhar, DESFAZEM
 * e propagam o erro para o componente avisar o usuário.
 */
export const useTodoMutations = ({ todosRef, commit, employeeName, userEmail }: UseTodoMutationsParams) => {
  // Guarda de idempotência para toggleComplete (duplo clique)
  const toggleInFlight = useRef<Set<string>>(new Set());

  // Adicionar tarefa
  const addTodo = useCallback(async (
    title: string,
    dueDate?: string | undefined,
    dueTime?: string | undefined,
    important: boolean = false,
    notes?: string | undefined,
    repeat: TodoRepeat = 'none',
    assignedTo?: string | undefined,
    assignedToName?: string | undefined,
    steps?: TodoStep[] | undefined
  ) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    // Persiste PRIMEIRO; o beep só toca se a gravação der certo.
    // addTodoDoc propaga o erro (throw) para o chamador tratar.
    await addTodoDoc({
      title: trimmedTitle,
      completed: false,
      important,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      repeat,
      notes: notes || undefined,
      steps: steps || [],
      assignedTo: assignedTo?.trim() || undefined,
      assignedToName: assignedToName?.trim() || undefined,
      employeeName,
      userEmail,
      createdAt: new Date().toISOString()
    });

    playSynthesizedBeep();
  }, [employeeName, userEmail]);

  // Alternar Concluído (com suporte a tarefas recorrentes!)
  const toggleComplete = useCallback(async (id: string) => {
    // Guarda de idempotência: ignora duplo clique enquanto processa
    if (toggleInFlight.current.has(id)) return;
    toggleInFlight.current.add(id);

    try {
      const target = todosRef.current.find((t) => t.id === id);
      if (!target) return;

      const nextCompleted = !target.completed;
      const completedAt = nextCompleted ? new Date().toISOString() : undefined;

      // Atualização otimista
      commit((list) => patchTodo(list, id, { completed: nextCompleted, completedAt }));

      try {
        await updateTodoDoc(id, { completed: nextCompleted, completedAt });
      } catch (err) {
        // Rollback em caso de falha e propaga o erro
        commit((list) => patchTodo(list, id, { completed: target.completed, completedAt: target.completedAt }));
        throw err;
      }

      if (nextCompleted) {
        playTodoAlertSound();
      } else {
        playSynthesizedBeep();
      }

      // Se for uma tarefa recorrente e foi concluída, gera automaticamente a próxima ocorrência
      // Dedup por title + dueDate + (userEmail||assignedTo) usando leitura fresca (todosRef)
      if (nextCompleted && target.repeat && target.repeat !== 'none') {
        const nextDueDate = getNextRecurrenceDate(target.dueDate, target.repeat);

        if (!hasNextOccurrence(todosRef.current, target, nextDueDate)) {
          const resetSteps = target.steps?.map(s => ({ ...s, completed: false }));
          await addTodo(
            target.title,
            nextDueDate,
            target.dueTime,
            target.important,
            target.notes,
            target.repeat,
            target.assignedTo,
            target.assignedToName,
            resetSteps
          );
        }
      }
    } finally {
      toggleInFlight.current.delete(id);
    }
  }, [addTodo, commit, todosRef]);

  // Alternar Estrela de Importante
  const toggleImportant = useCallback(async (id: string) => {
    const target = todosRef.current.find((t) => t.id === id);
    if (!target) return;
    const nextImportant = !target.important;

    commit((list) => patchTodo(list, id, { important: nextImportant }));

    try {
      await updateTodoDoc(id, { important: nextImportant });
      playSynthesizedBeep();
    } catch (err) {
      // Rollback
      commit((list) => patchTodo(list, id, { important: target.important }));
      throw err;
    }
  }, [commit, todosRef]);

  // Remover tarefa
  const deleteTodo = useCallback(async (id: string) => {
    const target = todosRef.current.find((t) => t.id === id);

    commit((list) => removeTodo(list, id));

    try {
      await deleteTodoDoc(id);
    } catch (err) {
      // Rollback: recoloca o item removido
      if (target) {
        commit((list) => [target, ...list]);
      }
      throw err;
    }
  }, [commit, todosRef]);

  // Editar tarefa (com rollback + rethrow para o componente mostrar toast)
  const updateTodo = useCallback(async (id: string, updates: Partial<TodoItem>) => {
    const target = todosRef.current.find((t) => t.id === id);
    if (!target) return;

    commit((list) => patchTodo(list, id, updates));

    try {
      await updateTodoDoc(id, updates);
    } catch (err) {
      // Rollback: reverte apenas os campos alterados
      commit((list) => patchTodo(list, id, target));
      throw err;
    }
  }, [commit, todosRef]);

  /** Troca a lista de etapas de uma tarefa (otimista) e grava; desfaz se falhar */
  const saveSteps = useCallback(async (
    todoId: string,
    previous: TodoItem,
    updatedSteps: TodoStep[],
    beepOnSuccess: boolean
  ) => {
    commit((list) => patchTodo(list, todoId, { steps: updatedSteps }));

    try {
      await updateTodoDoc(todoId, { steps: updatedSteps });
      if (beepOnSuccess) playSynthesizedBeep();
    } catch (err) {
      commit((list) => patchTodo(list, todoId, { steps: previous.steps }));
      throw err;
    }
  }, [commit]);

  // Adicionar etapa/subtarefa (cálculo puro FORA do updater)
  const addStep = useCallback(async (todoId: string, stepTitle: string) => {
    if (!stepTitle.trim()) return;

    const target = todosRef.current.find((t) => t.id === todoId);
    if (!target) return; // aborta: todo não existe

    const newStep: TodoStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: stepTitle.trim(),
      completed: false
    };

    await saveSteps(todoId, target, [...(target.steps || []), newStep], true);
  }, [saveSteps, todosRef]);

  // Alternar conclusão de etapa (cálculo puro FORA do updater)
  const toggleStep = useCallback(async (todoId: string, stepId: string) => {
    const target = todosRef.current.find((t) => t.id === todoId);
    if (!target || !target.steps) return; // aborta: todo não existe

    const updatedSteps = target.steps.map((s) =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );

    await saveSteps(todoId, target, updatedSteps, true);
  }, [saveSteps, todosRef]);

  // Excluir etapa (sem bipe de confirmação)
  const deleteStep = useCallback(async (todoId: string, stepId: string) => {
    const target = todosRef.current.find((t) => t.id === todoId);
    if (!target || !target.steps) return; // aborta: todo não existe

    await saveSteps(todoId, target, target.steps.filter((s) => s.id !== stepId), false);
  }, [saveSteps, todosRef]);

  return { addTodo, toggleComplete, toggleImportant, deleteTodo, updateTodo, addStep, toggleStep, deleteStep };
};
