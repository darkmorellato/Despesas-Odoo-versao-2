import { splitExpense, isGroupStore } from '../hooks/useExpenses';
import type { ExpenseGroupPlan } from '../hooks/useExpenses';
import type { Expense, StoreName } from '@/shared/types';
import type { AuditLogItem } from '@/features/audit';

type AuditLogInput = Omit<AuditLogItem, 'id' | 'createdAt'>;

/**
 * Regra de negócio de "salvar lançamento" (novo, rateio, edição de grupo e
 * edição individual), isolada da UI para ser testada sem React.
 */

export interface SaveExpenseForm {
  date: string;
  description: string;
  /** Loja individual OU nome de grupo (Todas, Piracicaba, Amparo) */
  store: string;
  category: string;
  notes: string;
  receiptUrl: string | undefined;
  editReason: string;
  /** Valor digitado (total do rateio quando a loja é um grupo) */
  totalVal: number;
}

export interface SaveExpenseActor {
  /** Nome gravado como autor da despesa */
  employeeName: string;
  /** Nome/e-mail gravados na auditoria */
  userName: string;
  userEmail: string;
}

export interface SaveExpenseDeps {
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  addExpenseGroup: (entries: Array<Omit<Expense, 'id'>>) => Promise<string>;
  saveExpenseGroup: (plan: ExpenseGroupPlan) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  logAuditEvent: (event: AuditLogInput) => Promise<unknown>;
}

export interface SaveExpenseInput {
  /** null = lançamento novo */
  editingId: string | null;
  /** Despesa como era antes da edição (para a auditoria) */
  previous: Expense | null;
  /** Parcelas existentes do grupo em edição (ou a própria despesa) */
  existingSiblings: Expense[];
  form: SaveExpenseForm;
  actor: SaveExpenseActor;
  deps: SaveExpenseDeps;
}

export type SaveExpenseOutcome =
  | { kind: 'created'; count: number; message: string }
  | { kind: 'group-updated'; count: number; message: string }
  | { kind: 'updated'; count: number; message: string };

/** Erro de salvamento que informa quantas operações já tinham sido concluídas */
export class SaveExpenseError extends Error {
  readonly opsCompleted: number;
  readonly cause: unknown;
  constructor(cause: unknown, opsCompleted: number) {
    super(cause instanceof Error ? cause.message : 'Erro ao salvar despesa');
    this.name = 'SaveExpenseError';
    this.cause = cause;
    this.opsCompleted = opsCompleted;
  }
}

const auditSnapshot = (e: Expense) => ({
  description: e.description,
  store: e.store,
  category: e.category,
  amount: e.amount,
  date: e.date,
  notes: e.notes,
  employeeName: e.employeeName,
  receiptUrl: e.receiptUrl,
});

