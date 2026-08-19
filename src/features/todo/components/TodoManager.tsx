import React, { useState, useMemo } from 'react';
import {
  ListTodo,
  Sun,
  Star,
  Calendar,
  CheckCircle,
  Circle,
  Plus,
  Trash2,
  Bell,
  Volume2,
  Clock,
  User,
  Check,
  Search,
  Sparkles,
  RefreshCw,
  Edit,
  Tag
} from '@/shared/components/icons';
import { useTodo } from '../hooks/useTodo';
import type { TodoFilter, TodoItem, TodoRepeat } from '../types';
import { playNotificationSound, playSynthesizedBeep } from '@/shared/utils/audio';

interface TodoManagerProps {
  employeeName: string;
  userEmail: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TodoManager: React.FC<TodoManagerProps> = ({ employeeName, userEmail, showToast }) => {
  const { todos, isLoading, addTodo, toggleComplete, toggleImportant, deleteTodo, updateTodo } = useTodo(
    employeeName,
    userEmail
  );

  const [activeFilter, setActiveFilter] = useState<TodoFilter>('today');
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newRepeat, setNewRepeat] = useState<TodoRepeat>('none');
  const [newImportant, setNewImportant] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter tasks based on selected view
  const filteredTodos = useMemo(() => {
    let result = todos;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    switch (activeFilter) {
      case 'today':
        return result.filter((t) => !t.completed && (t.dueDate === todayStr || !t.dueDate));
      case 'important':
        return result.filter((t) => !t.completed && t.important);
      case 'planned':
        return result.filter((t) => !t.completed && !!t.dueDate);
      case 'completed':
        return result.filter((t) => t.completed);
      case 'all':
      default:
        return result.filter((t) => !t.completed);
    }
  }, [todos, activeFilter, searchTerm, todayStr]);

  // Counts
  const counts = useMemo(() => {
    return {
      today: todos.filter((t) => !t.completed && (t.dueDate === todayStr || !t.dueDate)).length,
      important: todos.filter((t) => !t.completed && t.important).length,
      planned: todos.filter((t) => !t.completed && !!t.dueDate).length,
      all: todos.filter((t) => !t.completed).length,
      completed: todos.filter((t) => t.completed).length
    };
  }, [todos, todayStr]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await addTodo(
      newTitle,
      newDueDate || (activeFilter === 'today' ? todayStr : undefined),
      newDueTime || undefined,
      newImportant,
      '',
      newRepeat
    );

    setNewTitle('');
    setNewDueDate('');
    setNewDueTime('');
    setNewRepeat('none');
    setNewImportant(false);
    showToast('Tarefa adicionada à sua lista!', 'success');
  };

  const handleTestSound = () => {
    playNotificationSound();
    showToast('Som de Bip testado com sucesso! 🔔', 'info');
  };

