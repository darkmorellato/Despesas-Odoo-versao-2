import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useAuth, useToast, useBackup } from '@/shared/hooks';
import { useExpenses, splitExpense, validateAdminPassword } from '@/features/expenses';
import { useCalendar } from '@/features/calendar';
import { useFixedPayments } from '@/features/fixed-payments';
import { STORES_LIST, CATEGORIES_LIST, STORE_IMAGES, STORE_DISPLAY_ORDER } from '@/config/constants';
import { getTodayLocal, formatDateBR, formatMonthBR, formatCurrency } from '@/shared/utils/formatters';
import { getStoreColorClass, getStoreBarColor, getStoreOrder } from '@/shared/utils/helpers';
import { playNotificationSound } from '@/shared/utils/audio';
import { ToastContainer, DateInput, PendingPaymentsAlert } from '@/shared/components/ui';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';

const ExpenseCalendar = lazy(() => import('@/features/calendar').then(m => ({ default: m.ExpenseCalendar })));
const ExpenseAnalytics = lazy(() => import('@/features/analytics').then(m => ({ default: m.ExpenseAnalytics })));
const FixedPaymentsManager = lazy(() => import('@/features/fixed-payments').then(m => ({ default: m.FixedPaymentsManager })));
import {
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
  BarChart2
} from '@/shared/components/icons';
import type { Expense, ExpenseGroup, Settings as SettingsType, ViewMode, FilterMode, GroupByMode } from '@/shared/types';
import '../styles/index.css';

const DEFAULT_SETTINGS: SettingsType = {
  employeeName: "Seu Nome",
  currency: "R$",
  categories: CATEGORIES_LIST.map(cat => ({ label: cat, odooRef: cat }))
};

export default function App() {
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
  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [passwordInput, setPasswordInput] = useState('');
  
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

  // Load settings from localStorage
  useEffect(() => {
    const savedSet = localStorage.getItem('odoo_fast_settings');
    if (savedSet) {
      try {
        const parsed = JSON.parse(savedSet);
        parsed.categories = CATEGORIES_LIST.map(cat => ({ label: cat, odooRef: cat }));
        setSettings(parsed);
      } catch (e) {
        console.warn("Erro ao parsear settings:", e);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('odoo_fast_settings', JSON.stringify(settings));
  }, [settings]);

  // Check pending payments
  useEffect(() => {
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
  }, [getPendingPayments, fixedPayments]);

  // Flashing title for pending payments
  useEffect(() => {
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
  }, [showReminder, pendingItems.length]);

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

  // Group expenses
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
        const orderDiff = getStoreOrder(a.store) - getStoreOrder(b.store);
        if (orderDiff !== 0) return orderDiff;
        return a.description.localeCompare(b.description);
      });

      return {
        key,
        items: sortedItems,
        total: sortedItems.reduce((sum, item) => sum + item.amount, 0)
      };
    });
  }, [filteredExpenses, groupBy]);

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

  // Form handlers
  const resetForm = useCallback(() => {
    setDate(getTodayLocal());
    setDescription('');
    setStore('');
    setCategory('');
    setAmount('');
    setNotes('');
    setEditingId(null);
  }, []);

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

    if (settings.employeeName === "Seu Nome" || !settings.employeeName.trim()) {
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
        await updateExpense(editingId, {
          date,
          description,
          store,
          category,
          amount: totalVal,
          notes,
          employeeName: settings.employeeName
        });
        showToast("Lançamento atualizado!");
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
            employeeName: settings.employeeName,
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
  }, [isSubmitting, settings.employeeName, amount, date, description, store, category, notes, editingId, updateExpense, addExpense, resetForm, showToast]);

  const startEdit = useCallback((ex: Expense) => {
    setEditingId(ex.id);
    setDate(ex.date);
    setDescription(ex.description);
    setStore(ex.store);
    setCategory(ex.category);
    setAmount(formatCurrency(ex.amount));
    setNotes(ex.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Editando...", "info");
  }, [showToast]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!validateAdminPassword(passwordInput)) {
      showToast("Senha incorreta.", "error");
      return;
    }

    if (deleteModal.id) {
      const { allowed, reason } = canDelete(deleteModal.id);
      if (!allowed) {
        showToast(reason || "Exclusão não permitida", "error");
        return;
      }

      await deleteExpense(deleteModal.id);
      setDeleteModal({ open: false, id: null });
      setPasswordInput('');
      showToast("Excluído com sucesso");
    }
  }, [passwordInput, deleteModal.id, canDelete, deleteExpense, showToast]);

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
    exportToCSV(filteredExpenses, settings.employeeName);
    showToast(`CSV gerado com ${filteredExpenses.length} registro(s)!`);
  };

  const handleEmptyStateRestore = () => {
    if (fileInputRef.current) fileInputRef.current.click();
};

