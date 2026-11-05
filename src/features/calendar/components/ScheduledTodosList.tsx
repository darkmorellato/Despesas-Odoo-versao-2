import React from 'react';
import type { TodoItem } from '@/features/todo/types';
import { Calendar, Check, ListTodo, Mail, Star } from '@/shared/components/icons';
import { openGoogleCalendar, openInGmail } from '@/features/todo/utils/calendarIntegration';
import { getTaskTitle } from '@/features/todo/utils/todoFilters';

interface ScheduledTodosListProps {
  /** 'all' acrescenta o subtítulo com a contagem */
  activeTab: 'payments' | 'todos' | 'all';
  filteredMonthTodos: TodoItem[];
  handleToggleTodo: (id: string) => void | Promise<void>;
  showToast: ((message: string, type?: 'success' | 'error' | 'info') => void) | undefined;
  onSelectTodo: (todo: TodoItem) => void;
}

/** Tarefas To-Do com vencimento no mês (concluir, abrir detalhes, Google Agenda, Gmail) */
export const ScheduledTodosList: React.FC<ScheduledTodosListProps> = ({
  activeTab,
  filteredMonthTodos,
  handleToggleTodo,
  showToast,
  onSelectTodo,
}) => (
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
                onClick={() => onSelectTodo(todo)}
              >
                <div className="flex items-center gap-1.5">
                  <p className={`font-medium text-xs truncate ${
                    isDone ? "text-slate-400 line-through" : "text-slate-900 font-semibold"
                  }`}>
                    {getTaskTitle(todo, 'Tarefa sem título')}
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
);
