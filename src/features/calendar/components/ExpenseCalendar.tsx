import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import type { FixedNotification } from '@/shared/types';
import type { TodoItem } from '@/features/todo/types';
import { useCalendarTodos } from '../hooks/useCalendarTodos';
import { useCalendarPayments } from '../hooks/useCalendarPayments';
import {
  MONTH_NAMES,
  filterTodosByDay,
  getFilteredPayments,
  getMonthGrid,
  getMonthTodos,
  getPendingPayments,
  getUniqueFixedDays,
  getZoomStyles,
  groupPaymentsByDay,
  groupTodosByDate,
} from '../utils/calendarView';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { CalendarSectionHeader, type CalendarTab } from './CalendarSectionHeader';
import { PaymentsList } from './PaymentsList';
import { ScheduledTodosList } from './ScheduledTodosList';
import { TodoQuickModal } from './TodoQuickModal';
import { ConfirmPayModal, ConfirmSelectAllModal, FixPasswordModal } from './PaymentModals';

export interface ExpenseCalendarProps {
  fixedPayments: FixedNotification[];
  checkedState: Record<string, boolean>;
  onToggleCheck: (key: string, status: boolean) => void;
  /** Escrita em lote opcional (ex.: `setManyChecks` do useCalendar) — UMA única escrita no Firestore */
  setManyChecks?: (entries: { key: string; status: boolean }[]) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  syncError?: string | null;
  todos?: TodoItem[];
  onToggleTodo?: (id: string) => void;
}

/**
 * Calendário mensal de pagamentos fixos e tarefas. Este componente só orquestra
 * o estado da tela; regras em `utils/calendarView`, fluxos de pagamento em
 * `useCalendarPayments`, tarefas em `useCalendarTodos` e cada região da tela em
 * seu próprio componente.
 */
