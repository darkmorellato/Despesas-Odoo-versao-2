import React from 'react';
import { Plus, Calendar, Clock, RefreshCw, Mail, X, Star } from '@/shared/components/icons';
import type { TodoRepeat } from '../types';
import type { TodoComposer } from '../hooks/useTodoComposer';

interface TodoQuickAddProps {
  composer: TodoComposer;
  /** E-mail de quem usa (primeira opção de atribuição) */
  userEmail: string;
  savedContacts: string[];
}

/** Caixa "Adicionar uma tarefa..." com opções rápidas (data, hora, repetição, responsável, prioridade) */
export const TodoQuickAdd: React.FC<TodoQuickAddProps> = ({ composer, userEmail, savedContacts }) => {
  const {
    newTitle, setNewTitle,
    newDueDate, setNewDueDate,
    newDueTime, setNewDueTime,
    newRepeat, setNewRepeat,
    newImportant, setNewImportant,
    newAssignedTo, setNewAssignedTo,
    setNewAssignedToName,
    showQuickOptions, setShowQuickOptions,
    isSubmitting,
    isTypingCustomEmail, setIsTypingCustomEmail,
    customEmailInput, setCustomEmailInput,
    handleAddSubmit,
  } = composer;

  return (
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
            disabled={isSubmitting || !newTitle.trim()}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> {isSubmitting ? 'Adicionando...' : 'Adicionar'}
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
  );
};
