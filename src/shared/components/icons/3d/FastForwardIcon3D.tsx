import React from 'react';

export const FastForwardIcon3D: React.FC = () => (
  <div className="relative w-12 h-12 group select-none">
    <div className="absolute inset-0 bg-blue-900/30 rounded-[14px] translate-y-2 translate-x-0 blur-[2px]"></div>
    <div className="absolute inset-0 bg-[#2563eb] rounded-[14px] translate-y-1.5"></div>
    <div className="absolute inset-0 bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] rounded-[14px] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.1)]">
      <div className="flex -space-x-1.5 items-center justify-center transform translate-y-[1px]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm filter">
          <path d="M13 17l5-5-5-5" />
          <path d="M6 17l5-5-5-5" />
        </svg>
      </div>
    </div>
  </div>
);
