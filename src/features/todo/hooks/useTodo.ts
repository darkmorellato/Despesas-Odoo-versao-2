import { useState, useEffect, useCallback } from 'react';
import { db } from '@/config/firebase';
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
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
      const q = query(todoColl, orderBy('createdAt', 'desc'));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: TodoItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetched.push({
              id: docSnap.id,
              title: data.title,
              completed: !!data.completed,
              important: !!data.important,
              dueDate: data.dueDate,
              dueTime: data.dueTime,
              repeat: data.repeat || 'none',
              notes: data.notes,
              steps: data.steps || [],
              assignedTo: data.assignedTo,
              assignedToName: data.assignedToName,
              employeeName: data.employeeName || 'Funcionário',
              userEmail: data.userEmail || '',
              createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
              completedAt: data.completedAt
            });
          });

          setTodos(fetched);
          saveCachedTodos(fetched);
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
      dueDate,
      dueTime,
      repeat,
      notes,
      steps: steps || [],
      assignedTo: assignedTo?.trim() || undefined,
      assignedToName: assignedToName?.trim() || undefined,
      employeeName,
      userEmail,
      createdAt: new Date().toISOString()
    };

    const updated = [newTask, ...todos];
    setTodos(updated);
    saveCachedTodos(updated);

    playSynthesizedBeep();

    const realId = await addTodoDoc({
      title: title.trim(),
      completed: false,
      important,
      dueDate,
      dueTime,
      repeat,
      notes,
      steps: steps || [],
      assignedTo: assignedTo?.trim() || undefined,
      assignedToName: assignedToName?.trim() || undefined,
      employeeName,
      userEmail,
      createdAt: new Date().toISOString()
    });

    if (realId && realId !== tempId) {
      setTodos((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: realId } : t)));
    }
  }, [todos, employeeName, userEmail]);

  // Alternar Concluído (com suporte a tarefas recorrentes!)
  const toggleComplete = useCallback(async (id: string) => {
    const target = todos.find((t) => t.id === id);
    if (!target) return;

    const nextCompleted = !target.completed;
    const completedAt = nextCompleted ? new Date().toISOString() : undefined;

    if (nextCompleted) {
      playTodoAlertSound();
    } else {
      playSynthesizedBeep();
    }

    const updated = todos.map((t) =>
      t.id === id ? { ...t, completed: nextCompleted, completedAt } : t
    );

    setTodos(updated);
    saveCachedTodos(updated);

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
  }, [todos, addTodo]);

  // Alternar Estrela de Importante
  const toggleImportant = useCallback(async (id: string) => {
    const target = todos.find((t) => t.id === id);
    if (!target) return;

    const nextImportant = !target.important;
    const updated = todos.map((t) =>
      t.id === id ? { ...t, important: nextImportant } : t
    );

    setTodos(updated);
    saveCachedTodos(updated);

    playSynthesizedBeep();

    await updateTodoDoc(id, { important: nextImportant });
  }, [todos]);

  // Remover tarefa
  const deleteTodo = useCallback(async (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    setTodos(updated);
    saveCachedTodos(updated);

    await deleteTodoDoc(id);
  }, [todos]);

  // Editar tarefa
  const updateTodo = useCallback(async (id: string, updates: Partial<TodoItem>) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setTodos(updated);
    saveCachedTodos(updated);

    await updateTodoDoc(id, updates);
  }, [todos]);

  // Adicionar etapa/subtarefa
  const addStep = useCallback(async (todoId: string, stepTitle: string) => {
    const target = todos.find(t => t.id === todoId);
    if (!target || !stepTitle.trim()) return;

    const newStep: TodoStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: stepTitle.trim(),
      completed: false
    };

    const updatedSteps = [...(target.steps || []), newStep];
    await updateTodo(todoId, { steps: updatedSteps });
    playSynthesizedBeep();
  }, [todos, updateTodo]);

  // Alternar conclusão de etapa
  const toggleStep = useCallback(async (todoId: string, stepId: string) => {
    const target = todos.find(t => t.id === todoId);
    if (!target || !target.steps) return;

    const updatedSteps = target.steps.map(s =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );

    await updateTodo(todoId, { steps: updatedSteps });
    playSynthesizedBeep();
  }, [todos, updateTodo]);

  // Excluir etapa
  const deleteStep = useCallback(async (todoId: string, stepId: string) => {
    const target = todos.find(t => t.id === todoId);
    if (!target || !target.steps) return;

    const updatedSteps = target.steps.filter(s => s.id !== stepId);
    await updateTodo(todoId, { steps: updatedSteps });
  }, [todos, updateTodo]);

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
