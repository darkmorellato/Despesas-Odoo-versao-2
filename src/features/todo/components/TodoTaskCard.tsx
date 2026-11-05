import React from 'react';
import { Calendar, CheckCircle, ChevronRight, Circle, Mail, RefreshCw, Star } from '@/shared/components/icons';
import type { TodoItem } from '../types';
import { getDueBadge, getRepeatLabel, getTaskTitle } from '../utils/todoFilters';

interface TodoTaskCardProps {
  task: TodoItem;
  isSelected: boolean;
  todayStr: string;
  onSelect: (task: TodoItem) => void;
  onToggleComplete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onGoogleCalendar: (task: TodoItem) => void;
  onOpenGmail: (task: TodoItem) => void;
}

/** Cartão de uma tarefa na lista (selos de etapas, vencimento, repetição e responsável) */
export const TodoTaskCard: React.FC<TodoTaskCardProps> = ({
  task,
  isSelected,
  todayStr,
  onSelect,
  onToggleComplete,
  onToggleImportant,
  onGoogleCalendar,
  onOpenGmail,
}) => {
  const repeatText = getRepeatLabel(task.repeat);
  const dueBadge = getDueBadge(task, todayStr);
  const completedSteps = task.steps?.filter((s) => s.completed).length || 0;
  const totalSteps = task.steps?.length || 0;

  return (
    <div
      onClick={() => onSelect(task)}
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
          onToggleComplete(task.id);
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
          {getTaskTitle(task, 'Tarefa sem título')}
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
          {dueBadge && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                dueBadge.tone === 'today'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : dueBadge.tone === 'overdue'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-cyan-50 text-cyan-900 border-cyan-300 font-semibold'
              }`}
            >
              <Calendar className="w-2.5 h-2.5" />
              {dueBadge.label}
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
            onGoogleCalendar(task);
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
              onOpenGmail(task);
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
            onToggleImportant(task.id);
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
};
