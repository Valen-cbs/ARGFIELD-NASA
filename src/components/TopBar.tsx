import React from 'react';
import { GoogleIcon } from './GoogleIcon';
import { AppTab } from './Sidebar';
import { FarmLocation } from '../types';

interface TopBarProps {
  activeTab: AppTab;
  lang: 'es' | 'en';
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  lang,
  onToggleMobileMenu
}) => {
  // Short titles only! No verbose essays, no labels or descriptions in the title!
  const shortTitles: Record<AppTab, { es: string; en: string }> = {
    home: { es: 'Inicio', en: 'Home' },
    clima: { es: 'Clima', en: 'Weather' },
    alertas: { es: 'Alertas', en: 'Alerts' },
    mapa: { es: 'Mapa', en: 'Map' },
    fuentes: { es: 'Fuentes', en: 'Sources' },
    optimizador: { es: 'Optimizador', en: 'Optimizer' }
  };

  const title = shortTitles[activeTab];

  return (
    <header className="h-12 bg-white dark:bg-[#18181b] border-b border-slate-300 dark:border-[#2e2e33] px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-20 transition-colors">
      <div className="flex items-center gap-2.5">
        {/* Mobile Hamburger Menu Button */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 -ml-1 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#27272a] rounded-xs border border-transparent hover:border-slate-300 dark:hover:border-[#38383e] transition-colors cursor-pointer"
            aria-label={lang === 'es' ? 'Abrir menú' : 'Open menu'}
          >
            <GoogleIcon name="menu" size={20} />
          </button>
        )}

        {/* Short Title Only */}
        <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
          {lang === 'es' ? title.es : title.en}
        </h1>
      </div>

      {/* Mobile-friendly Argfield Brand badge */}
      <div className="md:hidden flex items-center gap-1.5 text-xs font-mono font-bold text-[#0f3260] dark:text-zinc-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>ARGFIELD</span>
      </div>
    </header>
  );
};
