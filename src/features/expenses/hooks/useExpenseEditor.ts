import React, { useState, useRef, useCallback } from 'react';
import { getTodayLocal, formatCurrency } from '@/shared/utils/formatters';
import { logAuditEvent } from '@/features/audit';
import type { AuthenticatedUser } from '@/features/auth';
import type { Expense, ToastType } from '@/shared/types';
import { detectExpenseGroup, validateAdminPassword } from './useExpenses';
import { saveExpense, SaveExpenseError } from '../services/saveExpense';
import type { SaveExpenseDeps } from '../services/saveExpense';

import { logger } from '@/shared/utils/logger';
type ToastFn = (message: string, type?: ToastType) => void;

interface UseExpenseEditorParams {
  sessionUser: AuthenticatedUser | null;
  /** Nome do funcionário nas configurações (fallback quando não há sessão) */
  settingsEmployeeName: string;
  expenses: Expense[];
  actions: Pick<SaveExpenseDeps, 'addExpense' | 'addExpenseGroup' | 'saveExpenseGroup' | 'updateExpense'> & {
    deleteExpense: (id: string, reason?: string, deletedBy?: string) => Promise<void>;
    canDelete: (id: string) => { allowed: boolean; reason?: string };
  };
  showToast: ToastFn;
  /** Após salvar: leva a listagem para a data do lançamento */
  revealSavedExpense: (savedDate: string) => void;
  /** Falta configurar o nome do funcionário: abrir as configurações */
  onNeedEmployeeName: () => void;
  /** Edição liberada (senha ok): voltar ao painel com o formulário preenchido */
  onEditLoaded: () => void;
}

/**
 * Estado do formulário de lançamento + fluxos de salvar, editar (com senha de
 * admin) e excluir (motivo + senha de admin + auditoria).
 *
 * A regra de gravação mora em `services/saveExpense.ts` (testável sem React);
 * este hook cuida só de estado, modais e feedback ao usuário.
 */
