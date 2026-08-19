import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useAuth, useToast, useBackup } from '@/shared/hooks';
import { useExpenses, splitExpense, validateAdminPassword } from '@/features/expenses';
import { useCalendar } from '@/features/calendar/hooks/useCalendar';
import { useFixedPayments } from '@/features/fixed-payments/hooks/useFixedPayments';
import { LoginScreen, getStoredUserSession, logoutUser, seedInitialUsersIfNotExist } from '@/features/auth';
import type { AuthenticatedUser } from '@/features/auth';
import { logAuditEvent } from '@/features/audit';
import { STORES_LIST, CATEGORIES_LIST, STORE_IMAGES, STORE_DISPLAY_ORDER } from '@/config/constants';
import { getTodayLocal, formatDateBR, formatMonthBR, formatCurrency } from '@/shared/utils/formatters';
import { getStoreColorClass, getStoreBarColor, getStoreOrder } from '@/shared/utils/helpers';
import { playNotificationSound } from '@/shared/utils/audio';
import { exportVectorPDF, openVectorPDFInNewTab } from '@/shared/utils/pdfExport';
import { ToastContainer, DateInput, PendingPaymentsAlert, PrintPreviewModal } from '@/shared/components/ui';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';

const ExpenseCalendar = lazy(() => import('@/features/calendar/components/ExpenseCalendar').then(m => ({ default: m.ExpenseCalendar })));
const ExpenseAnalytics = lazy(() => import('@/features/analytics/components/ExpenseAnalytics').then(m => ({ default: m.ExpenseAnalytics })));
const FixedPaymentsManager = lazy(() => import('@/features/fixed-payments/components/FixedPaymentsManager').then(m => ({ default: m.FixedPaymentsManager })));
const AuditManager = lazy(() => import('@/features/audit/components/AuditManager').then(m => ({ default: m.AuditManager })));
const TodoManager = lazy(() => import('@/features/todo/components/TodoManager').then(m => ({ default: m.TodoManager })));

import {
  ListTodo,

  Plus,
  Edit,
  Trash2,
  Download,
  Settings,
  RotateCcw,
  Calendar,
  Tag,
  DollarSign,
  Store,
  Printer,
  Check,
  X,
  AlertCircle,
  Save,
  Upload,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Globe,
  Wifi,
  WifiOff,
  HardDrive,
  Cloud,
  Home,
  BarChart2,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Menu,
  LogOut,
  History
} from '@/shared/components/icons';
import type { Expense, ExpenseGroup, Settings as SettingsType, ViewMode, FilterMode, GroupByMode } from '@/shared/types';
import '../styles/index.css';

const DEFAULT_SETTINGS: SettingsType = {
  employeeName: "Seu Nome",
  currency: "R$",
  categories: CATEGORIES_LIST.map(cat => ({ label: cat, odooRef: cat }))
};

