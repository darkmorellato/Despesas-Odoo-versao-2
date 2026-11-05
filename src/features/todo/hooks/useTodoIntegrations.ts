import type { TodoItem } from '../types';
import { openGoogleCalendar, openInGmail, downloadIcsFile } from '../utils/calendarIntegration';

type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void;

/** Ações de integração de uma tarefa (Google Agenda, Gmail, arquivo .ics) com o aviso ao usuário */
export const useTodoIntegrations = (showToast: ToastFn) => ({
  handleGoogleCalendarSync: (task: TodoItem) => {
    openGoogleCalendar(task);
    showToast('Abrindo Google Agenda com evento configurado! 📅', 'info');
  },
  handleOpenGmail: (task: TodoItem) => {
    openInGmail(task);
    showToast(`Abrindo rascunho no Gmail para ${task.assignedTo || 'destinatário'}... ✉️`, 'info');
  },
  handleDownloadIcs: (task: TodoItem) => {
    downloadIcsFile(task);
    showToast('Arquivo de calendário (.ics) baixado! 📥', 'success');
  },
});
