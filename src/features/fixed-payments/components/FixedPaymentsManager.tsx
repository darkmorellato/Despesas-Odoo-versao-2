import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { useFixedPayments } from '@/features/fixed-payments';
import { useAuth } from '@/shared/hooks';
import { validateAnyAdminPassword } from '@/features/auth';
import { CheckSquare, Edit, Trash2, Plus, ChevronDown, ChevronRight, X, Check, AlertTriangle, Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from '@/shared/components/icons';
import type { FixedNotification } from '@/shared/types';

interface FixedPaymentsManagerProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' },
];

const PAYMENT_DAYS = [5, 10, 15, 20, 25, 27, 29];

export const FixedPaymentsManager: React.FC<FixedPaymentsManagerProps> = memo(({ showToast }) => {
  const { user } = useAuth();
  const { payments, addPayment, updatePayment, deletePayment, getPaymentsByDay, getUniqueDays, syncStatus } = useFixedPayments(user);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FixedNotification | null>(null);
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; type: 'edit' | 'delete'; payment: FixedNotification | null }>({ open: false, type: 'edit', payment: null });
  const [passwordInput, setPasswordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [formData, setFormData] = useState<{
    description: string;
    day: number;
    months: number[];
    customDate?: string;
  }>({
    description: '',
    day: 5,
    months: [],
  });

  useEffect(() => {
    if (syncStatus === 'synced') {
      setLastSyncTime(new Date());
    }
  }, [syncStatus]);

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
    setFormData({ description: '', day: 5, months: [] });
    setUseCustomDate(false);
    setEditingPayment(null);
    setShowDropdown(true);
  }, []);

  const openEditModal = useCallback((payment: FixedNotification) => {
    setFormData({
      description: payment.description,
      day: payment.day,
      months: payment.months || [],
      ...(payment.customDate ? { customDate: payment.customDate } : {}),
    });
    setUseCustomDate(!!payment.customDate);
    setEditingPayment(payment);
    setShowDropdown(false);
    setModalOpen(true);
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
    if (!validateAnyAdminPassword(passwordInput)) {
      showToast('Senha incorreta.', 'error');
      return;
    }

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
    setPasswordModal({ open: false, type: 'edit', payment: null });
    setPasswordInput('');
  }, [passwordInput, passwordModal, deletePayment, showToast, openEditModal]);

  // Fechar modais com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalOpen) setModalOpen(false);
        if (passwordModal.open) {
          setPasswordModal({ open: false, type: 'edit', payment: null });
          setPasswordInput('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, passwordModal.open]);

  const handleSave = useCallback(async () => {
    if (!formData.description.trim()) {
      showToast('Descrição é obrigatória.', 'error');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const paymentData: Omit<FixedNotification, 'id'> = {
        description: formData.description.trim(),
        day: formData.day,
        ...(formData.months.length > 0 ? { months: formData.months } : {}),
        ...(formData.customDate ? { customDate: formData.customDate } : {}),
      };

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
    setFormData(prev => {
      const months = prev.months.includes(month)
        ? prev.months.filter(m => m !== month)
        : [...prev.months, month];
      return { ...prev, months };
    });
  }, []);

  const toggleDropdown = useCallback(() => {
    setShowDropdown(prev => !prev);
  }, []);

  const groupedPayments = useMemo(() => {
    const days = getUniqueDays();
    return days.map(day => ({
      day,
      payments: getPaymentsByDay(day),
    }));
  }, [getUniqueDays, getPaymentsByDay]);

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
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px]">
                {syncStatus === 'synced' && (
                  <>
                    <Cloud className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">
                      Sincronizado
                      {lastSyncTime && (
                        <span className="text-slate-400 ml-1 font-normal">
                          {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </span>
                  </>
                )}
                {syncStatus === 'syncing' && (
                  <>
                    <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                    <span className="text-amber-700 font-bold">Sincronizando...</span>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <CloudOff className="w-3 h-3 text-rose-600" />
                    <span className="text-rose-700 font-bold">Erro de conexão</span>
                  </>
                )}
                {syncStatus === 'offline' && (
                  <>
                    <CloudOff className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-600 font-medium">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={toggleDropdown}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Pagamento Fixo
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          <div
            className={`
              absolute top-full right-0 mt-2 w-[380px] sm:w-[420px] bg-white border border-slate-200 rounded-2xl p-5 z-[99999]
              shadow-2xl origin-top-right transform transition-all duration-300
              ${showDropdown
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
              }
            `}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">Novo Pagamento Fixo</h4>
              <button
                onClick={() => setShowDropdown(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="liquid-input w-full px-3 py-2 rounded-lg text-xs font-medium"
                  placeholder="Ex: Aluguel Loja Premium, Contabilidade..."
                  autoFocus
                />
              </div>

              {/* Day */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Dia de Vencimento</label>

                {/* Toggle para usar data personalizada */}
                <div className="flex items-center gap-1.5 mb-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setUseCustomDate(false)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      !useCustomDate
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Dia Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomDate(true)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      useCustomDate
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Data Específica
                  </button>
                </div>

                {/* Dias padrão */}
                {!useCustomDate && (
                  <div className="flex gap-1.5">
                    {PAYMENT_DAYS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const { customDate, ...rest } = prev;
                            return { ...rest, day: d };
                          });
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          formData.day === d
                            ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}

                {/* Data personalizada */}
                {useCustomDate && (
                  <input
                    type="date"
                    value={formData.customDate || ''}
                    onChange={e => {
                      const val = e.target.value;
                      const dayPart = val ? parseInt(val.split('-')[2]) : 5;
                      setFormData(prev => ({ ...prev, customDate: val, day: dayPart }));
                    }}
                    className="liquid-input w-full px-3 py-2 rounded-lg text-xs font-medium"
                  />
                )}
              </div>

              {/* Months */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Meses <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MONTHS.map(m => {
                    const isSelected = formData.months.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => toggleMonth(m.value)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Se nenhum mês selecionado, repete todos os meses.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDropdown(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="p-6 sm:p-8 space-y-3">
        {groupedPayments.map(({ day, payments: dayPayments }) => {
          const isExpanded = expandedDays.has(day);

          return (
            <div key={day} className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shadow-xs">
              {/* Day Header */}
              <button
                onClick={() => toggleDay(day)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-100/70 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs">
                    Dia {day}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {dayPayments.length} pagamento{dayPayments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {/* Payments for this day */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-2 border-t border-slate-200/60 bg-white">
                  {dayPayments.map(payment => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-all"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-semibold text-xs text-slate-900 truncate">{payment.description}</p>
                        {payment.months && payment.months.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {payment.months.map(m => {
                              const monthLabel = MONTHS.find(month => month.value === m)?.label;
                              return (
                                <span
                                  key={m}
                                  className="text-[10px] px-2 py-0.2 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold"
                                >
                                  {monthLabel}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEditClick(payment)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-200 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(payment)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 text-center animate-in fade-in shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="text-base font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">
              {editingPayment ? 'Editar Pagamento' : 'Novo Pagamento Fixo'}
            </h4>

            <div className="space-y-4 text-left">
              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="liquid-input w-full px-3 py-2 rounded-lg text-xs font-medium"
                  placeholder="Ex: Aluguel Loja Premium"
                />
              </div>

              {/* Day */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Dia de Vencimento</label>
                
                <div className="flex items-center gap-1.5 mb-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setUseCustomDate(false)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      !useCustomDate ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Dia Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomDate(true)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      useCustomDate ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Data Específica
                  </button>
                </div>

                {!useCustomDate ? (
                  <select
                    value={formData.day}
                    onChange={e => setFormData(prev => ({ ...prev, day: parseInt(e.target.value) }))}
                    className="liquid-input w-full px-3 py-2 rounded-lg text-xs font-medium"
                  >
                    {PAYMENT_DAYS.map(d => (
                      <option key={d} value={d}>Dia {d}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="date"
                    value={formData.customDate || ''}
                    onChange={e => {
                      const val = e.target.value;
                      const dayPart = val ? parseInt(val.split('-')[2]) : 5;
                      setFormData(prev => ({ ...prev, customDate: val, day: dayPart }));
                    }}
                    className="liquid-input w-full px-3 py-2 rounded-lg text-xs font-medium"
                  />
                )}
              </div>

              {/* Months */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Meses Específicos <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MONTHS.map(m => {
                    const isSelected = formData.months.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => toggleMonth(m.value)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Se nenhum mês selecionado, repete todos os meses.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                {isSubmitting ? 'Salvando...' : (editingPayment ? 'Salvar' : 'Adicionar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm p-6 text-center rounded-2xl shadow-2xl">
            <div className="mx-auto w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              {passwordModal.type === 'edit' ? 'Editar Pagamento' : 'Excluir Pagamento'}
            </h4>
            <p className="text-xs text-slate-500 mb-5">
              {passwordModal.type === 'edit'
                ? 'Digite a senha de administrador para editar.'
                : 'Digite a senha de administrador para excluir.'}
            </p>
            <input
              type="password"
              autoFocus
              placeholder="Senha"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              className="liquid-input w-full px-4 py-2.5 rounded-lg text-center font-bold text-slate-900 mb-5 placeholder-slate-400 text-sm"
            />
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setPasswordModal({ open: false, type: 'edit', payment: null });
                  setPasswordInput('');
                }}
                className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasswordConfirm}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg transition-all text-xs cursor-pointer shadow-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default FixedPaymentsManager;
