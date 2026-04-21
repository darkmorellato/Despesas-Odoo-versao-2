import { Download } from 'lucide-react';
import { exportToPDF } from '@/shared/utils/pdfExport';
import type { Expense } from '@/shared/types';

interface PDFExportButtonProps {
  expenses: Expense[];
  title?: string;
}

export const PDFExportButton = ({ expenses, title }: PDFExportButtonProps) => {
  const handleExport = () => {
    if (expenses.length === 0) {
      alert('Não há despesas para exportar');
      return;
    }

    exportToPDF(expenses, title);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
    >
      <Download className="w-4 h-4" />
      Exportar PDF
    </button>
  );
};
