import React from 'react';

export const HomeIcon3D: React.FC = () => (
  <div className="relative w-12 h-12 group cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0 -m-1">
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-slate-900/20 blur-sm rounded-full"></div>
    <div className="absolute top-[18%] right-[22%] w-[12%] h-[20%] bg-gradient-to-b from-red-400 to-red-600 rounded-sm z-0 shadow-sm border border-red-700/10">
      <div className="absolute -top-[3px] -left-[2px] w-[140%] h-[5px] bg-red-500 rounded-full shadow-sm"></div>
    </div>
    <div className="absolute bottom-[10%] left-[20%] w-[60%] h-[50%] bg-gradient-to-b from-white to-slate-100 rounded-lg shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_2px_4px_rgba(0,0,0,0.05)] z-10 flex justify-center items-end border border-slate-200/50">
      <div className="w-[40%] h-[75%] bg-gradient-to-b from-orange-400 to-orange-500 rounded-t-[6px] relative shadow-inner mb-0 border-t border-x border-white/20">
        <div className="absolute top-[55%] left-[15%] w-1.5 h-1.5 bg-white rounded-full shadow-sm"></div>
      </div>
    </div>
    <div className="absolute top-[8%] left-[8%] w-[84%] h-[50%] z-20 pointer-events-none drop-shadow-lg">
      <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible">
        <path d="M10 50 L50 15 L90 50" fill="none" stroke="#b91c1c" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 48 L50 13 L90 48" fill="none" stroke="#ef4444" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 48 L50 13 L90 48" fill="none" stroke="#fca5a5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 translate-y-[-2px]" />
      </svg>
    </div>
  </div>
);
