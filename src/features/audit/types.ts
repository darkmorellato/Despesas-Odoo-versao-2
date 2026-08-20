export type AuditActionType = 'EDIT' | 'DELETE' | 'RESTORE';

export interface AuditExpenseData {
  id?: string | undefined;
  description: string;
  store: string;
  category: string;
  amount: number;
  date: string;
  notes?: string | undefined;
  employeeName?: string | undefined;
  receiptUrl?: string | null | undefined;
}

export interface AuditLogItem {
  id: string;
  actionType: AuditActionType;
  actionDate: string; // ISO date
  userName: string;
  userEmail: string;
  expenseId: string;
  reason?: string | undefined;
  previousData: AuditExpenseData;
  newData?: AuditExpenseData | undefined;
  createdAt?: any;
}
