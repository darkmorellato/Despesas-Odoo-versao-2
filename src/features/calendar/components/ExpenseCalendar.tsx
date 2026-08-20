import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { validateAnyAdminPassword } from '@/features/auth';
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

interface ExpenseCalendarProps {
  fixedPayments: FixedNotification[];
  checkedState: Record<string, boolean>;
  onToggleCheck: (key: string, status: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  syncError?: string | null;
}

export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = memo(({
  fixedPayments,
  checkedState,
  onToggleCheck,
  showToast,
  syncError
}) => {
  const FIXED_NOTIFICATIONS = fixedPayments;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(() => {
    const today = new Date().getDate();
    if (today >= 1 && today <= 4) return 29;
    if (today >= 5 && today <= 9) return 5;
    if (today >= 10 && today <= 14) return 10;
    if (today >= 15 && today <= 19) return 15;
    if (today >= 20 && today <= 24) return 20;
    if (today >= 25 && today <= 26) return 25;
    if (today >= 27 && today <= 28) return 27;
    return 29;
  });
  const [confirmPayModal, setConfirmPayModal] = useState<{ open: boolean; desc: string | null }>({
    open: false,
    desc: null
  });
  const [confirmSelectAllModal, setConfirmSelectAllModal] = useState<{
    open: boolean;
    day: number | null;
    count: number;
    items: FixedNotification[];
  }>({
    open: false,
    day: null,
    count: 0,
    items: []
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
    if (validateAnyAdminPassword(fixPassword)) {
      if (fixModal.desc) {
        setCheckStatus(fixModal.desc, false);
        setFixModal({ open: false, desc: null });
        if (showToast) showToast("Correção realizada.", "success");
      }
    } else {
      if (showToast) showToast("Senha incorreta.", "error");
    }
  }, [fixPassword, fixModal.desc, setCheckStatus, showToast]);

  // Fechar modais com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmPayModal.open) setConfirmPayModal({ open: false, desc: null });
        if (confirmSelectAllModal.open) setConfirmSelectAllModal({ open: false, day: null, count: 0, items: [] });
        if (fixModal.open) {
          setFixModal({ open: false, desc: null });
          setFixPassword('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmPayModal.open, confirmSelectAllModal.open, fixModal.open]);

  const getZoomStyles = () => {
    switch (zoomLevel) {
      case 0: return { height: 'h-16', textSize: 'text-[9px]', padding: 'p-1.5' };
      case 2: return { height: 'h-40', textSize: 'text-sm', padding: 'p-3' };
      default: return { height: 'h-28 md:h-36', textSize: 'text-[11px]', padding: 'p-2' };
    }
  };
  
  const zoomStyles = getZoomStyles();

  const getDayColorStyles = useCallback((day: number) => {
    switch (day) {
      case 5:
      case 10:
      case 15:
      case 20:
      case 25:
      case 27:
      case 29:
        return 'bg-amber-50/40 border-amber-200 hover:border-amber-400';
      default:
        return 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50';
    }
  }, []);

  const getDueDateBadgeColor = useCallback((day: number, isChecked: boolean) => {
    if (isChecked) return 'bg-slate-100 text-slate-400 border-slate-200';
    switch (day) {
      case 5: return 'bg-purple-50 text-purple-700 border-purple-200';
      case 10: return 'bg-amber-50 text-amber-700 border-amber-200';
      case 15: return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 20: return 'bg-purple-50 text-purple-700 border-purple-200';
      case 25: return 'bg-amber-50 text-amber-700 border-amber-200';
      case 27: return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 29: return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }, []);

  const uniqueFixedDays = useMemo(() => {
    return [...new Set(FIXED_NOTIFICATIONS.map(n => n.day))].sort((a, b) => a - b);
  }, [FIXED_NOTIFICATIONS]);

  const getFilterButtonClass = (day: number, isSelected: boolean) => {
    const baseClass = "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer";
    if (!isSelected) return `${baseClass} bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 shadow-xs`;
    return `${baseClass} bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold border border-amber-500 shadow-sm`;
  };

  const filteredNotifications = useMemo(() => {
    const list = FIXED_NOTIFICATIONS
      .filter(item => !item.months || item.months.includes(month + 1))
      .filter(item => selectedDayFilter === null || item.day === selectedDayFilter);

    const seen = new Set<string>();
    return list.filter(item => {
      const key = `${item.day}|${item.description.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [FIXED_NOTIFICATIONS, month, selectedDayFilter]);

  const pendingNotifications = useMemo(() => {
    return filteredNotifications.filter(item => {
      const key = `${year}-${month}-${item.description}`;
      return !checkedState[key];
    });
  }, [filteredNotifications, year, month, checkedState]);

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

  const confirmSelectAll = useCallback(() => {
    confirmSelectAllModal.items.forEach(item => {
      setCheckStatus(item.description, true);
    });
    const count = confirmSelectAllModal.items.length;
    setConfirmSelectAllModal({ open: false, day: null, count: 0, items: [] });
    if (showToast) {
      showToast(`${count} pagamento(s) confirmado(s) como pago(s)!`, "success");
    }
  }, [confirmSelectAllModal.items, setCheckStatus, showToast]);

  return (
    <div className="bg-white rounded-2xl overflow-hidden fade-in flex flex-col relative border border-slate-200/90 shadow-sm">
      {/* Modal Confirmar Pagamento Individual */}
      {confirmPayModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4 text-amber-600">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Confirmar Pagamento?</h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">{confirmPayModal.desc}</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmPayModal({ open: false, desc: null })}
                className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
              >
                Não
              </button>
              <button
                onClick={confirmPayment}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
              >
                Sim, Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Selecionar Todos */}
      {confirmSelectAllModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Confirmar Todos como Pagos?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Deseja marcar <strong>{confirmSelectAllModal.count} pagamento(s)</strong> {confirmSelectAllModal.day ? `do Dia ${confirmSelectAllModal.day}` : 'do filtro selecionado'} de <strong>{monthNames[month]} de {year}</strong> como pagos?
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto text-left text-xs space-y-1.5 mb-6">
              {confirmSelectAllModal.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-slate-700 py-1 border-b border-slate-100 last:border-0">
                  <span className="truncate font-medium">{it.description}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 ml-2">
                    Dia {it.day}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmSelectAllModal({ open: false, day: null, count: 0, items: [] })}
                className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSelectAll}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Sim, Confirmar Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Corrigir */}
      {fixModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm p-6 text-center rounded-2xl shadow-2xl">
            <div className="mx-auto w-12 h-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center mb-4 text-amber-600">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Corrigir Status</h3>
            <p className="text-xs text-slate-500 mb-5">Digite a senha de administrador.</p>
            <input
              type="password"
              autoFocus
              placeholder="Senha"
              value={fixPassword}
              onChange={e => setFixPassword(e.target.value)}
              className="liquid-input w-full px-4 py-2.5 rounded-lg text-center font-bold text-slate-900 mb-5 placeholder-slate-400 text-sm"
            />
            <div className="flex gap-2.5">
              <button
                onClick={() => setFixModal({ open: false, desc: null })}
                className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmFix}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
              >
                Corrigir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header do Calendário */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 gap-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4"/>
            </button>
            <button
              onClick={handleToday}
              className="px-3 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded transition-all uppercase tracking-wider cursor-pointer"
            >
              Hoje
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
          <h3 className="text-base font-bold tracking-tight text-slate-900">
            {monthNames[month]} <span className="text-slate-400 font-normal text-sm">{year}</span>
          </h3>
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0, prev - 1))}
            disabled={zoomLevel === 0}
            className={`p-1.5 rounded transition-all cursor-pointer ${zoomLevel === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.min(2, prev + 1))}
            disabled={zoomLevel === 2}
            className={`p-1.5 rounded transition-all cursor-pointer ${zoomLevel === 2 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Alerta de Sincronização */}
        {syncError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
              !
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-800 mb-0.5">Aviso de Sincronização</p>
              <p className="text-xs text-amber-700">{syncError}</p>
            </div>
          </div>
        )}

        {/* Grid do Calendário */}
        <div>
          <div className="grid grid-cols-7 mb-3">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
              <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
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
                  className={`rounded-xl border transition-all duration-200 ${zoomStyles.height} ${zoomStyles.padding} flex flex-col relative group overflow-hidden ${
                    isToday
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                      : getDayColorStyles(day)
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold transition-all ${
                        isToday
                          ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                          : 'text-slate-600 bg-slate-100'
                      }`}
                    >
                      {day}
                    </span>
                    {hasNotification && (
                      <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse"></div>
                    )}
                  </div>
                  {hasNotification && (
                    <div className="flex-1 overflow-y-auto space-y-1 mt-1">
                      {FIXED_NOTIFICATIONS.filter(
                        n => n.day === day && (!n.months || n.months.includes(month + 1))
                      ).map((note, idx) => (
                        <div
                          key={idx}
                          className={`bg-slate-100/90 border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-medium truncate ${zoomStyles.textSize}`}
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
        <div className="pt-6 border-t border-slate-200">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
            <div>
              <h4 className="font-bold text-slate-900 flex items-center gap-2.5 text-base">
                <CheckSquare className="w-5 h-5 text-amber-600"/>
                Pagamentos Fixos de {monthNames[month]}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Controle de Vencimentos</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full xl:w-auto">
              {uniqueFixedDays.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDayFilter(day === selectedDayFilter ? null : day)}
                  className={getFilterButtonClass(day, selectedDayFilter === day)}
                >
                  Dia {day}
                </button>
              ))}
              <button
                onClick={() => setSelectedDayFilter(null)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
                  selectedDayFilter === null
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredNotifications.map((item, idx) => {
              const key = `${year}-${month}-${item.description}`;
              const isChecked = !!checkedState[key];

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200 border ${
                    isChecked
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div 
                    className="relative flex items-center shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isChecked) {
                        initiatePayment(item.description);
                      }
                    }}
                  >
                    <div
                      className={`w-5 h-5 rounded-md transition-all cursor-pointer flex items-center justify-center border ${
                        !isChecked
                          ? 'border-slate-300 bg-slate-50 hover:border-amber-500'
                          : 'bg-emerald-500 border-emerald-500 text-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer select-none"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isChecked) {
                        initiatePayment(item.description);
                      }
                    }}
                  >
                    <p className={`font-medium text-xs truncate ${
                      isChecked ? "text-slate-400 line-through" : "text-slate-900 font-semibold"
                    }`}>
                      {item.description}
                    </p>
                    <span className={`text-[10px] mt-1 font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                      getDueDateBadgeColor(item.day, isChecked)
                    }`}>
                      <Calendar className="w-2.5 h-2.5" /> Dia {item.day}
                    </span>
                  </div>
                  {isChecked && (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Pago
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateFix(item.description);
                        }}
                        className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                      >
                        Corrigir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botão Selecionar Todos Abaixo dos Pagamentos */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-slate-200">
            <div className="text-xs text-slate-500 font-medium">
              {pendingNotifications.length > 0 ? (
                <span>
                  <strong className="text-slate-900 font-bold">{pendingNotifications.length}</strong> de <strong className="text-slate-900 font-bold">{filteredNotifications.length}</strong> pagamentos pendentes {selectedDayFilter ? `no Dia ${selectedDayFilter}` : 'neste filtro'}.
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Todos os {filteredNotifications.length} pagamentos do período estão confirmados!
                </span>
              )}
            </div>

            <button
              onClick={initiateSelectAll}
              disabled={pendingNotifications.length === 0}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                pendingNotifications.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-emerald-600/20 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                pendingNotifications.length > 0
                  ? `Marcar todos os ${pendingNotifications.length} pagamentos pendentes como pagos`
                  : 'Nenhum pagamento pendente para confirmar'
              }
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                Selecionar Todos {selectedDayFilter ? `(Dia ${selectedDayFilter})` : '(Todos)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ExpenseCalendar;
