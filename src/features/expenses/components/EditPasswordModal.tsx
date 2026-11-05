import React from 'react';
import { Edit } from '@/shared/components/icons';
import type { Expense } from '@/shared/types';

interface EditPasswordModalProps {
  /** Despesa cuja edição será liberada; `null` = modal fechado */
  expense: Expense | null;
  reason: string;
  onReasonChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmação (senha de admin + motivo opcional) para liberar a edição de um lançamento. */
export const EditPasswordModal: React.FC<EditPasswordModalProps> = ({
  expense, reason, onReasonChange, password, onPasswordChange, onConfirm, onCancel,
}) => {
  if (!expense) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in no-print"
      onClick={onCancel}
    >
      <div
        className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4 text-amber-600">
          <Edit className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Confirmar Edição</h3>
        <p className="text-xs text-slate-600 mb-1 font-bold">
          {expense.description}
        </p>
        <p className="text-[11px] text-slate-400 mb-4">
          Digite a senha de administrador para liberar a edição deste item.
        </p>

        <div className="mb-3.5 text-left space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
            Motivo da Edição (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ex: Correção de valor de nota fiscal..."
            value={reason}
            onChange={e => onReasonChange(e.target.value)}
            className="liquid-input w-full px-3 py-2 rounded-lg text-xs text-slate-900 font-medium"
          />
        </div>

        <input
          type="password"
          autoFocus
          placeholder="Senha de Administrador"
          value={password}
          onChange={e => onPasswordChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onConfirm();
            if (e.key === 'Escape') onCancel();
          }}
          className="liquid-input w-full px-4 py-2.5 rounded-lg text-center font-bold text-slate-900 mb-5 placeholder-slate-400 text-sm"
        />
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
          >
            Liberar Edição
          </button>
        </div>
      </div>
    </div>
  );
};
