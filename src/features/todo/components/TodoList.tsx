import React from 'react';
import { AlertTriangle, Calendar, CheckCircle, ChevronRight, Sun } from '@/shared/components/icons';
import type { TodoFilter, TodoItem } from '../types';
import { splitMyDay } from '../utils/todoFilters';
import { TodoTaskCard } from './TodoTaskCard';

interface TodoListProps {
  isLoading: boolean;
  /** Tarefas do filtro ativo (já filtradas e buscadas) */
  filteredTodos: TodoItem[];
  /** Todas as tarefas (para contar as agendadas no futuro) */
  todos: TodoItem[];
  activeFilter: TodoFilter;
  todayStr: string;
  selectedId: string | null;
  onSelect: (task: TodoItem) => void;
  onToggleComplete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onGoogleCalendar: (task: TodoItem) => void;
  onOpenGmail: (task: TodoItem) => void;
  onShowPlanned: () => void;
}

/** Lista de tarefas: carregando, vazia, "Meu Dia" por seções ou lista simples */
export const TodoList: React.FC<TodoListProps> = ({
  isLoading,
  filteredTodos,
  todos,
  activeFilter,
  todayStr,
  selectedId,
  onSelect,
  onToggleComplete,
  onToggleImportant,
  onGoogleCalendar,
  onOpenGmail,
  onShowPlanned,
}) => {
  return (
    isLoading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium mt-3">Sincronizando tarefas...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">Nenhuma tarefa encontrada</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Adicione uma nova tarefa ou selecione outro filtro para visualizar seus itens.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const renderTaskCard = (task: TodoItem) => (
                  <TodoTaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedId === task.id}
                    todayStr={todayStr}
                    onSelect={onSelect}
                    onToggleComplete={onToggleComplete}
                    onToggleImportant={onToggleImportant}
                    onGoogleCalendar={onGoogleCalendar}
                    onOpenGmail={onOpenGmail}
                  />
                );

                if (activeFilter === 'today') {
                  const {
                    overdue: overdueTasks,
                    today: todayTasks,
                    completed: completedToday,
                    upcomingCount
                  } = splitMyDay(filteredTodos, todos, todayStr);

                  return (
                    <div className="space-y-4">
                      {/* Seção de Tarefas Atrasadas (se houver) */}
                      {overdueTasks.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 px-1 pt-1">
                            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Atrasadas ({overdueTasks.length})
                            </span>
                          </div>
                          <div className="space-y-2">{overdueTasks.map(renderTaskCard)}</div>
                        </div>
                      )}

                      {/* Seção Hoje & Sem Data */}
                      <div className="space-y-2">
                        {(overdueTasks.length > 0 || completedToday.length > 0) && (
                          <div className="flex items-center gap-2 px-1 pt-1">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                              <Sun className="w-3.5 h-3.5 text-amber-500" /> Tarefas de Hoje ({todayTasks.length})
                            </span>
                          </div>
                        )}
                        {todayTasks.length === 0 ? (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                            <p className="text-xs text-slate-500 font-medium">
                              {completedToday.length > 0
                                ? '🎉 Parabéns! Todas as tarefas de hoje foram concluídas.'
                                : 'Nenhuma tarefa pendente para hoje.'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">{todayTasks.map(renderTaskCard)}</div>
                        )}
                      </div>

                      {/* Seção Tarefas Concluídas */}
                      {completedToday.length > 0 && (
                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Concluídas ({completedToday.length})
                            </span>
                          </div>
                          <div className="space-y-2">{completedToday.map(renderTaskCard)}</div>
                        </div>
                      )}

                      {/* Aviso de Tarefas Futuras Agendadas */}
                      {upcomingCount > 0 && (
                        <div className="p-3 bg-cyan-50/60 border border-cyan-200/80 rounded-xl flex items-center justify-between text-xs text-cyan-900 mt-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-cyan-600 shrink-0" />
                            <span>Você tem <strong>{upcomingCount}</strong> tarefa(s) agendada(s) para datas futuras.</span>
                          </div>
                          <button
                            type="button"
                            onClick={onShowPlanned}
                            className="font-bold text-cyan-700 hover:text-cyan-900 hover:underline flex items-center gap-0.5 cursor-pointer text-xs shrink-0"
                          >
                            Ver Planejadas <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                return <div className="space-y-2">{filteredTodos.map(renderTaskCard)}</div>;
              })()}
            </div>
          )
  );
};
