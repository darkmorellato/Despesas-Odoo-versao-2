import type { TodoItem } from '../types';

/**
 * Leitura dos documentos de tarefa do Firestore, sem React. Documentos antigos
 * guardavam o texto em outros campos e a data de criação em formatos variados.
 */

/** Data de criação em ISO; `null` quando o documento não tem (NÃO vira "agora" a cada leitura) */
export const normalizeCreatedAt = (value: any): string | null => {
  if (value?.seconds) return new Date(value.seconds * 1000).toISOString();
  if (typeof value === 'string') return value;
  if (value?.toDate) return value.toDate().toISOString();
  return null;
};

/** Documento do Firestore → tarefa, com valores padrão para campos ausentes */
export const parseTodoDoc = (id: string, data: Record<string, any>): TodoItem => ({
  id,
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
  createdAt: normalizeCreatedAt(data.createdAt) as string,
  completedAt: data.completedAt || undefined
});

/** Mais recentes primeiro; sem data de criação vai para o fim */
export const sortByCreatedAtDesc = (list: TodoItem[]): TodoItem[] =>
  [...list].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

/** Remove ids repetidos (mantém o primeiro) e itens sem id */
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

/** Edições puras da lista (imutáveis) */
export const patchTodo = (list: TodoItem[], id: string, patch: Partial<TodoItem>): TodoItem[] =>
  list.map(t => (t.id === id ? { ...t, ...patch } : t));

export const removeTodo = (list: TodoItem[], id: string): TodoItem[] => list.filter(t => t.id !== id);
