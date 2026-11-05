import React from 'react';
import { Plus, ChevronDown, X } from '@/shared/components/icons';
import { PAYMENT_DAYS, selectStandardDay, type PaymentFormData } from '../utils/fixedPaymentsView';
import { CustomDateInput, DayModeToggle, MonthPicker } from './PaymentFormParts';

interface NewPaymentDropdownProps {
  showDropdown: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  formData: PaymentFormData;
  setFormData: React.Dispatch<React.SetStateAction<PaymentFormData>>;
  useCustomDate: boolean;
  setUseCustomDate: (value: boolean) => void;
  toggleMonth: (month: number) => void;
  isSubmitting: boolean;
  onButtonClick: () => void;
  onClose: () => void;
  onSave: () => void;
}

/** Botão "Novo Pagamento Fixo" e o menu suspenso com o formulário de cadastro */
export const NewPaymentDropdown: React.FC<NewPaymentDropdownProps> = ({
  showDropdown,
  inputRef,
  formData,
  setFormData,
  useCustomDate,
  setUseCustomDate,
  toggleMonth,
  isSubmitting,
  onButtonClick,
  onClose,
  onSave,
}) => (
  <div className="relative">
    <button
      onClick={onButtonClick}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-sm cursor-pointer"
    >
      <Plus className="w-3.5 h-3.5" />
      Novo Pagamento Fixo
      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
    </button>

    {/* Dropdown Menu — `invisible` quando fechado para não ficar focável/navegável por Tab */}
    <div
      className={`
        absolute top-full right-0 mt-2 w-[380px] sm:w-[420px] bg-white border border-slate-200 rounded-2xl p-5 z-[99999]
        shadow-2xl origin-top-right transform transition-all duration-300
        ${showDropdown
          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto visible'
          : 'opacity-0 scale-95 -translate-y-2 pointer-events-none invisible'
        }
      `}
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <h4 className="text-sm font-bold text-slate-900 tracking-tight">Novo Pagamento Fixo</h4>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Descrição</label>
          <input
            type="text"
            ref={inputRef}
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="liquid-input w-full px-3 py-2 rounded-lg text-xs font-medium"
            placeholder="Ex: Aluguel Loja Premium, Contabilidade..."
          />
        </div>

        {/* Day */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Dia de Vencimento</label>

          {/* Toggle para usar data personalizada */}
          <DayModeToggle useCustomDate={useCustomDate} setUseCustomDate={setUseCustomDate} />

          {/* Dias padrão */}
          {!useCustomDate && (
            <div className="flex gap-1.5">
              {PAYMENT_DAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFormData(prev => selectStandardDay(prev, d))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    formData.day === d
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* Data personalizada */}
          {useCustomDate && (
            <CustomDateInput
              value={formData.customDate}
              onChange={(customDate, day) => setFormData(prev => ({ ...prev, customDate, day }))}
            />
          )}
        </div>

        {/* Months */}
        <MonthPicker label="Meses" selected={formData.months} onToggle={toggleMonth} />
      </div>

      <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
        <button
          onClick={onClose}
          className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all text-xs"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={isSubmitting}
          className="flex-1 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-xs"
        >
          {isSubmitting ? 'Salvando...' : 'Adicionar'}
        </button>
      </div>
    </div>
  </div>
);
