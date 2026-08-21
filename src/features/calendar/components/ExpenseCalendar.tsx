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
  ZoomOut,
  ListTodo,
  ExternalLink,
  Mail,
  Star,
  CheckCircle,
  Circle,
  Clock
} from '@/shared/components/icons';
import type { FixedNotification } from '@/shared/types';
import type { TodoItem } from '@/features/todo/types';
import { openGoogleCalendar, openInGmail } from '@/features/todo/utils/calendarIntegration';
import { getCachedTodos, updateTodoDoc } from '@/features/todo/services/todoService';
import { playTodoAlertSound, playSynthesizedBeep } from '@/shared/utils/audio';

export interface ExpenseCalendarProps {
  fixedPayments: FixedNotification[];
  checkedState: Record<string, boolean>;
  onToggleCheck: (key: string, status: boolean) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  syncError?: string | null;
  todos?: TodoItem[];
  onToggleTodo?: (id: string) => void;
}

export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = memo(({
  fixedPayments,
  checkedState,
  onToggleCheck,
  showToast,
  syncError,
  todos: propTodos,
  onToggleTodo
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

  // To-Do Integration State
  const [internalTodos, setInternalTodos] = useState<TodoItem[]>(() => propTodos || getCachedTodos());
  const [selectedTodoModal, setSelectedTodoModal] = useState<TodoItem | null>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'todos' | 'all'>('payments');

  useEffect(() => {
    if (propTodos) {
      setInternalTodos(propTodos);
    }
  }, [propTodos]);

  const handleToggleTodo = useCallback(async (id: string) => {
    if (onToggleTodo) {
      onToggleTodo(id);
      return;
    }
    const target = internalTodos.find((t) => t.id === id);
    if (!target) return;
    const nextCompleted = !target.completed;
    const completedAt = nextCompleted ? new Date().toISOString() : undefined;
    if (nextCompleted) playTodoAlertSound();
    else playSynthesizedBeep();
    setInternalTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: nextCompleted, completedAt } : t))
    );
    await updateTodoDoc(id, { completed: nextCompleted, completedAt });
  }, [onToggleTodo, internalTodos]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // Tarefas To-Do com data de vencimento dentro do mês/ano exibido
  const monthTodos = useMemo(() => {
    const list = propTodos || internalTodos;
    const monthPad = String(month + 1).padStart(2, '0');
    const monthPrefix = `${year}-${monthPad}`;
    return list.filter((t) => t.dueDate && t.dueDate.startsWith(monthPrefix));
  }, [propTodos, internalTodos, year, month]);

  const filteredMonthTodos = useMemo(() => {
    if (selectedDayFilter === null) return monthTodos;
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDayFilter).padStart(2, '0')}`;
    return monthTodos.filter((t) => t.dueDate === targetDateStr);
  }, [monthTodos, year, month, selectedDayFilter]);

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
        if (selectedTodoModal) setSelectedTodoModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmPayModal.open, confirmSelectAllModal.open, fixModal.open, selectedTodoModal]);

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

        {/* Modal Detalhes Rápidos da Tarefa no Calendário */}
        {selectedTodoModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold text-slate-900 ${selectedTodoModal.completed ? 'line-through text-slate-400' : ''}`}>
                      {selectedTodoModal.title}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                      selectedTodoModal.completed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {selectedTodoModal.completed ? '✅ Concluída' : '⏳ Pendente'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTodoModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detalhes */}
              <div className="space-y-2.5 text-xs">
                {selectedTodoModal.dueDate && (
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                    <Calendar className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span className="font-semibold">Vencimento:</span>
                    <span>{formatDateBR(selectedTodoModal.dueDate)}</span>
                    {selectedTodoModal.dueTime && (
                      <span className="font-mono text-slate-500">às {selectedTodoModal.dueTime}</span>
                    )}
                  </div>
                )}

                {selectedTodoModal.assignedTo && (
                  <div className="flex items-center gap-2 text-slate-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-200/70">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">Atribuído a:</span>
                    <span className="font-medium text-emerald-900">{selectedTodoModal.assignedToName || selectedTodoModal.assignedTo}</span>
                  </div>
                )}

                {selectedTodoModal.notes && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Anotações:</p>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedTodoModal.notes}</p>
                  </div>
                )}

                {selectedTodoModal.steps && selectedTodoModal.steps.length > 0 && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Etapas ({selectedTodoModal.steps.filter(s => s.completed).length}/{selectedTodoModal.steps.length}):
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedTodoModal.steps.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-[11px] text-slate-700">
                          <span>{s.completed ? '✅' : '⬜'}</span>
                          <span className={s.completed ? 'line-through text-slate-400' : ''}>{s.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleTodo(selectedTodoModal.id);
                    setSelectedTodoModal((prev) => prev ? { ...prev, completed: !prev.completed } : null);
                    if (showToast) showToast(selectedTodoModal.completed ? 'Marcada como pendente' : 'Tarefa concluída!', 'success');
                  }}
                  className={`flex-1 py-2 px-3 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedTodoModal.completed
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{selectedTodoModal.completed ? 'Reabrir Tarefa' : 'Concluir Tarefa'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openGoogleCalendar(selectedTodoModal);
                    if (showToast) showToast('Abrindo Google Agenda com evento configurado! 📅', 'info');
                  }}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Adicionar ao Google Agenda"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Agenda</span>
                </button>

                {selectedTodoModal.assignedTo && (
                  <button
                    type="button"
                    onClick={() => {
                      openInGmail(selectedTodoModal);
                      if (showToast) showToast('Abrindo Gmail...', 'info');
                    }}
                    className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                    title="Notificar por Gmail"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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
              const dayPad = String(day).padStart(2, '0');
              const monthPad = String(month + 1).padStart(2, '0');
              const dayStr = `${year}-${monthPad}-${dayPad}`;
              const dayTodos = monthTodos.filter(t => t.dueDate === dayStr);

              const hasNotification = FIXED_NOTIFICATIONS.some(
                n => n.day === day && (!n.months || n.months.includes(month + 1))
              );
              const hasActiveItems = hasNotification || dayTodos.some(t => !t.completed);

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
                    {hasActiveItems && (
                      <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse"></div>
                    )}
                  </div>

                  {(hasNotification || dayTodos.length > 0) && (
                    <div className="flex-1 overflow-y-auto space-y-1 mt-1">
                      {/* Pagamentos Fixos */}
                      {FIXED_NOTIFICATIONS.filter(
                        n => n.day === day && (!n.months || n.months.includes(month + 1))
                      ).map((note, idx) => (
                        <div
                          key={`note-${idx}`}
                          className={`bg-slate-100/90 border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-medium truncate ${zoomStyles.textSize}`}
                          title={`Pagamento: ${note.description}`}
                        >
                          {note.description}
                        </div>
                      ))}

                      {/* Tarefas To-Do Agendadas para o Dia */}
                      {dayTodos.map((todo) => (
                        <div
                          key={`todo-${todo.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTodoModal(todo);
                          }}
                          className={`px-1.5 py-0.5 rounded font-medium truncate flex items-center justify-between gap-1 border transition-all cursor-pointer shadow-2xs ${zoomStyles.textSize} ${
                            todo.completed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through opacity-70'
                              : todo.important
                              ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                              : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                          }`}
                          title={`Tarefa: ${todo.title}${todo.dueTime ? ` @ ${todo.dueTime}` : ''} (Clique para detalhes)`}
                        >
                          <div className="flex items-center gap-1 min-w-0 truncate">
                            <span className="text-[10px] shrink-0">{todo.completed ? '✅' : '📋'}</span>
                            <span className="truncate">{todo.title}</span>
                          </div>
                          {todo.dueTime && (
                            <span className="text-[9px] font-mono opacity-80 shrink-0 hidden sm:inline">{todo.dueTime}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Seção de Pagamentos Fixos & Tarefas To-Do */}
        <div className="pt-6 border-t border-slate-200">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                  {activeTab === 'todos' ? (
                    <>
                      <ListTodo className="w-5 h-5 text-blue-600" />
                      Tarefas Agendadas de {monthNames[month]}
                    </>
                  ) : activeTab === 'all' ? (
                    <>
                      <Calendar className="w-5 h-5 text-purple-600" />
                      Visão Completa do Mês ({monthNames[month]})
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-5 h-5 text-amber-600" />
                      Pagamentos Fixos de {monthNames[month]}
                    </>
                  )}
                </h4>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {activeTab === 'todos'
                  ? 'Compromissos e Tarefas com Data'
                  : activeTab === 'all'
                  ? 'Pagamentos e Tarefas Unificados'
                  : 'Controle de Vencimentos'}
              </p>
            </div>

            {/* Seletor de Abas (Pagamentos / Tarefas / Todos) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'payments'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>Pagamentos ({filteredNotifications.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('todos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'todos'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5 text-blue-500" />
                <span>Tarefas To-Do ({filteredMonthTodos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Todos ({filteredNotifications.length + filteredMonthTodos.length})</span>
              </button>
            </div>

            {/* Filtro por Dia */}
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

          {/* Conteúdo da Aba Selecionada */}
          <div className="space-y-6">
            {/* Lista de Pagamentos Fixos (Visível em 'payments' e 'all') */}
            {(activeTab === 'payments' || activeTab === 'all') && (
              <div className="space-y-3">
                {activeTab === 'all' && (
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-500" /> Pagamentos Fixos
                  </h5>
                )}

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
            )}

            {/* Lista de Tarefas To-Do Agendadas (Visível em 'todos' e 'all') */}
            {(activeTab === 'todos' || activeTab === 'all') && (
              <div className="space-y-3 pt-2">
                {activeTab === 'all' && (
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-blue-500" /> Tarefas To-Do Agendadas ({filteredMonthTodos.length})
                  </h5>
                )}

                {filteredMonthTodos.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-slate-400">
                    <ListTodo className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-700">Nenhuma tarefa To-Do agendada para este filtro</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Você pode criar tarefas com data de vencimento no módulo Tarefas & To-Do.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredMonthTodos.map((todo) => {
                      const isDone = todo.completed;
                      const dayNumber = todo.dueDate ? parseInt(todo.dueDate.split('-')[2], 10) : null;

                      return (
                        <div
                          key={todo.id}
                          className={`flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200 border ${
                            isDone
                              ? 'bg-slate-50 border-slate-200 opacity-60'
                              : todo.important
                              ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                              : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          {/* Checkbox */}
                          <div
                            className="relative flex items-center shrink-0 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTodo(todo.id);
                              if (showToast) showToast(isDone ? 'Tarefa reaberta' : 'Tarefa concluída! 🎉', 'success');
                            }}
                          >
                            <div
                              className={`w-5 h-5 rounded-md transition-all flex items-center justify-center border ${
                                !isDone
                                  ? 'border-slate-300 bg-slate-50 hover:border-emerald-500'
                                  : 'bg-emerald-500 border-emerald-500 text-white'
                              }`}
                            >
                              {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Task info */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer select-none"
                            onClick={() => setSelectedTodoModal(todo)}
                          >
                            <div className="flex items-center gap-1.5">
                              <p className={`font-medium text-xs truncate ${
                                isDone ? "text-slate-400 line-through" : "text-slate-900 font-semibold"
                              }`}>
                                {todo.title}
                              </p>
                              {todo.important && <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {dayNumber && (
                                <span className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                  <Calendar className="w-2.5 h-2.5" /> Dia {dayNumber}
                                  {todo.dueTime ? ` @ ${todo.dueTime}` : ''}
                                </span>
                              )}
                              {todo.assignedTo && (
                                <span className="text-[10px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Mail className="w-2.5 h-2.5 text-emerald-600" />
                                  <span className="max-w-[120px] truncate">{todo.assignedToName || todo.assignedTo}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Action buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openGoogleCalendar(todo);
                                if (showToast) showToast('Abrindo Google Agenda... 📅', 'info');
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Adicionar / Abrir no Google Agenda"
                            >
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            </button>

                            {todo.assignedTo && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInGmail(todo);
                                  if (showToast) showToast('Abrindo Gmail...', 'info');
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Abrir no Gmail"
                              >
                                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ExpenseCalendar;
