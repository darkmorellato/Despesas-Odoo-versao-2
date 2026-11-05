import { useState } from 'react';
import { formatDateBR } from '@/shared/utils/formatters';
import type { TodoFilter, TodoRepeat } from '../types';
import type { useTodo } from './useTodo';

type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void;

interface UseTodoComposerParams {
  addTodo: ReturnType<typeof useTodo>['addTodo'];
  showToast: ToastFn;
  activeFilter: TodoFilter;
  todayStr: string;
  rememberContact: (email: string) => void;
}

/**
 * Estado e envio do formulário "Adicionar uma tarefa...".
 *
 * Em "Meu Dia" a tarefa sem data nasce agendada para hoje. Em caso de erro ao
 * salvar, o formulário NÃO é limpo (o usuário não perde o que digitou).
 */
export const useTodoComposer = ({ addTodo, showToast, activeFilter, todayStr, rememberContact }: UseTodoComposerParams) => {
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newRepeat, setNewRepeat] = useState<TodoRepeat>('none');
  const [newImportant, setNewImportant] = useState(false);
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newAssignedToName, setNewAssignedToName] = useState('');
  const [showQuickOptions, setShowQuickOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTypingCustomEmail, setIsTypingCustomEmail] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');

  const reset = () => {
    setNewTitle('');
    setNewDueDate('');
    setNewDueTime('');
    setNewRepeat('none');
    setNewImportant(false);
    setNewAssignedTo('');
    setNewAssignedToName('');
    setCustomEmailInput('');
    setIsTypingCustomEmail(false);
    setShowQuickOptions(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      let targetEmail = newAssignedTo.trim();
      if (isTypingCustomEmail && customEmailInput.trim()) {
        targetEmail = customEmailInput.trim();
      }

      rememberContact(targetEmail);

      const assignedDate = newDueDate || (activeFilter === 'today' ? todayStr : undefined);

      await addTodo(
        newTitle,
        assignedDate,
        newDueTime || undefined,
        newImportant,
        '',
        newRepeat,
        targetEmail || undefined,
        newAssignedToName || targetEmail || undefined
      );

      reset();

      if (assignedDate && assignedDate !== todayStr) {
        showToast(`Tarefa adicionada e agendada para ${formatDateBR(assignedDate)}! 📅`, 'success');
      } else {
        showToast('Tarefa adicionada com sucesso! ✨', 'success');
      }
    } catch (err) {
      // addTodo propaga erro de persistência: mostra toast e NÃO limpa o form
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao adicionar tarefa: ${msg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    newTitle, setNewTitle,
    newDueDate, setNewDueDate,
    newDueTime, setNewDueTime,
    newRepeat, setNewRepeat,
    newImportant, setNewImportant,
    newAssignedTo, setNewAssignedTo,
    newAssignedToName, setNewAssignedToName,
    showQuickOptions, setShowQuickOptions,
    isSubmitting,
    isTypingCustomEmail, setIsTypingCustomEmail,
    customEmailInput, setCustomEmailInput,
    handleAddSubmit,
  };
};

export type TodoComposer = ReturnType<typeof useTodoComposer>;
