import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Circle,
  Download,
  ExternalLink,
  Mail,
  Plus,
  Send,
  Star,
  Trash2,
  X
} from '@/shared/components/icons';
import type { TodoItem, TodoRepeat } from '../types';
import { getTaskTitle } from '../utils/todoFilters';

interface TodoDetailDrawerProps {
  activeTask: TodoItem;
  savedContacts: string[];
  /** Guarda um e-mail digitado na lista de contatos recentes */
  rememberContact: (email: string) => void;
  toggleComplete: (id: string) => void;
  toggleImportant: (id: string) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  addStep: (taskId: string, title: string) => Promise<void> | void;
  toggleStep: (taskId: string, stepId: string) => void;
  deleteStep: (taskId: string, stepId: string) => void;
  onGoogleCalendar: (task: TodoItem) => void;
  onDownloadIcs: (task: TodoItem) => void;
  onOpenGmail: (task: TodoItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Painel lateral com os detalhes da tarefa selecionada (etapas, integrações, agenda e anotações) */
export const TodoDetailDrawer: React.FC<TodoDetailDrawerProps> = ({
  activeTask,
  savedContacts,
  rememberContact,
  toggleComplete,
  toggleImportant,
  updateTodo,
  addStep,
  toggleStep,
  deleteStep,
  onGoogleCalendar,
  onDownloadIcs,
  onOpenGmail,
  onDelete,
  onClose,
}) => {
  const [newStepTitle, setNewStepTitle] = useState('');

  const handleAddStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;
    await addStep(activeTask.id, newStepTitle.trim());
    setNewStepTitle('');
  };

  return (
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
            value={getTaskTitle(activeTask)}
            onChange={(e) => updateTodo(activeTask.id, { title: e.target.value })}
            placeholder="Título da tarefa..."
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
            onClick={() => onClose()}
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
            onClick={() => onGoogleCalendar(activeTask)}
            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Adicionar ao Google Agenda</span>
          </button>

          <button
            type="button"
            onClick={() => onDownloadIcs(activeTask)}
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
              rememberContact(emailVal);
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
              onClick={() => onOpenGmail(activeTask)}
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
          onClick={() => onDelete(activeTask.id)}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-semibold"
          title="Excluir tarefa"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Excluir</span>
        </button>
      </div>
    </div>
  );
};
