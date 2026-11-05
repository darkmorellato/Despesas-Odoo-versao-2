import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useAuth, useToast, useBackup, useAppSettings, usePendingAlerts } from '@/shared/hooks';
import { auth as firebaseAuth } from '@/config/firebase';
import { useExpenses, useExpenseEditor, useExpenseFilters, useHistoryAccess, isBeforeRecentWindow, HistoryLoadError, ExpenseTableRow, ExpenseForm } from '@/features/expenses';
import { RecentHistoryBanner, HistoryRequiredView } from './components/HistoryNotices';
import { EditPasswordModal } from '@/features/expenses/components/EditPasswordModal';
import { DeleteExpenseModal } from '@/features/expenses/components/DeleteExpenseModal';
import { SettingsModal } from './components/SettingsModal';
import { BackupModal } from './components/BackupModal';
import { AppSidebar } from './components/AppSidebar';
import type { SortField } from '@/features/expenses';
import { ExpenseSummaryCards } from '@/features/dashboard/components/ExpenseSummaryCards';
import { useCalendar } from '@/features/calendar/hooks/useCalendar';
import { useFixedPayments } from '@/features/fixed-payments/hooks/useFixedPayments';
import { LoginScreen, getStoredUserSession, logoutUser } from '@/features/auth';
import type { AuthenticatedUser } from '@/features/auth';
import { useTodo } from '@/features/todo';
import { STORE_IMAGES } from '@/config/constants';
import { getTodayLocal, formatDateBR, formatMonthBR, formatCurrency } from '@/shared/utils/formatters';
import { ToastContainer, PendingPaymentsAlert, PrintPreviewModal, ReceiptModal, ErrorBoundary } from '@/shared/components/ui';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';

const ExpenseCalendar = lazy(() => import('@/features/calendar/components/ExpenseCalendar').then(m => ({ default: m.ExpenseCalendar })));
const ExpenseAnalytics = lazy(() => import('@/features/analytics/components/ExpenseAnalytics').then(m => ({ default: m.ExpenseAnalytics })));
const MonthlyClosingView = lazy(() => import('@/features/analytics/components/MonthlyClosingView').then(m => ({ default: m.MonthlyClosingView })));
const FixedPaymentsManager = lazy(() => import('@/features/fixed-payments/components/FixedPaymentsManager').then(m => ({ default: m.FixedPaymentsManager })));
const AuditManager = lazy(() => import('@/features/audit/components/AuditManager').then(m => ({ default: m.AuditManager })));
const TodoManager = lazy(() => import('@/features/todo/components/TodoManager').then(m => ({ default: m.TodoManager })));

