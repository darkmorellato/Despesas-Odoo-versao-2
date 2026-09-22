import React, { useState, useMemo } from 'react';
import { History, Search, Trash2, Edit, User, Calendar, Tag, Store, DollarSign, Shield, Check } from '@/shared/components/icons';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { formatCurrency, formatDateBR } from '@/shared/utils/formatters';
import { STORE_IMAGES } from '@/config/constants';
import type { AuditActionType } from '../types';

export const AuditManager: React.FC = () => {
  const { logs, isLoading } = useAuditLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | AuditActionType>('ALL');

  // Format date and time
  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      // Type filter
      if (filterType !== 'ALL' && item.actionType !== filterType) {
        return false;
      }

      // Search query (com guards: docs legados podem ter campos ausentes)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const prev = item.previousData;
        const next = item.newData;
        const contains = (v?: string) => (v ?? '').toLowerCase().includes(query);
        return (
          contains(item.userName) ||
          contains(item.userEmail) ||
          contains(item.reason) ||
          contains(prev?.description) ||
          contains(prev?.store) ||
          contains(prev?.category) ||
          contains(next?.description) ||
          contains(next?.store) ||
          contains(next?.category)
        );
      }

      return true;
    });
  }, [logs, filterType, searchTerm]);

  const editCount = useMemo(() => logs.filter(l => l.actionType === 'EDIT').length, [logs]);
  const deleteCount = useMemo(() => logs.filter(l => l.actionType === 'DELETE').length, [logs]);
  const restoreCount = useMemo(() => logs.filter(l => l.actionType === 'RESTORE').length, [logs]);

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Registros & Auditoria</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                  Admin Dark
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Histórico completo de alterações e exclusões de lançamentos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              {/* A consulta limita a 100 eventos — não é o total histórico */}
              <span>{logs.length} eventos exibidos (últimos 100)</span>
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Auditorias</p>
                <h4 className="text-2xl font-bold text-slate-950 mt-1 tabular-nums">{logs.length}</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Lançamentos monitorados (últimos 100)</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700 shadow-xs">
                <History className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Edições Realizadas</p>
                <h4 className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">{editCount}</h4>
                <p className="text-xs text-amber-700/80 mt-1 font-medium">Modificações salvas</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 shadow-xs">
                <Edit className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exclusões Realizadas</p>
                <h4 className="text-2xl font-bold text-rose-700 mt-1 tabular-nums">{deleteCount}</h4>
                <p className="text-xs text-rose-700/80 mt-1 font-medium">Itens removidos</p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por descrição, usuário, loja..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Type Toggle Pills */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => setFilterType('ALL')}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({logs.length})
              </button>
              <button
                onClick={() => setFilterType('EDIT')}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  filterType === 'EDIT'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Edições ({editCount})
              </button>
              <button
                onClick={() => setFilterType('DELETE')}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  filterType === 'DELETE'
                    ? 'bg-rose-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Exclusões ({deleteCount})
              </button>
              <button
                onClick={() => setFilterType('RESTORE')}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  filterType === 'RESTORE'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Restaurações ({restoreCount})
              </button>
            </div>
          </div>

          {/* Audit Logs List */}
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <History className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Nenhum Registro Encontrado</h4>
              <p className="text-xs text-slate-500 mt-1">
                Todas as ações de edição e exclusão serão registradas aqui em tempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map(item => {
                const isDelete = item.actionType === 'DELETE';
                const isRestore = item.actionType === 'RESTORE';
                const prev = item.previousData;
                const next = item.newData;
                // Guardas: doc legado/incompleto não pode derrubar a árvore
                // (não há ErrorBoundary no main.tsx)
                const userName = item.userName || '—';
                const userEmail = item.userEmail || '';

                const actionLabel = isDelete
                  ? 'Exclusão'
                  : isRestore
                  ? 'Restauração'
                  : 'Edição';
                const actionIcon = isDelete ? <Trash2 className="w-3 h-3" /> : isRestore ? <Check className="w-3 h-3" /> : <Edit className="w-3 h-3" />;

                const badgeTone = isDelete
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : isRestore
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200';
                const cardTone = isDelete
                  ? 'bg-white border-rose-200/80 hover:border-rose-300 shadow-xs'
                  : isRestore
                  ? 'bg-white border-emerald-200/80 hover:border-emerald-300 shadow-xs'
                  : 'bg-white border-amber-200/80 hover:border-amber-300 shadow-xs';

                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${cardTone}`}
                  >
                    {/* Top row: Badge, User & Timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border ${badgeTone}`}
                        >
                          {actionIcon}
                          {actionLabel}
                        </span>

                        <div className="flex items-center gap-1 text-xs text-slate-700 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <strong className="text-slate-900">{userName}</strong>
                          {userEmail && (
                            <span className="text-slate-400 text-[11px]">({userEmail})</span>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                        {formatDateTime(item.actionDate)}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div className="mt-3.5 space-y-2.5">
                      {item.reason && (
                        <div className="bg-slate-100/80 border border-slate-200 px-3 py-2 rounded-xl text-xs flex items-start gap-2">
                          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider shrink-0 mt-0.5">
                            Justificativa:
                          </span>
                          <span className="font-semibold text-slate-900">{item.reason}</span>
                        </div>
                      )}

                      {!prev ? (
                        /* Doc antigo sem dados anteriores — mostra aviso em vez de crashar */
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-500 italic">
                          Dados anteriores indisponíveis para este registro.
                        </div>
                      ) : isDelete || isRestore ? (
                        /* Deleted/Restored Item Info */
                        <div className={`p-3.5 rounded-xl border ${isRestore ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/40 border-rose-100'}`}>
                          <p className={`text-[10px] uppercase font-bold tracking-wider mb-1.5 ${isRestore ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isRestore ? 'Dados do Item Restaurado:' : 'Dados do Item Excluído:'}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400 text-[10px] block uppercase font-bold">Descrição</span>
                              <span className="font-semibold text-slate-900">{prev.description}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block uppercase font-bold">Loja / Categoria</span>
                              <span className="font-medium text-slate-700">{prev.store} • {prev.category}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block uppercase font-bold">Data Original</span>
                              <span className="font-medium text-slate-700">{prev.date ? formatDateBR(prev.date) : '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block uppercase font-bold">Valor</span>
                              <span className={`font-bold tabular-nums ${isRestore ? 'text-emerald-700' : 'text-rose-700'}`}>
                                R$ {formatCurrency(prev.amount)}
                              </span>
                            </div>
                          </div>
                          {prev.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-2">
                              Obs: {prev.notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Edited Item Diff */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Previous State */}
                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                              Antes da Edição:
                            </p>
                            <div className="space-y-1 text-xs text-slate-700">
                              <p><strong className="text-slate-900">Descrição:</strong> {prev.description}</p>
                              <p><strong className="text-slate-900">Loja / Cat:</strong> {prev.store} • {prev.category}</p>
                              <p><strong className="text-slate-900">Data:</strong> {formatDateBR(prev.date)}</p>
                              <p><strong className="text-slate-900">Valor:</strong> R$ {formatCurrency(prev.amount)}</p>
                            </div>
                          </div>

                          {/* New State */}
                          {next && (
                            <div className="bg-amber-50/40 border border-amber-200 p-3 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-amber-700 tracking-wider mb-1.5">
                                Depois da Edição:
                              </p>
                              <div className="space-y-1 text-xs text-slate-800">
                                <p><strong className="text-slate-900">Descrição:</strong> {next.description}</p>
                                <p><strong className="text-slate-900">Loja / Cat:</strong> {next.store} • {next.category}</p>
                                <p><strong className="text-slate-900">Data:</strong> {formatDateBR(next.date)}</p>
                                <p className="font-bold text-amber-800">
                                  <strong>Valor:</strong> R$ {formatCurrency(next.amount)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditManager;
