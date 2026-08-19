import React, { useState, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, Shield, AlertTriangle, User } from '@/shared/components/icons';
import { authenticateUser } from '../services/authService';
import type { AuthenticatedUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthenticatedUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail de acesso.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Por favor, digite sua senha de acesso.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const user = await authenticateUser({ email, password });
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao autenticar. Verifique seus dados.');
      passwordInputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEmail = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('');
    setErrorMessage(null);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-300">
        {/* Header with Realme Branding */}
        <div className="bg-[#111215] text-white p-8 text-center relative overflow-hidden">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-400 text-slate-950 font-black flex flex-col items-center justify-center shadow-lg shadow-amber-400/20 mb-3.5">
            <span className="text-sm tracking-tight leading-none">MI</span>
            <span className="text-[9px] tracking-tighter leading-none -mt-0.5">PLACE</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white">Miplace Despesas</h1>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">
            Enterprise Analytics Dashboard
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] text-slate-300 font-medium mt-3">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Acesso Restrito a Usuários Autorizados</span>
          </div>
        </div>

        {/* Form Area */}
        <div className="p-8">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 animate-in fade-in">
              <div className="p-1 bg-rose-100 rounded-md text-rose-600 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-rose-800">Falha no Acesso</p>
                <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                E-mail / Login
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="exemplo@miplace.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all placeholder-slate-400"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-slate-950" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Consultando Banco de Dados...</span>
                </>
              ) : (
                <span>Entrar no Sistema</span>
              )}
            </button>
          </form>

          {/* Quick Email Selection */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-center mb-3">
              Selecione o Usuário para Preencher o E-mail
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectEmail('miplaceabner@miplace.com')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                  email === 'miplaceabner@miplace.com'
                    ? 'border-amber-400 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                    AM
                  </div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-amber-800 truncate">Abner Morais</p>
                </div>
                <p className="text-[10px] text-slate-500 truncate font-medium">miplaceabner@...</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectEmail('darkmorelato@miplace.com')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                  email === 'darkmorelato@miplace.com'
                    ? 'border-amber-400 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                    DM
                  </div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-amber-800 truncate">Dark Morellato</p>
                </div>
                <p className="text-[10px] text-slate-500 truncate font-medium">darkmorelato@...</p>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2.5">
              * A senha deve ser digitada manualmente para segurança.
            </p>
          </div>
        </div>

        {/* Security Footer */}
        <div className="bg-slate-50 px-8 py-3.5 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            🔒 Conexão Segura & Criptografada • Firebase Firestore
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
