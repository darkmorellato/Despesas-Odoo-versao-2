import React from 'react';
import { Plus, Edit, X, RotateCcw } from '@/shared/components/icons';

interface ExpenseFormHeaderProps {
  editingId: string | null;
  onReset: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/** Título (novo ou edição) e botão Limpar / Cancelar Edição */
export const ExpenseFormHeader: React.FC<ExpenseFormHeaderProps> = ({ editingId, onReset, showToast }) => (
  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
    <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
        {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </div>
      <span>{editingId ? "Editar Lançamento (Modo Seguro)" : "Novo Lançamento"}</span>
    </h3>

    <div className="flex items-center gap-2">
      {editingId ? (
        <button
          type="button"
          onClick={() => { onReset(); showToast("Edição cancelada", "info"); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
          title="Cancelar edição e voltar"
        >
          <X className="w-3.5 h-3.5" /> Cancelar Edição
        </button>
      ) : (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all cursor-pointer"
          title="Limpar todos os campos do formulário"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Limpar
        </button>
      )}
    </div>
  </div>
);
