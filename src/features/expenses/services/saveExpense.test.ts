import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveExpense, SaveExpenseError } from './saveExpense';
import type { SaveExpenseDeps, SaveExpenseForm, SaveExpenseActor } from './saveExpense';
import type { Expense } from '@/shared/types';

// useExpenses.ts importa Firebase; aqui só interessam splitExpense/isGroupStore
vi.mock('firebase/firestore', () => ({}));
vi.mock('@/config/firebase', () => ({ getFirebaseRefs: vi.fn() }));
vi.mock('@/features/auth', () => ({ validateAnyAdminPassword: vi.fn() }));

const actor: SaveExpenseActor = { employeeName: 'Dark', userName: 'Dark Morellato', userEmail: 'dark@miplace.com' };

const makeDeps = (): SaveExpenseDeps => ({
  addExpense: vi.fn().mockResolvedValue(undefined),
  addExpenseGroup: vi.fn().mockResolvedValue('group-1'),
  saveExpenseGroup: vi.fn().mockResolvedValue(undefined),
  updateExpense: vi.fn().mockResolvedValue(undefined),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
});

const form = (over: Partial<SaveExpenseForm> = {}): SaveExpenseForm => ({
  date: '2026-08-20',
  description: 'Internet Fibra',
  store: 'Realme',
  category: 'Despesa',
  notes: '',
  receiptUrl: undefined,
  editReason: '',
  totalVal: 100,
  ...over,
});

const exp = (id: string, store: string, over: Partial<Expense> = {}): Expense => ({
  id,
  date: '2026-08-20',
  description: 'Internet Fibra',
  category: 'Despesa',
  store,
  amount: 100,
  quantity: 1,
  employeeName: 'Antigo',
  ...over,
});

describe('saveExpense — lançamento novo', () => {
  let deps: SaveExpenseDeps;
  beforeEach(() => { deps = makeDeps(); });

  it('loja individual: addExpense com originalTotal null, sem rateio', async () => {
    const out = await saveExpense({
      editingId: null, previous: null, existingSiblings: [], form: form(), actor, deps,
    });

    expect(out).toMatchObject({ kind: 'created', count: 1, message: 'Despesa salva!' });
    expect(deps.addExpense).toHaveBeenCalledTimes(1);
    expect(deps.addExpense).toHaveBeenCalledWith(expect.objectContaining({
      store: 'Realme', amount: 100, originalTotal: null, quantity: 1, employeeName: 'Dark',
    }));
    expect(deps.addExpenseGroup).not.toHaveBeenCalled();
    expect(deps.logAuditEvent).not.toHaveBeenCalled(); // criação não gera auditoria
  });

  it('"Todas": 4 parcelas (sem Kassouf) numa única chamada atômica', async () => {
    const out = await saveExpense({
      editingId: null, previous: null, existingSiblings: [],
      form: form({ store: 'Todas', totalVal: 400 }), actor, deps,
    });

    expect(out).toMatchObject({ kind: 'created', count: 4, message: '4 despesas geradas!' });
    expect(deps.addExpense).not.toHaveBeenCalled();
    const entries = vi.mocked(deps.addExpenseGroup).mock.calls[0][0];
    expect(entries.map(e => e.store)).toEqual(['Dom Pedro II', 'Realme', 'Xv de Novembro', 'Premium']);
    expect(entries.every(e => e.amount === 100 && e.originalTotal === 400)).toBe(true);
  });

  it('rateio com resto: a soma das parcelas fecha exatamente com o total', async () => {
    await saveExpense({
      editingId: null, previous: null, existingSiblings: [],
      form: form({ store: 'Piracicaba (DP - Realme - XV)', totalVal: 100 }), actor, deps,
    });
    const entries = vi.mocked(deps.addExpenseGroup).mock.calls[0][0];
    const cents = entries.reduce((s, e) => s + Math.round(e.amount * 100), 0);
    expect(cents).toBe(10000);
    expect(entries.map(e => e.amount)).toEqual([33.34, 33.33, 33.33]);
  });

  it('Amparo: Premium + Kassouf', async () => {
    await saveExpense({
      editingId: null, previous: null, existingSiblings: [],
      form: form({ store: 'Amparo (Premium - Kassouf)', totalVal: 200 }), actor, deps,
    });
    const entries = vi.mocked(deps.addExpenseGroup).mock.calls[0][0];
    expect(entries.map(e => e.store)).toEqual(['Premium', 'Kassouf']);
  });

  it('falha no gravação: lança SaveExpenseError com opsCompleted = 0', async () => {
    vi.mocked(deps.addExpenseGroup).mockRejectedValueOnce(new Error('offline'));
    const err = await saveExpense({
      editingId: null, previous: null, existingSiblings: [],
      form: form({ store: 'Todas', totalVal: 400 }), actor, deps,
    }).catch(e => e);

    expect(err).toBeInstanceOf(SaveExpenseError);
    expect(err.opsCompleted).toBe(0); // atômico: nada foi gravado
  });
});

