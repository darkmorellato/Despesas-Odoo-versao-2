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

  return (
    <div className="relative w-full group">
      <input
        type={inputType}
        required={required}
        value={inputType === 'text' && value ? formatDateBR(value) : value}
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
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-blue-400 group-hover:text-blue-600 transition-colors">
          <Calendar className="w-5 h-5 drop-shadow-sm" />
        </div>
      )}
    </div>
  );
};