  const getRepeatLabel = (repeat?: TodoRepeat) => {
    switch (repeat) {
      case 'daily':
        return 'Diária';
      case 'weekly':
        return 'Semanal';
      case 'monthly':
        return 'Mensal';
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 fade-in no-print">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-lg">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Minhas Tarefas & To-Do
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Tarefas diárias, semanais e mensais recorrentes com Bip sonoro
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={handleTestSound}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            title="Testar alarme sonoro de Bip"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>Testar Bip Sonoro</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Filters Sidebar + Tasks List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1.5 h-fit">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
            Filtros To-Do
          </p>

          <button
            onClick={() => setActiveFilter('today')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'today'
                ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sun className={`w-4 h-4 ${activeFilter === 'today' ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Meu Dia</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {counts.today}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('important')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'important'
                ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className={`w-4 h-4 ${activeFilter === 'important' ? 'text-amber-500 fill-amber-400' : 'text-slate-400'}`} />
              <span>Importantes</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {counts.important}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('planned')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'planned'
                ? 'bg-cyan-50 text-cyan-900 font-bold border border-cyan-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className={`w-4 h-4 ${activeFilter === 'planned' ? 'text-cyan-600' : 'text-slate-400'}`} />
              <span>Planejadas</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
              {counts.planned}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ListTodo className={`w-4 h-4 ${activeFilter === 'all' ? 'text-slate-800' : 'text-slate-400'}`} />
              <span>Todas as Tarefas</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('completed')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'completed'
                ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className={`w-4 h-4 ${activeFilter === 'completed' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Concluídas</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {counts.completed}
            </span>
          </button>
        </div>

        {/* Task List & Input Container */}
        <div className="lg:col-span-3 space-y-5">
          {/* Quick Create Task Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setNewImportant((prev) => !prev)}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    newImportant ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                  }`}
                  title="Marcar como importante"
                >
                  <Star className={`w-4 h-4 ${newImportant ? 'fill-amber-400' : ''}`} />
                </button>
                <input
                  type="text"
                  placeholder="Adicionar uma tarefa à lista..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white text-sm font-medium text-slate-900 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              {/* Options: Date, Time & Recurrence pickers */}
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium text-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="time"
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium text-xs"
                  />
                </div>

                {/* Recurrence Selector */}
                <div className="flex items-center gap-1.5 text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                  <select
                    value={newRepeat}
                    onChange={(e) => setNewRepeat(e.target.value as TodoRepeat)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="none">Não repetir</option>
                    <option value="daily">Repetir Diariamente 🔁</option>
                    <option value="weekly">Repetir Semanalmente 🔁</option>
                    <option value="monthly">Repetir Mensalmente 🔁</option>
                  </select>
                </div>
              </div>
            </form>
          </div>

          {/* Search & Filter Info */}
          <div className="flex items-center justify-between gap-4 bg-white p-3 px-4 rounded-xl border border-slate-200/80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <span className="text-xs font-bold text-slate-500 shrink-0">
              {filteredTodos.length} tarefa(s)
            </span>
          </div>

          {/* Task Items List */}
          {isLoading ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium mt-3">Carregando tarefas...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">Nenhuma tarefa encontrada</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Sua lista está limpa! Adicione uma tarefa diária, semanal ou mensal para receber alertas de Bip.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTodos.map((task) => {
                const repeatText = getRepeatLabel(task.repeat);
                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 p-4 flex flex-col gap-2 ${
                      task.completed
                        ? 'border-slate-200 bg-slate-50/70 opacity-75'
                        : task.important
                        ? 'border-amber-300 shadow-sm bg-amber-50/20'
                        : 'border-slate-200/90 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Checkbox Button with Sound */}
                      <button
                        onClick={() => toggleComplete(task.id)}
                        className={`p-1 rounded-full transition-all cursor-pointer shrink-0 ${
                          task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-amber-500'
                        }`}
                        title={task.completed ? 'Marcar como pendente' : 'Concluir tarefa (Bip + Nova Ocorrência se recorrente)'}
                      >
                        {task.completed ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      {/* Title */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      >
                        <p
                          className={`text-sm font-semibold truncate ${
                            task.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </p>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {task.dueDate && (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                task.dueDate === todayStr
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              <Calendar className="w-2.5 h-2.5" />
                              {task.dueDate} {task.dueTime ? `@ ${task.dueTime}` : ''}
                            </span>
                          )}

                          {repeatText && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                              <RefreshCw className="w-2.5 h-2.5 text-cyan-600" />
                              {repeatText}
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            <User className="w-2.5 h-2.5 text-slate-400" />
                            {task.employeeName}
                          </span>
                        </div>
                      </div>

                      {/* Star & Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleImportant(task.id)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            task.important ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500'
                          }`}
                          title="Alternar prioridade importante"
                        >
                          <Star className={`w-4 h-4 ${task.important ? 'fill-amber-400' : ''}`} />
                        </button>

                        <button
                          onClick={() => deleteTodo(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Excluir tarefa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Notes & Recurrence Setting */}
                    {expandedTaskId === task.id && (
                      <div className="pt-3 border-t border-slate-100 mt-1 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                            Repetição Recorrente
                          </label>
                          <select
                            value={task.repeat || 'none'}
                            onChange={(e) => updateTodo(task.id, { repeat: e.target.value as TodoRepeat })}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                          >
                            <option value="none">Sem repetição</option>
                            <option value="daily">Diária (Todo dia) 🔁</option>
                            <option value="weekly">Semanal (Toda semana) 🔁</option>
                            <option value="monthly">Mensal (Todo mês) 🔁</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Observações & Anotações
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Adicionar notas adicionais..."
                            value={task.notes || ''}
                            onChange={(e) => updateTodo(task.id, { notes: e.target.value })}
                            className="liquid-input w-full p-2.5 text-xs rounded-xl font-normal text-slate-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