export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = memo(({
  fixedPayments,
  checkedState,
  onToggleCheck,
  setManyChecks,
  showToast,
  syncError,
  todos: propTodos,
  onToggleTodo
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1);
  // Sem filtro por padrão: a lista de pagamentos fica visível desde o início
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<CalendarTab>('payments');

  const { internalTodos, selectedTodoModal, setSelectedTodoModal, handleToggleTodo } =
    useCalendarTodos({ propTodos, onToggleTodo });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { daysInMonth, firstDay } = getMonthGrid(year, month);

  // "Hoje" calculado uma única vez por render — evita ~62 `new Date()` por
  // iteração do grid a cada toggle/interação
  const todayDate = new Date();
  const todayDayOfMonth = todayDate.getDate();
  const isCurrentMonthToday = month === todayDate.getMonth() && year === todayDate.getFullYear();

  // Tarefas To-Do com data de vencimento dentro do mês/ano exibido
  const monthTodos = useMemo(() => getMonthTodos(internalTodos, year, month), [internalTodos, year, month]);
  const filteredMonthTodos = useMemo(
    () => filterTodosByDay(monthTodos, year, month, selectedDayFilter),
    [monthTodos, year, month, selectedDayFilter]
  );

  // Índices memoizados por dia: evita refiltrar as listas a cada toggle
  const paymentsByDay = useMemo(() => groupPaymentsByDay(fixedPayments, month), [fixedPayments, month]);
  const todosByDay = useMemo(() => groupTodosByDate(monthTodos), [monthTodos]);
  const uniqueFixedDays = useMemo(() => getUniqueFixedDays(fixedPayments), [fixedPayments]);
  const filteredNotifications = useMemo(
    () => getFilteredPayments(fixedPayments, month, selectedDayFilter),
    [fixedPayments, month, selectedDayFilter]
  );
  const pendingNotifications = useMemo(
    () => getPendingPayments(filteredNotifications, checkedState, year, month),
    [filteredNotifications, year, month, checkedState]
  );

  const payments = useCalendarPayments({
    year, month, pendingNotifications, selectedDayFilter, onToggleCheck, setManyChecks, showToast
  });
  const {
    confirmPayModal, cancelPay, confirmPayment,
    confirmSelectAllModal, cancelSelectAll, confirmSelectAll,
    fixModal, fixPassword, setFixPassword, cancelFix, confirmFix,
  } = payments;

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1));
  }, [year, month]);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1));
  }, [year, month]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Fechar modais com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmPayModal.open) cancelPay();
        if (confirmSelectAllModal.open) cancelSelectAll();
        if (fixModal.open) {
          cancelFix();
          setFixPassword('');
        }
        if (selectedTodoModal) setSelectedTodoModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    confirmPayModal.open, confirmSelectAllModal.open, fixModal.open, selectedTodoModal,
    cancelPay, cancelSelectAll, cancelFix, setFixPassword, setSelectedTodoModal,
  ]);

  const monthName = MONTH_NAMES[month];
  const zoomStyles = getZoomStyles(zoomLevel);

  return (
    <div className="bg-white rounded-2xl overflow-hidden fade-in flex flex-col relative border border-slate-200/90 shadow-sm">
      {confirmPayModal.open && (
        <ConfirmPayModal desc={confirmPayModal.desc} onCancel={cancelPay} onConfirm={confirmPayment} />
      )}

      {confirmSelectAllModal.open && (
        <ConfirmSelectAllModal
          count={confirmSelectAllModal.count}
          day={confirmSelectAllModal.day}
          items={confirmSelectAllModal.items}
          monthName={monthName}
          year={year}
          onCancel={cancelSelectAll}
          onConfirm={confirmSelectAll}
        />
      )}

      {fixModal.open && (
        <FixPasswordModal
          password={fixPassword}
          onPasswordChange={setFixPassword}
          onCancel={cancelFix}
          onConfirm={confirmFix}
        />
      )}

      <CalendarHeader
        monthName={monthName}
        year={year}
        zoomLevel={zoomLevel}
        onPrev={handlePrevMonth}
        onToday={handleToday}
        onNext={handleNextMonth}
        onZoomOut={() => setZoomLevel(prev => Math.max(0, prev - 1))}
        onZoomIn={() => setZoomLevel(prev => Math.min(2, prev + 1))}
      />

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

        {selectedTodoModal && (
          <TodoQuickModal
            todo={selectedTodoModal}
            setTodo={setSelectedTodoModal}
            handleToggleTodo={handleToggleTodo}
            showToast={showToast}
          />
        )}

        <CalendarGrid
          year={year}
          month={month}
          daysInMonth={daysInMonth}
          firstDay={firstDay}
          isCurrentMonthToday={isCurrentMonthToday}
          todayDayOfMonth={todayDayOfMonth}
          zoomStyles={zoomStyles}
          paymentsByDay={paymentsByDay}
          todosByDay={todosByDay}
          onSelectTodo={setSelectedTodoModal}
        />

        {/* Seção de Pagamentos Fixos & Tarefas To-Do */}
        <div className="pt-6 border-t border-slate-200">
          <CalendarSectionHeader
            monthName={monthName}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            filteredNotificationsCount={filteredNotifications.length}
            filteredMonthTodosCount={filteredMonthTodos.length}
            uniqueFixedDays={uniqueFixedDays}
            selectedDayFilter={selectedDayFilter}
            setSelectedDayFilter={setSelectedDayFilter}
          />

          {/* Conteúdo da Aba Selecionada */}
          <div className="space-y-6">
            {(activeTab === 'payments' || activeTab === 'all') && (
              <PaymentsList
                activeTab={activeTab}
                filteredNotifications={filteredNotifications}
                pendingNotifications={pendingNotifications}
                checkedState={checkedState}
                year={year}
                month={month}
                selectedDayFilter={selectedDayFilter}
                initiatePayment={payments.initiatePayment}
                initiateFix={payments.initiateFix}
                initiateSelectAll={payments.initiateSelectAll}
              />
            )}

            {(activeTab === 'todos' || activeTab === 'all') && (
              <ScheduledTodosList
                activeTab={activeTab}
                filteredMonthTodos={filteredMonthTodos}
                handleToggleTodo={handleToggleTodo}
                showToast={showToast}
                onSelectTodo={setSelectedTodoModal}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ExpenseCalendar;
