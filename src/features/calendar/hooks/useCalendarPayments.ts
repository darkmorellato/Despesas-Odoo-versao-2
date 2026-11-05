import { useState, useCallback } from 'react';
import { validateAnyAdminPassword } from '@/features/auth';
import type { FixedNotification } from '@/shared/types';
import { getCalendarBatchWriter } from './useCalendar';
import { makeCheckKey } from '../utils/calendarView';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

interface SelectAllModalState {
  open: boolean;
  day: number | null;
  count: number;
  items: FixedNotification[];
}

const CLOSED_SELECT_ALL: SelectAllModalState = { open: false, day: null, count: 0, items: [] };

interface UseCalendarPaymentsParams {
  year: number;
  month: number;
  /** Pagamentos exibidos que ainda não foram pagos */
  pendingNotifications: FixedNotification[];
  selectedDayFilter: number | null;
  onToggleCheck: (key: string, status: boolean) => void;
  /** Escrita em lote opcional — UMA única escrita no Firestore */
  setManyChecks: ((entries: { key: string; status: boolean }[]) => void) | undefined;
  showToast: ToastFn | undefined;
}

/**
 * Fluxos de pagamento do calendário: confirmar um pagamento, corrigir (desmarcar
 * com senha de admin) e "selecionar todos" (em lote). Guarda o estado dos três modais.
 */
export const useCalendarPayments = ({
  year,
  month,
  pendingNotifications,
  selectedDayFilter,
  onToggleCheck,
  setManyChecks,
  showToast,
}: UseCalendarPaymentsParams) => {
  const [confirmPayModal, setConfirmPayModal] = useState<{ open: boolean; desc: string | null }>({
    open: false,
    desc: null
  });
  const [confirmSelectAllModal, setConfirmSelectAllModal] = useState<SelectAllModalState>(CLOSED_SELECT_ALL);
  const [fixModal, setFixModal] = useState<{ open: boolean; desc: string | null }>({
    open: false,
    desc: null
  });
  const [fixPassword, setFixPassword] = useState('');

  const setCheckStatus = useCallback((desc: string, status: boolean) => {
    // UMA única chamada: a normalização da chave acontece apenas no hook
    onToggleCheck(makeCheckKey(year, month, desc), status);
  }, [year, month, onToggleCheck]);

  const initiatePayment = useCallback((desc: string) => {
    setConfirmPayModal({ open: true, desc });
  }, []);

  const cancelPay = useCallback(() => setConfirmPayModal({ open: false, desc: null }), []);

  const confirmPayment = useCallback(() => {
    if (confirmPayModal.desc) {
      setCheckStatus(confirmPayModal.desc, true);
      setConfirmPayModal({ open: false, desc: null });
      if (showToast) showToast("Marcado como Pago!", "success");
    }
  }, [confirmPayModal.desc, setCheckStatus, showToast]);

  const initiateFix = useCallback((desc: string) => {
    setFixModal({ open: true, desc });
    setFixPassword('');
  }, []);

  /** Fecha o modal de correção (o botão Cancelar não limpa a senha; ESC limpa) */
  const cancelFix = useCallback(() => setFixModal({ open: false, desc: null }), []);

  const confirmFix = useCallback(async () => {
    // Validação assíncrona contra o Firestore (nenhuma senha no cliente)
    if (await validateAnyAdminPassword(fixPassword)) {
      if (fixModal.desc) {
        setCheckStatus(fixModal.desc, false);
        setFixModal({ open: false, desc: null });
        if (showToast) showToast("Correção realizada.", "success");
      }
    } else {
      if (showToast) showToast("Senha incorreta.", "error");
    }
  }, [fixPassword, fixModal.desc, setCheckStatus, showToast]);

  const initiateSelectAll = useCallback(() => {
    if (pendingNotifications.length === 0) {
      if (showToast) showToast("Todos os pagamentos exibidos já estão marcados como pagos!", "info");
      return;
    }

    setConfirmSelectAllModal({
      open: true,
      day: selectedDayFilter,
      count: pendingNotifications.length,
      items: pendingNotifications
    });
  }, [pendingNotifications, selectedDayFilter, showToast]);

  const cancelSelectAll = useCallback(() => setConfirmSelectAllModal(CLOSED_SELECT_ALL), []);

  const confirmSelectAll = useCallback(() => {
    const items = confirmSelectAllModal.items;
    // UMA única escrita no Firestore: usa a função em lote do hook
    // (prop `setManyChecks` quando o App a passar, senão o escritor registrado
    // pelo useCalendar). O fallback só roda sem o hook disponível (ex.: testes).
    const entries = items.map(item => ({
      key: makeCheckKey(year, month, item.description),
      status: true
    }));
    const batchWriter = setManyChecks ?? getCalendarBatchWriter();
    if (batchWriter) {
      batchWriter(entries);
    } else {
      entries.forEach(entry => onToggleCheck(entry.key, entry.status));
    }
    const count = items.length;
    setConfirmSelectAllModal(CLOSED_SELECT_ALL);
    if (showToast) {
      showToast(`${count} pagamento(s) confirmado(s) como pago(s)!`, "success");
    }
  }, [confirmSelectAllModal.items, year, month, setManyChecks, onToggleCheck, showToast]);

  return {
    confirmPayModal, initiatePayment, cancelPay, confirmPayment,
    fixModal, fixPassword, setFixPassword, initiateFix, cancelFix, confirmFix,
    confirmSelectAllModal, initiateSelectAll, cancelSelectAll, confirmSelectAll,
  };
};
