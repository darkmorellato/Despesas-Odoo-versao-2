import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logAuditEvent, getCachedAuditLogs } from './auditService';

vi.mock('@/config/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'test_doc_id' }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn()
}));

describe('auditService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve registrar evento de exclusão com sucesso', async () => {
    await logAuditEvent({
      actionType: 'DELETE',
      actionDate: new Date().toISOString(),
      userName: 'Dark Morellato',
      userEmail: 'darkmorelato@miplace.com',
      expenseId: 'exp_123',
      previousData: {
        description: 'Conta de Energia',
        store: 'Dom Pedro II',
        category: 'Despesa Fixa',
        amount: 350.50,
        date: '2026-08-19'
      }
    });

    const logs = getCachedAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].actionType).toBe('DELETE');
    expect(logs[0].userName).toBe('Dark Morellato');
    expect(logs[0].previousData.description).toBe('Conta de Energia');
  });

  it('deve registrar evento de edição com sucesso', async () => {
    await logAuditEvent({
      actionType: 'EDIT',
      actionDate: new Date().toISOString(),
      userName: 'Dark Morellato',
      userEmail: 'darkmorelato@miplace.com',
      expenseId: 'exp_456',
      previousData: {
        description: 'Internet Antiga',
        store: 'Realme',
        category: 'Despesa Fixa',
        amount: 120.00,
        date: '2026-08-19'
      },
      newData: {
        description: 'Internet Nova Fibra',
        store: 'Realme',
        category: 'Despesa Fixa',
        amount: 150.00,
        date: '2026-08-19'
      }
    });

    const logs = getCachedAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].actionType).toBe('EDIT');
    expect(logs[0].newData?.description).toBe('Internet Nova Fibra');
  });
});
