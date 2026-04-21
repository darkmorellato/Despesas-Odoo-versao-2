import React, { useState, useMemo, useCallback, memo } from 'react';
import { ADMIN_PASSWORD } from '@/config/constants';
import { formatDateBR } from '@/shared/utils/formatters';
import {
  Calendar,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckSquare,
  ZoomIn,
  ZoomOut
} from '@/shared/components/icons';
import type { FixedNotification } from '@/shared/types';

/**
 * Props para o componente ExpenseCalendar
 * @interface ExpenseCalendarProps
 */
interface ExpenseCalendarProps {
  /** Lista reativa de pagamentos fixos vinda do Firestore */
  fixedPayments: FixedNotification[];
  /** Estado dos checkboxes de pagamento (key: 'year-month-description') */
  checkedState: Record<string, boolean>;
  /** Callback para alternar status de pagamento */
  onToggleCheck: (key: string, status: boolean) => void;
  /** Callback para exibir notificações toast */
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  /** Erro de sincronização com Firebase */
  syncError?: string | null;
}

/**
 * Componente de Calendário de Pagamentos Fixos
 * 
 * Exibe calendário mensal com dias de vencimento destacados e lista
 * de pagamentos fixos com checkboxes para marcar como pago.
 * 
 * Funcionalidades:
 * - Navegação entre meses
 * - Zoom em 3 níveis
 * - Filtro por dia de vencimento
 * - Confirmação de pagamento com modal
 * - Correção requer senha de admin
 * 
 * @param props - Props do componente
 * @returns Componente de calendário
 * 
 * @example
 * ```tsx
 * <ExpenseCalendar
 *   checkedState={checks}
 *   onToggleCheck={toggleCheck}
 *   showToast={showToast}
 * />
 * ```
 */