export const saveExpense = async (input: SaveExpenseInput): Promise<SaveExpenseOutcome> => {
  const { editingId, previous, existingSiblings, form, actor, deps } = input;
  const { date, description, store, category, notes, receiptUrl, editReason, totalVal } = form;
  let opsCompleted = 0;

  const newData = () => ({
    description,
    store,
    category,
    amount: totalVal,
    date,
    notes,
    employeeName: actor.employeeName,
    receiptUrl: receiptUrl || undefined,
  });

  const audit = async (reason: string) => {
    if (!previous || !editingId) return;
    await deps.logAuditEvent({
      actionType: 'EDIT',
      actionDate: new Date().toISOString(),
      userName: actor.userName,
      userEmail: actor.userEmail,
      expenseId: editingId,
      reason,
      previousData: auditSnapshot(previous),
      newData: newData(),
    });
  };

  try {
    // ---------------------------------------------------------------- EDIÇÃO
    if (editingId) {
      if (isGroupStore(store)) {
        const entries = splitExpense(store as StoreName, totalVal);
        const targetStores = entries.map(e => e.s as string);

        // Uma única operação atômica (writeBatch): ou o grupo inteiro é
        // atualizado, ou nada muda — sem estado parcial.
        const common = {
          date,
          description,
          category,
          notes,
          employeeName: actor.employeeName,
          originalTotal: totalVal,
          receiptUrl: receiptUrl || undefined,
        };
        const plan: ExpenseGroupPlan = {
          // Mantém o groupId existente; lançamento antigo (sem groupId) ganha um novo
          groupId: existingSiblings.find(s => s.groupId)?.groupId ?? undefined,
          updates: [],
          adds: [],
          removes: [],
        };
        for (const ent of entries) {
          const sibling = existingSiblings.find(s => s.store === ent.s);
          if (sibling) {
            plan.updates.push({
              id: sibling.id,
              data: { ...common, store: ent.s, amount: ent.v, editReason: editReason || undefined },
            });
          } else {
            // Nova loja para o grupo (ex: mudou de 3 para 4 lojas)
            plan.adds.push({ ...common, store: ent.s, amount: ent.v, quantity: 1.0 });
          }
        }
        // Lojas que deixaram de fazer parte do grupo
        for (const rem of existingSiblings.filter(s => !targetStores.includes(s.store))) {
          plan.removes.push({
            id: rem.id,
            reason: editReason || 'Ajuste de lojas na edição do grupo',
            deletedBy: actor.employeeName,
          });
        }

        await deps.saveExpenseGroup(plan);
        opsCompleted += plan.updates.length + plan.adds.length + plan.removes.length;

        await audit(editReason || `Edição consolidada do grupo ${store}`);
        return {
          kind: 'group-updated',
          count: entries.length,
          message: `Lançamento e valores corrigidos para todas as ${entries.length} lojas do grupo ${store}!`,
        };
      }

      // Lançamento individual para uma única loja
      const individualData: Partial<Expense> = {
        date,
        description,
        store,
        category,
        amount: totalVal,
        notes,
        employeeName: actor.employeeName,
        originalTotal: null,
        receiptUrl: receiptUrl || undefined,
        editReason: editReason || undefined,
      };

      // Se fazia parte de um grupo e virou loja individual, remove os outros
      // irmãos NA MESMA operação atômica
      const otherSiblings = existingSiblings.filter(s => s.id !== editingId);
      if (otherSiblings.length > 0) {
        await deps.saveExpenseGroup({
          groupId: null, // desagrupa
          updates: [{ id: editingId, data: individualData }],
          adds: [],
          removes: otherSiblings.map(sib => ({
            id: sib.id,
            reason: editReason || 'Desagrupamento na edição para loja individual',
            deletedBy: actor.employeeName,
          })),
        });
        opsCompleted += 1 + otherSiblings.length;
      } else {
        await deps.updateExpense(editingId, individualData);
        opsCompleted++;
      }

      await audit(editReason || 'Edição de lançamento');
      return { kind: 'updated', count: 1, message: 'Lançamento atualizado e registrado na auditoria!' };
    }

    // ------------------------------------------------------------------ NOVO
    const entries = splitExpense(store as StoreName, totalVal);
    const newDocs = entries.map(ent => ({
      date,
      description,
      category,
      notes,
      store: ent.s,
      amount: ent.v,
      quantity: 1.0,
      employeeName: actor.employeeName,
      originalTotal: entries.length > 1 ? totalVal : null,
      receiptUrl: receiptUrl || undefined,
    }));

    if (newDocs.length > 1) {
      // Rateio: todas as parcelas em uma operação atômica, ligadas por groupId
      await deps.addExpenseGroup(newDocs);
    } else {
      await deps.addExpense(newDocs[0]);
    }
    opsCompleted += newDocs.length;

    return {
      kind: 'created',
      count: newDocs.length,
      message: newDocs.length > 1 ? `${newDocs.length} despesas geradas!` : 'Despesa salva!',
    };
  } catch (error) {
    throw new SaveExpenseError(error, opsCompleted);
  }
};
