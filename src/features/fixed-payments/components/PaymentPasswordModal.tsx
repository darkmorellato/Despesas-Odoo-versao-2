import React from 'react';
import { AlertTriangle } from '@/shared/components/icons';

interface PaymentPasswordModalProps {
  type: 'edit' | 'delete';
  password: string;
  isSubmitting: boolean;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Pede a senha de administrador antes de editar ou excluir um pagamento */
export const PaymentPasswordModal: React.FC<PaymentPasswordModalProps> = ({
  type,
  password,
  isSubmitting,
  onPasswordChange,
  onCancel,
  onConfirm,
}) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
    <div className="bg-white border border-slate-200 w-full max-w-sm p-6 text-center rounded-2xl shadow-2xl">
      <div className="mx-auto w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4 text-amber-600">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-slate-900 mb-1">
        {type === 'edit' ? 'Editar Pagamento' : 'Excluir Pagamento'}
      </h4>
      <p className="text-xs text-slate-500 mb-5">
        {type === 'edit'
          ? 'Digite a senha de administrador para editar.'
          : 'Digite a senha de administrador para excluir.'}
      </p>
      <input
        type="password"
        autoFocus
        placeholder="Senha"
        value={password}
        onChange={e => onPasswordChange(e.target.value)}
        className="liquid-input w-full px-4 py-2.5 rounded-lg text-center font-bold text-slate-900 mb-5 placeholder-slate-400 text-sm"
      />
      <div className="flex gap-2.5">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all text-xs cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg transition-all text-xs cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>
);
