import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useExpenseEditor } from './useExpenseEditor';
import { validateAdminPassword } from './useExpenses';
import { logAuditEvent } from '@/features/audit/services/auditService';
import type { Expense } from '@/shared/types';

vi.mock('firebase/firestore', () => ({}));
vi.mock('@/config/firebase', () => ({ getFirebaseRefs: vi.fn() }));
vi.mock('@/features/auth', () => ({ validateAnyAdminPassword: vi.fn() }));
vi.mock('@/features/audit/services/auditService', () => ({ logAuditEvent: vi.fn().mockResolvedValue(undefined) }));
// splitExpense/detectExpenseGroup reais; só a senha de admin é simulada
vi.mock('./useExpenses', async (orig) => ({
  ...(await orig<typeof import('./useExpenses')>()),
  validateAdminPassword: vi.fn(),
}));

const user = { id: 'u1', name: 'Dark Morellato', email: 'dark@miplace.com', role: 'Administrador' };
const submitEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

const exp = (id: string, store: string, over: Partial<Expense> = {}): Expense => ({
  id, date: '2026-08-20', description: 'Internet', category: 'Despesa', store,
  amount: 100, quantity: 1, employeeName: 'Dark', ...over,
});

const setup = (over: Partial<Parameters<typeof useExpenseEditor>[0]> = {}, expenses: Expense[] = []) => {
  const actions = {
    addExpense: vi.fn().mockResolvedValue(undefined),
    addExpenseGroup: vi.fn().mockResolvedValue('g'),
    saveExpenseGroup: vi.fn().mockResolvedValue(undefined),
    updateExpense: vi.fn().mockResolvedValue(undefined),
    deleteExpense: vi.fn().mockResolvedValue(undefined),
    canDelete: vi.fn().mockReturnValue({ allowed: true }),
  };
  const params = {
    sessionUser: user,
    settingsEmployeeName: 'Dark Morellato',
    expenses,
    actions,
    showToast: vi.fn(),
    revealSavedExpense: vi.fn(),
    onNeedEmployeeName: vi.fn(),
    onEditLoaded: vi.fn(),
    ...over,
  };
  const hook = renderHook(() => useExpenseEditor(params));
  return { ...hook, params, actions };
};

/** Preenche o formulário como o usuário faria */
const fill = (r: ReturnType<typeof setup>, f: { store?: string; amount?: string; description?: string; category?: string } = {}) => {
  act(() => {
    r.result.current.setDate('2026-08-20');
    r.result.current.setDescription(f.description ?? 'Internet Fibra');
    r.result.current.setCategory(f.category ?? 'Despesa');
    r.result.current.setStore(f.store ?? 'Realme');
    r.result.current.setAmount(f.amount ?? '100,00');
  });
};

beforeEach(() => { vi.clearAllMocks(); });

