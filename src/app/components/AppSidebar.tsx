import React from 'react';
import {
  ListTodo, FileText, Settings, Calendar, Printer, X, CheckSquare, HardDrive,
  Home, BarChart2, Menu, LogOut, History,
} from '@/shared/components/icons';
import type { SyncStatus, ViewMode } from '@/shared/types';

interface AppSidebarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
  /** Tarefas do To-Do pendentes para hoje (badge) */
  pendingTodosToday: number;
  /** Mostra a aba "Registros" (auditoria) */
  isAdmin: boolean;
  onPrint: () => void;
  onOpenBackup: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  userInitials: string;
  userRole: string;
  userName: string;
  syncStatus: SyncStatus;
}

const NAV_BASE = 'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer';
const NAV_ACTIVE = 'bg-white/10 text-white font-semibold shadow-sm border border-white/10';
const NAV_IDLE = 'text-slate-400 hover:text-white hover:bg-white/5';

/** Barra superior mobile + menu lateral escuro + backdrop do drawer. */
export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView, onNavigate, mobileMenuOpen, onToggleMobileMenu, onCloseMobileMenu,
  pendingTodosToday, isAdmin, onPrint, onOpenBackup, onOpenSettings, onLogout,
  userInitials, userRole, userName, syncStatus,
}) => {
  const navItem = (view: ViewMode, icon: React.ReactNode, label: string, extra?: React.ReactNode) => (
    <button
      onClick={() => { onNavigate(view); onCloseMobileMenu(); }}
      className={`${NAV_BASE} ${currentView === view ? NAV_ACTIVE : NAV_IDLE}`}
    >
      {icon}
      <span>{label}</span>
      {extra}
    </button>
  );

  const actionItem = (onClick: () => void, icon: React.ReactNode, label: string) => (
    <button onClick={onClick} className={`${NAV_BASE} ${NAV_IDLE}`}>
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <>
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
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg bg-white/10 text-slate-300 hover:text-white cursor-pointer"
          aria-label="Abrir Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Dark Sidebar Navigation */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-30 w-64 h-screen bg-[#111215] text-slate-300 border-r border-zinc-900
          flex flex-col justify-between p-5 shrink-0 transition-transform duration-300 no-print shadow-xl
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div>
          {/* Logo Header */}
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

            {navItem('dashboard', <Home className="w-4 h-4 text-amber-400" />, 'Visão Geral')}
            {navItem('calendar', <Calendar className="w-4 h-4 text-cyan-400" />, 'Calendário')}
            {navItem('analytics', <BarChart2 className="w-4 h-4 text-purple-400" />, 'Categorias & Mix')}
            {navItem('closing', <FileText className="w-4 h-4 text-rose-400" />, 'Fechamento Mensal')}
            {navItem('payments', <CheckSquare className="w-4 h-4 text-emerald-400" />, 'Pagamentos Fixos')}
            {navItem(
              'todo',
              <ListTodo className="w-4 h-4 text-amber-400" />,
              'Tarefas & To-Do',
              pendingTodosToday > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full">
                  {pendingTodosToday}
                </span>
              )
            )}

            {/* Relatórios & Tools */}
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 pt-6 px-3">
              Relatórios & Nuvem
            </p>

            {actionItem(onPrint, <Printer className="w-4 h-4 text-slate-400" />, 'Exportar PDF')}
            {actionItem(
              () => { onOpenBackup(); onCloseMobileMenu(); },
              <HardDrive className="w-4 h-4 text-slate-400" />,
              'Backup & Nuvem'
            )}

            {/* Aba exclusiva "Registros" (auditoria) para o administrador */}
            {isAdmin && navItem(
              'audit',
              <History className="w-4 h-4 text-amber-400" />,
              'Registros',
              <span className="ml-auto text-[9px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                Admin
              </span>
            )}

            {actionItem(
              () => { onOpenSettings(); onCloseMobileMenu(); },
              <Settings className="w-4 h-4 text-slate-400" />,
              'Configurações'
            )}
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
                {userRole}
              </p>
              <p className="text-sm font-medium text-slate-200 truncate">
                {userName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {syncStatus === 'synced' && <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_6px_rgba(52,211,153,0.8)]" title="Online" />}
            {syncStatus === 'syncing' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" title="Sincronizando..." />}
            {syncStatus === 'error' && <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" title="Erro" />}

            <button
              onClick={onLogout}
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
          onClick={onCloseMobileMenu}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}
    </>
  );
};
