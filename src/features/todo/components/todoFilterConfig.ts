import { CheckCircle, Calendar, ListTodo, Mail, Star, Sun, User } from '@/shared/components/icons';
import type { TodoFilter } from '../types';

type IconComponent = typeof Sun;

export interface TodoFilterStyle {
  key: TodoFilter;
  label: string;
  Icon: IconComponent;
  /** Botão da lista quando selecionada */
  activeButton: string;
  /** Cor do ícone na barra lateral (selecionada / não selecionada) */
  iconActive: string;
  iconInactive: string;
  /** Selo com a contagem */
  badge: string;
  /** Ícone grande do cabeçalho da lista (qual lista está aberta) */
  headerIcon: { Icon: IconComponent; className: string };
}

/** Ordem = ordem exibida na barra lateral */
export const TODO_FILTERS: TodoFilterStyle[] = [
  {
    key: 'today', label: 'Meu Dia', Icon: Sun,
    activeButton: 'bg-amber-50 text-amber-900 font-bold border border-amber-200 shadow-xs',
    iconActive: 'text-amber-600', iconInactive: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    headerIcon: { Icon: Sun, className: 'w-6 h-6 text-amber-500' },
  },
  {
    key: 'important', label: 'Importantes', Icon: Star,
    activeButton: 'bg-amber-50 text-amber-900 font-bold border border-amber-200 shadow-xs',
    iconActive: 'text-amber-500 fill-amber-400', iconInactive: 'text-amber-400',
    badge: 'bg-amber-100 text-amber-800',
    headerIcon: { Icon: Star, className: 'w-6 h-6 text-amber-500 fill-amber-400' },
  },
  {
    key: 'planned', label: 'Planejadas', Icon: Calendar,
    activeButton: 'bg-cyan-50 text-cyan-900 font-bold border border-cyan-200 shadow-xs',
    iconActive: 'text-cyan-600', iconInactive: 'text-cyan-500',
    badge: 'bg-cyan-100 text-cyan-800',
    headerIcon: { Icon: Calendar, className: 'w-6 h-6 text-cyan-600' },
  },
  {
    key: 'assigned', label: 'Atribuídas / Gmail', Icon: Mail,
    activeButton: 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 shadow-xs',
    iconActive: 'text-emerald-600', iconInactive: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
    headerIcon: { Icon: User, className: 'w-6 h-6 text-emerald-600' },
  },
  {
    key: 'all', label: 'Todas as Tarefas', Icon: ListTodo,
    activeButton: 'bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-xs',
    iconActive: 'text-blue-600', iconInactive: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    headerIcon: { Icon: ListTodo, className: 'w-6 h-6 text-blue-600' },
  },
  {
    key: 'completed', label: 'Concluídas', Icon: CheckCircle,
    activeButton: 'bg-slate-100 text-slate-900 font-bold border border-slate-300 shadow-xs',
    iconActive: 'text-emerald-600', iconInactive: 'text-slate-400',
    badge: 'bg-slate-200 text-slate-700',
    headerIcon: { Icon: CheckCircle, className: 'w-6 h-6 text-emerald-600' },
  },
];

export const getFilterStyle = (filter: TodoFilter): TodoFilterStyle =>
  TODO_FILTERS.find(f => f.key === filter) ?? TODO_FILTERS[4]; // 'all' é o padrão
