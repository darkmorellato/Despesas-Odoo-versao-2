import jsPDF from 'jspdf';
import type { Expense } from '@/shared/types';

export const exportToPDF = (expenses: Expense[], title: string = 'Relatório de Despesas') => {
  const doc = new jsPDF();
  
  let yPosition = 20;
  const lineHeight = 10;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;

  doc.setFontSize(20);
  doc.text(title, margin, yPosition);
  yPosition += lineHeight * 2;

  doc.setFontSize(12);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, yPosition);
  yPosition += lineHeight;

  doc.text(`Total de despesas: ${expenses.length}`, margin, yPosition);
  yPosition += lineHeight;

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  doc.text(`Valor total: R$ ${total.toFixed(2)}`, margin, yPosition);
  yPosition += lineHeight * 2;

  doc.setFontSize(14);
  doc.text('Despesas:', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(10);
  expenses.forEach((expense, index) => {
    if (yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    const date = new Date(expense.date).toLocaleDateString('pt-BR');
    const text = `${index + 1}. ${date} - ${expense.description} - ${expense.category} - ${expense.store} - R$ ${expense.amount.toFixed(2)}`;
    
    doc.text(text, margin, yPosition);
    yPosition += lineHeight;
  });

  doc.save(`relatorio-despesas-${new Date().toISOString().split('T')[0]}.pdf`);
};
