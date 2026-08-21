import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCachedTodos, saveCachedTodos, addTodoDoc } from './todoService';

vi.mock('@/config/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'test_todo_id' }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(),
  deleteField: vi.fn()
}));

describe('todoService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve carregar tarefas vazias por padrão do cache', () => {
    const todos = getCachedTodos();
    expect(todos).toEqual([]);
  });

  it('deve salvar e carregar tarefas no cache local', () => {
    const mockTask = {
      id: 'task_1',
      title: 'Enviar relatório Odoo',
      completed: false,
      important: true,
      employeeName: 'Dark Morellato',
      userEmail: 'darkmorelato@miplace.com',
      createdAt: new Date().toISOString()
    };

    saveCachedTodos([mockTask]);
    const cached = getCachedTodos();
    expect(cached.length).toBe(1);
    expect(cached[0].title).toBe('Enviar relatório Odoo');
  });

  it('deve adicionar tarefa via service', async () => {
    const newId = await addTodoDoc({
      title: 'Comprar suprimentos',
      completed: false,
      important: false,
      employeeName: 'Abner Morais',
      userEmail: 'miplaceabner@miplace.com',
      createdAt: new Date().toISOString()
    });

    expect(newId).toBe('test_todo_id');
  });
});
