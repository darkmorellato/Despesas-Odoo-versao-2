import React from 'react';
import { formatDateBR } from '@/shared/utils/formatters';
import { Calendar, Check, X, ListTodo, ExternalLink, Mail } from '@/shared/components/icons';
import type { TodoItem } from '@/features/todo/types';
import { openGoogleCalendar, openInGmail } from '@/features/todo/utils/calendarIntegration';
import { getTaskTitle } from '@/features/todo/utils/todoFilters';

interface TodoQuickModalProps {
  todo: TodoItem;
  setTodo: React.Dispatch<React.SetStateAction<TodoItem | null>>;
  handleToggleTodo: (id: string) => void | Promise<void>;
  showToast: ((message: string, type?: 'success' | 'error' | 'info') => void) | undefined;
}

/** Detalhes rápidos de uma tarefa aberta a partir da grade (concluir, Google Agenda, Gmail) */
export const TodoQuickModal: React.FC<TodoQuickModalProps> = ({ todo, setTodo, handleToggleTodo, showToast }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
    <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-base font-bold text-slate-900 ${todo.completed ? 'line-through text-slate-400' : ''}`}>
              {getTaskTitle(todo, 'Tarefa sem título')}
            </h3>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
              todo.completed
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}>
              {todo.completed ? '✅ Concluída' : '⏳ Pendente'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setTodo(null)}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Detalhes */}
      <div className="space-y-2.5 text-xs">
        {todo.dueDate && (
          <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200/70">
            <Calendar className="w-4 h-4 text-cyan-600 shrink-0" />
            <span className="font-semibold">Vencimento:</span>
            <span>{formatDateBR(todo.dueDate)}</span>
            {todo.dueTime && (
              <span className="font-mono text-slate-500">às {todo.dueTime}</span>
            )}
          </div>
        )}

        {todo.assignedTo && (
          <div className="flex items-center gap-2 text-slate-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-200/70">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Atribuído a:</span>
            <span className="font-medium text-emerald-900">{todo.assignedToName || todo.assignedTo}</span>
          </div>
        )}

        {todo.notes && (
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Anotações:</p>
            <p className="text-slate-700 whitespace-pre-wrap">{todo.notes}</p>
          </div>
        )}

        {todo.steps && todo.steps.length > 0 && (
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Etapas ({todo.steps.filter(s => s.completed).length}/{todo.steps.length}):
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {todo.steps.map(s => (
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
            const willComplete = !todo.completed;
            handleToggleTodo(todo.id);
            setTodo((prev) => prev ? { ...prev, completed: willComplete } : null);
            if (showToast) showToast(willComplete ? 'Tarefa concluída!' : 'Marcada como pendente', 'success');
          }}
          className={`flex-1 py-2 px-3 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            todo.completed
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>{todo.completed ? 'Reabrir Tarefa' : 'Concluir Tarefa'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            openGoogleCalendar(todo);
            if (showToast) showToast('Abrindo Google Agenda com evento configurado! 📅', 'info');
          }}
          className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          title="Adicionar ao Google Agenda"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Google Agenda</span>
        </button>

        {todo.assignedTo && (
          <button
            type="button"
            onClick={() => {
              openInGmail(todo);
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
);