describe('saveExpense — edição de grupo', () => {
  let deps: SaveExpenseDeps;
  beforeEach(() => { deps = makeDeps(); });

  const piraSiblings = [
    exp('a', 'Dom Pedro II', { groupId: 'g1', originalTotal: 300 }),
    exp('b', 'Realme', { groupId: 'g1', originalTotal: 300 }),
    exp('c', 'Xv de Novembro', { groupId: 'g1', originalTotal: 300 }),
  ];

  it('mesmo grupo, novo valor: só updates, reaproveita o groupId, uma única operação', async () => {
    const out = await saveExpense({
      editingId: 'b', previous: piraSiblings[1], existingSiblings: piraSiblings,
      form: form({ store: 'Piracicaba (DP - Realme - XV)', totalVal: 600, editReason: 'Valor errado' }),
      actor, deps,
    });

    expect(out.kind).toBe('group-updated');
    expect(deps.saveExpenseGroup).toHaveBeenCalledTimes(1);
    const plan = vi.mocked(deps.saveExpenseGroup).mock.calls[0][0];
    expect(plan.groupId).toBe('g1');
    expect(plan.adds).toEqual([]);
    expect(plan.removes).toEqual([]);
    expect(plan.updates.map(u => [u.id, u.data.amount])).toEqual([['a', 200], ['b', 200], ['c', 200]]);
    expect(plan.updates[0].data).toMatchObject({ originalTotal: 600, editReason: 'Valor errado' });
    expect(deps.updateExpense).not.toHaveBeenCalled();
  });

  it('Piracicaba → Todas: adiciona Premium; nada é removido', async () => {
    await saveExpense({
      editingId: 'a', previous: piraSiblings[0], existingSiblings: piraSiblings,
      form: form({ store: 'Todas', totalVal: 400 }), actor, deps,
    });
    const plan = vi.mocked(deps.saveExpenseGroup).mock.calls[0][0];
    expect(plan.updates).toHaveLength(3);
    expect(plan.adds.map(a => a.store)).toEqual(['Premium']);
    expect(plan.adds[0]).toMatchObject({ amount: 100, originalTotal: 400, quantity: 1 });
    expect(plan.removes).toEqual([]);
  });

  it('Todas → Piracicaba: Premium é removida (soft delete) com o motivo', async () => {
    const todas = [...piraSiblings, exp('d', 'Premium', { groupId: 'g1', originalTotal: 400 })];
    await saveExpense({
      editingId: 'a', previous: todas[0], existingSiblings: todas,
      form: form({ store: 'Piracicaba (DP - Realme - XV)', totalVal: 300, editReason: 'Premium não participa' }),
      actor, deps,
    });
    const plan = vi.mocked(deps.saveExpenseGroup).mock.calls[0][0];
    expect(plan.removes).toEqual([{ id: 'd', reason: 'Premium não participa', deletedBy: 'Dark' }]);
  });

  it('lançamento antigo sem groupId: plano deixa groupId indefinido (será gerado)', async () => {
    const legacy = piraSiblings.map(({ groupId: _g, ...rest }) => rest as Expense);
    await saveExpense({
      editingId: 'a', previous: legacy[0], existingSiblings: legacy,
      form: form({ store: 'Piracicaba (DP - Realme - XV)', totalVal: 300 }), actor, deps,
    });
    expect(vi.mocked(deps.saveExpenseGroup).mock.calls[0][0].groupId).toBeUndefined();
  });

  it('grava auditoria EDIT com antes/depois e o motivo', async () => {
    await saveExpense({
      editingId: 'a', previous: piraSiblings[0], existingSiblings: piraSiblings,
      form: form({ store: 'Piracicaba (DP - Realme - XV)', totalVal: 600, editReason: 'Ajuste' }),
      actor, deps,
    });
    expect(deps.logAuditEvent).toHaveBeenCalledTimes(1);
    expect(deps.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'EDIT',
      userName: 'Dark Morellato',
      userEmail: 'dark@miplace.com',
      expenseId: 'a',
      reason: 'Ajuste',
      previousData: expect.objectContaining({ store: 'Dom Pedro II', amount: 100 }),
      newData: expect.objectContaining({ store: 'Piracicaba (DP - Realme - XV)', amount: 600 }),
    }));
  });

  it('falha no batch: nada gravado (opsCompleted 0) e sem auditoria', async () => {
    vi.mocked(deps.saveExpenseGroup).mockRejectedValueOnce(new Error('permission-denied'));
    const err = await saveExpense({
      editingId: 'a', previous: piraSiblings[0], existingSiblings: piraSiblings,
      form: form({ store: 'Piracicaba (DP - Realme - XV)', totalVal: 600 }), actor, deps,
    }).catch(e => e);
    expect(err).toBeInstanceOf(SaveExpenseError);
    expect(err.opsCompleted).toBe(0);
    expect(deps.logAuditEvent).not.toHaveBeenCalled();
  });

  it('se só a auditoria falha, informa que as operações JÁ foram gravadas', async () => {
    vi.mocked(deps.logAuditEvent).mockRejectedValueOnce(new Error('audit down'));
    const err = await saveExpense({
      editingId: 'a', previous: piraSiblings[0], existingSiblings: piraSiblings,
      form: form({ store: 'Piracicaba (DP - Realme - XV)', totalVal: 600 }), actor, deps,
    }).catch(e => e);
    expect(err.opsCompleted).toBe(3);
  });
});

