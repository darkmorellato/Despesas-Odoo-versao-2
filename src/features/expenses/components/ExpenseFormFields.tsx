import React, { useCallback } from 'react';
import { Tag, Store, DollarSign } from '@/shared/components/icons';
import { DateInput } from '@/shared/components/ui';
import { STORES_LIST } from '@/config/constants';
import { getGroupHint } from '@/config/stores';
import { formatPastedAmount, maskAmountInput } from '../utils/amountInput';

interface ExpenseFormFieldsProps {
  date: string;
  setDate: (d: string) => void;
  category: string;
  setCategory: (c: string) => void;
  description: string;
  setDescription: (d: string) => void;
  store: string;
  setStore: (s: string) => void;
  amount: string;
  setAmount: (a: string) => void;
  notes: string;
  setNotes: (n: string) => void;
  currency: string;
  categoriesList: { label: string; odooRef: string }[];
}

/** Campos do lançamento: data, categoria, descrição, valor (com máscara), loja/grupo e observações */
export const ExpenseFormFields: React.FC<ExpenseFormFieldsProps> = ({
  date,
  setDate,
  category,
  setCategory,
  description,
  setDescription,
  store,
  setStore,
  amount,
  setAmount,
  notes,
  setNotes,
  currency,
  categoriesList,
}) => {
  const groupHint = getGroupHint(store);

  // Formatação de valor monetário
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(maskAmountInput(e.target.value));
  }, [setAmount]);

  const handleAmountPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    const formatted = formatPastedAmount(pasted);
    if (formatted !== null) {
      e.preventDefault();
      setAmount(formatted);
    }
  }, [setAmount]);

  return (
    <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">

      {/* LINHA 1: DATA e CATEGORIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Data */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Data
          </label>
          <DateInput
            required
            value={date}
            onChange={e => setDate(e.target.value)}
            className="liquid-input w-full px-4 py-2.5 rounded-lg text-sm font-semibold"
          />
        </div>

        {/* Categoria */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Categoria
          </label>
          <div className="relative">
            <select
              required
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="liquid-input w-full px-4 py-2.5 rounded-lg appearance-none text-sm font-semibold cursor-pointer text-slate-900 pr-10"
            >
              <option value="" disabled className="text-slate-400">Selecione uma categoria...</option>
              {categoriesList.map((c, i) => (
                <option key={i} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Tag className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* LINHA 2: DESCRIÇÃO e VALOR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Descrição */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Descrição
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Café com cliente, boleto..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="liquid-input w-full px-4 py-2.5 rounded-lg text-sm font-medium"
          />
        </div>

        {/* Valor */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Valor ({currency})
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="0,00"
              value={amount}
              onChange={handleAmountChange}
              onPaste={handleAmountPaste}
              className="liquid-input w-full pl-4 pr-10 py-2.5 rounded-lg text-sm font-bold text-slate-900 tabular-nums"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* LINHA 3: LOJA / GRUPO e OBSERVAÇÕES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Loja / Grupo */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Loja / Grupo
          </label>
          <div className="relative">
            <select
              required
              value={store}
              onChange={e => setStore(e.target.value)}
              className="liquid-input w-full px-4 py-2.5 rounded-lg appearance-none text-sm font-semibold cursor-pointer text-slate-900 pr-10"
            >
              <option value="" disabled className="text-slate-400">Selecione a loja...</option>
              {STORES_LIST.map((l, i) => (
                <option key={i} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          {groupHint && (
            <p className={`text-[10px] ${groupHint.className} font-semibold pt-0.5`}>{groupHint.text}</p>
          )}
        </div>

        {/* Observações */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Observações (Opcional)
          </label>
          <input
            type="text"
            placeholder="Detalhes, NF, número..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="liquid-input w-full px-4 py-2.5 rounded-lg text-sm font-normal text-slate-700"
          />
        </div>
      </div>
    </div>
  );
};
