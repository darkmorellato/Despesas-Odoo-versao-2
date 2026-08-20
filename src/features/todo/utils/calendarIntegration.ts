import type { TodoItem } from '../types';
import { getTodayLocal } from '@/shared/utils/formatters';

const CONTACTS_STORAGE_KEY = 'miplace_todo_saved_contacts';

/**
 * Retorna a lista de contatos/e-mails reais salvos no navegador
 */
export const getSavedContacts = (): string[] => {
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar contatos salvos:', e);
  }
  return [];
};

/**
 * Salva um novo e-mail real na lista de contatos frequentes
 */
export const saveContact = (email: string): void => {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return;

  try {
    const current = getSavedContacts();
    if (!current.includes(trimmed)) {
      const updated = [trimmed, ...current].slice(0, 20); // guarda até 20 contatos
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('Erro ao salvar contato:', e);
  }
};

/**
 * Remove um e-mail da lista de contatos
 */
export const removeContact = (email: string): void => {
  try {
    const current = getSavedContacts();
    const updated = current.filter((c) => c !== email.trim().toLowerCase());
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao remover contato:', e);
  }
};

/**
 * Gera a URL oficial do Google Calendar para criar e sincronizar o evento na Google Agenda
 */
export const getGoogleCalendarUrl = (task: TodoItem): string => {
  const title = `📋 ${task.title}`;

  let details = `Tarefa agendada via MiPlace Despesas:\n\n`;
  if (task.notes) {
    details += `📝 Observações:\n${task.notes}\n\n`;
  }
  if (task.steps && task.steps.length > 0) {
    details += `Checklist de Etapas:\n`;
    task.steps.forEach((s) => {
      details += `${s.completed ? '✅' : '⬜'} ${s.title}\n`;
    });
    details += `\n`;
  }
  if (task.assignedTo) {
    details += `👤 Atribuído a: ${task.assignedToName || task.assignedTo} (${task.assignedTo})\n`;
  }
  details += `Criado por: ${task.employeeName} (${task.userEmail})`;

  // Configuração das datas para o Google Calendar
  let datesParam = '';
  const dateBase = task.dueDate || getTodayLocal();
  const cleanDate = dateBase.replace(/-/g, '');

  if (task.dueTime) {
    const cleanTime = task.dueTime.replace(/:/g, '');
    const startDateTime = `${cleanDate}T${cleanTime}00`;
    const [h, m] = task.dueTime.split(':').map(Number);
    const endH = String((h + 1) % 24).padStart(2, '0');
    const endDateTime = `${cleanDate}T${endH}${String(m).padStart(2, '0')}00`;
    datesParam = `${startDateTime}/${endDateTime}`;
  } else {
    // Evento de dia inteiro
    const d = new Date(dateBase + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const nextDayStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate()
    ).padStart(2, '0')}`;
    datesParam = `${cleanDate}/${nextDayStr}`;
  }

  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${datesParam}&details=${encodeURIComponent(details)}`;

  // Se houver um e-mail do Gmail atribuído, adiciona como convidado (o Google Calendar enviará o convite para a Google Agenda dele!)
  if (task.assignedTo && task.assignedTo.includes('@')) {
    url += `&add=${encodeURIComponent(task.assignedTo)}`;
  }

  // Regra de recorrência (RRULE)
  if (task.repeat === 'daily') {
    url += `&recur=RRULE:FREQ=DAILY`;
  } else if (task.repeat === 'weekdays') {
    url += `&recur=RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`;
  } else if (task.repeat === 'weekly') {
    url += `&recur=RRULE:FREQ=WEEKLY`;
  } else if (task.repeat === 'monthly') {
    url += `&recur=RRULE:FREQ=MONTHLY`;
  }

  return url;
};

/**
 * Abre a tarefa diretamente no Google Calendar para adicionar à Google Agenda
 */
export const openGoogleCalendar = (task: TodoItem): void => {
  const url = getGoogleCalendarUrl(task);
  window.open(url, '_blank');
};

/**
 * Gera a URL para abrir o rascunho oficial no Gmail Web Compose
 */
export const getGmailComposeUrl = (task: TodoItem): string => {
  const to = task.assignedTo || '';
  const subject = `📋 Tarefa MiPlace: ${task.title}`;

  let body = `Olá!\n\nVocê recebeu uma tarefa atribuída no sistema MiPlace:\n\n📌 Tarefa: ${task.title}\n`;
  if (task.dueDate) {
    body += `📅 Vencimento: ${task.dueDate}${task.dueTime ? ` às ${task.dueTime}` : ''}\n`;
  }
  if (task.repeat && task.repeat !== 'none') {
    const repMap: Record<string, string> = {
      daily: 'Diária',
      weekdays: 'Dias Úteis (Seg-Sex)',
      weekly: 'Semanal',
      monthly: 'Mensal'
    };
    body += `🔁 Recorrência: ${repMap[task.repeat] || task.repeat}\n`;
  }
  if (task.important) {
    body += `⭐ Prioridade: Alta (Importante)\n`;
  }
  if (task.notes) {
    body += `\n📝 Observações:\n${task.notes}\n`;
  }

  if (task.steps && task.steps.length > 0) {
    body += `\nChecklist de Etapas:\n`;
    task.steps.forEach((s) => {
      body += `${s.completed ? '✅' : '⬜'} ${s.title}\n`;
    });
  }

  body += `\n---\nAtribuído por: ${task.employeeName} (${task.userEmail})\nLink Google Agenda: ${getGoogleCalendarUrl(task)}`;

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
};

/**
 * Abre diretamente no Gmail
 */
export const openInGmail = (task: TodoItem): void => {
  const url = getGmailComposeUrl(task);
  window.open(url, '_blank');
};

/**
 * Faz download do arquivo iCalendar (.ics) compatível com qualquer calendário (Google Calendar, Apple, Outlook)
 */
export const downloadIcsFile = (task: TodoItem): void => {
  const dateBase = task.dueDate || getTodayLocal();
  const cleanDate = dateBase.replace(/-/g, '');
  let dtStart = `${cleanDate}`;
  let dtEnd = `${cleanDate}`;

  if (task.dueTime) {
    const cleanTime = task.dueTime.replace(/:/g, '');
    dtStart = `${cleanDate}T${cleanTime}00`;
    const [h, m] = task.dueTime.split(':').map(Number);
    const endH = String((h + 1) % 24).padStart(2, '0');
    dtEnd = `${cleanDate}T${endH}${String(m).padStart(2, '0')}00`;
  }

  let rrule = '';
  if (task.repeat === 'daily') rrule = 'RRULE:FREQ=DAILY\n';
  else if (task.repeat === 'weekdays') rrule = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR\n';
  else if (task.repeat === 'weekly') rrule = 'RRULE:FREQ=WEEKLY\n';
  else if (task.repeat === 'monthly') rrule = 'RRULE:FREQ=MONTHLY\n';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MiPlace//Tarefas ToDo//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:task_${task.id}@miplace.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    rrule ? rrule.trim() : null,
    `SUMMARY:📋 ${task.title}`,
    `DESCRIPTION:${(task.notes || task.title).replace(/\n/g, '\\n')}`,
    task.assignedTo ? `ATTENDEE;CN=${task.assignedToName || task.assignedTo}:mailto:${task.assignedTo}` : null,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .filter(Boolean)
    .join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `tarefa_${task.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
