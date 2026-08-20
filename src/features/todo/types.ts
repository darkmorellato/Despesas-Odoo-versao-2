export type TodoRepeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface TodoStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  important: boolean;
  dueDate?: string | undefined;
  dueTime?: string | undefined;
  repeat?: TodoRepeat | undefined;
  notes?: string | undefined;
  steps?: TodoStep[] | undefined;
  assignedTo?: string | undefined; // e-mail do Gmail / usuário
  assignedToName?: string | undefined; // Nome do responsável
  employeeName: string;
  userEmail: string;
  createdAt: string;
  completedAt?: string | undefined;
}

export type TodoFilter = 'today' | 'important' | 'planned' | 'assigned' | 'all' | 'completed';
