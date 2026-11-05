import React, { useState, useRef, useCallback, useEffect } from 'react';
import { compressImageFile } from '@/shared/utils/imageCompressor';

type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void;

interface UseReceiptAttachmentParams {
  receiptUrl: string | undefined;
  setReceiptUrl: ((url: string | undefined) => void) | undefined;
  showToast: ToastFn;
}

/**
 * Anexo de comprovante (foto ou PDF) ao lançamento: escolher arquivo, arrastar e
 * soltar, colar com Ctrl+V (dentro do formulário e, para imagens, em qualquer
 * lugar da página fora de campos de texto) e compactar antes de guardar.
 */
export const useReceiptAttachment = ({ receiptUrl, setReceiptUrl, showToast }: UseReceiptAttachmentParams) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isCompressingReceipt, setIsCompressingReceipt] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  return {
    fileInputRef,
    formRef,
    isCompressingReceipt,
    isDragging,
    isPdf,
    handleReceiptFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
  };
};

export type ReceiptAttachment = ReturnType<typeof useReceiptAttachment>;
