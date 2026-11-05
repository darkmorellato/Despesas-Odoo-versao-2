import React from 'react';
import { Plus, Check } from '@/shared/components/icons';
import { useReceiptAttachment } from '../hooks/useReceiptAttachment';
import { ExpenseFormHeader } from './ExpenseFormHeader';
import { ExpenseFormFields } from './ExpenseFormFields';
import { ReceiptDropzone } from './ReceiptDropzone';

// Mantido aqui por compatibilidade: a regra mora em utils/amountInput
export { parsePastedAmount } from '../utils/amountInput';

interface ExpenseFormProps {
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
  receiptUrl?: string | undefined;
  setReceiptUrl?: ((url: string | undefined) => void) | undefined;
  editingId: string | null;
  isSubmitting: boolean;
  currency: string;
  categoriesList: { label: string; odooRef: string }[];
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  onResetAllToHome?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Formulário de lançamento de despesa. Este componente só compõe a tela; a
 * regra de valores está em `utils/amountInput`, o anexo de comprovante em
 * `useReceiptAttachment` e cada região em seu próprio componente.
 */
export const ExpenseForm: React.FC<ExpenseFormProps> = ({
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
  receiptUrl,
  setReceiptUrl,
  editingId,
  isSubmitting,
  currency,
  categoriesList,
  onSubmit,
  onReset,
  showToast
}) => {
  const receipt = useReceiptAttachment({ receiptUrl, setReceiptUrl, showToast });

  return (
    <div
      onPaste={receipt.handlePaste}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden no-print"
    >
      {/* Header: Novo Lançamento (Esquerda) e Limpar/Cancelar (Direita) */}
      <ExpenseFormHeader editingId={editingId} onReset={onReset} showToast={showToast} />

      <div className="p-6 sm:p-8">
        <form ref={receipt.formRef} onSubmit={onSubmit} className="space-y-6">
          {/* Divisão: 70% Lado Esquerdo (Inputs) e 30% Lado Direito (Comprovante) */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch">

            {/* LADO ESQUERDO: 3 LINHAS DE CAMPOS (70%) */}
            <ExpenseFormFields
              date={date}
              setDate={setDate}
              category={category}
              setCategory={setCategory}
              description={description}
              setDescription={setDescription}
              store={store}
              setStore={setStore}
              amount={amount}
              setAmount={setAmount}
              notes={notes}
              setNotes={setNotes}
              currency={currency}
              categoriesList={categoriesList}
            />

            {/* LADO DIREITO: ÁREA DE COMPROVANTE / RECIBO (FOTO OU PDF) (30%) */}
            <ReceiptDropzone
              receiptUrl={receiptUrl}
              setReceiptUrl={setReceiptUrl}
              receipt={receipt}
              showToast={showToast}
            />

          </div>

          {/* Botão de Envio Inferior */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 active:scale-[0.99] transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <svg className="w-5 h-5 animate-spin text-slate-950" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : editingId ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {isSubmitting ? "Gravando..." : editingId ? "Salvar Alterações" : "Adicionar Lançamento"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
