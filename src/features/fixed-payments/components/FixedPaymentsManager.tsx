import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { useFixedPayments } from '@/features/fixed-payments';
import { useAuth } from '@/shared/hooks';
import { ADMIN_PASSWORD } from '@/config/constants';
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

const PAYMENT_DAYS = [5, 10, 15, 20, 25, 27];

export const FixedPaymentsManager: React.FC<FixedPaymentsManagerProps> = memo(({ showToast }) => {
  const { user } = useAuth();
  const { payments, addPayment, updatePayment, deletePayment, getPaymentsByDay, getUniqueDays, syncStatus } = useFixedPayments(user);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FixedNotification | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; payment: FixedNotification | null }>({ open: false, payment: null });
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
    if (passwordInput !== ADMIN_PASSWORD) {
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
    <div className="bg-white rounded-[40px] p-8 overflow-hidden fade-in flex flex-col border border-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#7C5CFC] rounded-xl text-white">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Pagamentos Fixos</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-gray-400">Total: {totalPayments} pagamentos</p>

              {/* Status de sincronização na nuvem */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 text-xs">
                {syncStatus === 'synced' && (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 font-medium">
                      Sincronizado
                      {lastSyncTime && (
                        <span className="text-gray-400 ml-1">
                          {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </span>
                  </>
                )}
                {syncStatus === 'syncing' && (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#FDB827] animate-spin" />
                    <span className="text-[#FDB827] font-medium">Sincronizando...</span>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-red-600 font-medium">Erro de conexão</span>
                  </>
                )}
                {syncStatus === 'offline' && (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500 font-medium">Offline</span>
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
            className="flex items-center gap-2 px-5 py-3 bg-[#1A1A1A] text-white font-bold rounded-xl hover:bg-black transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Pagamento
            <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          <div
            className={`
              absolute top-full right-0 mt-3 w-[420px] bg-white border border-gray-100 rounded-2xl p-5 z-[99999]
              shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]
              origin-top-right transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
              ${showDropdown
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 scale-90 -translate-y-4 pointer-events-none'
              }
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight">Novo Pagamento Fixo</h3>
              <button
                onClick={() => setShowDropdown(false)}
                className="p-1.5 rounded-lg hover:bg-[#EBE7D9] text-gray-400 hover:text-[#1A1A1A] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#FDB827] focus:ring-2 focus:ring-[#FDB827]/20 outline-none transition-all text-sm"
                  placeholder="Ex: Aluguel Loja Premium"
                  autoFocus
                />
              </div>

              {/* Day */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Dia de Vencimento</label>

                {/* Toggle para usar data personalizada */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setUseCustomDate(false)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${!useCustomDate
                        ? 'bg-black text-white'
                        : 'bg-[#EBE7D9] text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    Dia Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomDate(true)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${useCustomDate
                        ? 'bg-black text-white'
                        : 'bg-[#EBE7D9] text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    Data Personalizada
                  </button>
                </div>

                {/* Dias padrão */}
                {!useCustomDate && (
                  <div className="flex gap-2">
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
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${formData.day === d
                            ? 'bg-black text-white'
                            : 'bg-[#EBE7D9] text-gray-600 hover:bg-gray-200'
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
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#FDB827] focus:ring-2 focus:ring-[#FDB827]/20 outline-none transition-all text-sm"
                  />
                )}
              </div>

              {/* Months */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Meses <span className="text-gray-300 font-normal">(opcional)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MONTHS.map(m => {
                    const isSelected = formData.months.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => toggleMonth(m.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${isSelected
                            ? 'bg-[#FDB827] text-[#1A1A1A]'
                            : 'bg-[#EBE7D9] text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Se nenhum mês selecionado, é para todos os meses.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowDropdown(false)}
                className="flex-1 py-2.5 bg-[#EBE7D9] text-[#1A1A1A] font-semibold rounded-xl hover:bg-gray-200 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-[#FDB827] text-[#1A1A1A] font-semibold rounded-xl hover:bg-[#E5A71F] transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {groupedPayments.map(({ day, payments: dayPayments }) => {
          const isExpanded = expandedDays.has(day);

          return (
            <div key={day} className="rounded-[32px] bg-[#EBE7D9] overflow-hidden">
              {/* Day Header */}
              <button
                onClick={() => toggleDay(day)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg bg-black text-white font-bold text-sm">
                    Dia {day}
                  </span>
                  <span className="text-sm font-medium text-gray-600">
                    {dayPayments.length} pagamento{dayPayments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* Payments for this day */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-2">
                  {dayPayments.map(payment => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between bg-white rounded-xl p-3 hover:shadow-md transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-[#1A1A1A]">{payment.description}</p>
                        {payment.months && payment.months.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {payment.months.map(m => {
                              const monthLabel = MONTHS.find(month => month.value === m)?.label;
                              return (
                                <span
                                  key={m}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#7C5CFC] text-white font-bold"
                                >
                                  {monthLabel}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(payment)}
                          className="p-2 text-gray-400 hover:text-[#FDB827] hover:bg-[#FDB827]/10 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(payment)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
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
          className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="glass-panel w-full max-w-md rounded-3xl p-6 text-center animate-in fade-in zoom-in duration-200 shadow-2xl absolute"
            onClick={e => e.stopPropagation()}
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              {editingPayment ? 'Editar Pagamento' : 'Novo Pagamento Fixo'}
            </h3>

            <div className="space-y-4 text-left">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Ex: Aluguel Loja Premium"
                />
              </div>

              {/* Day */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Dia de Vencimento</label>
                
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setUseCustomDate(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      !useCustomDate ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Dia Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomDate(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      useCustomDate ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Data Personalizada
                  </button>
                </div>

                {!useCustomDate ? (
                  <select
                    value={formData.day}
                    onChange={e => setFormData(prev => ({ ...prev, day: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                )}
              </div>

              {/* Months */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Meses Específicos <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {MONTHS.map(m => {
                    const isSelected = formData.months.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => toggleMonth(m.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isSelected
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Se nenhum mês selecionado, o pagamento é para todos os meses.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : (editingPayment ? 'Salvar' : 'Adicionar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-xs p-6 text-center rounded-[32px]">
            <div className="mx-auto w-14 h-14 bg-[#FDB827] rounded-2xl flex items-center justify-center mb-5">
              <AlertTriangle className="w-7 h-7 text-[#1A1A1A]" />
            </div>
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2 tracking-tight">
              {passwordModal.type === 'edit' ? 'Editar Pagamento' : 'Excluir Pagamento'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
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
              className="liquid-input w-full px-5 py-3 rounded-xl text-center font-bold text-[#1A1A1A] mb-6 placeholder-gray-300"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPasswordModal({ open: false, type: 'edit', payment: null });
                  setPasswordInput('');
                }}
                className="flex-1 py-3 bg-[#EBE7D9] text-[#1A1A1A] font-bold rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasswordConfirm}
                className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
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
