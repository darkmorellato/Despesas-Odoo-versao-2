import React from 'react';
import { Trash2 } from '@/shared/components/icons';
import { formatDateBR, formatCurrency } from '@/shared/utils/formatters';
import type { Expense } from '@/shared/types';

interface DeleteExpenseModalProps {
  /** Despesa a excluir; `null` = modal fechado */
  expense: Expense | null;
  /** 1 = confirmar + motivo; 2 = senha de admin */
  step: 'confirm' | 'password';
  reason: string;
  onReasonChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  onProceed: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Exclusão em 2 passos: confirmação com justificativa obrigatória → senha de admin. */
export const DeleteExpenseModal: React.FC<DeleteExpenseModalProps> = ({
  expense, step, reason, onReasonChange, password, onPasswordChange, onProceed, onConfirm, onCancel,
}) => {
  if (!expense) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in no-print"
      onClick={onCancel}
    >
      <div
        className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center mb-4 text-rose-600">
          <Trash2 className="w-6 h-6" />
        </div>

        {step === 'confirm' ? (
          /* Passo 1: Confirmar intenção de excluir + Justificativa Obrigatória */
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Deseja realmente excluir?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Esta ação moverá o lançamento para a lixeira (soft-delete) e registrará o evento na auditoria.
            </p>

            {/* Detalhes do item a ser excluído */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left mb-4 space-y-1.5 text-xs">
              <p><strong className="text-slate-900">Descrição:</strong> {expense.description}</p>
              <p><strong className="text-slate-900">Loja / Categoria:</strong> {expense.store} • {expense.category}</p>
              <p><strong className="text-slate-900">Data:</strong> {formatDateBR(expense.date)}</p>
              <p><strong className="text-slate-900">Valor:</strong> <span className="font-bold text-rose-700">R$ {formatCurrency(expense.amount)}</span></p>
            </div>

            {/* Justificativa Obrigatória */}
            <div className="mb-5 text-left space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Motivo / Justificativa da Exclusão <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="Informe o motivo da exclusão para registro na auditoria..."
                value={reason}
                onChange={e => onReasonChange(e.target.value)}
                className="liquid-input w-full p-2.5 rounded-xl text-xs text-slate-900 font-medium placeholder-slate-400"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
              >
                Não, Manter
              </button>
              <button
                type="button"
                onClick={onProceed}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Sim, Continuar
              </button>
            </div>
          </div>
        ) : (
          /* Passo 2: Solicitar senha de administrador */
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Senha de Confirmação</h3>
            <p className="text-xs text-slate-500 mb-3">
              Digite a senha de administrador para concluir a exclusão de <strong>{expense.description}</strong>.
            </p>

            {reason && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-left mb-4 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Justificativa:</span>
                <span className="text-slate-800 font-semibold">{reason}</span>
              </div>
            )}

            <input
              type="password"
              autoFocus
              placeholder="Senha"
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
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
