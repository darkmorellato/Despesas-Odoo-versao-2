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
    ? "fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-xs"
    : "min-h-[300px] w-full flex items-center justify-center p-8";

  return (
    <div className={containerClasses} data-testid="loading-spinner">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin z-10"></div>
        </div>
        <p className="text-slate-600 font-medium tracking-wide text-xs">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
