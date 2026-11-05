import React from 'react';
import type { FixedNotification } from '@/shared/types';
import type { PaymentFormData } from '../utils/fixedPaymentsView';
import { CustomDateInput, DayModeToggle, MonthPicker } from './PaymentFormParts';

interface PaymentEditModalProps {
  editingPayment: FixedNotification | null;
  formData: PaymentFormData;
  setFormData: React.Dispatch<React.SetStateAction<PaymentFormData>>;
  useCustomDate: boolean;
  setUseCustomDate: (value: boolean) => void;
  dayOptions: number[];
  toggleMonth: (month: number) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: () => void;
}

/** Modal de edição de um pagamento fixo (aberto depois da senha de administrador) */
export const PaymentEditModal: React.FC<PaymentEditModalProps> = ({
  editingPayment,
  formData,
  setFormData,
  useCustomDate,
  setUseCustomDate,
  dayOptions,
  toggleMonth,
  isSubmitting,
  onClose,
  onSave,
}) => (
  <div
    className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 text-center animate-in fade-in shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      <h4 className="text-base font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">
        {editingPayment ? 'Editar Pagamento' : 'Novo Pagamento Fixo'}
      </h4>

      <div className="space-y-4 text-left">
        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Descrição</label>
          <input
            type="text"
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="liquid-input w-full px-3 py-2 rounded-lg text-xs font-medium"
            placeholder="Ex: Aluguel Loja Premium"
          />
        </div>

        {/* Day */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Dia de Vencimento</label>

          <DayModeToggle useCustomDate={useCustomDate} setUseCustomDate={setUseCustomDate} />

          {!useCustomDate ? (
            <select
              value={formData.day}
              onChange={e => setFormData(prev => ({ ...prev, day: parseInt(e.target.value) }))}
              className="liquid-input w-full px-3 py-2 rounded-lg text-xs font-medium"
            >
              {dayOptions.map(d => (
                <option key={d} value={d}>Dia {d}</option>
              ))}
            </select>
          ) : (
            <CustomDateInput
              value={formData.customDate}
              onChange={(customDate, day) => setFormData(prev => ({ ...prev, customDate, day }))}
            />
          )}
        </div>

        {/* Months */}
        <MonthPicker label="Meses Específicos" selected={formData.months} onToggle={toggleMonth} />
      </div>

      <div className="flex gap-2.5 mt-6 pt-3 border-t border-slate-100">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all text-xs cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={isSubmitting}
          className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          {isSubmitting ? 'Salvando...' : (editingPayment ? 'Salvar' : 'Adicionar')}
        </button>
      </div>
    </div>
  </div>
);