export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = memo(({
  fixedPayments,
  checkedState,
  onToggleCheck,
  showToast,
  syncError
}) => {
  // fixedPayments vem do Firestore via prop — reativo a edições/exclusões
  const FIXED_NOTIFICATIONS = fixedPayments;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(() => {
    const today = new Date().getDate();
    if (today >= 1 && today <= 4) return 27;
    if (today >= 5 && today <= 9) return 5;
    if (today >= 10 && today <= 14) return 10;
    if (today >= 15 && today <= 19) return 15;
    if (today >= 20 && today <= 24) return 20;
    if (today >= 25 && today <= 26) return 25;
    return 27;
  });
  const [confirmPayModal, setConfirmPayModal] = useState<{ open: boolean; desc: string | null }>({
    open: false,
    desc: null
  });
  const [fixModal, setFixModal] = useState<{ open: boolean; desc: string | null }>({
    open: false,
    desc: null
  });
  const [fixPassword, setFixPassword] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1));
  }, [year, month]);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1));
  }, [year, month]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const setCheckStatus = useCallback((desc: string, status: boolean) => {
    const key = `${year}-${month}-${desc}`;
    onToggleCheck(key, status);
  }, [year, month, onToggleCheck]);

  const initiatePayment = useCallback((desc: string) => {
    setConfirmPayModal({ open: true, desc });
  }, []);

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

  const confirmFix = useCallback(() => {
    if (fixPassword === ADMIN_PASSWORD) {
      if (fixModal.desc) {
        setCheckStatus(fixModal.desc, false);
        setFixModal({ open: false, desc: null });
        if (showToast) showToast("Correção realizada.", "success");
      }
    } else {
      if (showToast) showToast("Senha incorreta.", "error");
    }
  }, [fixPassword, fixModal.desc, setCheckStatus, showToast]);

  const getZoomStyles = () => {
    switch (zoomLevel) {
      case 0: return { height: 'h-16', textSize: 'text-[9px]', padding: 'p-1' };
      case 2: return { height: 'h-40', textSize: 'text-sm', padding: 'p-3' };
      default: return { height: 'h-28 md:h-36', textSize: 'text-[11px]', padding: 'p-2' };
    }
  };
  
  const zoomStyles = getZoomStyles();

  const getDayColorStyles = useCallback((day: number) => {
    switch (day) {
      case 5: return 'bg-[#EBE7D9] border-gray-200 hover:bg-gray-100';
      case 10: return 'bg-[#EBE7D9] border-gray-200 hover:bg-gray-100';
      case 15: return 'bg-[#EBE7D9] border-gray-200 hover:bg-gray-100';
      case 20: return 'bg-[#EBE7D9] border-gray-200 hover:bg-gray-100';
      case 25: return 'bg-[#EBE7D9] border-gray-200 hover:bg-gray-100';
      case 27: return 'bg-[#EBE7D9] border-gray-200 hover:bg-gray-100';
      default: return 'bg-white border-gray-100 hover:bg-[#EBE7D9]';
    }
  }, []);

  const getDueDateBadgeColor = useCallback((day: number, isChecked: boolean) => {
    if (isChecked) return 'bg-[#EBE7D9] text-gray-400 border-gray-200';
    switch (day) {
      case 5: return 'bg-[#7C5CFC] text-white border-[#7C5CFC]';
      case 10: return 'bg-[#FDB827] text-[#1A1A1A] border-[#FDB827]';
      case 15: return 'bg-black text-white border-black';
      case 20: return 'bg-[#7C5CFC] text-white border-[#7C5CFC]';
      case 25: return 'bg-[#FDB827] text-[#1A1A1A] border-[#FDB827]';
      case 27: return 'bg-black text-white border-black';
      default: return 'bg-[#EBE7D9] text-[#1A1A1A] border-gray-200';
    }
  }, []);

  const uniqueFixedDays = useMemo(() => {
    return [...new Set(FIXED_NOTIFICATIONS.map(n => n.day))].sort((a, b) => a - b);
  }, [FIXED_NOTIFICATIONS]);

  const getFilterButtonClass = (day: number, isSelected: boolean) => {
    const baseClass = "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1";
    if (!isSelected) return `${baseClass} bg-white text-gray-400 hover:text-[#1A1A1A] hover:bg-[#EBE7D9]`;
    return `${baseClass} bg-black text-white`;
  };

  const filteredNotifications = useMemo(() => {
    return FIXED_NOTIFICATIONS
      .filter(item => !item.months || item.months.includes(month + 1))
      .filter(item => selectedDayFilter === null || item.day === selectedDayFilter);
  }, [FIXED_NOTIFICATIONS, month, selectedDayFilter]);

  return (
    <div className="bg-white rounded-[40px] p-8 overflow-hidden fade-in flex flex-col relative border border-gray-100">
      {/* Modal Confirmar Pagamento */}
      {confirmPayModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center">
            <div className="mx-auto w-14 h-14 bg-[#FDB827] rounded-2xl flex items-center justify-center mb-5">
              <Check className="w-7 h-7 text-[#1A1A1A]" />
            </div>
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2 tracking-tight">Confirmar Pagamento?</h3>
            <p className="text-sm text-gray-400 mb-8 font-medium">{confirmPayModal.desc}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPayModal({ open: false, desc: null })}
                className="flex-1 py-3 bg-[#EBE7D9] text-[#1A1A1A] font-bold rounded-xl hover:bg-gray-200 transition-all"
              >
                Não
              </button>
              <button
                onClick={confirmPayment}
                className="flex-1 py-3 bg-black text-white rounded-xl font-bold"
              >
                Sim, Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Corrigir */}
      {fixModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-xs p-8 text-center rounded-[32px]">
            <div className="mx-auto w-14 h-14 bg-[#EBE7D9] rounded-2xl flex items-center justify-center mb-5">
              <RotateCcw className="w-7 h-7 text-[#1A1A1A]" />
            </div>
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2 tracking-tight">Corrigir Status</h3>
            <p className="text-sm text-gray-400 mb-6">Digite a senha de administrador.</p>
            <input
              type="password"
              autoFocus
              placeholder="Senha"
              value={fixPassword}
              onChange={e => setFixPassword(e.target.value)}
              className="liquid-input w-full px-5 py-3 rounded-xl text-center font-bold text-[#1A1A1A] mb-6 placeholder-gray-300"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setFixModal({ open: false, desc: null })}
                className="flex-1 py-3 bg-[#EBE7D9] text-[#1A1A1A] font-bold rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmFix}
                className="flex-1 py-3 bg-[#FDB827] hover:bg-[#E5A71F] text-[#1A1A1A] font-bold rounded-xl transition-all"
              >
                Corrigir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex bg-[#EBE7D9] rounded-2xl p-1 gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl text-gray-400 hover:text-[#1A1A1A] hover:bg-white transition-all"
            >
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <button
              onClick={handleToday}
              className="px-4 text-xs font-bold text-gray-500 hover:text-[#1A1A1A] hover:bg-white rounded-xl transition-all uppercase tracking-wider"
            >
              Hoje
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl text-gray-400 hover:text-[#1A1A1A] hover:bg-white transition-all"
            >
              <ChevronRight className="w-5 h-5"/>
            </button>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
            {monthNames[month]} <span className="opacity-40 font-light">{year}</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 bg-[#EBE7D9] p-1 rounded-2xl">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0, prev - 1))}
            disabled={zoomLevel === 0}
            className={`p-2 rounded-xl transition-all ${zoomLevel === 0 ? 'opacity-30 cursor-not-allowed' : 'text-gray-400 hover:text-[#1A1A1A] hover:bg-white'}`}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.min(2, prev + 1))}
            disabled={zoomLevel === 2}
            className={`p-2 rounded-lg transition-all ${zoomLevel === 2 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerta de Sincronização */}
      {syncError && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center mt-0.5">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 mb-1">Aviso de Sincronização</p>
            <p className="text-xs text-amber-700">{syncError}</p>
          </div>
        </div>
      )}

      {/* Grid do Calendário */}
      <div className="p-1">
        <div className="grid grid-cols-7 mb-4">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
            <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`}></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === new Date().getDate() && 
                           month === new Date().getMonth() && 
                           year === new Date().getFullYear();
            const hasNotification = FIXED_NOTIFICATIONS.some(
              n => n.day === day && (!n.months || n.months.includes(month + 1))
            );

            return (
              <div
                key={day}
                className={`rounded-2xl border transition-all duration-300 backdrop-blur-sm ${zoomStyles.height} ${zoomStyles.padding} flex flex-col relative group overflow-hidden ${
                  isToday
                    ? 'bg-white/80 border-blue-300 shadow-liquid-glow ring-2 ring-blue-100'
                    : getDayColorStyles(day)
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                      isToday
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md'
                        : 'text-slate-500 bg-white/50 shadow-sm'
                    }`}
                  >
                    {day}
                  </span>
                  {hasNotification && (
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
                  )}
                </div>
                {hasNotification && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 mt-2">
                    {FIXED_NOTIFICATIONS.filter(
                      n => n.day === day && (!n.months || n.months.includes(month + 1))
                    ).map((note, idx) => (
                      <div
                        key={idx}
                        className={`bg-white/50 border border-white/60 text-slate-600 px-2 py-1 rounded-lg font-medium truncate backdrop-blur-md ${zoomStyles.textSize}`}
                      >
                        {note.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção de Pagamentos Fixos */}
      <div className="mt-8 pt-8 border-t border-slate-200/50">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6">
          <h3 className="font-bold text-slate-700 flex items-center gap-3 text-lg whitespace-nowrap">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg shadow-sm text-blue-600">
              <CheckSquare className="w-5 h-5"/>
            </div>
            Pagamentos Fixos de {monthNames[month]}
          </h3>
          <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-start xl:justify-end">
            {uniqueFixedDays.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDayFilter(day === selectedDayFilter ? null : day)}
                className={getFilterButtonClass(day, selectedDayFilter === day)}
              >
                Dia {day}
              </button>
            ))}
            <div className="w-px h-8 bg-slate-300 mx-1 hidden sm:block"></div>
            <button
              onClick={() => setSelectedDayFilter(null)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border shadow-sm ${
                selectedDayFilter === null
                  ? 'bg-slate-700 text-white border-slate-800 ring-2 ring-slate-200'
                  : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredNotifications.map((item, idx) => {
            const key = `${year}-${month}-${item.description}`;
            const isChecked = !!checkedState[key];

            return (
              <div
                key={idx}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border ${
                  isChecked
                    ? 'bg-slate-50/50 border-slate-100 opacity-60 grayscale'
                    : 'bg-white/40 border-white/60 hover:bg-white/70 hover:shadow-md'
                }`}
              >
                <div 
                  className="relative flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isChecked) {
                      initiatePayment(item.description);
                    }
                  }}
                >
                  <div
                    className={`w-6 h-6 rounded-lg transition-all cursor-pointer flex items-center justify-center border ${
                      !isChecked
                        ? 'border-slate-300 bg-white/80 hover:border-blue-400'
                        : 'bg-green-500 border-green-500 text-white shadow-liquid-glow'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <div
                  className="flex-1 cursor-pointer select-none"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isChecked) {
                      initiatePayment(item.description);
                    }
                  }}
                >
                  <p className={`font-semibold text-sm ${
                    isChecked ? "text-slate-400 line-through" : "text-slate-700"
                  }`}>
                    {item.description}
                  </p>
                  <p className={`text-xs mt-1 font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                    getDueDateBadgeColor(item.day, isChecked)
                  }`}>
                    <Calendar className="w-3 h-3" /> Dia {item.day}
                  </p>
                </div>
                {isChecked && (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold text-white bg-green-500/90 px-2 py-1 rounded-lg shadow-sm backdrop-blur-sm">
                      Pago
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        initiateFix(item.description);
                      }}
                      className="text-[10px] font-bold text-red-400 hover:text-red-500 hover:underline"
                    >
                      Corrigir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default ExpenseCalendar;
