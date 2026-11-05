import React from 'react';
import type { TodoFilter } from '../types';
import { TODO_FILTERS } from './todoFilterConfig';

interface TodoSidebarProps {
  activeFilter: TodoFilter;
  counts: Record<TodoFilter, number>;
  onSelect: (filter: TodoFilter) => void;
}

/** Listas do To-Do (Meu Dia, Importantes, Planejadas...) com a contagem de cada uma */
export const TodoSidebar: React.FC<TodoSidebarProps> = ({ activeFilter, counts, onSelect }) => (
  <div className="lg:col-span-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1">
      Listas To-Do
    </p>

    {TODO_FILTERS.map(({ key, label, Icon, activeButton, iconActive, iconInactive, badge }) => {
      const isActive = activeFilter === key;
      return (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isActive
              ? activeButton
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-4 h-4 ${isActive ? iconActive : iconInactive}`} />
            <span>{label}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge}`}>
            {counts[key]}
          </span>
        </button>
      );
    })}
  </div>
);
