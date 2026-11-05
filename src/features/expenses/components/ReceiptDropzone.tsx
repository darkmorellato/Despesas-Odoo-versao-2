import React from 'react';
import { Check, Camera, Image as ImageIcon, Trash2, FileText } from '@/shared/components/icons';
import type { ReceiptAttachment } from '../hooks/useReceiptAttachment';

interface ReceiptDropzoneProps {
  receiptUrl: string | undefined;
  setReceiptUrl: ((url: string | undefined) => void) | undefined;
  receipt: ReceiptAttachment;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/** Área do comprovante: escolher, arrastar e soltar, pré-visualizar, trocar e remover */
export const ReceiptDropzone: React.FC<ReceiptDropzoneProps> = ({ receiptUrl, setReceiptUrl, receipt, showToast }) => {
  const {
    fileInputRef,
    isCompressingReceipt,
    isDragging,
    isPdf,
    handleReceiptFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = receipt;

  return (
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
  );
};
