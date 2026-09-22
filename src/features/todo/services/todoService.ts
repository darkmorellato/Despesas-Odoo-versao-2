import { db } from '@/config/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, serverTimestamp, deleteField, getDoc } from 'firebase/firestore';
import type { TodoItem } from '../types';

const STORAGE_KEY = 'miplace_todo_tasks_cache';

/**
 * Remove chaves undefined ou converte em deleteField() para compatibilidade estrita com Firestore.
 * DENTRO de arrays, substitui undefined por null (Firestore rejeita undefined em arrays).
 */
const sanitizeForFirestore = (obj: Record<string, any>, isUpdate = false): Record<string, any> => {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      if (isUpdate) {
        clean[key] = deleteField();
      }
    } else if (val !== null && typeof val === 'object' && ('_methodName' in val || val.constructor?.name === 'FieldValue')) {
      clean[key] = val;
    } else if (Array.isArray(val)) {
      clean[key] = val.map((item) => {
        // Firestore não aceita undefined dentro de arrays -> substitui por null
        if (item === undefined) return null;
        if (item !== null && typeof item === 'object' && !(item instanceof Date)) {
          return sanitizeForFirestore(item, isUpdate);
        }
        return item;
      });
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
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
  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const todoColl = collection(dataDoc, 'todo_tasks_v1');
  // Compat: continua gravando title e description, mas a leitura usa `title` com fallback
  const titleVal = todo.title || (todo as any).description || (todo as any).text || (todo as any).name || 'Tarefa';
  const payload = sanitizeForFirestore({
    ...todo,
    title: titleVal,
    description: titleVal,
    createdAt: serverTimestamp()
  }, false);
  const docRef = await addDoc(todoColl, payload);
  return docRef.id;
};

export const updateTodoDoc = async (id: string, updates: Partial<TodoItem>): Promise<void> => {
  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const todoColl = collection(dataDoc, 'todo_tasks_v1');
  const taskRef = doc(todoColl, id);

  // Se o doc não existir, NÃO usar setDoc merge (criaria doc fantasma)
  const snap = await getDoc(taskRef);
  if (!snap.exists()) {
    throw new Error(`Tarefa "${id}" não existe no Firestore.`);
  }

  const titleVal = updates.title ?? (updates as any).description ?? (updates as any).text ?? (updates as any).name;
  const payload = sanitizeForFirestore({
    ...updates,
    ...(titleVal !== undefined ? { title: titleVal, description: titleVal } : {}),
    updatedAt: serverTimestamp()
  }, true);
  await setDoc(taskRef, payload, { merge: true });
};

export const deleteTodoDoc = async (id: string): Promise<void> => {
  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const todoColl = collection(dataDoc, 'todo_tasks_v1');
  const taskRef = doc(todoColl, id);
  await deleteDoc(taskRef);
};