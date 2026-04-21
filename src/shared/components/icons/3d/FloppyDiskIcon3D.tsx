import React from 'react';

export const FloppyDiskIcon3D: React.FC = () => (
  <div className="relative w-10 h-10 group cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0">
    <div className="absolute inset-0 bg-slate-900/30 rounded-lg translate-y-1 blur-[1px]"></div>
    <div className="absolute inset-0 bg-[#1e1e1e] rounded-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden">
      <div className="absolute top-0 left-[10%] right-[10%] h-[40%] border-b border-l border-r border-white/5 bg-[#181818]"></div>
      <div className="absolute top-0 left-[15%] w-[45%] h-[38%] bg-gradient-to-b from-[#e5e7eb] via-[#d1d5db] to-[#9ca3af] shadow-md flex items-center justify-center rounded-b-[2px]">
        <div className="w-[35%] h-[65%] bg-[#1e1e1e] rounded-[1px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] ml-[15%]"></div>
      </div>
      <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32%] h-[32%] rounded-full bg-gradient-to-br from-[#f3f4f6] to-[#6b7280] shadow-[0_1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center border border-gray-400">
        <div className="w-[30%] h-[30%] bg-[#181818] rounded-[1px] transform rotate-12 shadow-inner"></div>
        <div className="absolute bottom-[15%] right-[25%] w-[15%] h-[15%] bg-[#181818] rounded-full shadow-inner"></div>
      </div>
      <div className="absolute bottom-[8%] left-[8%] w-[10%] h-[10%] bg-[#121212] rounded-[2px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5"></div>
      <div className="absolute bottom-[8%] right-[8%] w-[10%] h-[10%] bg-[#121212] rounded-[2px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5 flex items-center justify-center">
        <div className="w-[60%] h-[60%] bg-[#1e1e1e] mt-[40%]"></div>
      </div>
      <div className="absolute top-[2%] right-[2%] w-0 h-0 border-t-[6px] border-r-[6px] border-t-transparent border-r-white/5"></div>
    </div>
  </div>
);
