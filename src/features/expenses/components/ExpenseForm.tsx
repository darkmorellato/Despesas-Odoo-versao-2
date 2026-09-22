import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus,
  Edit,
  X,
  RotateCcw,
  Tag,
  Store,
  DollarSign,
  Check,
  Camera,
  Image as ImageIcon,
  Trash2,
  FileText
} from '@/shared/components/icons';
import { DateInput } from '@/shared/components/ui';
import { STORES_LIST } from '@/config/constants';
import { compressImageFile } from '@/shared/utils/imageCompressor';

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
 * Converte um texto colado no campo de valor em um número monetário,
 * interpretando o texto segundo a semântica pt-BR:
 *
 * - Contendo vírgula: os pontos são separadores de milhar e a vírgula é
 *   decimal ("1.234,56" -> 1234.56);
 * - Sem vírgula e com ponto: o ponto é decimal APENAS se houver exatamente
 *   1 ponto e até 2 dígitos depois ("1234.56" -> 1234.56, "1.234" -> 1234,
 *   "1.234.567" -> 1234567);
 * - Sem ponto e sem vírgula: mesma semântica da máscara de digitação
 *   (os dígitos são centavos, ou seja, divide por 100 — "123456" -> 1234.56),
 *   mantendo consistência com o que o usuário digita.
 *
 * Retorna `null` quando o texto não representa um número válido.
 */
