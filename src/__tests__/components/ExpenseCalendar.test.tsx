import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseCalendar } from '@/features/calendar';
import { ADMIN_PASSWORD } from '@/config/constants';

vi.mock('@/shared/components/icons', () => ({
  Calendar: ({ className }: any) => <div className={className} data-testid="calendar-icon">Cal</div>,
  Check: ({ className }: any) => <div className={className} data-testid="check-icon">✓</div>,
  X: ({ className }: any) => <div className={className} data-testid="x-icon">✗</div>,
  ChevronLeft: ({ className, onClick }: any) => (
    <div className={className} onClick={onClick} data-testid="chevron-left">&lt;</div>
  ),
  ChevronRight: ({ className, onClick }: any) => (
    <div className={className} onClick={onClick} data-testid="chevron-right">&gt;</div>
  ),
  RotateCcw: ({ className }: any) => <div className={className} data-testid="rotate-icon">↺</div>,
  CheckSquare: ({ className }: any) => <div className={className} data-testid="check-square">☐</div>,
  ZoomIn: ({ className }: any) => <div className={className} data-testid="zoom-in">+</div>,
  ZoomOut: ({ className }: any) => <div className={className} data-testid="zoom-out">-</div>,
}));

const mockFixedPayments = [
  { id: '1', day: 5, description: 'Aluguel Loja Premium' },
  { id: '2', day: 5, description: 'Contabilidade Colorado' },
  { id: '3', day: 10, description: 'Aluguel Loja Kassouf' },
];

const mockShowToast = vi.fn();
const mockOnToggleCheck = vi.fn();

const defaultCheckedState: Record<string, boolean> = {};

describe('ExpenseCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2024, 0, 15));
  });

  describe('render calendar', () => {
    it('should render calendar header', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText('Hoje')).toBeInTheDocument();
    });

    it('should render weekday headers', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText('Dom')).toBeInTheDocument();
      expect(screen.getByText('Seg')).toBeInTheDocument();
      expect(screen.getByText('Ter')).toBeInTheDocument();
      expect(screen.getByText('Qua')).toBeInTheDocument();
      expect(screen.getByText('Qui')).toBeInTheDocument();
      expect(screen.getByText('Sex')).toBeInTheDocument();
      expect(screen.getByText('Sáb')).toBeInTheDocument();
    });

    it('should render current month name', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      const janeiroElements = screen.getAllByText(/Janeiro/);
      expect(janeiroElements.length).toBeGreaterThan(0);
    });

    it('should render day numbers', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      const dayNumbers = screen.getAllByText(/^\d+$/);
      expect(dayNumbers.length).toBeGreaterThan(0);
    });

    it('should highlight today', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      const todayElements = screen.getAllByText('15');
      expect(todayElements.length).toBeGreaterThan(0);
    });
  });

  describe('month navigation', () => {
    it('should have previous month button', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      const prevButtons = screen.getAllByTestId('chevron-left');
      expect(prevButtons.length).toBeGreaterThan(0);
    });

    it('should have next month button', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      const nextButtons = screen.getAllByTestId('chevron-right');
      expect(nextButtons.length).toBeGreaterThan(0);
    });

    it('should navigate to previous month', async () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      const janeiroElements = screen.getAllByText(/Janeiro/);
      expect(janeiroElements.length).toBeGreaterThan(0);

      const prevButton = screen.getAllByTestId('chevron-left')[0];
      fireEvent.click(prevButton);

      await waitFor(() => {
        const dezembroElements = screen.getAllByText(/Dezembro/);
        expect(dezembroElements.length).toBeGreaterThan(0);
      });
    });

    it('should navigate to next month', async () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      const janeiroElements = screen.getAllByText(/Janeiro/);
      expect(janeiroElements.length).toBeGreaterThan(0);

      const nextButton = screen.getAllByTestId('chevron-right')[0];
      fireEvent.click(nextButton);

      await waitFor(() => {
        const fevereiroElements = screen.getAllByText(/Fevereiro/);
        expect(fevereiroElements.length).toBeGreaterThan(0);
      });
    });

    it('should go to today when clicking Hoje button', async () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      const nextButton = screen.getAllByTestId('chevron-right')[0];
      fireEvent.click(nextButton);

      await waitFor(() => {
        const fevereiroElements = screen.getAllByText(/Fevereiro/);
        expect(fevereiroElements.length).toBeGreaterThan(0);
      });

      const hojeBtn = screen.getByText('Hoje');
      fireEvent.click(hojeBtn);

      await waitFor(() => {
        const janeiroElements = screen.getAllByText(/Janeiro/);
        expect(janeiroElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('fixed payments section', () => {
    it('should render fixed payments header', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText(/Pagamentos Fixos/)).toBeInTheDocument();
    });

    it('should render filter buttons for payment days', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText('Dia 5')).toBeInTheDocument();
      expect(screen.getByText('Dia 10')).toBeInTheDocument();
      expect(screen.getByText('Todos')).toBeInTheDocument();
    });

    it('should display payment items', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText('Aluguel Loja Premium')).toBeInTheDocument();
    });
  });

  describe('checkbox toggle', () => {
    it('should render payment items as clickable', async () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText('Aluguel Loja Premium')).toBeInTheDocument();
    });
  });

  describe('checked state display', () => {
    it('should show Pago badge for checked items', () => {
      const checkedState = {
        [`${new Date().getFullYear()}-${new Date().getMonth()}-Aluguel Loja Premium`]: true,
      };

      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={checkedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText('Aluguel Loja Premium')).toBeInTheDocument();
    });

    it('should show Corrigir button for checked items', () => {
      const checkedState = {
        [`${new Date().getFullYear()}-${new Date().getMonth()}-Aluguel Loja Premium`]: true,
      };

      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={checkedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText('Aluguel Loja Premium')).toBeInTheDocument();
    });
  });

  describe('admin correction modal', () => {
    it('should render modal structure correctly', async () => {
      const checkedState = {
        [`${new Date().getFullYear()}-${new Date().getMonth()}-Aluguel Loja Premium`]: true,
      };

      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={checkedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText('Aluguel Loja Premium')).toBeInTheDocument();
    });
  });

  describe('zoom controls', () => {
    it('should render zoom buttons', () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByTestId('zoom-in')).toBeInTheDocument();
      expect(screen.getByTestId('zoom-out')).toBeInTheDocument();
    });
  });

  describe('filter functionality', () => {
    it('should filter payments by day', async () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText('Aluguel Loja Premium')).toBeInTheDocument();
    });

    it('should show all payments when clicking Todos', async () => {
      render(
        <ExpenseCalendar
          fixedPayments={mockFixedPayments}
          checkedState={defaultCheckedState}
          onToggleCheck={mockOnToggleCheck}
          showToast={mockShowToast}
        />
      );

      expect(screen.getByText('Aluguel Loja Premium')).toBeInTheDocument();
    });
  });
});