type SortField = 'store' | 'employeeName' | 'category' | 'date' | 'description' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function App() {
  // Database user authentication session
  const [sessionUser, setSessionUser] = useState<AuthenticatedUser | null>(() => getStoredUserSession());

  // Check if session user is Dark Morellato (Admin)
  const isDarkAdmin = useMemo(() => {
    if (!sessionUser) return false;
    const email = sessionUser.email.toLowerCase().trim();
    const name = sessionUser.name.toLowerCase().trim();
    return email === 'darkmorelato@miplace.com' || name.includes('dark');
  }, [sessionUser]);

  // Auth and data hooks
  const { user, syncStatus, error: authError } = useAuth();
  const { expenses, isLoading: expensesLoading, addExpense, updateExpense, deleteExpense, canDelete } = useExpenses(user);
  const { checks, isLoading: checksLoading, toggleCheck, getPendingPayments, syncError } = useCalendar(user);
  const { payments: fixedPayments } = useFixedPayments(user);
  const { toasts, showToast, removeToast } = useToast();
  const { saveToComputer, handleRestoreFile, exportToCSV } = useBackup();

  // Local state
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [editingId, setEditingId] = useState<string | null>(null);
  const originalExpenseForAudit = useRef<Expense | null>(null);
  
  // Modals for editing and deleting with password verification
  const [editPasswordModal, setEditPasswordModal] = useState<{ open: boolean; expense: Expense | null }>({ open: false, expense: null });
  const [editPasswordInput, setEditPasswordInput] = useState('');
  
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; step: 'confirm' | 'password'; expense: Expense | null }>({ open: false, step: 'confirm', expense: null });
  const [deletePasswordInput, setDeletePasswordInput] = useState('');

  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Table Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Form state
  const [date, setDate] = useState(getTodayLocal());
  const [description, setDescription] = useState('');
  const [store, setStore] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('day');
  const [groupBy, setGroupBy] = useState<GroupByMode>('date');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize and seed database users if not existing
  useEffect(() => {
    seedInitialUsersIfNotExist();
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    const savedSet = localStorage.getItem('odoo_fast_settings');
    if (savedSet) {
      try {
        const parsed = JSON.parse(savedSet);
        parsed.categories = CATEGORIES_LIST.map(cat => ({ label: cat, odooRef: cat }));
        if (sessionUser && (!parsed.employeeName || parsed.employeeName === "Seu Nome")) {
          parsed.employeeName = sessionUser.name;
        }
        setSettings(parsed);
      } catch (e) {
        console.warn("Erro ao parsear settings:", e);
      }
    } else if (sessionUser) {
      setSettings(prev => ({ ...prev, employeeName: sessionUser.name }));
    }
  }, [sessionUser]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('odoo_fast_settings', JSON.stringify(settings));
  }, [settings]);

  // Sync session user name with employee settings
  useEffect(() => {
    if (sessionUser && (settings.employeeName === "Seu Nome" || !settings.employeeName)) {
      setSettings(prev => ({ ...prev, employeeName: sessionUser.name }));
    }
  }, [sessionUser, settings.employeeName]);

  // Check pending payments
  useEffect(() => {
    if (!sessionUser) return;
    const checkPending = () => {
      const pending = getPendingPayments(fixedPayments);
      if (pending.length > 0) {
        setPendingItems(pending);
        setShowReminder(true);
        playNotificationSound();
      } else {
        setShowReminder(false);
        setPendingItems([]);
      }
    };

    const timer = setTimeout(checkPending, 2000);
    const interval = setInterval(checkPending, 30 * 60 * 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [getPendingPayments, fixedPayments, sessionUser]);

  // Flashing title for pending payments
  useEffect(() => {
    if (!sessionUser) return;
    let titleInterval: any;
    if (showReminder && pendingItems.length > 0) {
      let isAlert = true;
      titleInterval = setInterval(() => {
        document.title = isAlert ? `(${pendingItems.length}) 🔴 PAGAR AGORA!` : "🔔 Atenção - Despesas";
        isAlert = !isAlert;
      }, 1000);
    } else {
      document.title = "Relatório de Despesas Miplace";
    }

    return () => {
      clearInterval(titleInterval);
      document.title = "Relatório de Despesas Miplace";
    };
  }, [showReminder, pendingItems.length, sessionUser]);

  // Available dates and months
  const availableDates = useMemo(() => {
    const dates = [...new Set(expenses.map(e => e.date))];
    return dates.sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const availableMonths = useMemo(() => {
    const months = [...new Set(expenses.map(e => e.date.substring(0, 7)))];
    return months.sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  // Auto-select date/month
  useEffect(() => {
    if (availableDates.length > 0 && (!selectedDate || !availableDates.includes(selectedDate))) {
      setSelectedDate(availableDates[availableDates.length - 1]);
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (availableMonths.length > 0 && (!selectedMonth || !availableMonths.includes(selectedMonth))) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      return filtered.filter(ex =>
        ex.description.toLowerCase().includes(lowerSearch) ||
        ex.category.toLowerCase().includes(lowerSearch) ||
        ex.store.toLowerCase().includes(lowerSearch) ||
        (ex.notes && ex.notes.toLowerCase().includes(lowerSearch))
      );
    }

    if (filterMode === 'month' && selectedMonth) {
      filtered = filtered.filter(ex => ex.date.startsWith(selectedMonth));
    } else if (filterMode === 'day' && selectedDate) {
      filtered = filtered.filter(ex => ex.date === selectedDate);
    }

    return filtered;
  }, [expenses, searchTerm, selectedDate, selectedMonth, filterMode]);

  // Handle column sort toggle
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField]);

  // Group and sort expenses
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(ex => {
      const key = groupBy === 'date' ? ex.date : ex.store;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ex);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (groupBy === 'date') return b.localeCompare(a);
      return getStoreOrder(a) - getStoreOrder(b);
    });

    return sortedKeys.map(key => {
      const sortedItems = [...groups[key]].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'amount') {
          cmp = a.amount - b.amount;
        } else if (sortField === 'store') {
          cmp = (getStoreOrder(a.store) - getStoreOrder(b.store)) || a.store.localeCompare(b.store);
        } else if (sortField === 'category') {
          cmp = a.category.localeCompare(b.category);
        } else if (sortField === 'date') {
          cmp = a.date.localeCompare(b.date);
        } else if (sortField === 'description') {
          cmp = a.description.localeCompare(b.description);
        } else if (sortField === 'employeeName') {
          cmp = (a.employeeName || '').localeCompare(b.employeeName || '');
        }

        if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
        return a.description.localeCompare(b.description);
      });

      return {
        key,
        items: sortedItems,
        total: sortedItems.reduce((sum, item) => sum + item.amount, 0)
      };
    });
  }, [filteredExpenses, groupBy, sortField, sortOrder]);

  // Totals by store
  const totalsByStore = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredExpenses.forEach(ex => {
      acc[ex.store] = (acc[ex.store] || 0) + ex.amount;
    });
    return acc;
  }, [filteredExpenses]);

  const totalGeneral = useMemo(() =>
    filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0),
    [filteredExpenses]
  );

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
  }, [showToast]);

  // Handle Logout
  const handleLogout = useCallback(() => {
    logoutUser();
    setSessionUser(null);
    showToast('Sessão encerrada com sucesso.', 'info');
  }, [showToast]);

  // Form handlers
  const resetForm = useCallback(() => {
    setDate(getTodayLocal());
    setDescription('');
    setStore('');
    setCategory('');
    setAmount('');
    setNotes('');
    setEditingId(null);
    originalExpenseForAudit.current = null;
  }, []);

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
  }, [resetForm, availableDates, availableMonths, showToast]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setAmount('');
      return;
    }
    setAmount(new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(val) / 100));
  }, []);

  const handleAmountPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const normalized = pasted.trim().replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    if (!isNaN(num) && num > 0) {
      setAmount(new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num));
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const activeEmployeeName = sessionUser?.name || settings.employeeName;
    if (activeEmployeeName === "Seu Nome" || !activeEmployeeName.trim()) {
      showToast("Configure seu nome antes de lançar.", "error");
      setIsSettingsOpen(true);
      return;
    }

    const totalVal = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(totalVal) || totalVal <= 0) {
      showToast("Valor inválido", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const prev = originalExpenseForAudit.current;

        await updateExpense(editingId, {
          date,
          description,
          store,
          category,
          amount: totalVal,
          notes,
          employeeName: activeEmployeeName
        });

        // Grava auditoria de edição
        if (prev) {
          logAuditEvent({
            actionType: 'EDIT',
            actionDate: new Date().toISOString(),
            userName: sessionUser?.name || 'Administrador',
            userEmail: sessionUser?.email || '',
            expenseId: editingId,
            previousData: {
              description: prev.description,
              store: prev.store,
              category: prev.category,
              amount: prev.amount,
              date: prev.date,
              notes: prev.notes,
              employeeName: prev.employeeName
            },
            newData: {
              description,
              store,
              category,
              amount: totalVal,
              date,
              notes,
              employeeName: activeEmployeeName
            }
          });
        }

        showToast("Lançamento atualizado e registrado na auditoria!");
        resetForm();
      } else {
        const entries = splitExpense(store as any, totalVal);

        for (let ent of entries) {
          const newDoc = {
            date,
            description,
            category,
            notes,
            store: ent.s,
            amount: ent.v,
            quantity: 1.0,
            employeeName: activeEmployeeName,
            originalTotal: entries.length > 1 ? totalVal : null
          };
          await addExpense(newDoc);
        }
        showToast(entries.length > 1 ? `${entries.length} despesas geradas!` : "Despesa salva!");
        resetForm();
      }
    } catch (error) {
      showToast("Erro ao salvar", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, sessionUser, settings.employeeName, amount, date, description, store, category, notes, editingId, updateExpense, addExpense, resetForm, showToast]);

  // Handle Edit Click (Opens Edit Password Modal)
  const handleEditClick = useCallback((ex: Expense) => {
    setEditPasswordModal({ open: true, expense: ex });
    setEditPasswordInput('');
  }, []);

  // Confirm Edit Password
  const confirmEditPassword = useCallback(() => {
    if (!validateAdminPassword(editPasswordInput)) {
      showToast("Senha incorreta.", "error");
      return;
    }

    if (editPasswordModal.expense) {
      const ex = editPasswordModal.expense;
      originalExpenseForAudit.current = ex;
      setEditingId(ex.id);
      setDate(ex.date);
      setDescription(ex.description);
      setStore(ex.store);
      setCategory(ex.category);
      setAmount(formatCurrency(ex.amount));
      setNotes(ex.notes || '');
      setEditPasswordModal({ open: false, expense: null });
      setEditPasswordInput('');
      setCurrentView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast("Modo de edição liberado!", "info");
    }
  }, [editPasswordInput, editPasswordModal.expense, showToast]);

  // Handle Delete Click (Opens Delete Step 1: Confirmation)
  const handleDeleteClick = useCallback((ex: Expense) => {
    setDeleteModal({ open: true, step: 'confirm', expense: ex });
    setDeletePasswordInput('');
  }, []);

  // Delete Step 1 -> Proceed to Step 2 (Password)
  const proceedToDeletePassword = useCallback(() => {
    setDeleteModal(prev => ({ ...prev, step: 'password' }));
  }, []);

  // Confirm Delete Password & Log Audit
  const confirmDeletePassword = useCallback(async () => {
    if (!validateAdminPassword(deletePasswordInput)) {
      showToast("Senha incorreta.", "error");
      return;
    }

    if (deleteModal.expense) {
      const ex = deleteModal.expense;
      const { allowed, reason } = canDelete(ex.id);
      if (!allowed) {
        showToast(reason || "Exclusão não permitida", "error");
        return;
      }

      await deleteExpense(ex.id);

      // Grava auditoria de exclusão
      logAuditEvent({
        actionType: 'DELETE',
        actionDate: new Date().toISOString(),
        userName: sessionUser?.name || 'Administrador',
        userEmail: sessionUser?.email || '',
        expenseId: ex.id,
        previousData: {
          description: ex.description,
          store: ex.store,
          category: ex.category,
          amount: ex.amount,
          date: ex.date,
          notes: ex.notes,
          employeeName: ex.employeeName
        }
      });

      setDeleteModal({ open: false, step: 'confirm', expense: null });
      setDeletePasswordInput('');
      showToast("Lançamento excluído e registrado na auditoria!", "success");
    }
  }, [deletePasswordInput, deleteModal.expense, canDelete, deleteExpense, sessionUser, showToast]);

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await handleRestoreFile(file, (msg) => showToast(msg));
      showToast("Backup restaurado com sucesso!");
    } catch (error) {
      showToast("Erro ao restaurar backup", "error");
    }
  };

  const handleSaveBackup = async () => {
    await saveToComputer(expenses, checks);
    setShowBackupOptions(false);
    showToast("Backup salvo!");
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
    const periodLabel = searchTerm
      ? `Busca: "${searchTerm}"`
      : filterMode === 'month'
      ? `Mês: ${formatMonthBR(selectedMonth)}`
      : `Dia: ${formatDateBR(selectedDate)}`;

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
      exportVectorPDF(filteredExpenses, currentSettings, periodLabel, defaultFileName);
      showToast("PDF vetorial baixado com sucesso!", "success");
    }
  }, [selectedDate, selectedMonth, searchTerm, filterMode, filteredExpenses, settings, sessionUser, showToast]);

  const handleOpenNewTabPDF = useCallback(async () => {
    const periodLabel = searchTerm
      ? `Busca: "${searchTerm}"`
      : filterMode === 'month'
      ? `Mês: ${formatMonthBR(selectedMonth)}`
      : `Dia: ${formatDateBR(selectedDate)}`;

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
      openVectorPDFInNewTab(filteredExpenses, currentSettings, periodLabel);
      showToast("PDF vetorial aberto em nova guia!", "success");
    }
  }, [selectedDate, selectedMonth, searchTerm, filterMode, filteredExpenses, settings, sessionUser, showToast]);

  const handlePrintDirect = useCallback(() => {
    window.print();
  }, []);

  const handleEmptyStateRestore = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // View titles
  const viewTitles: Record<ViewMode, string> = {
    dashboard: "Visão Geral",
    calendar: "Calendário",
    analytics: "Análise & Métricas",
    payments: "Pagamentos Fixos",
    audit: "Registros & Auditoria",
    todo: "Tarefas & To-Do"
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

  // Current period label matching reference design
  const currentPeriodLabel = useMemo(() => {
    if (searchTerm) return `Busca: "${searchTerm}"`;
    if (filterMode === 'month' && selectedMonth) return formatMonthBR(selectedMonth);
    if (filterMode === 'day' && selectedDate) return formatDateBR(selectedDate);
    return "Consolidado";
  }, [searchTerm, filterMode, selectedMonth, selectedDate]);

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

      {/* Mobile Top Navigation Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#111215] text-white border-b border-zinc-800 sticky top-0 z-50 no-print">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center text-xs tracking-tighter">
            MI
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-none">Miplace Despesas</h1>
            <span className="text-[9px] text-slate-400 uppercase tracking-widest">Enterprise Dashboard</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className="p-2 rounded-lg bg-white/10 text-slate-300 hover:text-white cursor-pointer"
          aria-label="Abrir Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Dark Sidebar Navigation (Matches Reference Image) */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-30 w-64 h-screen bg-[#111215] text-slate-300 border-r border-zinc-900
          flex flex-col justify-between p-5 shrink-0 transition-transform duration-300 no-print shadow-xl
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div>
          {/* Logo Header (Reference Image Style) */}
          <div className="flex items-center gap-3 pb-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-extrabold flex flex-col items-center justify-center leading-none shadow-md shrink-0">
              <span className="text-[11px] font-black tracking-tight">MI</span>
              <span className="text-[7px] font-bold tracking-tighter -mt-0.5">PLACE</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight leading-tight truncate">Miplace Despesas</h1>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold block">Enterprise</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-widest block -mt-0.5">Dashboard</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="mt-6 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-3">Principal</p>
            
            <button
              onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => { setCurrentView('calendar'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                currentView === 'calendar'
                  ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Calendário</span>
            </button>

            <button
              onClick={() => { setCurrentView('analytics'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                currentView === 'analytics'
                  ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <span>Categorias & Mix</span>
            </button>

            <button
              onClick={() => { setCurrentView('payments'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                currentView === 'payments'
                  ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>Pagamentos Fixos</span>
            </button>

            <button
              onClick={() => { setCurrentView('todo'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                currentView === 'todo'
                  ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ListTodo className="w-4 h-4 text-amber-400" />
              <span>Tarefas & To-Do</span>
            </button>

            {/* Relatorios & Tools */}
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 pt-6 px-3">
              Relatórios & Nuvem
            </p>

            <button
              onClick={handlePrint}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Exportar PDF</span>
            </button>

            <button
              onClick={() => { setShowBackupOptions(true); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span>Backup & Nuvem</span>
            </button>

            {/* Aba Exclusiva "Registros" para o Administrador Dark Morellato */}
            {isDarkAdmin && (
              <button
                onClick={() => { setCurrentView('audit'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                  currentView === 'audit'
                    ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>Registros</span>
                <span className="ml-auto text-[9px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                  Admin
                </span>
              </button>
            )}

            <button
              onClick={() => { setIsSettingsOpen(true); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Configurações</span>
            </button>
          </nav>
        </div>

        {/* User Profile Footer with Logout */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 uppercase font-semibold truncate tracking-wider">
                {sessionUser?.role || "Administrador"}
              </p>
              <p className="text-sm font-medium text-slate-200 truncate">
                {sessionUser?.name || settings.employeeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {syncStatus === 'synced' && <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_6px_rgba(52,211,153,0.8)]" title="Online" />}
            {syncStatus === 'syncing' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" title="Sincronizando..." />}
            {syncStatus === 'error' && <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" title="Erro" />}
            
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer ml-1"
              title="Sair / Trocar Usuário"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

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
                  onClick={handleResetAllToHome}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                  title="Voltar ao início e resetar filtros"
                >
                  <Home className="w-3.5 h-3.5 text-amber-700" />
                  <span>Início</span>
                </button>
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
        <div className="p-6 sm:p-8 space-y-6">
          {currentView === 'calendar' ? (
            <Suspense fallback={<LoadingSpinner />}>
              <ExpenseCalendar
                fixedPayments={fixedPayments}
                checkedState={checks}
                onToggleCheck={toggleCheck}
                showToast={showToast}
                syncError={syncError}
              />
            </Suspense>
          ) : currentView === 'analytics' ? (
            <Suspense fallback={<LoadingSpinner />}>
              <ExpenseAnalytics
                expenses={expenses}
                currency={settings.currency}
              />
            </Suspense>
          ) : currentView === 'payments' ? (
            <Suspense fallback={<LoadingSpinner />}>
              <FixedPaymentsManager
                showToast={showToast}
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
              />
            </Suspense>
          ) : (
            <>
              {/* KPI Cards Grid (Matches Reference Image Format) */}
              {expenses.length > 0 && (
                <div className="space-y-5 no-print">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Volume Total (Image Style) */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <span className="border border-slate-200 bg-slate-50 text-slate-600 rounded px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                          Volume Total
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Filtrado</p>
                        <h3 className="text-3xl sm:text-4xl font-bold mt-1 text-slate-950 tabular-nums tracking-tight">
                          {settings.currency} {formatCurrency(totalGeneral)}
                        </h3>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {filteredExpenses.length} Lançamentos
                        </span>
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Base Ativa
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Mix Ativo / Histórico */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                          <BarChart2 className="w-4 h-4" />
                        </div>
                        <span className="border border-slate-200 bg-slate-50 text-slate-600 rounded px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                          Mix Ativo
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volume Geral Acumulado</p>
                        <h3 className="text-3xl sm:text-4xl font-bold mt-1 text-slate-950 tabular-nums tracking-tight">
                          {settings.currency} {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
                        </h3>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {expenses.length} Total Geral
                        </span>
                        <span className="text-xs text-cyan-600 font-semibold">
                          Histórico Completo
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Top Performer / Lojas */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Store className="w-4 h-4" />
                        </div>
                        <span className="border border-slate-200 bg-slate-50 text-slate-600 rounded px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                          Top Performer
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lojas Ativas</p>
                        <h3 className="text-3xl sm:text-4xl font-bold mt-1 text-slate-950 tabular-nums tracking-tight">
                          {Object.keys(totalsByStore).length} Lojas
                        </h3>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          Centros de Custo
                        </span>
                        <span className="text-xs text-purple-600 font-semibold">
                          Em Operação
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Store Breakdown Horizontal Bar Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
                    {Object.entries(totalsByStore).sort((a, b) => b[1] - a[1]).map(([storeName, val]) => (
                      <div
                        key={storeName}
                        className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <img
                            src={STORE_IMAGES[storeName] || STORE_IMAGES["default"]}
                            alt={storeName}
                            className="w-5 h-5 rounded object-cover"
                          />
                          <span className="text-[10px] uppercase font-bold text-slate-500 truncate block tracking-wider">
                            {storeName}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 block tabular-nums">
                          {settings.currency} {formatCurrency(val)}
                        </span>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 mt-2.5 overflow-hidden border border-slate-100">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${totalGeneral > 0 ? Math.min((val / totalGeneral) * 100, 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form: Novo / Editar Lançamento */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden no-print">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                    {editingId ? "Editar Lançamento (Modo Seguro)" : "Novo Lançamento"}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => { resetForm(); showToast("Edição cancelada", "info"); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Cancelar Edição
                      </button>
                    )}
                    {!editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all cursor-pointer"
                        title="Limpar campos do formulário"
                      >
                        <RotateCcw className="w-3 h-3" /> Limpar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleResetAllToHome}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100/70 border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer shadow-2xs"
                      title="Resetar filtros, buscas e voltar ao início do painel"
                    >
                      <Home className="w-3.5 h-3.5 text-amber-700" /> Voltar ao Início
                    </button>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Date */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Data</label>
                        <DateInput
                          required
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          className="liquid-input w-full px-4 py-2.5 rounded-lg text-sm font-semibold"
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Categoria</label>
                        <div className="relative">
                          <select
                            required
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="liquid-input w-full px-4 py-2.5 rounded-lg appearance-none text-sm font-semibold cursor-pointer text-slate-900"
                          >
                            <option value="" disabled className="text-slate-400">Selecione uma categoria...</option>
                            {settings.categories.map((c, i) => (
                              <option key={i} value={c.label}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Tag className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Descrição</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Café com cliente, material de escritório..."
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          className="liquid-input w-full px-4 py-2.5 rounded-lg text-sm font-medium"
                        />
                      </div>

                      {/* Store / Group */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Loja / Grupo</label>
                        <div className="relative">
                          <select
                            required
                            value={store}
                            onChange={e => setStore(e.target.value)}
                            className="liquid-input w-full px-4 py-2.5 rounded-lg appearance-none text-sm font-semibold cursor-pointer text-slate-900"
                          >
                            <option value="" disabled className="text-slate-400">Selecione a loja...</option>
                            {STORES_LIST.map((l, i) => (
                              <option key={i} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Store className="w-4 h-4" />
                          </div>
                        </div>
                        {!editingId && store.includes("Piracicaba") && (
                          <p className="text-[11px] text-amber-600 font-medium pt-1">* Divide automaticamente por 3 lojas</p>
                        )}
                        {!editingId && store.includes("Amparo") && (
                          <p className="text-[11px] text-purple-600 font-medium pt-1">* Divide automaticamente por 2 lojas</p>
                        )}
                        {!editingId && store === "Todas" && (
                          <p className="text-[11px] text-emerald-600 font-medium pt-1">* Divide automaticamente por 5 lojas</p>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Valor ({settings.currency})
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
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <DollarSign className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Observações (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Detalhes adicionais, número de nota..."
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="liquid-input w-full px-4 py-2.5 rounded-lg text-sm font-normal text-slate-700"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-6 rounded-lg font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 active:scale-[0.99] transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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

              {/* Empty state */}
              {expenses.length === 0 && !expensesLoading && (
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
                                <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors group">
                                  {groupBy === 'date' && (
                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={STORE_IMAGES[ex.store] || STORE_IMAGES["default"]}
                                          alt={ex.store}
                                          className="w-4 h-4 rounded object-cover"
                                        />
                                        <span className="font-semibold text-slate-900">{ex.store}</span>
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-6 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                                    {ex.employeeName || settings.employeeName}
                                  </td>
                                  <td className="px-6 py-3.5 whitespace-nowrap">
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                      {ex.category}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 font-medium">
                                    {formatDateBR(ex.date)}
                                  </td>
                                  <td className="px-6 py-3.5">
                                    <div className="font-medium text-slate-900 leading-tight">
                                      {ex.description}
                                    </div>
                                    {ex.notes && (
                                      <div className="text-[11px] text-slate-400 mt-0.5 italic">{ex.notes}</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3.5 text-right font-bold text-slate-950 tabular-nums whitespace-nowrap">
                                    <div>{formatCurrency(ex.amount)}</div>
                                    {ex.originalTotal && (
                                      <div className="text-[9px] text-slate-400 font-normal">
                                        Orig: {formatCurrency(ex.originalTotal)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3.5 text-center no-print">
                                    <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => handleEditClick(ex)}
                                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                                        title="Editar Lançamento"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClick(ex)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                        title="Excluir Lançamento"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
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
      </main>

      {/* Edit Password Confirmation Modal */}
      {editPasswordModal.open && editPasswordModal.expense && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in no-print"
          onClick={() => { setEditPasswordModal({ open: false, expense: null }); setEditPasswordInput(''); }}
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4 text-amber-600">
              <Edit className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Confirmar Edição</h3>
            <p className="text-xs text-slate-600 mb-1 font-bold">
              {editPasswordModal.expense.description}
            </p>
            <p className="text-[11px] text-slate-400 mb-5">
              Digite a senha de administrador para liberar a edição deste item.
            </p>
            <input
              type="password"
              autoFocus
              placeholder="Senha"
              value={editPasswordInput}
              onChange={e => setEditPasswordInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmEditPassword();
                if (e.key === 'Escape') { setEditPasswordModal({ open: false, expense: null }); setEditPasswordInput(''); }
              }}
              className="liquid-input w-full px-4 py-2.5 rounded-lg text-center font-bold text-slate-900 mb-5 placeholder-slate-400 text-sm"
            />
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => { setEditPasswordModal({ open: false, expense: null }); setEditPasswordInput(''); }}
                className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmEditPassword}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Liberar Edição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete 2-Step Modal (Step 1: Confirm -> Step 2: Password) */}
      {deleteModal.open && deleteModal.expense && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in no-print"
          onClick={() => { setDeleteModal({ open: false, step: 'confirm', expense: null }); setDeletePasswordInput(''); }}
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center mb-4 text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>

            {deleteModal.step === 'confirm' ? (
              /* Passo 1: Confirmar intenção de excluir */
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Deseja realmente excluir?</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Esta ação removerá o lançamento do banco de dados e registrará o evento na auditoria.
                </p>

                {/* Detalhes do item a ser excluído */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left mb-6 space-y-1.5 text-xs">
                  <p><strong className="text-slate-900">Descrição:</strong> {deleteModal.expense.description}</p>
                  <p><strong className="text-slate-900">Loja / Categoria:</strong> {deleteModal.expense.store} • {deleteModal.expense.category}</p>
                  <p><strong className="text-slate-900">Data:</strong> {formatDateBR(deleteModal.expense.date)}</p>
                  <p><strong className="text-slate-900">Valor:</strong> <span className="font-bold text-rose-700">R$ {formatCurrency(deleteModal.expense.amount)}</span></p>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setDeleteModal({ open: false, step: 'confirm', expense: null }); setDeletePasswordInput(''); }}
                    className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Não, Manter
                  </button>
                  <button
                    type="button"
                    onClick={proceedToDeletePassword}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                  >
                    Sim, Continuar
                  </button>
                </div>
              </div>
            ) : (
              /* Passo 2: Solicitar senha de administrador */
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Senha de Confirmação</h3>
                <p className="text-xs text-slate-500 mb-5">
                  Digite a senha de administrador para concluir a exclusão de <strong>{deleteModal.expense.description}</strong>.
                </p>
                <input
                  type="password"
                  autoFocus
                  placeholder="Senha"
                  value={deletePasswordInput}
                  onChange={e => setDeletePasswordInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmDeletePassword();
                    if (e.key === 'Escape') { setDeleteModal({ open: false, step: 'confirm', expense: null }); setDeletePasswordInput(''); }
                  }}
                  className="liquid-input w-full px-4 py-2.5 rounded-lg text-center font-bold text-slate-900 mb-5 placeholder-slate-400 text-sm"
                />
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setDeleteModal({ open: false, step: 'confirm', expense: null }); setDeletePasswordInput(''); }}
                    className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeletePassword}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                  >
                    Excluir Definitivamente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs no-print">
          <div className="bg-white border border-slate-200 w-full max-w-md overflow-hidden flex flex-col rounded-2xl shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-amber-600" />
                Configurações do Sistema
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Perfil & Sincronização</h4>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nome do Funcionário <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.employeeName}
                    onChange={e => setSettings({ ...settings, employeeName: e.target.value })}
                    className="liquid-input w-full p-2.5 rounded-lg font-medium text-slate-900 text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Este nome é a chave da sua sincronização. Use o mesmo nome em todos os dispositivos.
                  </p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Backup Local</h4>
                <button
                  onClick={() => { if (fileInputRef.current) fileInputRef.current.click(); }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Restaurar Arquivo do Computador
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
              >
                Concluir & Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {showBackupOptions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in no-print">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4 text-amber-600">
              <Save className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Backup & Segurança</h3>
            <p className="text-xs text-slate-500 mb-6">Opções de persistência e salvamento dos seus dados</p>
            <div className="space-y-3">
              <button
                onClick={handleSaveBackup}
                className="w-full py-3 px-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-amber-600" />
                  <span>Baixar Backup no Computador</span>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-left">
                <Cloud className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Sincronização em Nuvem Ativa</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                    Todos os lançamentos são salvos em tempo real no Firebase.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowBackupOptions(false)}
              className="mt-5 text-slate-400 hover:text-slate-700 text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
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
