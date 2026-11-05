import React, { useMemo, memo } from 'react';
import { useFixedPayments } from '../hooks/useFixedPayments';
import { useFixedPaymentsEditor } from '../hooks/useFixedPaymentsEditor';
import { useLastSyncTime } from '../hooks/useLastSyncTime';
import { useAuth } from '@/shared/hooks';
import { CheckSquare } from '@/shared/components/icons';
import type { FixedNotification } from '@/shared/types';
import { getDayOptions } from '../utils/fixedPaymentsView';
import { SyncStatusBadge } from './SyncStatusBadge';
import { NewPaymentDropdown } from './NewPaymentDropdown';
import { PaymentDayGroup } from './PaymentDayGroup';
import { PaymentEditModal } from './PaymentEditModal';
import { PaymentPasswordModal } from './PaymentPasswordModal';

interface FixedPaymentsManagerProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  payments?: FixedNotification[];
  addPayment?: (payment: Omit<FixedNotification, 'id'>) => Promise<void>;
  updatePayment?: (id: string, payment: Partial<FixedNotification>) => Promise<void>;
  deletePayment?: (id: string) => Promise<void>;
  getPaymentsByDay?: (day: number) => FixedNotification[];
  getUniqueDays?: () => number[];
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
}

/**
 * Cadastro de pagamentos fixos (agrupados por dia de vencimento). Este componente
 * só compõe a tela; regras do formulário em `utils/fixedPaymentsView`, estado e
 * fluxos em `useFixedPaymentsEditor` e cada região em seu próprio componente.
 */
export const FixedPaymentsManager: React.FC<FixedPaymentsManagerProps> = memo(({
  showToast,
  payments: propPayments,
  addPayment: propAddPayment,
  updatePayment: propUpdatePayment,
  deletePayment: propDeletePayment,
  getPaymentsByDay: propGetPaymentsByDay,
  getUniqueDays: propGetUniqueDays,
  syncStatus: propSyncStatus
}) => {
  const { user } = useAuth();
  // Se os dados já foram passados por props (ex: App.tsx), evita abrir um 2º listener no Firestore
  const hookData = useFixedPayments(propPayments ? null : user);
  const payments = propPayments ?? hookData.payments;
  const addPayment = propAddPayment ?? hookData.addPayment;
  const updatePayment = propUpdatePayment ?? hookData.updatePayment;
  const deletePayment = propDeletePayment ?? hookData.deletePayment;
  const getPaymentsByDay = propGetPaymentsByDay ?? hookData.getPaymentsByDay;
  const getUniqueDays = propGetUniqueDays ?? hookData.getUniqueDays;
  const syncStatus = propSyncStatus ?? hookData.syncStatus;

  const lastSyncTime = useLastSyncTime(syncStatus);
  const editor = useFixedPaymentsEditor({ showToast, addPayment, updatePayment, deletePayment });

  const groupedPayments = useMemo(() => {
    const days = getUniqueDays();
    return days.map(day => ({
      day,
      payments: getPaymentsByDay(day),
    }));
  }, [getUniqueDays, getPaymentsByDay]);

  // Dias disponíveis no select: inclui o dia atual do formulário caso não
  // esteja na lista fixa (ex.: dia 30/31) para não exibir uma opção errada
  const dayOptions = useMemo(() => getDayOptions(editor.formData.day), [editor.formData.day]);

  const totalPayments = payments.length;

  return (
    <div className="bg-white rounded-2xl overflow-hidden fade-in flex flex-col border border-slate-200/90 shadow-sm">
      {/* Header do Card */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Pagamentos Fixos</h3>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-xs text-slate-500 font-medium">Total: {totalPayments} pagamentos cadastrados</p>

              {/* Status de sincronização na nuvem */}
              <SyncStatusBadge syncStatus={syncStatus} lastSyncTime={lastSyncTime} />
            </div>
          </div>
        </div>
        <NewPaymentDropdown
          showDropdown={editor.showDropdown}
          inputRef={editor.dropdownInputRef}
          formData={editor.formData}
          setFormData={editor.setFormData}
          useCustomDate={editor.useCustomDate}
          setUseCustomDate={editor.setUseCustomDate}
          toggleMonth={editor.toggleMonth}
          isSubmitting={editor.isSubmitting}
          onButtonClick={editor.handleNewPaymentClick}
          onClose={editor.closeDropdown}
          onSave={editor.handleSave}
        />
      </div>

      {/* Payments List */}
      <div className="p-6 sm:p-8 space-y-3">
        {groupedPayments.map(({ day, payments: dayPayments }) => (
          <PaymentDayGroup
            key={day}
            day={day}
            payments={dayPayments}
            isExpanded={editor.expandedDays.has(day)}
            onToggle={() => editor.toggleDay(day)}
            onEdit={editor.handleEditClick}
            onDelete={editor.handleDeleteClick}
          />
        ))}
      </div>

      {/* Add/Edit Modal */}
      {editor.modalOpen && (
        <PaymentEditModal
          editingPayment={editor.editingPayment}
          formData={editor.formData}
          setFormData={editor.setFormData}
          useCustomDate={editor.useCustomDate}
          setUseCustomDate={editor.setUseCustomDate}
          dayOptions={dayOptions}
          toggleMonth={editor.toggleMonth}
          isSubmitting={editor.isSubmitting}
          onClose={editor.closeAddEditModal}
          onSave={editor.handleSave}
        />
      )}

      {/* Password Modal */}
      {editor.passwordModal.open && (
        <PaymentPasswordModal
          type={editor.passwordModal.type}
          password={editor.passwordInput}
          isSubmitting={editor.isSubmitting}
          onPasswordChange={editor.setPasswordInput}
          onCancel={editor.closePasswordModal}
          onConfirm={editor.handlePasswordConfirm}
        />
      )}
    </div>
  );
});

export default FixedPaymentsManager;