describe('useExpenseEditor — salvar', () => {
  it('bloqueia quando o nome do funcionário não foi configurado', async () => {
    const r = setup({ sessionUser: null, settingsEmployeeName: 'Seu Nome' });
    fill(r);
    await act(async () => { await r.result.current.handleSubmit(submitEvent); });

    expect(r.params.showToast).toHaveBeenCalledWith('Configure seu nome antes de lançar.', 'error');
    expect(r.params.onNeedEmployeeName).toHaveBeenCalled();
    expect(r.actions.addExpense).not.toHaveBeenCalled();
  });

  it.each(['', '0', 'abc', '-5'])('rejeita valor inválido "%s"', async (value) => {
    const r = setup();
    fill(r, { amount: value });
    await act(async () => { await r.result.current.handleSubmit(submitEvent); });

    expect(r.params.showToast).toHaveBeenCalledWith('Valor inválido', 'error');
    expect(r.actions.addExpense).not.toHaveBeenCalled();
  });

  it('interpreta valor no formato brasileiro (1.234,56)', async () => {
    const r = setup();
    fill(r, { amount: '1.234,56' });
    await act(async () => { await r.result.current.handleSubmit(submitEvent); });
    expect(r.actions.addExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 1234.56 }));
  });

  it('despesa individual: salva, avisa, revela a data e limpa o formulário', async () => {
    const r = setup();
    fill(r);
    await act(async () => { await r.result.current.handleSubmit(submitEvent); });

    expect(r.actions.addExpense).toHaveBeenCalledWith(expect.objectContaining({
      store: 'Realme', amount: 100, employeeName: 'Dark Morellato', originalTotal: null,
    }));
    expect(r.params.showToast).toHaveBeenCalledWith('Despesa salva!', undefined);
    expect(r.params.revealSavedExpense).toHaveBeenCalledWith('2026-08-20');
    expect(r.result.current.description).toBe('');
    expect(r.result.current.amount).toBe('');
    expect(r.result.current.isSubmitting).toBe(false);
  });

  it('"Todas" cria 4 parcelas de uma vez (sem Kassouf)', async () => {
    const r = setup();
    fill(r, { store: 'Todas', amount: '400,00' });
    await act(async () => { await r.result.current.handleSubmit(submitEvent); });

    const entries = r.actions.addExpenseGroup.mock.calls[0][0] as Expense[];
    expect(entries.map(e => e.store)).toEqual(['Dom Pedro II', 'Realme', 'Xv de Novembro', 'Premium']);
    expect(r.params.showToast).toHaveBeenCalledWith('4 despesas geradas!', undefined);
  });

  it('erro ao gravar: avisa, NÃO limpa o formulário e libera o botão', async () => {
    const r = setup();
    r.actions.addExpense.mockRejectedValueOnce(new Error('offline'));
    fill(r);
    await act(async () => { await r.result.current.handleSubmit(submitEvent); });

    expect(r.params.showToast).toHaveBeenCalledWith('Erro ao salvar', 'error');
    expect(r.result.current.description).toBe('Internet Fibra'); // dados preservados
    expect(r.result.current.isSubmitting).toBe(false);
    expect(r.params.revealSavedExpense).not.toHaveBeenCalled();
  });
});

describe('useExpenseEditor — editar', () => {
  const group = [
    exp('a', 'Dom Pedro II', { groupId: 'g1', originalTotal: 300 }),
    exp('b', 'Realme', { groupId: 'g1', originalTotal: 300 }),
    exp('c', 'Xv de Novembro', { groupId: 'g1', originalTotal: 300 }),
  ];

  it('senha incorreta não libera a edição', async () => {
    vi.mocked(validateAdminPassword).mockResolvedValue(false);
    const r = setup({}, group);
    act(() => r.result.current.handleEditClick(group[0]));
    act(() => r.result.current.setEditPasswordInput('errada'));
    await act(async () => { await r.result.current.confirmEditPassword(); });

    expect(r.params.showToast).toHaveBeenCalledWith('Senha incorreta.', 'error');
    expect(r.result.current.editingId).toBeNull();
    expect(r.params.onEditLoaded).not.toHaveBeenCalled();
  });

  it('senha correta em item de grupo: carrega o GRUPO com o valor TOTAL', async () => {
    vi.mocked(validateAdminPassword).mockResolvedValue(true);
    const r = setup({}, group);
    act(() => r.result.current.handleEditClick(group[1]));
    await act(async () => { await r.result.current.confirmEditPassword(); });

    expect(r.result.current.editingId).toBe('b');
    expect(r.result.current.store).toBe('Piracicaba (DP - Realme - XV)');
    expect(r.result.current.amount).toBe('300,00');
    expect(r.result.current.editPasswordModal.open).toBe(false);
    expect(r.params.onEditLoaded).toHaveBeenCalled();
  });

  it('salvar a edição do grupo faz UM saveExpenseGroup e audita', async () => {
    vi.mocked(validateAdminPassword).mockResolvedValue(true);
    const r = setup({}, group);
    act(() => r.result.current.handleEditClick(group[0]));
    await act(async () => { await r.result.current.confirmEditPassword(); });
    act(() => r.result.current.setAmount('600,00'));
    await act(async () => { await r.result.current.handleSubmit(submitEvent); });

    expect(r.actions.saveExpenseGroup).toHaveBeenCalledTimes(1);
    const plan = r.actions.saveExpenseGroup.mock.calls[0][0];
    expect(plan.updates.map((u: { data: Expense }) => u.data.amount)).toEqual([200, 200, 200]);
    expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'EDIT', expenseId: 'a' }));
    expect(r.result.current.editingId).toBeNull(); // formulário resetado
  });

  it('despesa individual abre como individual com o valor da própria despesa', async () => {
    vi.mocked(validateAdminPassword).mockResolvedValue(true);
    const solo = exp('x', 'Premium', { amount: 80 });
    const r = setup({}, [solo]);
    act(() => r.result.current.handleEditClick(solo));
    await act(async () => { await r.result.current.confirmEditPassword(); });
    expect(r.result.current.store).toBe('Premium');
    expect(r.result.current.amount).toBe('80,00');
  });

  it('cancelar descarta motivo e senha', () => {
    const r = setup({}, group);
    act(() => r.result.current.handleEditClick(group[0]));
    act(() => { r.result.current.setEditReason('motivo'); r.result.current.setEditPasswordInput('123'); });
    act(() => r.result.current.cancelEditPassword());
    expect(r.result.current.editPasswordModal.open).toBe(false);
    expect(r.result.current.editPasswordInput).toBe('');
    expect(r.result.current.editReason).toBe('');
  });
});

