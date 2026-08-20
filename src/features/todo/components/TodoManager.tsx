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
  Volume2,
  Clock,
  User,
  Search,
  RefreshCw,
  Mail,
  ExternalLink,
  Send,
  X,
  ChevronRight,
  Download
} from '@/shared/components/icons';
import { useTodo } from '../hooks/useTodo';
import type { TodoFilter, TodoItem, TodoRepeat } from '../types';
import { playCalendarAlertSound, playTodoAlertSound } from '@/shared/utils/audio';
import { getTodayLocal } from '@/shared/utils/formatters';
import {
  openGoogleCalendar,
  openInGmail,
  downloadIcsFile,
  getSavedContacts,
  saveContact
} from '../utils/calendarIntegration';

interface TodoManagerProps {
  employeeName: string;
  userEmail: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TodoManager: React.FC<TodoManagerProps> = ({ employeeName, userEmail, showToast }) => {
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
  } = useTodo(employeeName, userEmail);

  const [activeFilter, setActiveFilter] = useState<TodoFilter>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<TodoItem | null>(null);

  // New task quick bar state
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newRepeat, setNewRepeat] = useState<TodoRepeat>('none');
  const [newImportant, setNewImportant] = useState(false);
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newAssignedToName, setNewAssignedToName] = useState('');
  const [showQuickOptions, setShowQuickOptions] = useState(false);

  // Detail panel step input
  const [newStepTitle, setNewStepTitle] = useState('');

  // Saved contacts state for auto-suggestions
  const [savedContacts, setSavedContacts] = useState<string[]>(() => getSavedContacts());
  const [isTypingCustomEmail, setIsTypingCustomEmail] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');

  const todayStr = useMemo(() => getTodayLocal(), []);

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

  // Filter tasks based on selected view
  const filteredTodos = useMemo(() => {
    let result = todos;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (t.assignedTo && t.assignedTo.toLowerCase().includes(q)) ||
          (t.assignedToName && t.assignedToName.toLowerCase().includes(q)) ||
          t.steps?.some((s) => s.title.toLowerCase().includes(q))
      );
    }

    switch (activeFilter) {
      case 'today':
        return result.filter((t) => !t.completed && (t.dueDate === todayStr || !t.dueDate));
      case 'important':
        return result.filter((t) => !t.completed && t.important);
      case 'planned':
        return result.filter((t) => !t.completed && !!t.dueDate);
      case 'assigned':
        return result.filter(
          (t) =>
            !t.completed &&
            (t.assignedTo?.toLowerCase() === userEmail.toLowerCase() ||
              t.userEmail.toLowerCase() === userEmail.toLowerCase() ||
              !!t.assignedTo)
        );
      case 'completed':
        return result.filter((t) => t.completed);
      case 'all':
      default:
        return result.filter((t) => !t.completed);
    }
  }, [todos, activeFilter, searchTerm, todayStr, userEmail]);

  // Filter Counts
  const counts = useMemo(() => {
    return {
      today: todos.filter((t) => !t.completed && (t.dueDate === todayStr || !t.dueDate)).length,
      important: todos.filter((t) => !t.completed && t.important).length,
      planned: todos.filter((t) => !t.completed && !!t.dueDate).length,
      assigned: todos.filter(
        (t) =>
          !t.completed &&
          (t.assignedTo?.toLowerCase() === userEmail.toLowerCase() ||
            t.userEmail.toLowerCase() === userEmail.toLowerCase() ||
            !!t.assignedTo)
      ).length,
      all: todos.filter((t) => !t.completed).length,
      completed: todos.filter((t) => t.completed).length
    };
  }, [todos, todayStr, userEmail]);

  // Add Task Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let targetEmail = newAssignedTo.trim();
    if (isTypingCustomEmail && customEmailInput.trim()) {
      targetEmail = customEmailInput.trim();
    }

    if (targetEmail && targetEmail.includes('@')) {
      saveContact(targetEmail);
      setSavedContacts(getSavedContacts());
    }

    await addTodo(
      newTitle,
      newDueDate || (activeFilter === 'today' ? todayStr : undefined),
      newDueTime || undefined,
      newImportant,
      '',
      newRepeat,
      targetEmail || undefined,
      newAssignedToName || targetEmail || undefined
    );

    setNewTitle('');
    setNewDueDate('');
    setNewDueTime('');
    setNewRepeat('none');
    setNewImportant(false);
    setNewAssignedTo('');
    setNewAssignedToName('');
    setCustomEmailInput('');
    setIsTypingCustomEmail(false);
    setShowQuickOptions(false);
    showToast('Tarefa adicionada com sucesso!', 'success');
  };

  // Add Step to active task
  const handleAddStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !newStepTitle.trim()) return;
    await addStep(activeTask.id, newStepTitle.trim());
    setNewStepTitle('');
  };

  // Google Calendar Integration
  const handleGoogleCalendarSync = (task: TodoItem) => {
    openGoogleCalendar(task);
    showToast('Abrindo Google Agenda com evento configurado! 📅', 'info');
  };

  // Gmail Open
  const handleOpenGmail = (task: TodoItem) => {
    openInGmail(task);
    showToast(`Abrindo rascunho no Gmail para ${task.assignedTo || 'destinatário'}... ✉️`, 'info');
  };

  // Download .ics
  const handleDownloadIcs = (task: TodoItem) => {
    downloadIcsFile(task);
    showToast('Arquivo de calendário (.ics) baixado! 📥', 'success');
  };

  const handleTestHeyListen = () => {
    playCalendarAlertSound();
    showToast('Som do Calendário (Hey Listen) testado! 🔔', 'info');
  };

  const handleTestTodoSound = () => {
    playTodoAlertSound();
    showToast('Som do To-Do (todo.mp3) testado! 🔔', 'info');
  };

  const getRepeatLabel = (repeat?: TodoRepeat) => {
    switch (repeat) {
      case 'daily':
        return 'Diária';
      case 'weekdays':
        return 'Dias Úteis (Seg-Sex)';
      case 'weekly':
        return 'Semanal';
      case 'monthly':
        return 'Mensal';
      default:
        return null;
    }
  };

  const getFilterHeaderInfo = () => {
    switch (activeFilter) {
      case 'today':
        return {
          title: 'Meu Dia',
          subtitle: todayFormatted,
          icon: <Sun className="w-6 h-6 text-amber-500" />
        };
      case 'important':
        return {
          title: 'Importantes',
          subtitle: 'Tarefas de alta prioridade',
          icon: <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
        };
      case 'planned':
        return {
          title: 'Planejadas',
          subtitle: 'Tarefas com data de vencimento agendada',
          icon: <Calendar className="w-6 h-6 text-cyan-600" />
        };
      case 'assigned':
        return {
          title: 'Atribuídas / Gmail',
          subtitle: 'Tarefas vinculadas a contas de e-mail reais do Gmail',
          icon: <User className="w-6 h-6 text-emerald-600" />
        };
      case 'completed':
        return {
          title: 'Concluídas',
          subtitle: 'Histórico de tarefas finalizadas',
          icon: <CheckCircle className="w-6 h-6 text-emerald-600" />
        };
      case 'all':
      default:
        return {
          title: 'Todas as Tarefas',
          subtitle: 'Visão geral de todas as tarefas ativas',
          icon: <ListTodo className="w-6 h-6 text-blue-600" />
        };
    }
  };

  const headerInfo = getFilterHeaderInfo();

  return (
    <div className="space-y-6 fade-in no-print">
      {/* Top Banner Microsoft To Do Style */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-black flex items-center justify-center shadow-lg">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Microsoft To Do • MiPlace
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3 h-3" /> Gmail & Google Agenda
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Conecte qualquer e-mail real do Gmail, sincronize com o Google Calendar e receba alertas sonoros intercalados
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative z-10 w-full md:w-auto justify-end">
          <button
            onClick={handleTestHeyListen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            title="Testar som do Calendário (hey_listen.mp3)"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Hey Listen (15m)</span>
          </button>
          <button
            onClick={handleTestTodoSound}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            title="Testar som do To-Do (todo.mp3)"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>To-Do Som (30m)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar + Tasks + Slide-out Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Sidebar (Estilo Microsoft To Do) */}
        <div className="lg:col-span-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1">
            Listas To-Do
          </p>

          {/* ☀️ Meu Dia */}
          <button
            onClick={() => {
              setActiveFilter('today');
              setSelectedTask(null);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'today'
                ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sun className={`w-4 h-4 ${activeFilter === 'today' ? 'text-amber-600' : 'text-amber-500'}`} />
              <span>Meu Dia</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {counts.today}
            </span>
          </button>

          {/* ⭐ Importantes */}
          <button
            onClick={() => {
              setActiveFilter('important');
              setSelectedTask(null);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'important'
                ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Star
                className={`w-4 h-4 ${
                  activeFilter === 'important' ? 'text-amber-500 fill-amber-400' : 'text-amber-400'
                }`}
              />
              <span>Importantes</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {counts.important}
            </span>
          </button>

          {/* 📅 Planejadas */}
          <button
            onClick={() => {
              setActiveFilter('planned');
              setSelectedTask(null);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'planned'
                ? 'bg-cyan-50 text-cyan-900 font-bold border border-cyan-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar
                className={`w-4 h-4 ${activeFilter === 'planned' ? 'text-cyan-600' : 'text-cyan-500'}`}
              />
              <span>Planejadas</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
              {counts.planned}
            </span>
          </button>

          {/* 👤 Atribuídas / Gmail */}
          <button
            onClick={() => {
              setActiveFilter('assigned');
              setSelectedTask(null);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'assigned'
                ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Mail
                className={`w-4 h-4 ${activeFilter === 'assigned' ? 'text-emerald-600' : 'text-emerald-500'}`}
              />
              <span>Atribuídas / Gmail</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {counts.assigned}
            </span>
          </button>

          {/* 📋 Todas as Tarefas */}
          <button
            onClick={() => {
              setActiveFilter('all');
              setSelectedTask(null);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <ListTodo
                className={`w-4 h-4 ${activeFilter === 'all' ? 'text-blue-600' : 'text-blue-500'}`}
              />
              <span>Todas as Tarefas</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              {counts.all}
            </span>
          </button>

          {/* ✅ Concluídas */}
          <button
            onClick={() => {
              setActiveFilter('completed');
              setSelectedTask(null);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'completed'
                ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle
                className={`w-4 h-4 ${activeFilter === 'completed' ? 'text-emerald-600' : 'text-slate-400'}`}
              />
              <span>Concluídas</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {counts.completed}
            </span>
          </button>
        </div>

        {/* Central Tasks List Area */}
        <div className={`${activeTask ? 'lg:col-span-5' : 'lg:col-span-9'} space-y-4 transition-all`}>
          {/* Header of Active View */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                {headerInfo.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {headerInfo.title}
                </h3>
                <p className="text-xs text-slate-500 capitalize">{headerInfo.subtitle}</p>
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

          {/* Microsoft To Do Top Task Creation Box */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm transition-all focus-within:ring-2 focus-within:ring-amber-400/50">
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-slate-400">
                  <Plus className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Adicionar uma tarefa..."
                  value={newTitle}
                  onFocus={() => setShowQuickOptions(true)}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 bg-transparent border-0 focus:outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {/* Quick options bar */}
              {(showQuickOptions || newDueDate || newDueTime || newRepeat !== 'none' || newAssignedTo || customEmailInput || newImportant) && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Due Date */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
                      />
                    </div>

                    {/* Due Time */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="time"
                        value={newDueTime}
                        onChange={(e) => setNewDueTime(e.target.value)}
                        className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
                      />
                    </div>

                    {/* Recurrence */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                      <select
                        value={newRepeat}
                        onChange={(e) => setNewRepeat(e.target.value as TodoRepeat)}
                        className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="none">Não repetir</option>
                        <option value="daily">Diariamente 🔁</option>
                        <option value="weekdays">Dias Úteis (Seg-Sex) 🔁</option>
                        <option value="weekly">Semanalmente 🔁</option>
                        <option value="monthly">Mensalmente 🔁</option>
                      </select>
                    </div>

                    {/* Assign to Real Gmail Email */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      {!isTypingCustomEmail ? (
                        <select
                          value={newAssignedTo}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'CUSTOM_EMAIL') {
                              setIsTypingCustomEmail(true);
                              setNewAssignedTo('');
                            } else {
                              setNewAssignedTo(val);
                              setNewAssignedToName(val);
                            }
                          }}
                          className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[150px] truncate"
                        >
                          <option value="">Atribuir a (Gmail)...</option>
                          {userEmail && (
                            <option value={userEmail}>Meu e-mail ({userEmail})</option>
                          )}
                          {savedContacts.map((email) => (
                            <option key={email} value={email}>
                              {email}
                            </option>
                          ))}
                          <option value="CUSTOM_EMAIL">+ Digitar outro Gmail...</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="email"
                            placeholder="exemplo@gmail.com"
                            value={customEmailInput}
                            onChange={(e) => setCustomEmailInput(e.target.value)}
                            className="bg-transparent text-[11px] font-semibold text-slate-800 focus:outline-none w-36"
                          />
                          <button
                            type="button"
                            onClick={() => setIsTypingCustomEmail(false)}
                            className="text-slate-400 hover:text-slate-700 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Important star button */}
                  <button
                    type="button"
                    onClick={() => setNewImportant((prev) => !prev)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                      newImportant
                        ? 'bg-amber-100 text-amber-700 border-amber-300'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-500'
                    }`}
                    title="Marcar como importante"
                  >
                    <Star className={`w-3.5 h-3.5 ${newImportant ? 'fill-amber-400' : ''}`} />
                    <span className="text-[10px] font-bold">{newImportant ? 'Importante' : 'Normal'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Task Items List */}
          {isLoading ? (
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
            <div className="space-y-2">
              {filteredTodos.map((task) => {
                const repeatText = getRepeatLabel(task.repeat);
                const isSelected = activeTask?.id === task.id;
                const completedSteps = task.steps?.filter((s) => s.completed).length || 0;
                const totalSteps = task.steps?.length || 0;

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`bg-white rounded-2xl border transition-all duration-200 p-3.5 flex items-center justify-between gap-3 cursor-pointer group ${
                      isSelected
                        ? 'ring-2 ring-amber-400 border-amber-400 shadow-md bg-amber-50/10'
                        : task.completed
                        ? 'border-slate-200 bg-slate-50/60 opacity-70'
                        : task.important
                        ? 'border-amber-200/90 shadow-xs hover:border-amber-400 hover:shadow-sm'
                        : 'border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleComplete(task.id);
                      }}
                      className="p-1 text-slate-300 hover:text-emerald-500 transition-colors shrink-0 cursor-pointer"
                      title={task.completed ? 'Marcar como não concluída' : 'Concluir tarefa'}
                    >
                      {task.completed ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5 hover:stroke-emerald-600" />
                      )}
                    </button>

                    {/* Title & Metadata */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          task.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </p>

                      {/* Badges / Chips */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {/* Subtasks Progress */}
                        {totalSteps > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <span>{completedSteps} de {totalSteps} etapas</span>
                          </span>
                        )}

                        {/* Due Date & Time */}
                        {task.dueDate && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              task.dueDate === todayStr
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <Calendar className="w-2.5 h-2.5" />
                            {task.dueDate === todayStr ? 'Hoje' : task.dueDate}
                            {task.dueTime ? ` @ ${task.dueTime}` : ''}
                          </span>
                        )}

                        {/* Recurrence */}
                        {repeatText && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                            <RefreshCw className="w-2.5 h-2.5 text-cyan-600" />
                            {repeatText}
                          </span>
                        )}

                        {/* Assigned Real Gmail */}
                        {task.assignedTo && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Mail className="w-2.5 h-2.5 text-emerald-600" />
                            <span className="max-w-[160px] truncate">{task.assignedToName || task.assignedTo}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions: Google Calendar + Gmail Button + Star Button */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Google Calendar Link Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGoogleCalendarSync(task);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Adicionar ao Google Agenda / Google Calendar"
                      >
                        <Calendar className="w-4 h-4 text-blue-500" />
                      </button>

                      {/* Gmail Button */}
                      {task.assignedTo && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGmail(task);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title={`Abrir e-mail no Gmail para ${task.assignedTo}`}
                        >
                          <Mail className="w-4 h-4 text-emerald-500" />
                        </button>
                      )}

                      {/* Star Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImportant(task.id);
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          task.important
                            ? 'text-amber-500 bg-amber-50'
                            : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50'
                        }`}
                        title="Alternar prioridade importante"
                      >
                        <Star className={`w-4 h-4 ${task.important ? 'fill-amber-400' : ''}`} />
                      </button>

                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Task Detail Drawer (Estilo Microsoft To Do) */}
        {activeTask && (
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-lg p-5 space-y-5 animate-in slide-in-from-right duration-200 sticky top-4">
            {/* Header: Complete Check + Title + Star + Close */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => toggleComplete(activeTask.id)}
                  className="text-slate-300 hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
                >
                  {activeTask.completed ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="text"
                  value={activeTask.title}
                  onChange={(e) => updateTodo(activeTask.id, { title: e.target.value })}
                  className={`w-full text-base font-bold bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-amber-400 rounded px-1 text-slate-900 ${
                    activeTask.completed ? 'line-through text-slate-400' : ''
                  }`}
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleImportant(activeTask.id)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTask.important ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500'
                  }`}
                  title="Marcar como importante"
                >
                  <Star className={`w-4 h-4 ${activeTask.important ? 'fill-amber-400' : ''}`} />
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Fechar detalhes"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Checklist / Subtarefas (Etapas no estilo Microsoft To Do) */}
            <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>Checklist de Etapas ({activeTask.steps?.filter((s) => s.completed).length || 0}/
                {activeTask.steps?.length || 0})</span>
              </p>

              {/* Steps List */}
              {activeTask.steps && activeTask.steps.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {activeTask.steps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg border border-slate-200/70 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleStep(activeTask.id, step.id)}
                          className="text-slate-300 hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
                        >
                          {step.completed ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Circle className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span
                          className={`truncate ${
                            step.completed ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteStep(activeTask.id, step.id)}
                        className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                        title="Remover etapa"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Step Input */}
              <form onSubmit={handleAddStepSubmit} className="flex items-center gap-2 pt-1">
                <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Adicionar etapa..."
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  disabled={!newStepTitle.trim()}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  Ok
                </button>
              </form>
            </div>

            {/* Google Calendar & Google Agenda Action Box */}
            <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-blue-900 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Google Agenda / Calendar</span>
                </label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  Sincronização
                </span>
              </div>
              <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                Adicione este evento na sua Google Agenda e envie convite automático para o e-mail do Gmail atribuído.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGoogleCalendarSync(activeTask)}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Adicionar ao Google Agenda</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadIcs(activeTask)}
                  className="p-2 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl text-xs transition-colors flex items-center justify-center cursor-pointer"
                  title="Baixar arquivo .ics para Outlook ou Apple Calendar"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Atribuição de E-mail Real (Gmail) */}
            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2.5">
              <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Atribuir a E-mail Real (Gmail)</span>
              </label>

              <div className="space-y-1.5">
                <input
                  type="email"
                  placeholder="Digite qualquer e-mail (ex: pessoa@gmail.com)"
                  value={activeTask.assignedTo || ''}
                  onChange={(e) => {
                    const emailVal = e.target.value;
                    updateTodo(activeTask.id, {
                      assignedTo: emailVal || undefined,
                      assignedToName: emailVal || undefined
                    });
                    if (emailVal && emailVal.includes('@')) {
                      saveContact(emailVal);
                      setSavedContacts(getSavedContacts());
                    }
                  }}
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />

                {savedContacts.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] text-emerald-800 font-semibold w-full">Contatos recentes:</span>
                    {savedContacts.slice(0, 4).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          updateTodo(activeTask.id, {
                            assignedTo: c,
                            assignedToName: c
                          });
                        }}
                        className="text-[10px] px-2 py-0.5 bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 rounded-full font-medium transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botões de Ação do Gmail */}
              {activeTask.assignedTo && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenGmail(activeTask)}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Notificar no Gmail</span>
                  </button>

                  <a
                    href={`mailto:${activeTask.assignedTo}?subject=${encodeURIComponent(
                      `Tarefa: ${activeTask.title}`
                    )}`}
                    className="p-1.5 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs transition-colors flex items-center justify-center"
                    title="Enviar por aplicativo de e-mail padrão"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Configurações da Tarefa: Vencimento, Horário de Bip, Recorrência */}
            <div className="space-y-3 text-xs">
              {/* Data de Vencimento */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Data de Vencimento
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={activeTask.dueDate || ''}
                    onChange={(e) => updateTodo(activeTask.id, { dueDate: e.target.value || undefined })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  {activeTask.dueDate && (
                    <button
                      type="button"
                      onClick={() => updateTodo(activeTask.id, { dueDate: undefined })}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      title="Remover data"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Horário do Alarme / Bip */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Lembrar-me (Horário do Bip)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={activeTask.dueTime || ''}
                    onChange={(e) => updateTodo(activeTask.id, { dueTime: e.target.value || undefined })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  {activeTask.dueTime && (
                    <button
                      type="button"
                      onClick={() => updateTodo(activeTask.id, { dueTime: undefined })}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      title="Remover horário"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Repetição */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Repetição
                </label>
                <select
                  value={activeTask.repeat || 'none'}
                  onChange={(e) => updateTodo(activeTask.id, { repeat: e.target.value as TodoRepeat })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                >
                  <option value="none">Não repetir</option>
                  <option value="daily">Diária (Todo dia) 🔁</option>
                  <option value="weekdays">Dias Úteis (Segunda a Sexta) 🔁</option>
                  <option value="weekly">Semanal (Toda semana) 🔁</option>
                  <option value="monthly">Mensal (Todo mês) 🔁</option>
                </select>
              </div>

              {/* Anotações */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Anotações & Detalhes
                </label>
                <textarea
                  rows={3}
                  placeholder="Adicionar anotação..."
                  value={activeTask.notes || ''}
                  onChange={(e) => updateTodo(activeTask.id, { notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Footer: Metadata & Delete */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Criado por {activeTask.employeeName}</span>
              <button
                type="button"
                onClick={() => {
                  deleteTodo(activeTask.id);
                  setSelectedTask(null);
                  showToast('Tarefa excluída', 'info');
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                title="Excluir tarefa"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoManager;
