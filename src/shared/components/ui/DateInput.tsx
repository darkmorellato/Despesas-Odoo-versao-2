import React, { useState } from 'react';
import { Calendar } from '@/shared/components/icons/Icons';
import { formatDateBR } from '@/shared/utils/formatters';

interface DateInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  required,
  className,
  placeholder = "dd/mm/aaaa"
}) => {
  const [inputType, setInputType] = useState<'text' | 'date'>('text');

  // Só formata quando o value é YYYY-MM-DD — senão exibe o valor cru
  const displayValue =
    inputType === 'text' && value && /^\d{4}-\d{2}-\d{2}/.test(value)
      ? formatDateBR(value)
      : value;

  return (
    <div className="relative w-full group">
      <input
        type={inputType}
        required={required}
        value={displayValue}
        onChange={onChange}
        onFocus={(e) => {
          setInputType('date');
          if (e.target.showPicker) {
            try {
              e.target.showPicker();
            } catch (err) {
              // Ignore showPicker errors
            }
          }
        }}
        onBlur={() => setInputType('text')}
        placeholder={placeholder}
        className={className}
      />
      {inputType === 'text' && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-amber-400 transition-colors">
          <Calendar className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
