import React from 'react';
import type { FixedNotification } from '@/shared/types';
import type { TodoItem } from '@/features/todo/types';
import { getTaskTitle } from '@/features/todo/utils/todoFilters';
import { WEEKDAY_LABELS, getDayColorStyles, toDateKey } from '../utils/calendarView';

interface CalendarGridProps {
  year: number;
  month: number;
  daysInMonth: number;
  firstDay: number;
  isCurrentMonthToday: boolean;
  todayDayOfMonth: number;
  zoomStyles: { height: string; textSize: string; padding: string };
  paymentsByDay: Record<number, FixedNotification[]>;
  todosByDay: Record<string, TodoItem[]>;
  onSelectTodo: (todo: TodoItem) => void;
}

/** Grade do mês: cada dia mostra os pagamentos fixos e as tarefas agendadas */
export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  daysInMonth,
  firstDay,
  isCurrentMonthToday,
  todayDayOfMonth,
  zoomStyles,
  paymentsByDay,
  todosByDay,
  onSelectTodo,
}) => (
  <div>
    <div className="grid grid-cols-7 mb-3">
      {WEEKDAY_LABELS.map(d => (
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
        const isToday = isCurrentMonthToday && day === todayDayOfMonth;
        const dayStr = toDateKey(year, month, day);
        const dayTodos = todosByDay[dayStr] ?? [];
        const dayPayments = paymentsByDay[day] ?? [];

        const hasNotification = dayPayments.length > 0;
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
                {dayPayments.map((note) => (
                  <div
                    key={note.id ?? `note-${note.day}-${note.description}`}
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
                      onSelectTodo(todo);
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
                      <span className="truncate">{getTaskTitle(todo, 'Tarefa sem título')}</span>
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
);