describe('useExpenseEditor — excluir', () => {
  const target = exp('x', 'Realme');

  it('exige o motivo antes de pedir a senha', () => {
    const r = setup();
    act(() => r.result.current.handleDeleteClick(target));
    act(() => r.result.current.proceedToDeletePassword());

    expect(r.params.showToast).toHaveBeenCalledWith('Informe o motivo da exclusão antes de continuar.', 'error');
    expect(r.result.current.deleteModal.step).toBe('confirm');
  });

  it('com motivo avança para o passo da senha', () => {
    const r = setup();
    act(() => r.result.current.handleDeleteClick(target));
    act(() => r.result.current.setDeleteReason('Lançado errado'));
    act(() => r.result.current.proceedToDeletePassword());
    expect(r.result.current.deleteModal.step).toBe('password');
  });

  it('senha incorreta não exclui', async () => {
    vi.mocked(validateAdminPassword).mockResolvedValue(false);
    const r = setup();
    act(() => r.result.current.handleDeleteClick(target));
    await act(async () => { await r.result.current.confirmDeletePassword(); });

    expect(r.actions.deleteExpense).not.toHaveBeenCalled();
    expect(r.params.showToast).toHaveBeenCalledWith('Senha incorreta.', 'error');
  });

  it('regra das 24h: exclusão não permitida mostra o motivo e não exclui', async () => {
    vi.mocked(validateAdminPassword).mockResolvedValue(true);
    const r = setup();
    r.actions.canDelete.mockReturnValue({ allowed: false, reason: 'Exclusão não permitida após 1 dia do lançamento.' });
    act(() => r.result.current.handleDeleteClick(target));
    await act(async () => { await r.result.current.confirmDeletePassword(); });

    expect(r.actions.deleteExpense).not.toHaveBeenCalled();
    expect(r.params.showToast).toHaveBeenCalledWith('Exclusão não permitida após 1 dia do lançamento.', 'error');
  });

  it('exclui, grava auditoria DELETE com motivo e fecha o modal', async () => {
    vi.mocked(validateAdminPassword).mockResolvedValue(true);
    const r = setup();
    act(() => r.result.current.handleDeleteClick(target));
    act(() => r.result.current.setDeleteReason('Duplicado'));
    await act(async () => { await r.result.current.confirmDeletePassword(); });

    expect(r.actions.deleteExpense).toHaveBeenCalledWith('x', 'Duplicado', 'Dark Morellato');
    expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'DELETE', expenseId: 'x', reason: 'Duplicado',
      previousData: expect.objectContaining({ store: 'Realme', amount: 100 }),
    }));
    expect(r.result.current.deleteModal.open).toBe(false);
    expect(r.params.showToast).toHaveBeenCalledWith('Lançamento excluído e registrado na auditoria!', 'success');
  });

  it('falha ao excluir: avisa e mantém o modal aberto para nova tentativa', async () => {
    vi.mocked(validateAdminPassword).mockResolvedValue(true);
    const r = setup();
    r.actions.deleteExpense.mockRejectedValueOnce(new Error('rede'));
    act(() => r.result.current.handleDeleteClick(target));
    act(() => r.result.current.setDeleteReason('x'));
    await act(async () => { await r.result.current.confirmDeletePassword(); });

    expect(r.params.showToast).toHaveBeenCalledWith('Erro ao excluir lançamento. Tente novamente.', 'error');
    expect(r.result.current.deleteModal.open).toBe(true);
    expect(logAuditEvent).not.toHaveBeenCalled();
  });
});
