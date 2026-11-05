import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditPasswordModal } from './EditPasswordModal';
import { DeleteExpenseModal } from './DeleteExpenseModal';
import type { Expense } from '@/shared/types';

const expense: Expense = {
  id: 'x', date: '2026-08-20', description: 'Internet Fibra', category: 'Despesa',
  store: 'Realme', amount: 1234.5, quantity: 1, employeeName: 'Dark',
};

describe('EditPasswordModal', () => {
  const base = () => ({
    expense, reason: '', onReasonChange: vi.fn(), password: '', onPasswordChange: vi.fn(),
    onConfirm: vi.fn(), onCancel: vi.fn(),
  });

  it('não renderiza sem despesa', () => {
    const { container } = render(<EditPasswordModal {...base()} expense={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra a descrição e dispara confirmar/cancelar', () => {
    const p = base();
    render(<EditPasswordModal {...p} />);
    expect(screen.getByText('Internet Fibra')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Liberar Edição'));
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it('Enter confirma e Escape cancela no campo de senha', () => {
    const p = base();
    render(<EditPasswordModal {...p} />);
    const input = screen.getByPlaceholderText('Senha de Administrador');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it('repassa o que é digitado (senha e motivo)', () => {
    const p = base();
    render(<EditPasswordModal {...p} />);
    fireEvent.change(screen.getByPlaceholderText('Senha de Administrador'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByPlaceholderText(/Correção de valor/), { target: { value: 'erro' } });
    expect(p.onPasswordChange).toHaveBeenCalledWith('abc');
    expect(p.onReasonChange).toHaveBeenCalledWith('erro');
  });

  it('clicar no fundo cancela; clicar dentro do cartão não', () => {
    const p = base();
    const { container } = render(<EditPasswordModal {...p} />);
    fireEvent.click(screen.getByText('Confirmar Edição'));
    expect(p.onCancel).not.toHaveBeenCalled();
    fireEvent.click(container.firstChild as Element);
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('DeleteExpenseModal', () => {
  const base = () => ({
    expense, step: 'confirm' as const, reason: '', onReasonChange: vi.fn(),
    password: '', onPasswordChange: vi.fn(), onProceed: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn(),
  });

  it('passo 1: mostra os detalhes do item e avança', () => {
    const p = base();
    render(<DeleteExpenseModal {...p} />);
    expect(screen.getByText('Deseja realmente excluir?')).toBeInTheDocument();
    expect(screen.getByText(/Realme • Despesa/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 1\.234,50/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/motivo da exclusão/), { target: { value: 'Duplicado' } });
    expect(p.onReasonChange).toHaveBeenCalledWith('Duplicado');
    fireEvent.click(screen.getByText('Sim, Continuar'));
    expect(p.onProceed).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Não, Manter'));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it('passo 2: pede a senha, mostra a justificativa e confirma', () => {
    const p = { ...base(), step: 'password' as const, reason: 'Duplicado' };
    render(<DeleteExpenseModal {...p} />);
    expect(screen.getByText('Senha de Confirmação')).toBeInTheDocument();
    expect(screen.getByText('Duplicado')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Senha');
    fireEvent.change(input, { target: { value: 'segredo' } });
    expect(p.onPasswordChange).toHaveBeenCalledWith('segredo');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByText('Excluir Definitivamente'));
    expect(p.onConfirm).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it('não renderiza sem despesa', () => {
    const { container } = render(<DeleteExpenseModal {...base()} expense={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
