import React from 'react';

export const CalendarIcon3D: React.FC = () => {
  const today = new Date().getDate();
  
  return (
    <div className="relative w-10 h-10 group cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0">
      <div className="absolute inset-0 bg-slate-900/20 rounded-xl translate-y-1 blur-[1px]"></div>
      <div className="relative w-full h-full bg-[#f8f9fa] rounded-xl overflow-hidden border border-slate-200 shadow-inner flex flex-col items-center">
        <div className="h-[35%] w-full bg-gradient-to-b from-[#ff4d4d] to-[#dc2626] relative">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/30 rounded-t-md"></div>
        </div>
        <div className="h-[65%] flex items-center justify-center">
          <span className="text-lg font-bold text-slate-800 leading-none font-sans tracking-tight">{today}</span>
        </div>
      </div>
      <div className="absolute -top-[2px] left-[20%] w-1.5 h-2.5 bg-gradient-to-b from-gray-400 via-white to-gray-500 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.3)] z-20"></div>
      <div className="absolute -top-[2px] right-[20%] w-1.5 h-2.5 bg-gradient-to-b from-gray-400 via-white to-gray-500 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.3)] z-20"></div>
      <div className="absolute top-[2px] left-[20%] w-1.5 h-1.5 bg-black/20 rounded-full z-10 translate-y-0.5"></div>
      <div className="absolute top-[2px] right-[20%] w-1.5 h-1.5 bg-black/20 rounded-full z-10 translate-y-0.5"></div>
    </div>
  );
};
