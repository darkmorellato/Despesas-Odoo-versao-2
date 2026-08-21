import { useState, useEffect, useCallback } from 'react';
import { db } from '@/config/firebase';
import { collection, doc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import type { TodoItem, TodoRepeat, TodoStep } from '../types';
import { getCachedTodos, saveCachedTodos, addTodoDoc, updateTodoDoc, deleteTodoDoc } from '../services/todoService';
import { playTodoAlertSound, playSynthesizedBeep } from '@/shared/utils/audio';
import { showNativeNotification, requestNotificationPermission } from '@/shared/utils/notifications';
import { getTodayLocal } from '@/shared/utils/formatters';

export const getNextRecurrenceDate = (currentDateStr?: string, repeat?: TodoRepeat): string => {
  let baseDate = new Date();
  if (currentDateStr) {
    const parts = currentDateStr.split('-');
    if (parts.length === 3) {
      baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }

  if (repeat === 'daily') {
    baseDate.setDate(baseDate.getDate() + 1);
  } else if (repeat === 'weekdays') {
    do {
      baseDate.setDate(baseDate.getDate() + 1);
    } while (baseDate.getDay() === 0 || baseDate.getDay() === 6);
  } else if (repeat === 'weekly') {
    baseDate.setDate(baseDate.getDate() + 7);
  } else if (repeat === 'monthly') {
    const targetDay = baseDate.getDate();
    baseDate.setMonth(baseDate.getMonth() + 1, 1);
    const daysInNextMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
    baseDate.setDate(Math.min(targetDay, daysInNextMonth));
  }

  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useTodo = (employeeName: string, userEmail: string) => {
  const [todos, setTodos] = useState<TodoItem[]>(() => getCachedTodos());
  const [isLoading, setIsLoading] = useState(true);
  const [notifiedTasks, setNotifiedTasks] = useState<Set<string>>(new Set());

  // Escuta em tempo real no Firestore
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
      const todoColl = collection(dataDoc, 'todo_tasks_v1');
      const q = query(todoColl, limit(300));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: TodoItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetched.push({
              id: docSnap.id,
              title: data.title || '',
              completed: !!data.completed,
              important: !!data.important,
              dueDate: data.dueDate || undefined,
              dueTime: data.dueTime || undefined,
              repeat: data.repeat || 'none',
              notes: data.notes || undefined,
              steps: data.steps || [],
              assignedTo: data.assignedTo || undefined,
              assignedToName: data.assignedToName || undefined,
              employeeName: data.employeeName || 'Funcionário',
              userEmail: data.userEmail || '',
              createdAt: data.createdAt?.seconds
                ? new Date(data.createdAt.seconds * 1000).toISOString()
                : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
              completedAt: data.completedAt || undefined
            });
          });

          // Ordenação por data de criação decrescente
          fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // Preserva tarefas locais que ainda não sincronizaram
          setTodos((prevTodos) => {
            const localPending = prevTodos.filter(p => p.id.startsWith('local_') || p.id.startsWith('temp_'));
            const merged = [...localPending, ...fetched.filter(f => !localPending.some(p => p.id === f.id))];
            saveCachedTodos(merged);
            return merged;
          });
          setIsLoading(false);
        },
        (error) => {
          console.warn('Falha na escuta do Firestore para To-Do, usando cache local:', error);
          setTodos(getCachedTodos());
          setIsLoading(false);
        }
      );
    } catch (e) {
      console.warn('Erro ao conectar ao Firestore To-Do:', e);
      setTodos(getCachedTodos());
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Solicita permissão para notificações nativas ao carregar
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
  }, []);

  // Monitora horários de vencimento/lembrete e dispara Bip sonoro + Notificação nativa
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayStr = getTodayLocal();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;

      todos.forEach((task) => {
        if (!task.completed && task.dueDate === todayStr && task.dueTime === currentTimeStr) {
          if (!notifiedTasks.has(task.id)) {
            playTodoAlertSound();
            showNativeNotification(`🔔 Lembrete To-Do: ${task.title}`, {
              body: task.notes || (task.assignedTo ? `Atribuído a: ${task.assignedToName || task.assignedTo}` : `Horário agendado: ${currentTimeStr}`),
            });
            setNotifiedTasks((prev) => new Set(prev).add(task.id));
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 15000);
    checkReminders();
    return () => clearInterval(interval);
  }, [todos, notifiedTasks]);

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
    if (!title.trim()) return;

    const tempId = `temp_${Date.now()}`;
    const newTask: TodoItem = {
      id: tempId,
      title: title.trim(),
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
    };

    setTodos((prev) => {
      const updated = [newTask, ...prev];
      saveCachedTodos(updated);
      return updated;
    });

    playSynthesizedBeep();

    const realId = await addTodoDoc({
      title: title.trim(),
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

    if (realId && realId !== tempId) {
      setTodos((prev) => {
        const updated = prev.map((t) => (t.id === tempId ? { ...t, id: realId } : t));
        saveCachedTodos(updated);
        return updated;
      });
    }
  }, [employeeName, userEmail]);

  // Alternar Concluído (com suporte a tarefas recorrentes!)
  const toggleComplete = useCallback(async (id: string) => {
    let target: TodoItem | undefined;
    let nextCompleted = false;
    let completedAt: string | undefined;

    setTodos((prev) => {
      target = prev.find((t) => t.id === id);
      if (!target) return prev;
      nextCompleted = !target.completed;
      completedAt = nextCompleted ? new Date().toISOString() : undefined;
      const updated = prev.map((t) =>
        t.id === id ? { ...t, completed: nextCompleted, completedAt } : t
      );
      saveCachedTodos(updated);
      return updated;
    });

    if (!target) return;

    if (nextCompleted) {
      playTodoAlertSound();
    } else {
      playSynthesizedBeep();
    }

    await updateTodoDoc(id, { completed: nextCompleted, completedAt });

    // Se for uma tarefa recorrente e foi concluída, gera automaticamente a próxima ocorrência!
    if (nextCompleted && target.repeat && target.repeat !== 'none') {
      const nextDueDate = getNextRecurrenceDate(target.dueDate, target.repeat);
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
  }, [addTodo]);

  // Alternar Estrela de Importante
  const toggleImportant = useCallback(async (id: string) => {
    let nextImportant = false;
    setTodos((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      nextImportant = !target.important;
      const updated = prev.map((t) =>
        t.id === id ? { ...t, important: nextImportant } : t
      );
      saveCachedTodos(updated);
      return updated;
    });

    playSynthesizedBeep();
    await updateTodoDoc(id, { important: nextImportant });
  }, []);

  // Remover tarefa
  const deleteTodo = useCallback(async (id: string) => {
    setTodos((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveCachedTodos(updated);
      return updated;
    });

    await deleteTodoDoc(id);
  }, []);

  // Editar tarefa
  const updateTodo = useCallback(async (id: string, updates: Partial<TodoItem>) => {
    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      saveCachedTodos(updated);
      return updated;
    });

    await updateTodoDoc(id, updates);
  }, []);

  // Adicionar etapa/subtarefa
  const addStep = useCallback(async (todoId: string, stepTitle: string) => {
    if (!stepTitle.trim()) return;

    const newStep: TodoStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: stepTitle.trim(),
      completed: false
    };

    let updatedSteps: TodoStep[] = [];
    setTodos((prev) => {
      const target = prev.find(t => t.id === todoId);
      if (!target) return prev;
      updatedSteps = [...(target.steps || []), newStep];
      const updated = prev.map(t => (t.id === todoId ? { ...t, steps: updatedSteps } : t));
      saveCachedTodos(updated);
      return updated;
    });

    await updateTodoDoc(todoId, { steps: updatedSteps });
    playSynthesizedBeep();
  }, []);

  // Alternar conclusão de etapa
  const toggleStep = useCallback(async (todoId: string, stepId: string) => {
    let updatedSteps: TodoStep[] = [];
    setTodos((prev) => {
      const target = prev.find(t => t.id === todoId);
      if (!target || !target.steps) return prev;

      updatedSteps = target.steps.map(s =>
        s.id === stepId ? { ...s, completed: !s.completed } : s
      );
      const updated = prev.map(t => (t.id === todoId ? { ...t, steps: updatedSteps } : t));
      saveCachedTodos(updated);
      return updated;
    });

    await updateTodoDoc(todoId, { steps: updatedSteps });
    playSynthesizedBeep();
  }, []);

  // Excluir etapa
  const deleteStep = useCallback(async (todoId: string, stepId: string) => {
    let updatedSteps: TodoStep[] = [];
    setTodos((prev) => {
      const target = prev.find(t => t.id === todoId);
      if (!target || !target.steps) return prev;

      updatedSteps = target.steps.filter(s => s.id !== stepId);
      const updated = prev.map(t => (t.id === todoId ? { ...t, steps: updatedSteps } : t));
      saveCachedTodos(updated);
      return updated;
    });

    await updateTodoDoc(todoId, { steps: updatedSteps });
  }, []);

  return {
    todos,
    isLoading,
    addTodo,
    toggleComplete,
    toggleImportant,
    deleteTodo,
    updateTodo,
    addStep,
    toggleStep,
    deleteStep
  };
};