import {
  Download,
  Calendar,
  Printer,
  X,
  AlertCircle,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from '@/shared/components/icons';
import type { Expense, ViewMode } from '@/shared/types';
import '../styles/index.css';

import { logger } from '@/shared/utils/logger';
export default function App() {
  // Database user authentication session
  const [sessionUser, setSessionUser] = useState<AuthenticatedUser | null>(() => getStoredUserSession());

  // Check if session user is Dark Morellato (Admin)
  // Somente o e-mail exato define o admin — nunca por substring do nome
  // (evita escalada de privilégio tipo "darkson@..." ou nome "Darkson").
  const isDarkAdmin = useMemo(() => {
    if (!sessionUser?.email) return false;
    return sessionUser.email.toLowerCase().trim() === 'darkmorelato@miplace.com';
  }, [sessionUser]);

  // Auth and data hooks
  const { user, authReady, syncStatus } = useAuth();
  const { expenses, isLoading: expensesLoading, isFullHistory, isLoadingHistory, recentWindowStart, loadFullHistory, addExpense, addExpenseGroup, saveExpenseGroup, updateExpense, deleteExpense, canDelete } = useExpenses(user);
  const { checks, toggleCheck, getPendingPayments, syncError } = useCalendar(user);
  const { 
    payments: fixedPayments, 
    addPayment: addFixedPayment, 
    updatePayment: updateFixedPayment, 
    deletePayment: deleteFixedPayment, 
    getPaymentsByDay: getFixedPaymentsByDay, 
    getUniqueDays: getFixedUniqueDays, 
    syncStatus: fixedPaymentsSyncStatus 
  } = useFixedPayments(user);
  const { toasts, showToast, removeToast } = useToast();
  const { saveToComputer, handleRestoreFile, exportToCSV } = useBackup();

  // Local state
  const { settings, setSettings } = useAppSettings(sessionUser?.name ?? null);
  const todoHookData = useTodo(
    sessionUser?.name || settings.employeeName,
    sessionUser?.email || ''
  );
  const { todos, toggleComplete: toggleTodoComplete } = todoHookData;
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');

  // Comprovante visualizer
  const [viewReceiptExpense, setViewReceiptExpense] = useState<Expense | null>(null);

  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Alertas periódicos (contas pendentes + tarefas vencidas)
  const { showReminder, setShowReminder, pendingItems } = usePendingAlerts({
    enabled: !!sessionUser,
    checks,
    fixedPayments,
    getPendingPayments,
    todos,
  });

  // Filtro, agrupamento, ordenação e totais da listagem
  const {
    searchTerm, setSearchTerm,
    filterMode, setFilterMode,
    groupBy, setGroupBy,
    selectedDate, setSelectedDate,
    selectedMonth, setSelectedMonth,
    sortField, sortOrder, handleSort,
    availableDates, availableMonths,
    revealSavedExpense,
    filteredExpenses, groupedExpenses, totalsByStore, totalGeneral,
    currentPeriodLabel, pdfPeriodLabel,
  } = useExpenseFilters(expenses);

  // Histórico completo sob demanda: análises, fechamento, busca (vale para todo o
  // período) e painel vazio (pode haver histórico antigo) precisam dele.
  const { historyFailed, retryHistory } = useHistoryAccess({
    needed:
      currentView === 'analytics' ||
      currentView === 'closing' ||
      !!searchTerm ||
      (!!user && !expensesLoading && expenses.length === 0),
    isFullHistory,
    loadFullHistory,
  });

  // Lançamento com data anterior à janela carregada: traz o histórico para que
  // ele apareça na lista depois de salvo.
  const revealSaved = useCallback((savedDate: string) => {
    if (!isFullHistory && isBeforeRecentWindow(savedDate, recentWindowStart)) {
      loadFullHistory().catch(() => { /* o aviso do painel oferece tentar de novo */ });
    }
    revealSavedExpense(savedDate);
  }, [isFullHistory, recentWindowStart, loadFullHistory, revealSavedExpense]);

  // Formulário de lançamento + fluxos de salvar / editar / excluir
  const editorActions = useMemo(
    () => ({ addExpense, addExpenseGroup, saveExpenseGroup, updateExpense, deleteExpense, canDelete }),
    [addExpense, addExpenseGroup, saveExpenseGroup, updateExpense, deleteExpense, canDelete]
  );
  const onNeedEmployeeName = useCallback(() => setIsSettingsOpen(true), []);
  const onEditLoaded = useCallback(() => {
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const {
    date, setDate, description, setDescription, store, setStore,
    category, setCategory, amount, setAmount, notes, setNotes,
    receiptUrl, setReceiptUrl, isSubmitting,
    editingId, resetForm, handleSubmit,
    editPasswordModal, setEditPasswordModal, editPasswordInput, setEditPasswordInput,
    editReason, setEditReason, handleEditClick, confirmEditPassword, closeEditPasswordModal, cancelEditPassword,
    deleteModal, setDeleteModal, deletePasswordInput, setDeletePasswordInput,
    deleteReason, setDeleteReason, handleDeleteClick, proceedToDeletePassword,
    confirmDeletePassword, closeDeleteModal, cancelDelete,
  } = useExpenseEditor({
    sessionUser,
    settingsEmployeeName: settings.employeeName,
    expenses,
    actions: editorActions,
    showToast,
    revealSavedExpense: revealSaved,
    onNeedEmployeeName,
    onEditLoaded,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // User initials for sidebar avatar
  const userInitials = useMemo(() => {
    const name = sessionUser?.name || settings.employeeName;
    if (!name || name === "Seu Nome") return "DM";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [sessionUser, settings.employeeName]);

  // Handle Login Success
  const handleLoginSuccess = useCallback((user: AuthenticatedUser) => {
    setSessionUser(user);
    setSettings(prev => ({ ...prev, employeeName: user.name }));
    showToast(`Bem-vindo, ${user.name}!`, 'success');
  }, [setSettings, showToast]);

  // Sessão do Firebase expirou/foi revogada (ou o app abriu sem sessão válida,
  // ex.: restos de um login anônimo antigo): volta para a tela de login.
  useEffect(() => {
    // `firebaseAuth.currentUser` evita deslogar no instante entre o login
    // concluir e o estado do hook propagar.
    if (authReady && !user && sessionUser && (!firebaseAuth.currentUser || firebaseAuth.currentUser.isAnonymous)) {
      void logoutUser();
      setSessionUser(null);
    }
  }, [authReady, user, sessionUser]);

  // Handle Logout
  const handleLogout = useCallback(() => {
    void logoutUser();
    setSessionUser(null);
    showToast('Sessão encerrada com sucesso.', 'info');
  }, [showToast]);

  // Reset all states and return to Home dashboard
  const handleResetAllToHome = useCallback(() => {
    resetForm();
    setSearchTerm('');
    setEditPasswordModal({ open: false, expense: null });
    setDeleteModal({ open: false, step: 'confirm', expense: null });
    if (availableDates.length > 0) {
      setSelectedDate(availableDates[availableDates.length - 1]);
    }
    if (availableMonths.length > 0) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Retornado ao início do painel!", "info");
  }, [resetForm, setSearchTerm, setEditPasswordModal, setDeleteModal, setSelectedDate, setSelectedMonth, availableDates, availableMonths, showToast]);

  // Contagem de tarefas pendentes do To-Do para "Hoje"
  const pendingTodosToday = useMemo(() => {
    const today = getTodayLocal();
    return todos.filter(t => !t.completed && (t.dueDate === today || !t.dueDate)).length;
  }, [todos]);

  // Fechar modais ao pressionar ESC
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editPasswordModal.open) closeEditPasswordModal();
        if (deleteModal.open) closeDeleteModal();
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (showBackupOptions) setShowBackupOptions(false);
        if (showPrintPreview) setShowPrintPreview(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editPasswordModal.open, deleteModal.open, closeEditPasswordModal, closeDeleteModal, isSettingsOpen, showBackupOptions, showPrintPreview]);

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await handleRestoreFile(file, (msg) => showToast(msg));
      showToast("Backup restaurado com sucesso!");
    } catch (error) {
      logger.error('Erro ao restaurar backup:', error);
      showToast("Erro ao restaurar backup", "error");
    } finally {
      // Permite selecionar o MESMO arquivo novamente (senão o onChange não dispara)
      e.target.value = '';
    }
  };

  const handleSaveBackup = async () => {
    try {
      // O backup precisa de TODO o histórico (não só da janela do painel)
      const fullExpenses = await loadFullHistory();
      await saveToComputer(fullExpenses, checks);
      setShowBackupOptions(false);
      showToast("Backup salvo!");
    } catch (error) {
      if (error instanceof HistoryLoadError) {
        showToast("Backup cancelado: não foi possível carregar o histórico completo. Verifique a conexão.", "error");
        return;
      }
      // Erro real do seletor de arquivo (permissão, disco...) — não fechar
      // o modal nem mostrar "salvo" quando não salvou
      logger.error('Erro ao salvar backup:', error);
      showToast("Erro ao salvar o backup. Verifique as permissões do navegador.", "error");
    }
  };

  const handleExportCSV = () => {
    exportToCSV(filteredExpenses, sessionUser?.name || settings.employeeName);
    showToast(`CSV gerado com ${filteredExpenses.length} registro(s)!`);
  };

  const handlePrint = useCallback(() => {
    setShowPrintPreview(true);
  }, []);

  const handleSavePDF = useCallback(async () => {
    const defaultFileName = `relatorio-despesas-${selectedDate || selectedMonth || getTodayLocal()}.pdf`;
    const periodLabel = pdfPeriodLabel;

    const currentSettings = {
      ...settings,
      employeeName: sessionUser?.name || settings.employeeName
    };

    if (window.electronAPI?.downloadPDFDirect) {
      showToast("Baixando PDF direto...", "info");
      const res = await window.electronAPI.downloadPDFDirect(defaultFileName);
      if (res.success) {
        showToast(`PDF baixado com sucesso em Downloads: ${res.fileName || defaultFileName}`, "success");
      } else {
        showToast("Erro ao baixar PDF: " + (res.error || "Desconhecido"), "error");
      }
    } else {
      // jsPDF só é baixado quando o usuário exporta (fora do bundle inicial)
      const { exportVectorPDF } = await import('@/shared/utils/pdfExport');
      exportVectorPDF(filteredExpenses, currentSettings, periodLabel, defaultFileName);
      showToast("PDF vetorial baixado com sucesso!", "success");
    }
  }, [selectedDate, selectedMonth, pdfPeriodLabel, filteredExpenses, settings, sessionUser, showToast]);

  const handleOpenNewTabPDF = useCallback(async () => {
    const periodLabel = pdfPeriodLabel;

    const currentSettings = {
      ...settings,
      employeeName: sessionUser?.name || settings.employeeName
    };

    if (window.electronAPI?.printToPDF) {
      showToast("Abrindo PDF vetorial...", "info");
      const res = await window.electronAPI.printToPDF();
      if (res.success) {
        showToast("PDF aberto no visualizador!", "success");
      } else {
        showToast("Erro ao abrir PDF: " + (res.error || "Desconhecido"), "error");
      }
    } else {
      const { openVectorPDFInNewTab } = await import('@/shared/utils/pdfExport');
      openVectorPDFInNewTab(filteredExpenses, currentSettings, periodLabel);
      showToast("PDF vetorial aberto em nova guia!", "success");
    }
  }, [pdfPeriodLabel, filteredExpenses, settings, sessionUser, showToast]);

  const handlePrintDirect = useCallback(() => {
    window.print();
  }, []);

  const handleEmptyStateRestore = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Render sort icon in table headers
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-amber-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-amber-600" />
    );
  };

  // If user is not authenticated, render Login Screen
  if (!sessionUser) {
    return (
      <>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  // Loading state
  if (expensesLoading && expenses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium text-sm">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900 flex flex-col lg:flex-row font-sans antialiased">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {showReminder && (
        <PendingPaymentsAlert
          items={pendingItems}
          onClick={() => setCurrentView('calendar')}
          onClose={() => setShowReminder(false)}
        />
      )}

      {/* Hidden file input for backup restoration */}
      <input type="file" ref={fileInputRef} onChange={handleRestore} accept=".json" className="hidden" />

      <AppSidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
        pendingTodosToday={pendingTodosToday}
        isAdmin={isDarkAdmin}
        onPrint={handlePrint}
        onOpenBackup={() => setShowBackupOptions(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        userInitials={userInitials}
        userRole={sessionUser?.role || 'Administrador'}
        userName={sessionUser?.name || settings.employeeName}
        syncStatus={syncStatus}
      />

      {/* Main Light Clean Canvas (Matches Reference Image) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="border-b border-slate-200/90 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white sticky top-0 z-20 no-print shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              {currentView === 'audit' ? 'Registros de Auditoria' : currentView === 'todo' ? 'Minhas Tarefas To-Do' : `Resultados: ${currentPeriodLabel}`}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {currentView === 'audit' ? 'Monitoramento em tempo real' : 'Atualizado em tempo real'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Period Quick Select & Actions */}
            {currentView === 'dashboard' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all shadow-xs cursor-pointer"
                  title="Pré-visualizar e Imprimir"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg transition-all shadow-xs cursor-pointer"
                  title="Exportar CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Views Content Area */}
        <ErrorBoundary scope="view" resetKey={currentView}>
          <div className="p-6 sm:p-8 space-y-6">
            {currentView === 'calendar' ? (
              <Suspense fallback={<LoadingSpinner />}>
                <ExpenseCalendar
                  fixedPayments={fixedPayments}
                  checkedState={checks}
                  onToggleCheck={toggleCheck}
                  showToast={showToast}
                  syncError={syncError}
                  todos={todos}
                  onToggleTodo={toggleTodoComplete}
                />
              </Suspense>
            ) : currentView === 'analytics' && !isFullHistory ? (
              <HistoryRequiredView failed={historyFailed} onRetry={retryHistory} />
            ) : currentView === 'closing' && !isFullHistory ? (
              <HistoryRequiredView failed={historyFailed} onRetry={retryHistory} />
            ) : currentView === 'analytics' ? (
              <Suspense fallback={<LoadingSpinner />}>
                <ExpenseAnalytics
                  expenses={expenses}
                  currency={settings.currency}
                />
              </Suspense>
            ) : currentView === 'closing' ? (
              <Suspense fallback={<LoadingSpinner />}>
                <MonthlyClosingView
                  expenses={expenses}
                  currency={settings.currency}
                  employeeName={sessionUser?.name || settings.employeeName}
                  showToast={showToast}
                />
              </Suspense>
            ) : currentView === 'payments' ? (
              <Suspense fallback={<LoadingSpinner />}>
                <FixedPaymentsManager
                  showToast={showToast}
                  payments={fixedPayments}
                  addPayment={addFixedPayment}
                  updatePayment={updateFixedPayment}
                  deletePayment={deleteFixedPayment}
                  getPaymentsByDay={getFixedPaymentsByDay}
                  getUniqueDays={getFixedUniqueDays}
                  syncStatus={fixedPaymentsSyncStatus}
                />
              </Suspense>
            ) : currentView === 'audit' && isDarkAdmin ? (
              <Suspense fallback={<LoadingSpinner />}>
                <AuditManager />
              </Suspense>
            ) : currentView === 'todo' ? (
              <Suspense fallback={<LoadingSpinner />}>
                <TodoManager
                  employeeName={sessionUser?.name || settings.employeeName}
                  userEmail={sessionUser?.email || ''}
                  showToast={showToast}
                  todoData={todoHookData}
                />
              </Suspense>
            ) : (
              <>
                {!isFullHistory && (expenses.length > 0 || historyFailed) && (
                  <RecentHistoryBanner
                    windowStart={recentWindowStart}
                    isLoading={isLoadingHistory}
                    failed={historyFailed}
                    onLoadFull={retryHistory}
                  />
                )}

                {/* KPI Cards Grid (Modularizado) */}
                {expenses.length > 0 && (
                  <ExpenseSummaryCards
                    partialSince={isFullHistory ? undefined : recentWindowStart}
                    expenses={expenses}
                    filteredExpenses={filteredExpenses}
                    totalsByStore={totalsByStore}
                    totalGeneral={totalGeneral}
                    currency={settings.currency}
                  />
                )}

                {/* Form: Novo / Editar Lançamento (Modularizado com Comprovante) */}
                <ExpenseForm
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
                  receiptUrl={receiptUrl}
                  setReceiptUrl={setReceiptUrl}
                  editingId={editingId}
                  isSubmitting={isSubmitting}
                  currency={settings.currency}
                  categoriesList={settings.categories}
                  onSubmit={handleSubmit}
                  onReset={resetForm}
                  onResetAllToHome={handleResetAllToHome}
                  showToast={showToast}
                />

                {/* Empty state */}
                {expenses.length === 0 && !expensesLoading && isFullHistory && (
                  <div className="text-center py-20 rounded-2xl border border-dashed border-slate-300 no-print flex flex-col items-center justify-center text-slate-500 bg-white shadow-sm">
                    <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mb-4 text-amber-600">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <p className="font-bold text-slate-900 text-base">Banco de Dados Vazio</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">Nenhum lançamento foi registrado ainda. Comece adicionando uma despesa ou importe um backup.</p>
                    <button
                      onClick={handleEmptyStateRestore}
                      className="mt-6 px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm rounded-lg transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Upload className="w-4 h-4" /> Importar Backup do Computador
                    </button>
                  </div>
                )}

                {/* Expenses List & Interactive Data Grids */}
                {expenses.length > 0 && (
                  <div className="space-y-6">
                    {/* Search & Period Selector Controls */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 no-print">
                      {/* Search Input - Protected from Browser Autofill */}
                      <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Search className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          name="search_query_despesas_non_auth"
                          id="search_query_despesas_non_auth"
                          autoComplete="new-password"
                          autoCorrect="off"
                          spellCheck="false"
                          data-form-type="other"
                          data-lpignore="true"
                          placeholder="Pesquisar por descrição, categoria, loja..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder-slate-400"
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Limpar pesquisa"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {!searchTerm && (
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                          {/* Day / Month Toggle */}
                          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                              onClick={() => setFilterMode('day')}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                filterMode === 'day'
                                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              Dia
                            </button>
                            <button
                              onClick={() => setFilterMode('month')}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                filterMode === 'month'
                                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              Mês
                            </button>
                          </div>

                          {/* Date Navigation */}
                          {filterMode === 'day' ? (
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                              <button
                                onClick={() => {
                                  const idx = availableDates.indexOf(selectedDate);
                                  if (idx > 0) setSelectedDate(availableDates[idx - 1]);
                                }}
                                disabled={availableDates.indexOf(selectedDate) <= 0}
                                className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="font-bold text-slate-800 px-2 min-w-[90px] text-center text-xs">
                                {selectedDate ? formatDateBR(selectedDate) : '...'}
                              </span>
                              <button
                                onClick={() => {
                                  const idx = availableDates.indexOf(selectedDate);
                                  if (idx < availableDates.length - 1) setSelectedDate(availableDates[idx + 1]);
                                }}
                                disabled={availableDates.indexOf(selectedDate) >= availableDates.length - 1}
                                className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                              <button
                                onClick={() => {
                                  const idx = availableMonths.indexOf(selectedMonth);
                                  if (idx > 0) setSelectedMonth(availableMonths[idx - 1]);
                                }}
                                disabled={availableMonths.indexOf(selectedMonth) <= 0}
                                className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="font-bold text-slate-800 px-2 min-w-[110px] text-center text-xs capitalize">
                                {selectedMonth ? formatMonthBR(selectedMonth) : '...'}
                              </span>
                              <button
                                onClick={() => {
                                  const idx = availableMonths.indexOf(selectedMonth);
                                  if (idx < availableMonths.length - 1) setSelectedMonth(availableMonths[idx + 1]);
                                }}
                                disabled={availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1}
                                className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Group By Toggle */}
                          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                              onClick={() => setGroupBy('date')}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                groupBy === 'date'
                                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              Data
                            </button>
                            <button
                              onClick={() => setGroupBy('store')}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                groupBy === 'store'
                                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              Loja
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Grouped Data Grids */}
                    <div className="space-y-6">
                      {groupedExpenses.map(group => (
                        <div key={group.key} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                          {/* Table Group Header */}
                          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2.5">
                              {groupBy === 'date' ? (
                                <Calendar className="w-4 h-4 text-slate-600" />
                              ) : (
                                <img
                                  src={STORE_IMAGES[group.key] || STORE_IMAGES["default"]}
                                  alt={group.key}
                                  className="w-5 h-5 rounded object-cover"
                                />
                              )}
                              <span>{groupBy === 'date' ? formatDateBR(group.key) : group.key}</span>
                            </h4>
                            <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-full tabular-nums shadow-xs">
                              {settings.currency} {formatCurrency(group.total)}
                            </span>
                          </div>

                          {/* Data Grid */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                                  {groupBy === 'date' && (
                                    <th
                                      onClick={() => handleSort('store')}
                                      className="px-6 py-3 cursor-pointer hover:text-slate-900 transition-colors group"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span>Loja</span>
                                        {renderSortIcon('store')}
                                      </div>
                                    </th>
                                  )}
                                  <th
                                    onClick={() => handleSort('employeeName')}
                                    className="px-6 py-3 cursor-pointer hover:text-slate-900 transition-colors group"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span>Quem</span>
                                      {renderSortIcon('employeeName')}
                                    </div>
                                  </th>
                                  <th
                                    onClick={() => handleSort('category')}
                                    className="px-6 py-3 cursor-pointer hover:text-slate-900 transition-colors group"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span>Categoria</span>
                                      {renderSortIcon('category')}
                                    </div>
                                  </th>
                                  <th
                                    onClick={() => handleSort('date')}
                                    className="px-6 py-3 cursor-pointer hover:text-slate-900 transition-colors group"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span>Data</span>
                                      {renderSortIcon('date')}
                                    </div>
                                  </th>
                                  <th
                                    onClick={() => handleSort('description')}
                                    className="px-6 py-3 cursor-pointer hover:text-slate-900 transition-colors group"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span>Descrição</span>
                                      {renderSortIcon('description')}
                                    </div>
                                  </th>
                                  <th
                                    onClick={() => handleSort('amount')}
                                    className="px-6 py-3 text-right cursor-pointer hover:text-slate-900 transition-colors group"
                                  >
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span>Valor</span>
                                      {renderSortIcon('amount')}
                                    </div>
                                  </th>
                                  <th className="px-6 py-3 text-center no-print w-24">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {group.items.map(ex => (
                                  <ExpenseTableRow
                                    key={ex.id}
                                    expense={ex}
                                    groupBy={groupBy}
                                    defaultEmployeeName={settings.employeeName}
                                    onEdit={handleEditClick}
                                    onDelete={handleDeleteClick}
                                    onViewReceipt={setViewReceiptExpense}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ErrorBoundary>
      </main>

      <EditPasswordModal
        expense={editPasswordModal.open ? editPasswordModal.expense : null}
        reason={editReason}
        onReasonChange={setEditReason}
        password={editPasswordInput}
        onPasswordChange={setEditPasswordInput}
        onConfirm={confirmEditPassword}
        onCancel={cancelEditPassword}
      />

      <DeleteExpenseModal
        expense={deleteModal.open ? deleteModal.expense : null}
        step={deleteModal.step}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        password={deletePasswordInput}
        onPasswordChange={setDeletePasswordInput}
        onProceed={proceedToDeletePassword}
        onConfirm={confirmDeletePassword}
        onCancel={cancelDelete}
      />

      {/* Visualizador de Comprovante Anexado */}
      <ReceiptModal
        expense={viewReceiptExpense}
        onClose={() => setViewReceiptExpense(null)}
      />

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onEmployeeNameChange={(name) => setSettings(prev => ({ ...prev, employeeName: name }))}
          onRestoreClick={handleEmptyStateRestore}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {showBackupOptions && (
        <BackupModal
          onSave={handleSaveBackup}
          onClose={() => setShowBackupOptions(false)}
        />
      )}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        expenses={filteredExpenses}
        totalsByStore={totalsByStore}
        totalGeneral={totalGeneral}
        settings={settings}
        filterMode={filterMode}
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        searchTerm={searchTerm}
        onPrintDirect={handlePrintDirect}
        onSavePDF={handleSavePDF}
        onOpenNewTab={handleOpenNewTabPDF}
      />
    </div>
  );
}
