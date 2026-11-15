import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'table' | 'map' | 'text';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'card',
  count = 3
}) => {
  if (type === 'table') {
    return (
      <div className="border border-slate-300 dark:border-[#2e2e33] bg-white dark:bg-[#1c1c1e] p-4 space-y-3 rounded-none animate-pulse">
        <div className="h-5 bg-slate-200 dark:bg-[#27272a] w-1/4 rounded-none mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-4 bg-slate-200 dark:bg-[#27272a] w-1/6 rounded-none" />
              <div className="h-4 bg-slate-200 dark:bg-[#27272a] w-2/6 rounded-none" />
              <div className="h-4 bg-slate-200 dark:bg-[#27272a] w-2/6 rounded-none" />
              <div className="h-4 bg-slate-200 dark:bg-[#27272a] w-1/6 rounded-none" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'map') {
    return (
      <div className="w-full h-[520px] bg-slate-200 dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] rounded-none animate-pulse flex items-center justify-center text-slate-400 dark:text-zinc-500 font-mono text-xs">
        Cargando visor cartográfico...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="border border-slate-300 dark:border-[#2e2e33] bg-white dark:bg-[#1c1c1e] p-4 space-y-2.5 rounded-none animate-pulse"
        >
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-200 dark:bg-[#27272a] w-1/3 rounded-none" />
            <div className="h-4 bg-slate-200 dark:bg-[#27272a] w-12 rounded-none" />
          </div>
          <div className="h-3 bg-slate-200 dark:bg-[#27272a] w-2/3 rounded-none" />
          <div className="h-3 bg-slate-200 dark:bg-[#27272a] w-1/2 rounded-none" />
        </div>
      ))}
    </div>
  );
};