describe('saveExpense — edição individual', () => {
  let deps: SaveExpenseDeps;
  beforeEach(() => { deps = makeDeps(); });

  it('despesa individual: updateExpense simples, originalTotal zerado', async () => {
    const e = exp('x', 'Realme');
    const out = await saveExpense({
      editingId: 'x', previous: e, existingSiblings: [e],
      form: form({ totalVal: 250, editReason: 'Corrigido' }), actor, deps,
    });

    expect(out).toMatchObject({ kind: 'updated', message: 'Lançamento atualizado e registrado na auditoria!' });
    expect(deps.updateExpense).toHaveBeenCalledWith('x', expect.objectContaining({
      amount: 250, store: 'Realme', originalTotal: null, editReason: 'Corrigido',
    }));
    expect(deps.saveExpenseGroup).not.toHaveBeenCalled();
    expect(deps.logAuditEvent).toHaveBeenCalledTimes(1);
  });

  it('grupo → loja individual: mantém a parcela editada, desagrupa e remove as irmãs atomicamente', async () => {
    const sibs = [
      exp('a', 'Dom Pedro II', { groupId: 'g1', originalTotal: 300 }),
      exp('b', 'Realme', { groupId: 'g1', originalTotal: 300 }),
      exp('c', 'Xv de Novembro', { groupId: 'g1', originalTotal: 300 }),
    ];
    await saveExpense({
      editingId: 'b', previous: sibs[1], existingSiblings: sibs,
      form: form({ store: 'Realme', totalVal: 300 }), actor, deps,
    });

    expect(deps.updateExpense).not.toHaveBeenCalled();
    const plan = vi.mocked(deps.saveExpenseGroup).mock.calls[0][0];
    expect(plan.groupId).toBeNull();
    expect(plan.updates).toEqual([{ id: 'b', data: expect.objectContaining({ amount: 300, originalTotal: null }) }]);
    expect(plan.removes.map(r => r.id)).toEqual(['a', 'c']);
  });

  it('sem despesa anterior (previous null) não grava auditoria', async () => {
    const e = exp('x', 'Realme');
    await saveExpense({
      editingId: 'x', previous: null, existingSiblings: [e], form: form(), actor, deps,
    });
    expect(deps.logAuditEvent).not.toHaveBeenCalled();
  });
});
