import React from 'react';
import { MONTHS, dayFromCustomDate } from '../utils/fixedPaymentsView';

interface DayModeToggleProps {
  useCustomDate: boolean;
  setUseCustomDate: (value: boolean) => void;
}

/** Alterna entre "Dia Padrão" e "Data Específica" */
export const DayModeToggle: React.FC<DayModeToggleProps> = ({ useCustomDate, setUseCustomDate }) => (
  <div className="flex items-center gap-1.5 mb-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
    <button
      type="button"
      onClick={() => setUseCustomDate(false)}
      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
        !useCustomDate
          ? 'bg-white text-slate-900 shadow-xs font-bold'
          : 'text-slate-500 hover:text-slate-900'
      }`}
    >
      Dia Padrão
    </button>
    <button
      type="button"
      onClick={() => setUseCustomDate(true)}
      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
        useCustomDate
          ? 'bg-white text-slate-900 shadow-xs font-bold'
          : 'text-slate-500 hover:text-slate-900'
      }`}
    >
      Data Específica
    </button>
  </div>
);

interface CustomDateInputProps {
  value: string | undefined;
  /** Recebe a data escolhida e o dia do mês correspondente */
  onChange: (customDate: string, day: number) => void;
}

/** Campo de data específica; o dia de vencimento acompanha a data escolhida */
export const CustomDateInput: React.FC<CustomDateInputProps> = ({ value, onChange }) => (
  <input
    type="date"
    value={value || ''}
    onChange={e => {
      const val = e.target.value;
      onChange(val, dayFromCustomDate(val));
    }}
    className="liquid-input w-full px-3 py-2 rounded-lg text-xs font-medium"
  />
);

interface MonthPickerProps {
  label: string;
  selected: number[];
  onToggle: (month: number) => void;
}

/** Grade de meses (opcional): sem nenhum mês marcado, o pagamento repete todos os meses */
export const MonthPicker: React.FC<MonthPickerProps> = ({ label, selected, onToggle }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
      {label} <span className="text-slate-400 font-normal">(opcional)</span>
    </label>
    <div className="grid grid-cols-4 gap-1.5">
      {MONTHS.map(m => {
        const isSelected = selected.includes(m.value);
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onToggle(m.value)}
            className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              isSelected
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs font-bold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
    <p className="text-[10px] text-slate-400 mt-1.5">
      Se nenhum mês selecionado, repete todos os meses.
    </p>
  </div>
);
