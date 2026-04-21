import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useBudgets } from '@/shared/hooks/useBudgets';
import type { CategoryName } from '@/shared/types';

interface BudgetAlertProps {
  expenses: any[];
  category: CategoryName;
}

export const BudgetAlert = ({ expenses, category }: BudgetAlertProps) => {
  const { getBudgetStatus, budgets } = useBudgets(expenses);
  const status = getBudgetStatus(category);
  const budget = budgets.find(b => b.category === category);

  if (!budget) return null;

  const spent = expenses
    .filter(e => e.category === category)
    .reduce((sum, e) => sum + e.amount, 0);

  const percentage = (spent / budget.limit) * 100;

  if (status === 'ok') return null;

  const icons = {
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    exceeded: <XCircle className="w-5 h-5 text-red-500" />
  };

  const colors = {
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    exceeded: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[status]} mb-4`}>
      <div className="flex items-center gap-3">
        {icons[status]}
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">
            {status === 'warning' ? 'Alerta de Orçamento' : 'Orçamento Excedido'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {category}: R$ {spent.toFixed(2)} / R$ {budget.limit.toFixed(2)} ({percentage.toFixed(0)}%)
          </p>
        </div>
      </div>
    </div>
  );
};
