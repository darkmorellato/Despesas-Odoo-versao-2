import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth, onAuthStateChanged } from '@/config/firebase';
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

export const deduplicateTodos = (items: TodoItem[]): TodoItem[] => {
  const seenIds = new Set<string>();
  const clean: TodoItem[] = [];

  for (const item of items) {
    if (!item.id || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    clean.push(item);
  }
  return clean;
};

const NOTIFIED_KEY = 'miplace_todo_notified';

/** Carrega o Set de tarefas já notificadas (apenas as do dia salvo). */
const loadNotifiedForToday = (): { day: string; ids: Set<string> } => {
  const today = getTodayLocal();
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.day === today && Array.isArray(parsed.ids)) {
        return { day: today, ids: new Set(parsed.ids) };
      }
    }
  } catch {
    // cache inválido, começa do zero
  }
  return { day: today, ids: new Set<string>() };
};

const saveNotifiedForToday = (day: string, ids: Set<string>): void => {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify({ day, ids: Array.from(ids) }));
  } catch {
    // ignora falha de persistência
  }
};

export const useTodo = (employeeName: string, userEmail: string, enabled: boolean = true) => {
  const [todos, setTodos] = useState<TodoItem[]>(() => deduplicateTodos(getCachedTodos()));
  const [isLoading, setIsLoading] = useState(true);
  const [notifiedTasks, setNotifiedTasks] = useState<Set<string>>(() => loadNotifiedForToday().ids);

  // Ref sempre atualizado com a lista mais recente (evita closure obsoleta)
  const todosRef = useRef<TodoItem[]>(todos);
  todosRef.current = todos;

  // Guarda de idempotência para toggleComplete (duplo clique)
  const toggleInFlight = useRef<Set<string>>(new Set());

  // Aguarda o login anônimo do Firebase: as firestore.rules exigem
  // request.auth != null — se assinarmos o listener antes, o Firestore nega
  // ("Missing or insufficient permissions") e o listener morre, deixando o
  // app preso no cache local (os outros hooks já esperavam o `user`).
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    if (auth.currentUser) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthReady(!!u);
    });
    return () => unsub();
  }, [enabled]);

  // Escuta em tempo real no Firestore
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
            const data = docSnap.data();
            fetched.push({
              id: docSnap.id,
              title: data.title || data.description || data.text || data.name || data.nome || 'Tarefa sem título',
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
              // Docs sem createdAt viram null (NÃO new Date() a cada snapshot)
              createdAt: data.createdAt?.seconds
                ? new Date(data.createdAt.seconds * 1000).toISOString()
                : (typeof data.createdAt === 'string'
                  ? data.createdAt
                  : (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (null as any))),
              completedAt: data.completedAt || undefined
            });
          });

          // Ordenação por data de criação decrescente (ignora nulls)
          fetched.sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          });

          const cleanList = deduplicateTodos(fetched);
          setTodos(cleanList);
          todosRef.current = cleanList;
          saveCachedTodos(cleanList);
          setIsLoading(false);
        },
        (error) => {
          console.warn('Falha na escuta do Firestore para To-Do, usando cache local:', error);
          setTodos(deduplicateTodos(getCachedTodos()));
          setIsLoading(false);
        }
      );
    } catch (e) {
      console.warn('Erro ao conectar ao Firestore To-Do:', e);
      setTodos(deduplicateTodos(getCachedTodos()));
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [enabled, authReady]);

  // Permissão de notificação só pode ser pedida dentro de um GESTO do usuário
  // (regra dos navegadores — no carregamento o navegador bloqueia e ignora).
  // Pedimos no primeiro clique/toque da sessão; se já concedida, é no-op.
  useEffect(() => {
    if (!enabled) return;
    const requestOnGesture = () => {
      requestNotificationPermission().catch(() => {});
    };
    document.addEventListener('pointerdown', requestOnGesture, { once: true, passive: true });
    return () => document.removeEventListener('pointerdown', requestOnGesture);
  }, [enabled]);

  // Monitora horários de vencimento/lembrete e dispara Bip sonoro + Notificação nativa
  useEffect(() => {
    if (!enabled) return;

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
            setNotifiedTasks((prev) => {
              const next = new Set(prev).add(task.id);
              saveNotifiedForToday(todayStr, next);
              return next;
            });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 15000);
    checkReminders();
    return () => clearInterval(interval);
  }, [todos, notifiedTasks, enabled]);

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
      setTodos((prev) => {
        const updated = prev.map((t) =>
          t.id === id ? { ...t, completed: nextCompleted, completedAt } : t
        );
        todosRef.current = updated;
        saveCachedTodos(updated);
        return updated;
      });

      try {
        await updateTodoDoc(id, { completed: nextCompleted, completedAt });
      } catch (err) {
        // Rollback em caso de falha e propaga o erro
        setTodos((prev) => {
          const restored = prev.map((t) =>
            t.id === id ? { ...t, completed: target.completed, completedAt: target.completedAt } : t
          );
          todosRef.current = restored;
          saveCachedTodos(restored);
          return restored;
        });
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
        const ownerKey = (target.userEmail || target.assignedTo || '').trim().toLowerCase();
        const alreadyExists = todosRef.current.some((t) => {
          const tOwner = (t.userEmail || t.assignedTo || '').trim().toLowerCase();
          return (
            t.title.trim().toLowerCase() === target.title.trim().toLowerCase() &&
            t.dueDate === nextDueDate &&
            tOwner === ownerKey
          );
        });

        if (!alreadyExists) {
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
  }, [addTodo]);

  // Alternar Estrela de Importante
  const toggleImportant = useCallback(async (id: string) => {
    const target = todosRef.current.find((t) => t.id === id);
    if (!target) return;
    const nextImportant = !target.important;

    setTodos((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, important: nextImportant } : t
      );
      todosRef.current = updated;
      saveCachedTodos(updated);
      return updated;
    });

    try {
      await updateTodoDoc(id, { important: nextImportant });
      playSynthesizedBeep();
    } catch (err) {
      // Rollback
      setTodos((prev) => {
        const restored = prev.map((t) =>
          t.id === id ? { ...t, important: target.important } : t
        );
        todosRef.current = restored;
        saveCachedTodos(restored);
        return restored;
      });
      throw err;
    }
  }, []);

  // Remover tarefa
  const deleteTodo = useCallback(async (id: string) => {
    const target = todosRef.current.find((t) => t.id === id);

    setTodos((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      todosRef.current = updated;
      saveCachedTodos(updated);
      return updated;
    });

    try {
      await deleteTodoDoc(id);
    } catch (err) {
      // Rollback: recoloca o item removido
      if (target) {
        setTodos((prev) => {
          const restored = [target, ...prev];
          todosRef.current = restored;
          saveCachedTodos(restored);
          return restored;
        });
      }
      throw err;
    }
  }, []);

  // Editar tarefa (com rollback + rethrow para o componente mostrar toast)
  const updateTodo = useCallback(async (id: string, updates: Partial<TodoItem>) => {
    const target = todosRef.current.find((t) => t.id === id);
    if (!target) return;

    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      todosRef.current = updated;
      saveCachedTodos(updated);
      return updated;
    });

    try {
      await updateTodoDoc(id, updates);
    } catch (err) {
      // Rollback: reverte apenas os campos alterados
      setTodos((prev) => {
        const restored = prev.map((t) => (t.id === id ? { ...t, ...target } : t));
        todosRef.current = restored;
        saveCachedTodos(restored);
        return restored;
      });
      throw err;
    }
  }, []);

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
    const updatedSteps = [...(target.steps || []), newStep];

    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === todoId ? { ...t, steps: updatedSteps } : t));
      todosRef.current = updated;
      saveCachedTodos(updated);
      return updated;
    });

    try {
      await updateTodoDoc(todoId, { steps: updatedSteps });
      playSynthesizedBeep();
    } catch (err) {
      // Rollback
      setTodos((prev) => {
        const restored = prev.map((t) => (t.id === todoId ? { ...t, steps: target.steps } : t));
        todosRef.current = restored;
        saveCachedTodos(restored);
        return restored;
      });
      throw err;
    }
  }, []);

  // Alternar conclusão de etapa (cálculo puro FORA do updater)
  const toggleStep = useCallback(async (todoId: string, stepId: string) => {
    const target = todosRef.current.find((t) => t.id === todoId);
    if (!target || !target.steps) return; // aborta: todo não existe

    const updatedSteps = target.steps.map((s) =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );

    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === todoId ? { ...t, steps: updatedSteps } : t));
      todosRef.current = updated;
      saveCachedTodos(updated);
      return updated;
    });

    try {
      await updateTodoDoc(todoId, { steps: updatedSteps });
      playSynthesizedBeep();
    } catch (err) {
      setTodos((prev) => {
        const restored = prev.map((t) => (t.id === todoId ? { ...t, steps: target.steps } : t));
        todosRef.current = restored;
        saveCachedTodos(restored);
        return restored;
      });
      throw err;
    }
  }, []);

  // Excluir etapa (cálculo puro FORA do updater)
  const deleteStep = useCallback(async (todoId: string, stepId: string) => {
    const target = todosRef.current.find((t) => t.id === todoId);
    if (!target || !target.steps) return; // aborta: todo não existe

    const updatedSteps = target.steps.filter((s) => s.id !== stepId);

    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === todoId ? { ...t, steps: updatedSteps } : t));
      todosRef.current = updated;
      saveCachedTodos(updated);
      return updated;
    });

    try {
      await updateTodoDoc(todoId, { steps: updatedSteps });
    } catch (err) {
      setTodos((prev) => {
        const restored = prev.map((t) => (t.id === todoId ? { ...t, steps: target.steps } : t));
        todosRef.current = restored;
        saveCachedTodos(restored);
        return restored;
      });
      throw err;
    }
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