// Render calendar view
  const renderCalendarView = () => {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ExpenseCalendar
          fixedPayments={fixedPayments}
          checkedState={checks}
          onToggleCheck={toggleCheck}
          showToast={showToast}
          syncError={syncError}
        />
      </Suspense>
    );
  };

const renderAnalyticsView = () => {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ExpenseAnalytics
          expenses={expenses}
          currency={settings.currency}
        />
      </Suspense>
    );
  };

  const renderPaymentsView = () => {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <FixedPaymentsManager
          showToast={showToast}
        />
      </Suspense>
    );
  };

// Loading state
  if (expensesLoading && expenses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2EA]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#FDB827] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#1A1A1A] font-medium">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 print:pb-0 min-h-screen bg-[#F5F2EA]">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {showReminder && (
        <PendingPaymentsAlert
          items={pendingItems}
          onClick={() => setCurrentView('calendar')}
          onClose={() => setShowReminder(false)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 no-print px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white p-4 px-6 flex justify-between items-center rounded-[32px] border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FDB827] rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#1A1A1A]" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <h1 className="font-bold text-[#1A1A1A] text-xl leading-tight tracking-tight">Despesas Miplace</h1>
                  <div className="flex items-center gap-2 ml-4 border-l border-gray-200 pl-4">
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className={`p-2.5 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-400'}`}
                      title="Início"
                    >
                      <Home className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentView('calendar')}
                      className={`p-2.5 rounded-xl transition-all ${currentView === 'calendar' ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-400'}`}
                      title="Calendário"
                    >
                      <Calendar className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentView('analytics')}
                      className={`p-2.5 rounded-xl transition-all ${currentView === 'analytics' ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-400'}`}
                      title="Análise"
                    >
                      <BarChart2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentView('payments')}
                      className={`p-2.5 rounded-xl transition-all ${currentView === 'payments' ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-400'}`}
                      title="Pagamentos"
                    >
                      <CheckSquare className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {settings.employeeName !== "Seu Nome" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-[#EBE7D9] text-[#1A1A1A] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {settings.employeeName} | V2
                      </span>
                      {syncStatus === 'synced' && <div className="w-2 h-2 rounded-full bg-emerald-500" title="Online"></div>}
                      {syncStatus === 'syncing' && <div className="w-2 h-2 rounded-full bg-[#FDB827] animate-pulse" title="Sincronizando..."></div>}
                      {syncStatus === 'error' && <WifiOff className="w-3 h-3 text-red-500" title="Erro de Conexão" />}
                      {syncStatus === 'offline' && <div className="w-2 h-2 rounded-full bg-gray-400" title="Offline"></div>}
                    </div>
                  ) : (
                    <span className="text-[10px] bg-[#FDB827] text-[#1A1A1A] px-2 py-0.5 rounded-full font-bold">
                      Configure seu Nome
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowBackupOptions(true)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#1A1A1A]" title="Salvar Backup">
                <HardDrive className="w-5 h-5" />
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#1A1A1A]" title="Configurações">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} onChange={handleRestore} accept=".json" className="hidden" />

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 space-y-8 mt-4">
        {currentView === 'calendar' ? (
          renderCalendarView()
        ) : currentView === 'analytics' ? (
          renderAnalyticsView()
        ) : currentView === 'payments' ? (
          renderPaymentsView()
        ) : (
          <>
{/* Store cards */}
          {expenses.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 no-print fade-in">
              {Object.entries(totalsByStore).sort((a, b) => b[1] - a[1]).map(([storeName, val]) => (
                <div key={storeName} className="bg-white p-5 rounded-[32px] border border-gray-100 hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center gap-2 mb-3">
                    <img src={STORE_IMAGES[storeName] || STORE_IMAGES["default"]} alt={storeName} className="w-8 h-8 rounded-xl" />
                    <span className="text-[10px] uppercase font-bold text-gray-400 truncate block tracking-wider">{storeName}</span>
                  </div>
                  <span className="text-xl font-bold text-[#1A1A1A] block">{settings.currency} {formatCurrency(val)}</span>
                  <div className="h-1.5 w-full rounded-full bg-[#EBE7D9] mt-3"></div>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-[40px] overflow-hidden no-print border border-gray-100">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight flex items-center gap-4">
                  {editingId ? (
                    <div className="p-2.5 rounded-xl bg-[#FDB827] text-[#1A1A1A]">
                      <Edit className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#7C5CFC] text-white">
                      <Plus className="w-5 h-5" />
                    </div>
                  )}
                  {editingId ? "Editar Lançamento" : "Novo Lançamento"}
                </h2>
                <div className="flex items-center gap-2">
                  {editingId && (
                    <button onClick={() => { resetForm(); showToast("Cancelado", "info"); }} className="bg-[#EBE7D9] px-4 py-2 rounded-xl text-xs font-bold text-[#1A1A1A] hover:bg-gray-200 transition-colors">
                      Cancelar
                    </button>
                  )}
                  {!editingId && (
                    <button onClick={resetForm} className="flex items-center gap-1.5 bg-[#EBE7D9] px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-[#1A1A1A] hover:bg-gray-200 transition-all" title="Limpar campos">
                      <RotateCcw className="w-3.5 h-3.5" /> Limpar
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Data</label>
                    <DateInput required value={date} onChange={e => setDate(e.target.value)} className="liquid-input w-full px-5 py-3.5 rounded-xl text-[#1A1A1A] font-semibold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Categoria</label>
                    <div className="relative group">
                      <select required value={category} onChange={e => setCategory(e.target.value)} className="liquid-input w-full px-5 py-3.5 rounded-xl appearance-none text-[#1A1A1A] font-semibold cursor-pointer">
                        <option value="" disabled>Selecione...</option>
                        {settings.categories.map((c, i) => <option key={i} value={c.label}>{c.label}</option>)}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Tag className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Descrição</label>
                    <input type="text" required placeholder="Ex: Café com cliente" value={description} onChange={e => setDescription(e.target.value)} className="liquid-input w-full px-5 py-3.5 rounded-xl text-[#1A1A1A] font-semibold placeholder-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Loja / Grupo</label>
                    <div className="relative group">
                      <select required value={store} onChange={e => setStore(e.target.value)} className="liquid-input w-full px-5 py-3.5 rounded-xl appearance-none text-[#1A1A1A] font-semibold cursor-pointer">
                        <option value="" disabled>Selecione...</option>
                        {STORES_LIST.map((l, i) => <option key={i} value={l}>{l}</option>)}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Store className="w-4 h-4" />
                      </div>
                    </div>
                    {!editingId && store.includes("Piracicaba") && <p className="text-[10px] text-[#FDB827] font-bold px-3 pt-1">* Divide por 3</p>}
                    {!editingId && store.includes("Amparo") && <p className="text-[10px] text-[#7C5CFC] font-bold px-3 pt-1">* Divide por 2</p>}
                    {!editingId && store === "Todas" && <p className="text-[10px] text-emerald-500 font-bold px-3 pt-1">* Divide por 5</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Valor ({settings.currency})</label>
                    <div className="relative group">
                      <input type="text" inputMode="numeric" required placeholder="0,00" value={amount} onChange={handleAmountChange} onPaste={handleAmountPaste} className="liquid-input w-full pl-5 pr-12 py-3.5 rounded-xl text-[#1A1A1A] font-bold text-lg" />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Observações (Opcional)</label>
                      <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="liquid-input w-full px-5 py-3.5 rounded-xl text-slate-600 font-medium text-sm placeholder-slate-400" />
                    </div>
                  </div>
<button type="submit" disabled={isSubmitting} className={`w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 mt-4 disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${editingId ? 'bg-black text-white hover:bg-gray-800' : 'bg-[#FDB827] text-[#1A1A1A] hover:bg-[#E5A71F]'}`}>
                  {isSubmitting ? (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {isSubmitting ? "Enviando..." : editingId ? "Salvar Alterações" : "Adicionar Despesa"}
                </button>
              </form>
            </div>
          </div>

          {/* Empty state */}
          {expenses.length === 0 && !expensesLoading && (
            <div className="text-center py-24 rounded-[40px] border-2 border-dashed border-gray-200 no-print flex flex-col items-center justify-center text-gray-400 bg-white">
              <div className="bg-[#EBE7D9] p-6 rounded-[32px] mb-4">
                <AlertCircle className="w-10 h-10 text-[#7C5CFC]" />
              </div>
              <p className="font-bold text-[#1A1A1A] text-lg">Banco de Dados Vazio.</p>
              <button onClick={handleEmptyStateRestore} className="mt-6 px-8 py-4 bg-[#FDB827] hover:bg-[#E5A71F] text-[#1A1A1A] font-bold rounded-xl transition-all flex items-center gap-2">
                <Upload className="w-5 h-5" /> Importar Backup do PC
              </button>
            </div>
          )}

            {/* Expenses list */}
            {expenses.length > 0 && (
              <div className="glass-panel p-6 rounded-3xl flex flex-col gap-8 print:border-none print:shadow-none print:rounded-none print:p-0 print:mb-6">
                {/* Filters and controls */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-2 no-print tracking-widest">
                      Total Geral {searchTerm ? "(Busca)" : filterMode === 'month' ? `(Mês: ${formatMonthBR(selectedMonth)})` : "(Do Dia)"}
                    </p>
                    <p className="text-4xl font-extrabold text-slate-800 tracking-tight drop-shadow-sm">
                      <span className="text-xl text-slate-400 font-bold mr-1 align-top relative top-1">{settings.currency}</span>
                      {formatCurrency(totalGeneral)}
                    </p>
                    <div className="mt-2 inline-block no-print">
                      <span className="text-xs font-bold text-slate-500 bg-white/60 border border-white px-3 py-1 rounded-full shadow-sm">
                        {filteredExpenses.length} registros
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto no-print">
                    <button onClick={() => window.print()} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-5 py-3 bg-white/60 hover:bg-white border border-white/80 rounded-xl text-slate-600 font-bold transition-all shadow-sm">
                      <Printer className="w-4 h-4" /> Imprimir
                    </button>
                    <button onClick={handleExportCSV} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200/50 font-bold transition-transform hover:-translate-y-0.5">
                      <Download className="w-4 h-4" /> Exportar
                    </button>
                  </div>
                </div>

                {/* Search and filter bar */}
                <div className="flex flex-col md:flex-row gap-6 no-print items-end md:items-center bg-white/30 p-4 rounded-2xl border border-white/40">
                  <div className="relative flex-1 w-full group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Pesquisar..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-white/60 border border-white rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium text-slate-600 placeholder-slate-400"
                    />
                  </div>
                  
                  {!searchTerm && (
                    <>
                      {/* Dia/Mês toggle */}
                      <div className="flex bg-white/60 p-1 rounded-xl border border-white shadow-sm mr-2">
                        <button 
                          onClick={() => setFilterMode('day')} 
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'day' ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                          Dia
                        </button>
                        <button 
                          onClick={() => setFilterMode('month')} 
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'month' ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                          Mês
                        </button>
                      </div>

                      {/* Date/Month navigation */}
                      {filterMode === 'day' ? (
                        <div className="flex items-center gap-2 bg-white/60 p-1 rounded-xl border border-white shadow-sm">
                          <button 
                            onClick={() => {
                              const idx = availableDates.indexOf(selectedDate);
                              if (idx > 0) setSelectedDate(availableDates[idx - 1]);
                            }} 
                            disabled={availableDates.indexOf(selectedDate) <= 0}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronLeft className="w-5 h-5"/>
                          </button>
                          <span className="font-bold text-slate-700 px-2 min-w-[100px] text-center text-sm">
                            {selectedDate ? formatDateBR(selectedDate) : '...'}
                          </span>
                          <button 
                            onClick={() => {
                              const idx = availableDates.indexOf(selectedDate);
                              if (idx < availableDates.length - 1) setSelectedDate(availableDates[idx + 1]);
                            }}
                            disabled={availableDates.indexOf(selectedDate) >= availableDates.length - 1}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronRight className="w-5 h-5"/>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-white/60 p-1 rounded-xl border border-white shadow-sm">
                          <button 
                            onClick={() => {
                              const idx = availableMonths.indexOf(selectedMonth);
                              if (idx > 0) setSelectedMonth(availableMonths[idx - 1]);
                            }}
                            disabled={availableMonths.indexOf(selectedMonth) <= 0}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronLeft className="w-5 h-5"/>
                          </button>
                          <span className="font-bold text-slate-700 px-2 min-w-[120px] text-center text-sm capitalize">
                            {selectedMonth ? formatMonthBR(selectedMonth) : '...'}
                          </span>
                          <button 
                            onClick={() => {
                              const idx = availableMonths.indexOf(selectedMonth);
                              if (idx < availableMonths.length - 1) setSelectedMonth(availableMonths[idx + 1]);
                            }}
                            disabled={availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronRight className="w-5 h-5"/>
                          </button>
                        </div>
                      )}

                      {/* Group by toggle */}
                      <div className="h-6 w-px bg-slate-300 hidden md:block"></div>
                      <div className="flex bg-white/60 p-1 rounded-xl border border-white shadow-sm">
                        <button 
                          onClick={() => setGroupBy('date')} 
                          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${groupBy === 'date' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Data
                        </button>
                        <button 
                          onClick={() => setGroupBy('store')} 
                          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${groupBy === 'store' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Loja
                        </button>
                      </div>
                    </>
                  )}
                  
                  {searchTerm && (
                    <div className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg text-xs font-bold border border-yellow-200">
                      Modo Busca Ativo (Global)
                    </div>
                  )}
                </div>

                {/* Grouped expenses tables */}
                <div className="space-y-8 print:space-y-6">
                  {groupedExpenses.map(group => (
                    <div key={group.key} className="print-break-inside-avoid">
                      <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-lg font-bold text-slate-700 flex items-center gap-3">
                          <div className="bg-white/80 p-2 rounded-xl shadow-sm text-blue-500 border border-white">
                            {groupBy === 'date' ? (
                              <Calendar className="w-5 h-5" />
                            ) : (
                              <img src={STORE_IMAGES[group.key] || STORE_IMAGES["default"]} alt={group.key} className="w-5 h-5 rounded-full" />
                            )}
                          </div>
                          {groupBy === 'date' ? formatDateBR(group.key) : group.key}
                        </h3>
                        <span className="text-sm font-bold text-slate-600 bg-white/60 px-4 py-1.5 rounded-full border border-white shadow-sm">
                          {settings.currency} {formatCurrency(group.total)}
                        </span>
                      </div>

                      <div className="glass-panel rounded-2xl overflow-hidden print:shadow-none print:border print:border-slate-300 print:rounded-none p-0">
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto print-scroll-fix">
                          <table className="w-full text-left text-sm relative border-collapse">
                            <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white print:bg-white print:backdrop-blur-none print:border-slate-300">
                              <tr>
                                {groupBy === 'date' && <th className="px-6 py-4 font-bold text-slate-400 print:text-black uppercase text-[10px] tracking-widest">Loja</th>}
                                <th className="px-6 py-4 font-bold text-slate-400 print:text-black uppercase text-[10px] tracking-widest">Quem</th>
                                <th className="px-6 py-4 font-bold text-slate-400 print:text-black uppercase text-[10px] tracking-widest">Categoria</th>
                                <th className="px-6 py-4 font-bold text-slate-400 print:text-black uppercase text-[10px] tracking-widest">Data</th>
                                <th className="px-6 py-4 font-bold text-slate-400 print:text-black uppercase text-[10px] tracking-widest">Descrição</th>
                                <th className="px-6 py-4 font-bold text-slate-400 print:text-black uppercase text-[10px] tracking-widest text-right">Valor</th>
                                <th className="px-6 py-4 font-bold text-slate-400 print:text-black uppercase text-[10px] tracking-widest text-center no-print">Opções</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.items.map(ex => (
                                <tr key={ex.id} className="hover:bg-blue-50/40 transition-colors group">
                                  {groupBy === 'date' && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <img src={STORE_IMAGES[ex.store] || STORE_IMAGES["default"]} alt={ex.store} className="w-5 h-5 rounded-full print:w-5 print:h-5" />
                                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm border border-white/50 backdrop-blur-sm print:hidden ${getStoreColorClass(ex.store)}`}>
                                          {ex.store}
                                        </span>
                                        <span className="hidden print:inline font-bold text-[10px] text-slate-800">
                                          {ex.store}
                                        </span>
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-6 py-4 text-slate-600 font-medium text-xs">{ex.employeeName || settings.employeeName}</td>
                                  <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                                    <span className="bg-white/60 border border-white px-2 py-1 rounded-md shadow-sm">{ex.category}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium text-xs">{formatDateBR(ex.date)}</td>
                                  <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-700 leading-tight">{ex.description}</div>
                                    {ex.notes && <div className="text-xs text-slate-400 mt-1 italic">{ex.notes}</div>}
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-slate-700 tabular-nums">
                                    <div className="flex flex-col items-end">
                                      <span>{formatCurrency(ex.amount)}</span>
                                      {ex.originalTotal && (
                                        <span className="text-[9px] text-slate-400 font-medium bg-white/80 px-1.5 py-0.5 rounded shadow-sm mt-1 border border-white">
                                          Orig: {formatCurrency(ex.originalTotal)}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center no-print">
                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                                      <button onClick={() => startEdit(ex)} className="p-1.5 text-slate-400 hover:text-orange-500 bg-white/50 hover:bg-white border border-transparent hover:border-orange-100 rounded-lg transition-all shadow-sm" title="Editar">
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => setDeleteModal({ open: true, id: ex.id })} className="p-1.5 text-slate-400 hover:text-red-500 bg-white/50 hover:bg-white border border-transparent hover:border-red-100 rounded-lg transition-all shadow-sm" title="Excluir">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-md p-4 animate-in fade-in no-print">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl">
            <div className="mx-auto w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5 shadow-inner text-red-500">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Excluir Lançamento</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Digite a senha de administrador para confirmar.</p>
            <input
              type="password"
              autoFocus
              placeholder="Senha"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDeleteConfirm()}
              className="liquid-input w-full px-5 py-3 rounded-xl text-center font-bold text-slate-700 mb-6 placeholder-slate-300"
            />
            <div className="flex gap-3">
              <button onClick={() => { setDeleteModal({ open: false, id: null }); setPasswordInput(''); }} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md no-print">
          <div className="glass-panel w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] rounded-3xl border border-white/80 shadow-2xl">
            <div className="p-5 border-b border-white/60 flex justify-between items-center bg-white/40">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100/50 rounded-lg text-blue-600">
                  <Settings className="w-5 h-5" />
                </div>
                Configurações
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white/50 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-8 overflow-y-auto">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Perfil</h4>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Nome do Funcionário <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.employeeName}
                    onChange={e => setSettings({ ...settings, employeeName: e.target.value })}
                    className="liquid-input w-full p-3.5 rounded-xl font-medium text-slate-700"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 ml-1">Este nome é a chave da sua sincronização. Use o mesmo nome em todos os dispositivos.</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Dados & Backup</h4>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => { if (fileInputRef.current) fileInputRef.current.click(); }} className="flex items-center justify-center gap-2 w-full py-3.5 bg-white/60 text-slate-600 hover:text-blue-600 hover:bg-white border border-white rounded-xl transition-all shadow-sm">
                    <Upload className="w-5 h-5" /> Restaurar Arquivo (PC)
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5 bg-white/30 border-t border-white/60">
              <button onClick={() => setIsSettingsOpen(false)} className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5">
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {showBackupOptions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-md p-4 animate-in fade-in zoom-in no-print">
          <div className="glass-panel w-full max-w-sm overflow-hidden relative rounded-3xl shadow-2xl p-8 text-center">
            <div className="mx-auto w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 shadow-inner text-blue-500">
              <Save className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Salvar Backup</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">Onde deseja salvar seus dados?</p>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={handleSaveBackup} className="group relative w-full py-4 bg-white/60 border border-white hover:bg-white hover:border-blue-200 text-slate-700 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-500 transition-colors">
                  <HardDrive className="w-5 h-5" />
                </div>
                <span className="flex-1 text-left">No Computador</span>
                <Download className="w-4 h-4 text-slate-400 mr-2" />
              </button>
              <div className="flex items-start gap-3 p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl text-left">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-700">Nuvem — Sync Automático</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Todos os lançamentos são salvos em tempo real no Firebase. Nenhuma ação manual é necessária.</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowBackupOptions(false)} className="mt-6 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
