import React from 'react';
import { Calendar, CheckSquare, ListTodo } from '@/shared/components/icons';
import { getFilterButtonClass } from '../utils/calendarView';

export type CalendarTab = 'payments' | 'todos' | 'all';

interface CalendarSectionHeaderProps {
  monthName: string;
  activeTab: CalendarTab;
  setActiveTab: (tab: CalendarTab) => void;
  filteredNotificationsCount: number;
  filteredMonthTodosCount: number;
  uniqueFixedDays: number[];
  selectedDayFilter: number | null;
  setSelectedDayFilter: (day: number | null) => void;
}

/** Título da seção, abas (Pagamentos / Tarefas / Todos) e filtro por dia de vencimento */
export const CalendarSectionHeader: React.FC<CalendarSectionHeaderProps> = ({
  monthName,
  activeTab,
  setActiveTab,
  filteredNotificationsCount,
  filteredMonthTodosCount,
  uniqueFixedDays,
  selectedDayFilter,
  setSelectedDayFilter,
}) => (
  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h4 className="font-bold text-slate-900 flex items-center gap-2 text-base">
          {activeTab === 'todos' ? (
            <>
              <ListTodo className="w-5 h-5 text-blue-600" />
              Tarefas Agendadas de {monthName}
            </>
          ) : activeTab === 'all' ? (
            <>
              <Calendar className="w-5 h-5 text-purple-600" />
              Visão Completa do Mês ({monthName})
            </>
          ) : (
            <>
              <CheckSquare className="w-5 h-5 text-amber-600" />
              Pagamentos Fixos de {monthName}
            </>
          )}
        </h4>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {activeTab === 'todos'
          ? 'Compromissos e Tarefas com Data'
          : activeTab === 'all'
          ? 'Pagamentos e Tarefas Unificados'
          : 'Controle de Vencimentos'}
      </p>
    </div>

    {/* Seletor de Abas (Pagamentos / Tarefas / Todos) */}
    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 text-xs">
      <button
        type="button"
        onClick={() => setActiveTab('payments')}
        className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
          activeTab === 'payments'
            ? 'bg-white text-slate-900 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
        <span>Pagamentos ({filteredNotificationsCount})</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('todos')}
        className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
          activeTab === 'todos'
            ? 'bg-white text-slate-900 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <ListTodo className="w-3.5 h-3.5 text-blue-500" />
        <span>Tarefas To-Do ({filteredMonthTodosCount})</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('all')}
        className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
          activeTab === 'all'
            ? 'bg-white text-slate-900 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <span>Todos ({filteredNotificationsCount + filteredMonthTodosCount})</span>
      </button>
    </div>

    {/* Filtro por Dia */}
    <div className="flex flex-wrap gap-2 w-full xl:w-auto">
      {uniqueFixedDays.map(day => (
        <button
          key={day}
          onClick={() => setSelectedDayFilter(day === selectedDayFilter ? null : day)}
          className={getFilterButtonClass(selectedDayFilter === day)}
        >
          Dia {day}
        </button>
      ))}
      <button
        onClick={() => setSelectedDayFilter(null)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
          selectedDayFilter === null
            ? 'bg-slate-900 text-white border-slate-900 font-bold'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        Todos
      </button>
    </div>
  </div>
);
