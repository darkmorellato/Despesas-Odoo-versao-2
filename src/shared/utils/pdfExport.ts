import jsPDF from 'jspdf';
import { formatDateBR, formatCurrency, getTodayLocal } from '@/shared/utils/formatters';
import { getStoreOrder } from '@/shared/utils/helpers';
import { DEFAULT_SETTINGS } from '@/shared/types';
import type { Expense, Settings } from '@/shared/types';

/** Remove quebras de linha/controle que quebrariam o layout da tabela do PDF */
const sanitizeSingleLine = (text: string): string =>
  (text || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

/** Trunca texto acrescentando reticências '…' quando corta */
const truncate = (text: string, max: number): string => {
  const clean = sanitizeSingleLine(text);
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

/** Formata moeda protegendo valores NaN/Infinity/undefined */
const formatCurrencySafe = (value: number): string =>
  Number.isFinite(value) ? formatCurrency(value) : '—';

/**
 * Generates a 100% vector PDF with selectable, copyable text, grouped by store.
 */
export const buildVectorPDFDocument = (
  expenses: Expense[],
  settings: Settings,
  periodLabel: string
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  // Group by store
  const groups: Record<string, Expense[]> = {};
  expenses.forEach((ex) => {
    const stName = ex.store || 'Outros';
    if (!groups[stName]) groups[stName] = [];
    groups[stName].push(ex);
  });

  const sortedStoreNames = Object.keys(groups).sort((a, b) => {
    const orderA = getStoreOrder(a);
    const orderB = getStoreOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  const totalGeneral = expenses.reduce((sum, ex) => sum + (Number.isFinite(ex.amount) ? ex.amount : 0), 0);
  const emissionDate = formatDateBR(getTodayLocal());

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Header Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('MIPLACE  •  EQUIPE GLOBAL', margin, y + 4);

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('Relatório de Despesas', margin, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Período: ${periodLabel}`, margin, y + 18);

  // Total summary badge on right
  const rightX = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL GERAL', rightX, y + 4, { align: 'right' });

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${settings.currency} ${formatCurrencySafe(totalGeneral)}`, rightX, y + 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Emissor: ${settings.employeeName}  |  Emitido em: ${emissionDate}`, rightX, y + 17, { align: 'right' });

  y += 24;

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Render each Store group
  sortedStoreNames.forEach((stName) => {
    const items = [...groups[stName]].sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.description.localeCompare(b.description);
    });

    const storeTotal = items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);

    checkPageBreak(25);

    // Store Header banner
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(truncate(stName, 60), margin + 3, y + 5);

    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Subtotal Loja: ${settings.currency} ${formatCurrencySafe(storeTotal)}`, rightX - 3, y + 5, { align: 'right' });

    y += 9;

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);

    const colQuem = margin + 2;
    const colCat = margin + 32;
    const colData = margin + 64;
    const colDesc = margin + 86;
    const colVal = rightX - 2;

    doc.text('QUEM', colQuem, y + 3);
    doc.text('CATEGORIA', colCat, y + 3);
    doc.text('DATA', colData, y + 3);
    doc.text('DESCRIÇÃO', colDesc, y + 3);
    doc.text('VALOR', colVal, y + 3, { align: 'right' });

    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, rightX, y);
    y += 2;

    // Table Rows
    items.forEach((ex) => {
      checkPageBreak(10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      const quem = truncate(ex.employeeName || settings.employeeName || '', 16);
      const cat = truncate(ex.category || '', 16);
      const dateStr = formatDateBR(ex.date);
      const desc = truncate(ex.description || '', 42);
      const valStr = formatCurrencySafe(ex.amount);

      doc.text(quem, colQuem, y + 4);
      doc.text(cat, colCat, y + 4);
      doc.text(dateStr, colData, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(desc, colDesc, y + 4);

      doc.text(valStr, colVal, y + 4, { align: 'right' });

      // Notes if present
      if (ex.notes) {
        y += 4;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Obs: ${truncate(ex.notes, 50)}`, colDesc, y + 3);
      }

      y += 6;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, rightX, y);
      y += 1;
    });

    y += 4;
  });

  // Add Page Numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Despesas Miplace • Documento vetorial gerado pelo sistema', margin, pageHeight - 6);
    doc.text(`Página ${i} de ${totalPages}`, rightX, pageHeight - 6, { align: 'right' });
  }

  return doc;
};

/**
 * Downloads vector PDF directly in browser
 */
export const exportVectorPDF = (
  expenses: Expense[],
  settingsOrTitle?: Settings | string,
  periodLabel: string = 'Geral',
  fileName: string = 'relatorio-despesas.pdf'
) => {
  let settings: Settings;
  let label = periodLabel;

  if (typeof settingsOrTitle === 'string') {
    label = settingsOrTitle;
    settings = DEFAULT_SETTINGS;
  } else if (settingsOrTitle) {
    settings = settingsOrTitle;
  } else {
    settings = DEFAULT_SETTINGS;
  }

  const doc = buildVectorPDFDocument(expenses, settings, label);
  doc.save(fileName);
};

/**
 * Opens vector PDF in a new browser tab with selectable, copyable text
 */
export const openVectorPDFInNewTab = (
  expenses: Expense[],
  settings?: Settings,
  periodLabel: string = 'Geral'
) => {
  const safeSettings: Settings = settings || DEFAULT_SETTINGS;
  const doc = buildVectorPDFDocument(expenses, safeSettings, periodLabel);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  // 'noopener' impede que a nova aba acesse window.opener (segurança)
  const newWindow = window.open(blobUrl, '_blank', 'noopener');
  if (newWindow) {
    newWindow.opener = null;
  } else {
    // Popup bloqueado — libera o download direto como fallback
    URL.revokeObjectURL(blobUrl);
  }
};

export const exportToPDF = exportVectorPDF;

