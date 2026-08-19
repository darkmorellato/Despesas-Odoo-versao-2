import { db } from '@/config/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { TodoItem } from '../types';

const STORAGE_KEY = 'miplace_todo_tasks_cache';

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
    const docRef = await addDoc(todoColl, {
      ...todo,
      createdAt: serverTimestamp()
    });
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
    await setDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });
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
