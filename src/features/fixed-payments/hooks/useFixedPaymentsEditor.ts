import { useState, useCallback, useRef, useEffect } from 'react';
import { validateAnyAdminPassword } from '@/features/auth';
import type { FixedNotification } from '@/shared/types';
import {
  createEmptyPaymentForm,
  buildPaymentData,
  formFromPayment,
  toggleMonth as toggleMonthInList,
  type PaymentFormData,
} from '../utils/fixedPaymentsView';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

interface PasswordModalState {
  open: boolean;
  type: 'edit' | 'delete';
  payment: FixedNotification | null;
}

const CLOSED_PASSWORD_MODAL: PasswordModalState = { open: false, type: 'edit', payment: null };

interface UseFixedPaymentsEditorParams {
  showToast: ToastFn;
  addPayment: (payment: Omit<FixedNotification, 'id'>) => Promise<void>;
  updatePayment: (id: string, payment: Partial<FixedNotification>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
}

/**
 * Estado e fluxos de cadastro de pagamentos fixos: menu "Novo Pagamento",
 * modal de edição, pedido de senha de admin (editar/excluir) e salvar.
 */
export const useFixedPaymentsEditor = ({ showToast, addPayment, updatePayment, deletePayment }: UseFixedPaymentsEditorParams) => {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FixedNotification | null>(null);
  const [passwordModal, setPasswordModal] = useState<PasswordModalState>(CLOSED_PASSWORD_MODAL);
  const [passwordInput, setPasswordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownInputRef = useRef<HTMLInputElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>(createEmptyPaymentForm);

  // Foca o campo de descrição quando o dropdown abre (o `autoFocus` direto não
  // funciona porque o dropdown fica `invisible`/oculto quando fechado)
  useEffect(() => {
    if (showDropdown) {
      dropdownInputRef.current?.focus();
    }
  }, [showDropdown]);

  const toggleDay = useCallback((day: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }, []);

  const openAddModal = useCallback(() => {
    setFormData(createEmptyPaymentForm());
    setUseCustomDate(false);
    setEditingPayment(null);
    setShowDropdown(true);
  }, []);

  const openEditModal = useCallback((payment: FixedNotification) => {
    setFormData(formFromPayment(payment));
    setUseCustomDate(!!payment.customDate);
    setEditingPayment(payment);
    setShowDropdown(false);
    setModalOpen(true);
  }, []);

  // Fecha o dropdown descartando qualquer edição pendente — evita que um
  // próximo "Novo Pagamento Fixo" edite o pagamento anterior por engano
  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
    setEditingPayment(null);
  }, []);

  // Fecha o modal de adicionar/editar sem deixar `editingPayment` residual
  const closeAddEditModal = useCallback(() => {
    setModalOpen(false);
    setEditingPayment(null);
  }, []);

  const closePasswordModal = useCallback(() => {
    setPasswordModal(CLOSED_PASSWORD_MODAL);
    setPasswordInput('');
  }, []);

  const handleEditClick = useCallback((payment: FixedNotification) => {
    setPasswordModal({ open: true, type: 'edit', payment });
    setPasswordInput('');
  }, []);

  const handleDeleteClick = useCallback((payment: FixedNotification) => {
    setPasswordModal({ open: true, type: 'delete', payment });
    setPasswordInput('');
  }, []);

  const handlePasswordConfirm = useCallback(async () => {
    // Guarda anti duplo-submissão
    if (isSubmitting) return;

    if (!(await validateAnyAdminPassword(passwordInput))) {
      showToast('Senha incorreta.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (passwordModal.type === 'edit' && passwordModal.payment && passwordModal.payment.id) {
        openEditModal(passwordModal.payment);
      } else if (passwordModal.type === 'delete' && passwordModal.payment && passwordModal.payment.id) {
        try {
          await deletePayment(passwordModal.payment.id);
          showToast('Pagamento excluído com sucesso!', 'success');
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Erro ao excluir pagamento';
          showToast(msg, 'error');
        }
      }
      closePasswordModal();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, passwordInput, passwordModal, deletePayment, showToast, openEditModal, closePasswordModal]);

  // Fechar modais/dropdown com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalOpen) closeAddEditModal();
        if (showDropdown) closeDropdown();
        if (passwordModal.open) closePasswordModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, showDropdown, passwordModal.open, closeAddEditModal, closeDropdown, closePasswordModal]);

  const handleSave = useCallback(async () => {
    if (!formData.description.trim()) {
      showToast('Descrição é obrigatória.', 'error');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const paymentData = buildPaymentData(formData);

      if (editingPayment && editingPayment.id) {
        await updatePayment(editingPayment.id, paymentData);
        showToast('Pagamento atualizado com sucesso!', 'success');
      } else {
        await addPayment(paymentData);
        showToast('Pagamento adicionado com sucesso!', 'success');
      }

      setModalOpen(false);
      setShowDropdown(false);
      setEditingPayment(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar pagamento';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingPayment, addPayment, updatePayment, showToast, isSubmitting]);

  const toggleMonth = useCallback((month: number) => {
    setFormData(prev => ({ ...prev, months: toggleMonthInList(prev.months, month) }));
  }, []);

  // Botão "Novo Pagamento Fixo": ao abrir, SEMPRE reseta o formulário e
  // cancela qualquer edição pendente (evita salvar por cima do pagamento antigo)
  const handleNewPaymentClick = useCallback(() => {
    if (showDropdown) {
      closeDropdown();
      return;
    }
    openAddModal();
  }, [showDropdown, closeDropdown, openAddModal]);

  return {
    expandedDays, toggleDay,
    showDropdown, dropdownInputRef, handleNewPaymentClick, closeDropdown,
    modalOpen, editingPayment, closeAddEditModal,
    formData, setFormData, useCustomDate, setUseCustomDate, toggleMonth,
    isSubmitting, handleSave,
    passwordModal, passwordInput, setPasswordInput, closePasswordModal,
    handleEditClick, handleDeleteClick, handlePasswordConfirm,
  };
};
