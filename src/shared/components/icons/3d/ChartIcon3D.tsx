import React from 'react';

export const ChartIcon3D: React.FC = () => (
  <div className="relative w-12 h-12 group cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0">
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-3 bg-blue-900/20 blur-md rounded-full"></div>
    <div className="absolute top-1 left-0 w-full h-10 bg-indigo-600 rounded-xl transform translate-y-1"></div>
    <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl border-t border-white/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] flex flex-col items-center justify-end pb-1.5 overflow-hidden">
      <div className="absolute top-1.5 left-2 w-2.5 h-2.5 bg-yellow-300 rounded-full shadow-sm opacity-90"></div>
      <div className="absolute top-1.5 right-2">
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
          <polyline points="0,10 5,5 10,8 16,2" />
        </svg>
      </div>
      <div className="flex items-end gap-1 px-2 w-full justify-center z-10">
        <div className="w-1.5 h-3 bg-emerald-300 rounded-t-[2px] shadow-sm"></div>
        <div className="w-1.5 h-5 bg-orange-300 rounded-t-[2px] shadow-sm"></div>
        <div className="w-1.5 h-7 bg-blue-200 rounded-t-[2px] shadow-sm"></div>
        <div className="w-1.5 h-4 bg-purple-300 rounded-t-[2px] shadow-sm"></div>
      </div>
      <div className="absolute bottom-0 w-full h-1.5 bg-white/20 backdrop-blur-sm"></div>
    </div>
  </div>
);
