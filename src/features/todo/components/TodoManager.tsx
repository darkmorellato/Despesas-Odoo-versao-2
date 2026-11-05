import React, { useState, useMemo } from 'react';
import { Search } from '@/shared/components/icons';
import { useTodo } from '../hooks/useTodo';
import { useSavedContacts } from '../hooks/useSavedContacts';
import { useTodoComposer } from '../hooks/useTodoComposer';
import { useTodoIntegrations } from '../hooks/useTodoIntegrations';
import type { TodoFilter, TodoItem } from '../types';
import { getTodayLocal } from '@/shared/utils/formatters';
import { countTodos, filterTodos, getFilterHeaderText } from '../utils/todoFilters';
import { TodoBanner } from './TodoBanner';
import { TodoSidebar } from './TodoSidebar';
import { TodoQuickAdd } from './TodoQuickAdd';
import { TodoList } from './TodoList';
import { TodoDetailDrawer } from './TodoDetailDrawer';
import { getFilterStyle } from './todoFilterConfig';

interface TodoManagerProps {
  employeeName: string;
  userEmail: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  todoData?: ReturnType<typeof useTodo>;
}

/**
 * Tela de tarefas (estilo Microsoft To Do): listas, criação rápida, lista de
 * tarefas e painel de detalhes. Este componente só orquestra o estado da tela;
 * regras em `utils/todoFilters`, formulário em `useTodoComposer` e cada região
 * da tela em seu próprio componente.
 */
export const TodoManager: React.FC<TodoManagerProps> = ({
  employeeName,
  userEmail,
  showToast,
  todoData: propTodoData
}) => {
  // enabled=false quando todoData (prop) é passado: evita listener/intervalo duplicados (bips duplos)
  const localTodoData = useTodo(employeeName, userEmail, !propTodoData);
  const {
    todos,
    isLoading,
    addTodo,
    toggleComplete,
    toggleImportant,
    deleteTodo,
    updateTodo,
    addStep,
    toggleStep,
    deleteStep
  } = propTodoData || localTodoData;

  const [activeFilter, setActiveFilter] = useState<TodoFilter>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<TodoItem | null>(null);

  const { savedContacts, rememberContact } = useSavedContacts();
  const todayStr = useMemo(() => getTodayLocal(), []);
  const composer = useTodoComposer({ addTodo, showToast, activeFilter, todayStr, rememberContact });
  const { handleGoogleCalendarSync, handleOpenGmail, handleDownloadIcs } = useTodoIntegrations(showToast);

  // Format today's date for "Meu Dia" header
  const todayFormatted = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(d);
  }, []);

  // Sync selected task with latest todos state
  const activeTask = useMemo(() => {
    if (!selectedTask) return null;
    return todos.find((t) => t.id === selectedTask.id) || null;
  }, [todos, selectedTask]);

  const filteredTodos = useMemo(
    () => filterTodos(todos, { filter: activeFilter, searchTerm, userEmail, todayStr }),
    [todos, activeFilter, searchTerm, userEmail, todayStr]
  );
  const counts = useMemo(() => countTodos(todos, { userEmail, todayStr }), [todos, todayStr, userEmail]);

  const headerText = getFilterHeaderText(activeFilter, todayFormatted);
  const { Icon: HeaderIcon, className: headerIconClass } = getFilterStyle(activeFilter).headerIcon;

  const selectFilter = (filter: TodoFilter) => {
    setActiveFilter(filter);
    setSelectedTask(null);
  };

  return (
    <div className="space-y-6 fade-in no-print">
      <TodoBanner showToast={showToast} />

      {/* Main Grid: Sidebar + Tasks + Slide-out Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <TodoSidebar activeFilter={activeFilter} counts={counts} onSelect={selectFilter} />

        {/* Central Tasks List Area */}
        <div className={`${activeTask ? 'lg:col-span-5' : 'lg:col-span-9'} space-y-4 transition-all`}>
          {/* Header of Active View */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <HeaderIcon className={headerIconClass} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {headerText.title}
                </h3>
                <p className="text-xs text-slate-500 capitalize">{headerText.subtitle}</p>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-44 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          <TodoQuickAdd composer={composer} userEmail={userEmail} savedContacts={savedContacts} />

          <TodoList
            isLoading={isLoading}
            filteredTodos={filteredTodos}
            todos={todos}
            activeFilter={activeFilter}
            todayStr={todayStr}
            selectedId={activeTask?.id ?? null}
            onSelect={setSelectedTask}
            onToggleComplete={toggleComplete}
            onToggleImportant={toggleImportant}
            onGoogleCalendar={handleGoogleCalendarSync}
            onOpenGmail={handleOpenGmail}
            onShowPlanned={() => setActiveFilter('planned')}
          />
        </div>

        {/* Right Task Detail Drawer (Estilo Microsoft To Do) */}
        {activeTask && (
          <TodoDetailDrawer
            activeTask={activeTask}
            savedContacts={savedContacts}
            rememberContact={rememberContact}
            toggleComplete={toggleComplete}
            toggleImportant={toggleImportant}
            updateTodo={updateTodo}
            addStep={addStep}
            toggleStep={toggleStep}
            deleteStep={deleteStep}
            onGoogleCalendar={handleGoogleCalendarSync}
            onDownloadIcs={handleDownloadIcs}
            onOpenGmail={handleOpenGmail}
            onDelete={(id) => {
              deleteTodo(id);
              setSelectedTask(null);
              showToast('Tarefa excluída', 'info');
            }}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    </div>
  );
};

export default TodoManager;
