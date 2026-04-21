import React from 'react';

export const WalletIcon3D: React.FC = () => (
  <div className="relative w-12 h-12 group cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0">
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-3 bg-blue-900/20 blur-md rounded-full"></div>
    <div className="absolute top-1 left-2 w-8 h-6 bg-emerald-500 rounded-md transform -rotate-6 border-t border-emerald-300"></div>
    <div className="absolute top-2 left-3 w-8 h-6 bg-green-400 rounded-md transform -rotate-3 border-t border-green-200 shadow-sm"></div>
    <div className="absolute top-4 left-1 w-10 h-8 bg-gradient-to-b from-amber-700 to-amber-900 rounded-xl shadow-lg border-t border-amber-600/50">
      <div className="absolute top-0 right-0 w-4 h-full bg-black/10 rounded-r-xl"></div>
    </div>
    <div className="absolute top-6 right-0 w-3 h-4 bg-amber-800 rounded-r-md shadow-sm flex items-center justify-center translate-x-1">
      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-sm"></div>
    </div>
    <div className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-full shadow-lg border-2 border-yellow-200 flex items-center justify-center z-10">
      <span className="text-yellow-800 font-bold text-[10px]">$</span>
    </div>
  </div>
);
