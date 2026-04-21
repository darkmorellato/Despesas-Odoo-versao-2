import { useState, useMemo } from 'react';
import { Plus, Calendar, BarChart2, Settings, Home } from 'lucide-react';
import { Wifi, WifiOff, Cloud } from '@/shared/components/icons/StatusIcons';
import { useAuth, useToast } from '@/shared/hooks';
import { useExpenses } from '@/features/expenses';
import { useCalendar } from '@/features/calendar';
import { useFixedPayments } from '@/features/fixed-payments';
import { getTodayLocal, formatCurrency } from '@/shared/utils/formatters';
import { PendingPaymentsAlert } from '@/shared/components/ui';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { ThemeToggle } from '@/features/dashboard';
import type { ViewMode } from '@/shared/types';

interface DashboardProps {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  children: React.ReactNode;
}

export const Dashboard = ({ currentView, setCurrentView, children }: DashboardProps) => {
  const { user, syncStatus } = useAuth();
  const { expenses, isLoading: expensesLoading } = useExpenses(user);
  const { getPendingPayments } = useCalendar(user);
  const { payments: fixedPayments } = useFixedPayments(user);
  const { toasts, removeToast } = useToast();

  const pendingPayments = useMemo(() => getPendingPayments(fixedPayments), [getPendingPayments, fixedPayments]);

  const totalToday = useMemo(() => {
    const today = getTodayLocal();
    return expenses
      .filter(e => e.date === today)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return expenses
      .filter(e => e.date.startsWith(currentMonth))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const syncStatusIcon = useMemo(() => {
    switch (syncStatus) {
      case 'synced':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'syncing':
        return <Cloud className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  }, [syncStatus]);

  if (expensesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Home className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Despesas Miplace
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {syncStatusIcon}
                  <span>
                    {syncStatus === 'synced' && 'Sincronizado'}
                    {syncStatus === 'syncing' && 'Sincronizando...'}
                    {syncStatus === 'error' && 'Erro de sincronização'}
                    {syncStatus === 'offline' && 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`p-2 rounded-lg transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Home className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('calendar')}
                className={`p-2 rounded-lg transition-colors ${
                  currentView === 'calendar'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className={`p-2 rounded-lg transition-colors ${
                  currentView === 'analytics'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <BarChart2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('payments')}
                className={`p-2 rounded-lg transition-colors ${
                  currentView === 'payments'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {pendingPayments.length > 0 && (
          <PendingPaymentsAlert
            items={pendingPayments}
            onClick={() => {}}
            onClose={() => {}}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total Hoje
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalToday)}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total do Mês
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalMonth)}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total de Despesas
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {expenses.length}
            </p>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
};
