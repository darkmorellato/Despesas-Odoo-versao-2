import { db } from '@/config/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import type { TodoItem } from '../types';

const STORAGE_KEY = 'miplace_todo_tasks_cache';

/**
 * Remove chaves undefined ou converte em deleteField() para compatibilidade estrita com Firestore
 */
const sanitizeForFirestore = (obj: Record<string, any>, isUpdate = false): Record<string, any> => {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      if (isUpdate) {
        clean[key] = deleteField();
      }
    } else if (Array.isArray(val)) {
      clean[key] = val.map((item) =>
        item !== null && typeof item === 'object' && !(item instanceof Date)
          ? sanitizeForFirestore(item, isUpdate)
          : item
      );
    } else if (val !== null && typeof val === 'object' && !(val instanceof Date) && typeof val.toMillis !== 'function') {
      clean[key] = sanitizeForFirestore(val, isUpdate);
    } else {
      clean[key] = val;
    }
  }
  return clean;
};

export const getCachedTodos = (): TodoItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Erro ao carregar tarefas do cache:', e);
  }
  return [];
};

export const saveCachedTodos = (todos: TodoItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.warn('Erro ao salvar tarefas no cache:', e);
  }
};

export const addTodoDoc = async (todo: Omit<TodoItem, 'id'>): Promise<string> => {
  try {
    const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
    const todoColl = collection(dataDoc, 'todo_tasks_v1');
    const titleVal = todo.title || (todo as any).description || (todo as any).text || (todo as any).name || 'Tarefa';
    const payload = sanitizeForFirestore({
      ...todo,
      title: titleVal,
      description: titleVal,
      createdAt: serverTimestamp()
    }, false);
    const docRef = await addDoc(todoColl, payload);
    return docRef.id;
  } catch (e) {
    console.warn('Erro ao adicionar tarefa no Firestore, usando salvamento local:', e);
    return `local_${Date.now()}`;
  }
};

export const updateTodoDoc = async (id: string, updates: Partial<TodoItem>): Promise<void> => {
  try {
    const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
    const todoColl = collection(dataDoc, 'todo_tasks_v1');
    const taskRef = doc(todoColl, id);
    const titleVal = updates.title ?? (updates as any).description ?? (updates as any).text ?? (updates as any).name;
    const payload = sanitizeForFirestore({
      ...updates,
      ...(titleVal !== undefined ? { title: titleVal, description: titleVal } : {}),
      updatedAt: serverTimestamp()
    }, true);
    await setDoc(taskRef, payload, { merge: true });
  } catch (e) {
    console.warn('Erro ao atualizar tarefa no Firestore:', e);
  }
};

export const deleteTodoDoc = async (id: string): Promise<void> => {
  try {
    const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
    const todoColl = collection(dataDoc, 'todo_tasks_v1');
    const taskRef = doc(todoColl, id);
    await deleteDoc(taskRef);
  } catch (e) {
    console.warn('Erro ao remover tarefa no Firestore:', e);
  }
};
