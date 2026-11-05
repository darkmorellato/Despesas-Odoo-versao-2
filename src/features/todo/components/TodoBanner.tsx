import React from 'react';
import { ListTodo, Mail, Volume2 } from '@/shared/components/icons';
import { playCalendarAlertSound, playTodoAlertSound } from '@/shared/utils/audio';

interface TodoBannerProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/** Faixa de abertura do To-Do, com os botões de teste dos alertas sonoros */
export const TodoBanner: React.FC<TodoBannerProps> = ({ showToast }) => {
  const handleTestHeyListen = () => {
    playCalendarAlertSound();
    showToast('Som do Calendário (Hey Listen) testado! 🔔', 'info');
  };

  const handleTestTodoSound = () => {
    playTodoAlertSound();
    showToast('Som do To-Do (todo.mp3) testado! 🔔', 'info');
  };

  return (
    <div className="bg-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
      <div className="flex items-center gap-3.5 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-black flex items-center justify-center shadow-lg">
          <ListTodo className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Microsoft To Do • MiPlace
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Mail className="w-3 h-3" /> Gmail & Google Agenda
            </span>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Conecte qualquer e-mail real do Gmail, sincronize com o Google Calendar e receba alertas sonoros intercalados
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 relative z-10 w-full md:w-auto justify-end">
        <button
          onClick={handleTestHeyListen}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          title="Testar som do Calendário (hey_listen.mp3)"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Hey Listen (15m)</span>
        </button>
        <button
          onClick={handleTestTodoSound}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          title="Testar som do To-Do (todo.mp3)"
        >
          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>To-Do Som (30m)</span>
        </button>
      </div>
    </div>
  );
};
