import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTodayLocal } from '@/shared/utils/formatters';
import type { FilterMode, GroupByMode } from '@/shared/types';

interface NavigationProps {
  showAddForm: boolean;
  onToggleAddForm: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  groupBy: GroupByMode;
  onGroupByChange: (mode: GroupByMode) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export const Navigation = ({
  showAddForm,
  onToggleAddForm,
  searchTerm,
  onSearchChange,
  filterMode,
  onFilterModeChange,
  groupBy,
  onGroupByChange,
  selectedDate,
  onDateChange,
  selectedMonth,
  onMonthChange
}: NavigationProps) => {
  const handlePreviousDate = () => {
    if (filterMode === 'day' && selectedDate) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() - 1);
      onDateChange(date.toISOString().split('T')[0]);
    } else if (filterMode === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      date.setMonth(date.getMonth() - 1);
      onMonthChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleNextDate = () => {
    if (filterMode === 'day' && selectedDate) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + 1);
      onDateChange(date.toISOString().split('T')[0]);
    } else if (filterMode === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      date.setMonth(date.getMonth() + 1);
      onMonthChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleToday = () => {
    const today = getTodayLocal();
    onDateChange(today);
    const [year, month] = today.split('-').map(Number);
    onMonthChange(`${year}-${String(month).padStart(2, '0')}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar despesas..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onFilterModeChange('day')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterMode === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => onFilterModeChange('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Mês
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onGroupByChange('date')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              groupBy === 'date'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Por Data
          </button>
          <button
            onClick={() => onGroupByChange('store')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              groupBy === 'store'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Por Loja
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePreviousDate}
            className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={handleNextDate}
            className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onToggleAddForm}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showAddForm
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Plus className="w-5 h-5" />
          {showAddForm ? 'Cancelar' : 'Nova Despesa'}
        </button>
      </div>
    </div>
  );
};