export const useExpenseEditor = ({
  sessionUser,
  settingsEmployeeName,
  expenses,
  actions,
  showToast,
  revealSavedExpense,
  onNeedEmployeeName,
  onEditLoaded,
}: UseExpenseEditorParams) => {
  // Form state
  const [date, setDate] = useState(getTodayLocal());
  const [description, setDescription] = useState('');
  const [store, setStore] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const originalExpenseForAudit = useRef<Expense | null>(null);
  const editingGroupSiblings = useRef<Expense[]>([]);

  // Modais de edição/exclusão com senha de admin
  const [editPasswordModal, setEditPasswordModal] = useState<{ open: boolean; expense: Expense | null }>({ open: false, expense: null });
  const [editPasswordInput, setEditPasswordInput] = useState('');
  const [editReason, setEditReason] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; step: 'confirm' | 'password'; expense: Expense | null }>({ open: false, step: 'confirm', expense: null });
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  const resetForm = useCallback(() => {
    setDate(getTodayLocal());
    setDescription('');
    setStore('');
    setCategory('');
    setAmount('');
    setNotes('');
    setReceiptUrl(undefined);
    setEditingId(null);
    setEditReason('');
    originalExpenseForAudit.current = null;
    editingGroupSiblings.current = [];
  }, []);

  const closeEditPasswordModal = useCallback(() => {
    setEditPasswordModal({ open: false, expense: null });
    setEditPasswordInput('');
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModal({ open: false, step: 'confirm', expense: null });
    setDeletePasswordInput('');
  }, []);

  // Cancelar pelo botão/ESC do modal: fecha e descarta também o motivo digitado
  const cancelEditPassword = useCallback(() => {
    closeEditPasswordModal();
    setEditReason('');
  }, [closeEditPasswordModal]);

  const cancelDelete = useCallback(() => {
    closeDeleteModal();
    setDeleteReason('');
  }, [closeDeleteModal]);

  // ------------------------------------------------------------------ SALVAR
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const activeEmployeeName = sessionUser?.name || settingsEmployeeName;
    if (activeEmployeeName === 'Seu Nome' || !activeEmployeeName.trim()) {
      showToast('Configure seu nome antes de lançar.', 'error');
      onNeedEmployeeName();
      return;
    }

    const totalVal = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(totalVal) || totalVal <= 0) {
      showToast('Valor inválido', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const prev = originalExpenseForAudit.current;
      const outcome = await saveExpense({
        editingId,
        previous: prev,
        existingSiblings: editingId
          ? (editingGroupSiblings.current.length > 0
              ? editingGroupSiblings.current
              : [prev || expenses.find(x => x.id === editingId)].filter((x): x is Expense => !!x))
          : [],
        form: { date, description, store, category, notes, receiptUrl, editReason, totalVal },
        actor: {
          employeeName: activeEmployeeName,
          userName: sessionUser?.name || 'Administrador',
          userEmail: sessionUser?.email || '',
        },
        deps: { ...actions, logAuditEvent },
      });

      showToast(outcome.message, outcome.kind === 'group-updated' ? 'success' : undefined);
      editingGroupSiblings.current = [];
      revealSavedExpense(date);
      resetForm();
    } catch (error) {
      logger.error('Erro ao salvar despesa:', error);
      const opsCompleted = error instanceof SaveExpenseError ? error.opsCompleted : 0;
      if (opsCompleted > 0) {
        // Falha parcial (ex.: gravou mas a auditoria falhou) — usuário precisa conferir
        showToast(`Erro após ${opsCompleted} operação(ões) concluída(s) — verifique os valores do lançamento.`, 'error');
      } else {
        showToast('Erro ao salvar', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, sessionUser, settingsEmployeeName, amount, date, description, store, category, notes, receiptUrl, editingId, editReason, actions, expenses, resetForm, showToast, revealSavedExpense, onNeedEmployeeName]);

  // ------------------------------------------------------------------ EDITAR
  const handleEditClick = useCallback((ex: Expense) => {
    setEditPasswordModal({ open: true, expense: ex });
    setEditPasswordInput('');
    setEditReason('');
  }, []);

  const isEditConfirmingRef = useRef(false); // guarda anti duplo-submissão
  const confirmEditPassword = useCallback(async () => {
    if (isEditConfirmingRef.current) return;
    isEditConfirmingRef.current = true;
    try {
      if (!(await validateAdminPassword(editPasswordInput))) {
        showToast('Senha incorreta.', 'error');
        return;
      }

      if (editPasswordModal.expense) {
        const ex = editPasswordModal.expense;
        originalExpenseForAudit.current = ex;

        // Detecta se a despesa pertence a um grupo rateado (Todas, Piracicaba, Amparo)
        const groupInfo = detectExpenseGroup(ex, expenses);
        editingGroupSiblings.current = groupInfo.siblings;

        setEditingId(ex.id);
        setDate(ex.date);
        setDescription(ex.description);
        setStore(groupInfo.isGroup && groupInfo.groupName ? groupInfo.groupName : ex.store);
        setCategory(ex.category);
        // Só carrega o total do grupo quando a loja carregada É o grupo;
        // caso contrário (groupName null com originalTotal), usar o valor
        // individual — senão salvar gravaria o total inteiro em 1 loja.
        setAmount(formatCurrency(groupInfo.isGroup && groupInfo.groupName ? groupInfo.totalAmount : ex.amount));
        setNotes(ex.notes || '');
        setReceiptUrl(ex.receiptUrl || undefined);
        setEditPasswordModal({ open: false, expense: null });
        setEditPasswordInput('');
        onEditLoaded();
        showToast(
          groupInfo.isGroup && groupInfo.groupName
            ? `Modo de edição: grupo ${groupInfo.groupName} carregado com valor total!`
            : 'Modo de edição liberado!',
          'info'
        );
      }
    } finally {
      isEditConfirmingRef.current = false;
    }
  }, [editPasswordInput, editPasswordModal.expense, expenses, showToast, onEditLoaded]);

  // ----------------------------------------------------------------- EXCLUIR
  const handleDeleteClick = useCallback((ex: Expense) => {
    setDeleteModal({ open: true, step: 'confirm', expense: ex });
    setDeletePasswordInput('');
    setDeleteReason('');
  }, []);

  // Passo 1 (motivo) → passo 2 (senha)
  const proceedToDeletePassword = useCallback(() => {
    if (!deleteReason.trim()) {
      showToast('Informe o motivo da exclusão antes de continuar.', 'error');
      return;
    }
    setDeleteModal(prev => ({ ...prev, step: 'password' }));
  }, [deleteReason, showToast]);

  // Confirma a senha, exclui logicamente e registra a auditoria
  const isDeletingRef = useRef(false); // guarda anti duplo-submissão
  const confirmDeletePassword = useCallback(async () => {
    if (isDeletingRef.current) return; // clique duplo não exclui 2x nem duplica auditoria
    if (!(await validateAdminPassword(deletePasswordInput))) {
      showToast('Senha incorreta.', 'error');
      return;
    }

    if (deleteModal.expense) {
      const ex = deleteModal.expense;
      const { allowed, reason } = actions.canDelete(ex.id);
      if (!allowed) {
        showToast(reason || 'Exclusão não permitida', 'error');
        return;
      }

      isDeletingRef.current = true;
      try {
        await actions.deleteExpense(ex.id, deleteReason, sessionUser?.name || 'Administrador');

        // Auditoria de exclusão com motivo (aguardada — toast só se confirmou)
        await logAuditEvent({
          actionType: 'DELETE',
          actionDate: new Date().toISOString(),
          userName: sessionUser?.name || 'Administrador',
          userEmail: sessionUser?.email || '',
          expenseId: ex.id,
          reason: deleteReason,
          previousData: {
            description: ex.description,
            store: ex.store,
            category: ex.category,
            amount: ex.amount,
            date: ex.date,
            notes: ex.notes,
            employeeName: ex.employeeName,
            receiptUrl: ex.receiptUrl
          }
        });

        setDeleteModal({ open: false, step: 'confirm', expense: null });
        setDeletePasswordInput('');
        setDeleteReason('');
        showToast('Lançamento excluído e registrado na auditoria!', 'success');
      } catch (error) {
        logger.error('Erro ao excluir lançamento:', error);
        showToast('Erro ao excluir lançamento. Tente novamente.', 'error');
      } finally {
        isDeletingRef.current = false;
      }
    }
  }, [deletePasswordInput, deleteModal.expense, deleteReason, actions, sessionUser, showToast]);

  return {
    // formulário
    date, setDate, description, setDescription, store, setStore,
    category, setCategory, amount, setAmount, notes, setNotes,
    receiptUrl, setReceiptUrl, isSubmitting,
    editingId, resetForm, handleSubmit,
    // edição
    editPasswordModal, setEditPasswordModal, editPasswordInput, setEditPasswordInput,
    editReason, setEditReason, handleEditClick, confirmEditPassword, closeEditPasswordModal, cancelEditPassword,
    // exclusão
    deleteModal, setDeleteModal, deletePasswordInput, setDeletePasswordInput,
    deleteReason, setDeleteReason, handleDeleteClick, proceedToDeletePassword,
    confirmDeletePassword, closeDeleteModal, cancelDelete,
  };
};
