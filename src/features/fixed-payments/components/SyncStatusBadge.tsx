import React from 'react';
import { Cloud, CloudOff, RefreshCw } from '@/shared/components/icons';

interface SyncStatusBadgeProps {
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  /** Horário da última sincronização (mostrado quando "Sincronizado") */
  lastSyncTime: Date | null;
}

/** Estado da sincronização com a nuvem (sincronizado, sincronizando, erro, offline) */
export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ syncStatus, lastSyncTime }) => (
  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px]">
    {syncStatus === 'synced' && (
      <>
        <Cloud className="w-3 h-3 text-emerald-600" />
        <span className="text-emerald-700 font-bold">
          Sincronizado
          {lastSyncTime && (
            <span className="text-slate-400 ml-1 font-normal">
              {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </span>
      </>
    )}
    {syncStatus === 'syncing' && (
      <>
        <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
        <span className="text-amber-700 font-bold">Sincronizando...</span>
      </>
    )}
    {syncStatus === 'error' && (
      <>
        <CloudOff className="w-3 h-3 text-rose-600" />
        <span className="text-rose-700 font-bold">Erro de conexão</span>
      </>
    )}
    {syncStatus === 'offline' && (
      <>
        <CloudOff className="w-3 h-3 text-slate-400" />
        <span className="text-slate-600 font-medium">Offline</span>
      </>
    )}
  </div>
);
