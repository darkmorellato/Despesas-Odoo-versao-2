import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseAnalytics } from '@/features/analytics';
import type { Expense } from '@/shared/types';

vi.mock('@/shared/components/icons', () => ({
  ChartIcon3D: () => <div data-testid="chart-icon">Chart</div>,
  TrendingUp: () => <div data-testid="trending-up">Up</div>,
  TrendingDown: () => <div data-testid="trending-down">Down</div>,
  DollarSign: ({ className }: any) => <div className={className} data-testid="dollar-icon">$</div>,
  Calendar: ({ className }: any) => <div className={className} data-testid="calendar-icon">Cal</div>,
  Tag: ({ className }: any) => <div className={className} data-testid="tag-icon">Tag</div>,
  Store: ({ className }: any) => <div className={className} data-testid="store-icon">Store</div>,
  BarChart2: () => <div data-testid="bar-chart">Bar</div>,
  ChevronLeft: ({ className, onClick }: any) => (
    <div className={className} onClick={onClick} data-testid="chevron-left">&lt;</div>
  ),
  ChevronRight: ({ className, onClick }: any) => (
    <div className={className} onClick={onClick} data-testid="chevron-right">&gt;</div>
  ),
}));

vi.mock('@/config/constants', () => ({
  STORE_IMAGES: {
    'Dom Pedro II': '/images/dompedro.png',
    'Realme': '/images/realme.png',
    'Xv de Novembro': '/images/xv.png',
    'Premium': '/images/premium.png',
    'Kassouf': '/images/kassouf.png',
    'default': 'default-image',
  },
}));

const mockExpenses: Expense[] = [
  {
    id: '1',
    date: '2024-01-15',
    description: 'Test Expense 1',
    store: 'Dom Pedro II',
    category: 'Despesa',
    amount: 100,
    quantity: 1,
    employeeName: 'Test',
  },
  {
    id: '2',
    date: '2024-01-20',
    description: 'Test Expense 2',
    store: 'Realme',
    category: 'Despesa Fixa',
    amount: 200,
    quantity: 1,
    employeeName: 'Test',
  },
  {
    id: '3',
    date: '2024-02-10',
    description: 'Test Expense 3',
    store: 'Premium',
    category: 'Despesa',
    amount: 150,
    quantity: 1,
    employeeName: 'Test',
  },
  {
    id: '4',
    date: '2023-12-05',
    description: 'Test Expense 4',
    store: 'Kassouf',
    category: 'Despesa',
    amount: 300,
    quantity: 1,
    employeeName: 'Test',
  },
];

describe('ExpenseAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('render without data', () => {
    it('should render empty state when no expenses', () => {
      render(<ExpenseAnalytics expenses={[]} currency="R$" />);

      expect(screen.getByText('Sem Dados para Análise')).toBeInTheDocument();
      expect(screen.getByText('Adicione despesas para visualizar os gráficos')).toBeInTheDocument();
    });

    it('should render empty state with correct styling', () => {
      const { container } = render(<ExpenseAnalytics expenses={[]} currency="R$" />);

      const emptyStateDiv = container.querySelector('.bg-white');
      expect(emptyStateDiv).toBeInTheDocument();
    });
  });

  describe('render with data', () => {
    it('should render dashboard with expenses', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      expect(screen.getByText('Dashboard Analítico')).toBeInTheDocument();
    });

    it('should display total monthly expense', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      expect(screen.getByText(/Total Mensal/)).toBeInTheDocument();
    });

    it('should display expense count', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      expect(screen.getAllByText(/lançamentos/).length).toBeGreaterThan(0);
    });

    it('should render ranking de lojas', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      expect(screen.getByText('Ranking de Lojas')).toBeInTheDocument();
    });

    it('should render maiores despesas', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      expect(screen.getByText('Maiores Despesas')).toBeInTheDocument();
    });

    it('should render categoria distribution', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      expect(screen.getByText('Distribuição por Categoria')).toBeInTheDocument();
    });
  });

  describe('view mode toggle', () => {
    it('should render Mensal/Anual buttons', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      expect(screen.getByRole('button', { name: 'Mensal' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anual' })).toBeInTheDocument();
    });

    it('should start in monthly mode', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      const mensalBtn = screen.getByRole('button', { name: 'Mensal' });
      expect(mensalBtn.className).toContain('bg-black');
    });

    it('should switch to yearly mode on click', async () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      const anualBtn = screen.getByRole('button', { name: 'Anual' });
      fireEvent.click(anualBtn);

      await waitFor(() => {
        expect(screen.getByText('Total Anual')).toBeInTheDocument();
      });
    });

    it('should display year selector in yearly mode', async () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      const anualBtn = screen.getByRole('button', { name: 'Anual' });
      fireEvent.click(anualBtn);

      await waitFor(() => {
        expect(screen.getByText('2024')).toBeInTheDocument();
      });
    });
  });

  describe('month navigation', () => {
    it('should render month navigation controls', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      const chevronButtons = screen.getAllByTestId('chevron-left');
      expect(chevronButtons.length).toBeGreaterThan(0);
    });

    it('should navigate to previous month', async () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      const prevButton = screen.getAllByTestId('chevron-left')[0];
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText(/Fevereiro|Janeiro/)).toBeInTheDocument();
      });
    });

    it('should navigate to next month', async () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      const prevButton = screen.getAllByTestId('chevron-left')[0];
      fireEvent.click(prevButton);

      await waitFor(() => {
        const nextButton = screen.getAllByTestId('chevron-right')[0];
        fireEvent.click(nextButton);
      });
    });

    it('should disable next button on first month', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      const nextButtons = screen.getAllByTestId('chevron-right');
      const monthNavNext = nextButtons[0];

      expect(monthNavNext.closest('button')).toBeDisabled();
    });
  });

  describe('year navigation', () => {
    it('should render year navigation in yearly mode', async () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      const anualBtn = screen.getByRole('button', { name: 'Anual' });
      fireEvent.click(anualBtn);

      await waitFor(() => {
        const chevrons = screen.getAllByTestId('chevron-left');
        expect(chevrons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('12-month chart', () => {
    it('should render monthly breakdown in yearly mode', async () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      const anualBtn = screen.getByRole('button', { name: 'Anual' });
      fireEvent.click(anualBtn);

      await waitFor(() => {
        expect(screen.getByText(/Evolução Mensal/)).toBeInTheDocument();
      });
    });

    it('should display month abbreviations', async () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="R$" />);

      const anualBtn = screen.getByRole('button', { name: 'Anual' });
      fireEvent.click(anualBtn);

      await waitFor(() => {
        expect(screen.getByText('Jan')).toBeInTheDocument();
      });
    });
  });

  describe('currency formatting', () => {
    it('should use provided currency symbol', () => {
      render(<ExpenseAnalytics expenses={mockExpenses} currency="$" />);

      expect(screen.getAllByText(/\$/).length).toBeGreaterThan(0);
    });
  });
});
