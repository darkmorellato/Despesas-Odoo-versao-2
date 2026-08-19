export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  important: boolean;
  dueDate?: string | undefined;
  dueTime?: string | undefined;
  notes?: string | undefined;
  employeeName: string;
  userEmail: string;
  createdAt: string;
  completedAt?: string | undefined;
}

export type TodoFilter = 'today' | 'important' | 'planned' | 'all' | 'completed';