export const parsePastedAmount = (raw: string): number | null => {
  let text = raw.trim().replace(/R\$/gi, '').replace(/[\s\u00A0]/g, '');
  if (!text) return null;

  const isNegative = text.startsWith('-');
  if (isNegative) text = text.slice(1);
  if (!text) return null;

  let valueStr: string;
  if (text.includes(',')) {
    // Formato pt-BR explícito: remove separadores de milhar e troca vírgula por ponto
    valueStr = text.replace(/\./g, '').replace(',', '.');
  } else if (text.includes('.')) {
    const segments = text.split('.');
    const lastSegment = segments[segments.length - 1];
    const isDecimal = segments.length === 2 && lastSegment.length <= 2;
    valueStr = isDecimal ? text : text.replace(/\./g, '');
  } else {
    // Sem separadores: aplica a mesma semântica da máscara (dígitos / 100)
    const digits = text.replace(/\D/g, '');
    if (!digits) return null;
    const value = parseInt(digits, 10) / 100;
    return isNegative ? -value : value;
  }

  const value = parseFloat(valueStr);
  if (isNaN(value)) return null;
  return isNegative ? -value : value;
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isCompressingReceipt, setIsCompressingReceipt] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Formatação de valor monetário
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setAmount('');
      return;
    }
    setAmount(
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(parseFloat(val) / 100)
    );
  }, [setAmount]);

  const handleAmountPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    const num = parsePastedAmount(pasted);
    if (num !== null && num > 0) {
      e.preventDefault();
      setAmount(
        new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(num)
      );
    }
  }, [setAmount]);

  // Processamento e compressão do arquivo
  const processFile = useCallback(async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      showToast('Por favor envie uma imagem (JPG, PNG, WebP) ou documento PDF.', 'error');
      return;
    }

    setIsCompressingReceipt(true);
    try {
      const compressedBase64 = await compressImageFile(file, 1200, 1200, 0.75);
      if (setReceiptUrl) {
        setReceiptUrl(compressedBase64);
        showToast('Comprovante anexado com sucesso!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao processar arquivo do comprovante', 'error');
    } finally {
      setIsCompressingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [setReceiptUrl, showToast]);

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Suporte a Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Suporte a Ctrl+V (colar imagem ou PDF da área de transferência)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/') || item.type === 'application/pdf') {
        const file = item.getAsFile();
        if (file) {
          // Impede a propagação para o listener global de `paste` em window,
          // que caso contrário processaria o MESMO arquivo uma 2ª vez
          e.stopPropagation();
          e.preventDefault();
          processFile(file);
          return;
        }
      }
    }
  }, [processFile]);

  // Listener global para capturar Ctrl+V com imagem da área de transferência
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;

      // Eventos originados dentro do formulário já são tratados pelo onPaste
      // do próprio formulário (que chama stopPropagation ao processar)
      if (target && formRef.current && formRef.current.contains(target)) return;

      // Não intercepta colagem em campos de texto (input/textarea/contenteditable)
      const isTextInput = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (isTextInput) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [processFile]);

  const isPdf = receiptUrl?.startsWith('data:application/pdf');

  return (
    <div
      onPaste={handlePaste}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden no-print"
    >
      {/* Header: Novo Lançamento (Esquerda) e Limpar/Cancelar (Direita) */}
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

      <div className="p-6 sm:p-8">
        <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
          {/* Divisão: 70% Lado Esquerdo (Inputs) e 30% Lado Direito (Comprovante) */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch">
            
            {/* LADO ESQUERDO: 3 LINHAS DE CAMPOS (70%) */}
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
                  {store.includes("Piracicaba") && (
                    <p className="text-[10px] text-amber-600 font-semibold pt-0.5">* Divide por 3 lojas (Dom Pedro II, Realme, XV)</p>
                  )}
                  {store.includes("Amparo") && (
                    <p className="text-[10px] text-purple-600 font-semibold pt-0.5">* Divide por 2 lojas (Premium, Kassouf)</p>
                  )}
                  {store === "Todas" && (
                    <p className="text-[10px] text-emerald-600 font-semibold pt-0.5">* Divide por 5 lojas (Todas)</p>
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

            {/* LADO DIREITO: ÁREA DE COMPROVANTE / RECIBO (FOTO OU PDF) (30%) */}
            <div className="lg:col-span-3 flex flex-col h-full space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Comprovante / Recibo (Foto ou PDF)
                </label>
                {receiptUrl && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Anexado
                  </span>
                )}
              </div>

              {/* Input de arquivo oculto */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,application/pdf"
                onChange={handleReceiptFileChange}
                className="hidden"
                id="receipt-file-upload-input"
              />

              {/* Dropzone & Paste Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (!receiptUrl && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                className={`flex-1 min-h-[190px] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 relative overflow-hidden text-center group ${
                  isDragging
                    ? 'border-amber-500 bg-amber-50/80 scale-[1.01]'
                    : receiptUrl
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-300 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/30 cursor-pointer'
                }`}
              >
                {isCompressingReceipt ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-bold text-amber-800">Processando e compactando arquivo...</span>
                    <span className="text-[10px] text-slate-500">Otimizando para carregamento rápido</span>
                  </div>
                ) : receiptUrl ? (
                  /* Visualização do comprovante anexado */
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    {isPdf ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Documento PDF Anexado</span>
                        <span className="text-[10px] text-slate-500">Pronto para salvar junto com a despesa</span>
                      </div>
                    ) : (
                      <div className="relative group/preview max-h-[140px] overflow-hidden rounded-lg border border-slate-200 shadow-xs bg-white p-1">
                        <img
                          src={receiptUrl}
                          alt="Pré-visualização do comprovante"
                          className="max-h-[130px] object-contain rounded"
                        />
                      </div>
                    )}

                    {/* Ações para o comprovante anexado */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (fileInputRef.current) fileInputRef.current.click();
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Trocar arquivo"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-600" />
                        <span>Trocar</span>
                      </button>

                      {setReceiptUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptUrl(undefined);
                            showToast("Comprovante removido", "info");
                          }}
                          className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Remover comprovante"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Estado vazio: Instruções de Anexo, Drag & Drop e Ctrl+V */
                  <div className="flex flex-col items-center justify-center gap-2 py-4 select-none">
                    <div className="w-11 h-11 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">
                        Anexar Foto / Cupom ou PDF
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Arraste e solte, clique para buscar ou <strong className="text-amber-700 font-bold">cole com Ctrl+V</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> JPG, PNG, WebP</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
