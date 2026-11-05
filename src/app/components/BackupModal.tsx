import React from 'react';
import { Save, HardDrive, Download, Cloud } from '@/shared/components/icons';

interface BackupModalProps {
  onSave: () => void;
  onClose: () => void;
}

/** Opções de backup e aviso da sincronização em nuvem. */
export const BackupModal: React.FC<BackupModalProps> = ({ onSave, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in no-print">
    <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
      <div className="mx-auto w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4 text-amber-600">
        <Save className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">Backup & Segurança</h3>
      <p className="text-xs text-slate-500 mb-6">Opções de persistência e salvamento dos seus dados</p>
      <div className="space-y-3">
        <button
          onClick={onSave}
          className="w-full py-3 px-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-amber-600" />
            <span>Baixar Backup no Computador</span>
          </div>
          <Download className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-left">
          <Cloud className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-emerald-800">Sincronização em Nuvem Ativa</p>
            <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
              Todos os lançamentos são salvos em tempo real no Firebase.
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={() => onClose()}
        className="mt-5 text-slate-400 hover:text-slate-700 text-xs font-semibold uppercase tracking-wider cursor-pointer"
      >
        Fechar
      </button>
    </div>
  </div>
);
