import React from 'react';
import { Settings, X, Upload } from '@/shared/components/icons';
import type { Settings as SettingsType } from '@/shared/types';

interface SettingsModalProps {
  settings: SettingsType;
  onEmployeeNameChange: (name: string) => void;
  onRestoreClick: () => void;
  onClose: () => void;
}

/** Configurações do sistema (nome do funcionário e restauração de backup local). */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings, onEmployeeNameChange, onRestoreClick, onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs no-print">
    <div className="bg-white border border-slate-200 w-full max-w-md overflow-hidden flex flex-col rounded-2xl shadow-2xl">
      <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-amber-600" />
          Configurações do Sistema
        </h3>
        <button
          onClick={() => onClose()}
          className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 space-y-6 overflow-y-auto">
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Perfil & Sincronização</h4>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome do Funcionário <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={settings.employeeName}
              onChange={e => onEmployeeNameChange(e.target.value)}
              className="liquid-input w-full p-2.5 rounded-lg font-medium text-slate-900 text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Este nome é a chave da sua sincronização. Use o mesmo nome em todos os dispositivos.
            </p>
          </div>
        </div>
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Backup Local</h4>
          <button
            onClick={onRestoreClick}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Restaurar Arquivo do Computador
          </button>
        </div>
      </div>
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <button
          onClick={() => onClose()}
          className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
        >
          Concluir & Salvar
        </button>
      </div>
    </div>
  </div>
);
