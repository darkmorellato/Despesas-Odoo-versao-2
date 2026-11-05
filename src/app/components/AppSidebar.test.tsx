import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppSidebar } from './AppSidebar';

const props = () => ({
  currentView: 'dashboard' as const,
  onNavigate: vi.fn(),
  mobileMenuOpen: false,
  onToggleMobileMenu: vi.fn(),
  onCloseMobileMenu: vi.fn(),
  pendingTodosToday: 0,
  isAdmin: false,
  onPrint: vi.fn(),
  onOpenBackup: vi.fn(),
  onOpenSettings: vi.fn(),
  onLogout: vi.fn(),
  userInitials: 'DM',
  userRole: 'Administrador',
  userName: 'Dark Morellato',
  syncStatus: 'synced' as const,
});

describe('AppSidebar', () => {
  it('navega e fecha o menu mobile ao clicar numa aba', () => {
    const p = props();
    render(<AppSidebar {...p} />);
    fireEvent.click(screen.getByText('Calendário'));
    expect(p.onNavigate).toHaveBeenCalledWith('calendar');
    expect(p.onCloseMobileMenu).toHaveBeenCalled();
  });

  it.each([
    ['Visão Geral', 'dashboard'],
    ['Categorias & Mix', 'analytics'],
    ['Fechamento Mensal', 'closing'],
    ['Pagamentos Fixos', 'payments'],
    ['Tarefas & To-Do', 'todo'],
  ])('aba "%s" abre a view %s', (label, view) => {
    const p = props();
    render(<AppSidebar {...p} />);
    fireEvent.click(screen.getByText(label));
    expect(p.onNavigate).toHaveBeenCalledWith(view);
  });

  it('aba "Registros" (auditoria) só aparece para o administrador', () => {
    const { rerender } = render(<AppSidebar {...props()} isAdmin={false} />);
    expect(screen.queryByText('Registros')).not.toBeInTheDocument();
    rerender(<AppSidebar {...props()} isAdmin />);
    expect(screen.getByText('Registros')).toBeInTheDocument();
  });

  it('badge de tarefas só com pendências', () => {
    const { rerender } = render(<AppSidebar {...props()} pendingTodosToday={0} />);
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    rerender(<AppSidebar {...props()} pendingTodosToday={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('ações: exportar PDF, backup, configurações e sair', () => {
    const p = props();
    render(<AppSidebar {...p} />);
    fireEvent.click(screen.getByText('Exportar PDF'));
    fireEvent.click(screen.getByText('Backup & Nuvem'));
    fireEvent.click(screen.getByText('Configurações'));
    fireEvent.click(screen.getByTitle('Sair / Trocar Usuário'));
    expect(p.onPrint).toHaveBeenCalled();
    expect(p.onOpenBackup).toHaveBeenCalled();
    expect(p.onOpenSettings).toHaveBeenCalled();
    expect(p.onLogout).toHaveBeenCalled();
  });

  it('mostra usuário, perfil e o indicador de sincronização', () => {
    render(<AppSidebar {...props()} syncStatus="error" />);
    expect(screen.getByText('Dark Morellato')).toBeInTheDocument();
    expect(screen.getByText('DM')).toBeInTheDocument();
    expect(screen.getByTitle('Erro')).toBeInTheDocument();
  });

  it('botão do menu mobile alterna o drawer', () => {
    const p = props();
    render(<AppSidebar {...p} />);
    fireEvent.click(screen.getByLabelText('Abrir Menu'));
    expect(p.onToggleMobileMenu).toHaveBeenCalled();
  });
});
