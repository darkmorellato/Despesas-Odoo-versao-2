import React from 'react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  fullScreen = false,
  message = 'Carregando...'
}) => {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
    : "min-h-[300px] w-full flex items-center justify-center p-8";

  return (
    <div className={containerClasses} data-testid="loading-spinner">
      <div className="flex flex-col items-center justify-center space-y-5">
        <div className="relative flex items-center justify-center">
          {/* Anel estático de fundo */}
          <div className="absolute inset-0 rounded-full border-4 border-blue-50/50"></div>
          {/* Anel pulsante */}
          <div className="absolute -inset-3 rounded-full border-[3px] border-blue-100 opacity-50 animate-pulse"></div>
          {/* Anel giratório principal */}
          <div className="w-12 h-12 border-4 border-transparent border-t-blue-600 border-r-blue-400 rounded-full animate-spin z-10 shadow-sm"></div>
        </div>
        <p className="text-slate-500 font-medium animate-pulse tracking-wide text-sm">{message}</p>
      </div>
    </div>
  );
};
