import React from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from '@/shared/components/icons';

interface CalendarHeaderProps {
  monthName: string;
  year: number;
  zoomLevel: number;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
}

/** Navegação entre meses, botão "Hoje" e controles de zoom da grade */
export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  monthName,
  year,
  zoomLevel,
  onPrev,
  onToday,
  onNext,
  onZoomOut,
  onZoomIn,
}) => (
  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
    <div className="flex items-center gap-3">
      <div className="flex bg-white rounded-lg p-1 border border-slate-200 gap-1 shadow-xs">
        <button
          onClick={onPrev}
          className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4"/>
        </button>
        <button
          onClick={onToday}
          className="px-3 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded transition-all uppercase tracking-wider cursor-pointer"
        >
          Hoje
        </button>
        <button
          onClick={onNext}
          className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4"/>
        </button>
      </div>
      <h3 className="text-base font-bold tracking-tight text-slate-900">
        {monthName} <span className="text-slate-400 font-normal text-sm">{year}</span>
      </h3>
    </div>
    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
      <button
        onClick={onZoomOut}
        disabled={zoomLevel === 0}
        className={`p-1.5 rounded transition-all cursor-pointer ${zoomLevel === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        onClick={onZoomIn}
        disabled={zoomLevel === 2}
        className={`p-1.5 rounded transition-all cursor-pointer ${zoomLevel === 2 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
      >
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  </div>
);
