import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginScreen } from './LoginScreen';

const requestPasswordReset = vi.fn();
const authenticateUser = vi.fn();
vi.mock('../services/authService', () => ({
  requestPasswordReset: (...a: unknown[]) => requestPasswordReset(...a),
  authenticateUser: (...a: unknown[]) => authenticateUser(...a),
}));

const typeEmail = (value: string) =>
  fireEvent.change(screen.getByPlaceholderText('exemplo@miplace.com'), { target: { value } });

describe('LoginScreen — esqueci minha senha', () => {
  beforeEach(() => {
    requestPasswordReset.mockReset();
    authenticateUser.mockReset();
  });

  it('sem e-mail preenchido: pede o e-mail e não envia nada', async () => {
    render(<LoginScreen onLoginSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    expect(await screen.findByText(/Informe seu e-mail no campo acima/)).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('com e-mail: envia e mostra a mensagem neutra de confirmação', async () => {
    requestPasswordReset.mockResolvedValue(undefined);
    render(<LoginScreen onLoginSuccess={vi.fn()} />);
    typeEmail('miplaceabner@miplace.com');
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('miplaceabner@miplace.com'));
    expect(await screen.findByRole('status')).toHaveTextContent('Se o e-mail estiver cadastrado');
    expect(screen.queryByText('Falha no Acesso')).not.toBeInTheDocument();
  });

  it('erro do serviço aparece como falha e não como sucesso', async () => {
    requestPasswordReset.mockRejectedValue(new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.'));
    render(<LoginScreen onLoginSuccess={vi.fn()} />);
    typeEmail('a@b.com');
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));

    expect(await screen.findByText(/Muitas tentativas/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('o clique duplo não envia dois e-mails', async () => {
    let release!: () => void;
    requestPasswordReset.mockReturnValue(new Promise<void>(r => { release = r; }));
    render(<LoginScreen onLoginSuccess={vi.fn()} />);
    typeEmail('a@b.com');
    const btn = screen.getByRole('button', { name: 'Esqueci minha senha' });
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('button', { name: 'Enviando...' }));
    release();
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(requestPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('o login normal continua funcionando e limpa o aviso de redefinição', async () => {
    requestPasswordReset.mockResolvedValue(undefined);
    const user = { id: 'u', name: 'Abner', email: 'a@b.com', role: 'Administrador', lastLogin: '' };
    authenticateUser.mockResolvedValue(user);
    const onLoginSuccess = vi.fn();
    render(<LoginScreen onLoginSuccess={onLoginSuccess} />);
    typeEmail('a@b.com');
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    await screen.findByRole('status');

    fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), { target: { value: 'segredo1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar no Sistema' }));

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith(user));
    expect(authenticateUser).toHaveBeenCalledWith({ email: 'a@b.com', password: 'segredo1' });
  });
});
