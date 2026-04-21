import React from 'react';

export const PaymentsIcon3D: React.FC = () => (
  <div className="relative w-12 h-12 group cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0">
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-3 bg-emerald-900/20 blur-md rounded-full"></div>
    <div className="absolute top-1 left-0 w-full h-10 bg-emerald-700 rounded-xl transform translate-y-1"></div>
    <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl border-t border-white/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-300 rounded-full shadow-sm opacity-90"></div>
      <div className="absolute top-2 left-2 w-3 h-2 bg-white/20 rounded-sm"></div>
      <div className="flex flex-col items-center justify-center gap-0.5 mt-1">
        <div className="w-6 h-1.5 bg-white/90 rounded-sm shadow-sm"></div>
        <div className="w-5 h-1.5 bg-white/70 rounded-sm shadow-sm"></div>
        <div className="w-4 h-1.5 bg-white/50 rounded-sm shadow-sm"></div>
      </div>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
        <span className="text-[8px] font-bold text-white/90 tracking-tight">R$</span>
      </div>
    </div>
  </div>
);
