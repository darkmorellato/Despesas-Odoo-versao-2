import React from 'react';
import type { FixedNotification } from '@/shared/types';
import { Check, RotateCcw } from '@/shared/components/icons';

interface ConfirmPayModalProps {
  desc: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmação de pagamento individual */
export const ConfirmPayModal: React.FC<ConfirmPayModalProps> = ({ desc, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
    <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl">
      <div className="mx-auto w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4 text-amber-600">
        <Check className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">Confirmar Pagamento?</h3>
      <p className="text-xs text-slate-500 mb-6 font-medium">{desc}</p>
      <div className="flex gap-2.5">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
        >
          Não
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
        >
          Sim, Pago
        </button>
      </div>
    </div>
  </div>
);

interface ConfirmSelectAllModalProps {
  count: number;
  day: number | null;
  items: FixedNotification[];
  monthName: string;
  year: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmação de "marcar todos como pagos" (lista os pagamentos afetados) */
export const ConfirmSelectAllModal: React.FC<ConfirmSelectAllModalProps> = ({
  count,
  day,
  items,
  monthName,
  year,
  onCancel,
  onConfirm,
}) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
    <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 text-center shadow-2xl">
      <div className="mx-auto w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
        <Check className="w-6 h-6 stroke-[3]" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">Confirmar Todos como Pagos?</h3>
      <p className="text-xs text-slate-500 mb-4">
        Deseja marcar <strong>{count} pagamento(s)</strong> {day ? `do Dia ${day}` : 'do filtro selecionado'} de <strong>{monthName} de {year}</strong> como pagos?
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto text-left text-xs space-y-1.5 mb-6">
        {items.map((it) => (
          <div key={it.id ?? `${it.day}-${it.description}`} className="flex items-center justify-between text-slate-700 py-1 border-b border-slate-100 last:border-0">
            <span className="truncate font-medium">{it.description}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 ml-2">
              Dia {it.day}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-600/20"
        >
          Sim, Confirmar Todos
        </button>
      </div>
    </div>
  </div>
);

interface FixPasswordModalProps {
  password: string;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Corrigir status de um pagamento já pago (exige a senha de administrador) */
export const FixPasswordModal: React.FC<FixPasswordModalProps> = ({ password, onPasswordChange, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
    <div className="bg-white border border-slate-200 w-full max-w-sm p-6 text-center rounded-2xl shadow-2xl">
      <div className="mx-auto w-12 h-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center mb-4 text-amber-600">
        <RotateCcw className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">Corrigir Status</h3>
      <p className="text-xs text-slate-500 mb-5">Digite a senha de administrador.</p>
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
          className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
        >
          Corrigir
        </button>
      </div>
    </div>
  </div>
);
