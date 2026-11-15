import React from 'react';
import { GoogleIcon } from './GoogleIcon';
import { FlagIcon } from './FlagIcon';

export type AppTab = 'home' | 'clima' | 'alertas' | 'mapa' | 'fuentes' | 'optimizador';

interface SidebarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  criticalAlertsCount: number;
  onOpenFarmEditor: () => void;
  onOpenAbout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  lang: 'es' | 'en';
  onToggleLang: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  criticalAlertsCount,
  onOpenFarmEditor,
  onOpenAbout,
  isDarkMode,
  onToggleDarkMode,
  lang,
  onToggleLang,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const navItems: {
    id: AppTab;
    icon: string;
    labelEs: string;
    labelEn: string;
    badge?: number;
  }[] = [
    {
      id: 'home',
      icon: 'home',
      labelEs: 'Inicio',
      labelEn: 'Home'
    },
    {
      id: 'clima',
      icon: 'cloud',
      labelEs: 'Clima',
      labelEn: 'Weather'
    },
    {
      id: 'alertas',
      icon: 'notifications',
      labelEs: 'Alertas',
      labelEn: 'Alerts',
      badge: criticalAlertsCount
    },
    {
      id: 'mapa',
      icon: 'map',
      labelEs: 'Mapa',
      labelEn: 'Map'
    },
    {
      id: 'fuentes',
      icon: 'satellite_alt',
      labelEs: 'Fuentes',
      labelEn: 'Sources'
    },
    {
      id: 'optimizador',
      icon: 'eco',
      labelEs: 'Optimizador',
      labelEn: 'Optimizer'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/60 z-[9990] md:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside 
        aria-label="Menú Institucional"
        className={`fixed md:sticky top-0 left-0 z-[9999] md:z-30 w-64 md:w-56 lg:w-60 bg-white dark:bg-[#18181b] border-r border-slate-300 dark:border-[#2e2e33] flex flex-col justify-between select-none shrink-0 h-screen shadow-xl md:shadow-xs transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Section: Official Agency Branding */}
        <div>
          <div className="bg-[#0f3260] dark:bg-[#121212] text-white p-4 border-b border-[#092040] dark:border-[#2e2e33] flex items-center justify-between">
            <div>

              <div className="font-bold text-sm text-white tracking-tight mt-0.5">
                ARGFIELD
              </div>
              <div className="text-[11px] text-slate-300 dark:text-zinc-400 mt-0.5 font-mono">
                NASA Space Apps
              </div>
            </div>

            {/* Close button for mobile */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xs transition-colors cursor-pointer"
                aria-label={lang === 'es' ? 'Cerrar menú' : 'Close menu'}
              >
                <GoogleIcon name="close" size={20} />
              </button>
            )}
          </div>

          {/* Clear Navigation List with Google SVG Icons + Short Titles */}
          <nav className="p-2 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-colors border ${
                    isActive
                      ? 'bg-[#0f3260] dark:bg-[#27272a] text-white border-[#0f3260] dark:border-[#3f3f46] shadow-xs'
                      : 'bg-white dark:bg-[#18181b] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#27272a] border-transparent hover:border-slate-200 dark:hover:border-[#333336]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GoogleIcon 
                      name={item.icon} 
                      className={isActive ? 'text-white' : 'text-slate-600 dark:text-zinc-400'} 
                      size={18} 
                    />
                    <span>{lang === 'es' ? item.labelEs : item.labelEn}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-1.5 py-0.2 text-[10px] font-bold font-mono ${
                      isActive ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-900'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Controls: 4 icons side-by-side with no text */}
        <div className="p-1.5 border-t border-slate-300 dark:border-[#2e2e33] bg-slate-50 dark:bg-[#121212] transition-colors">
          <div className="grid grid-cols-4 gap-1">
            {/* 1. Intro / About */}
            <button
              id="sidebar-intro-icon-btn"
              onClick={onOpenAbout}
              title={lang === 'es' ? 'Introducción / Acerca de Argfield' : 'Introduction / About Argfield'}
              className="h-8 flex items-center justify-center bg-white dark:bg-[#1c1c1e] hover:bg-slate-100 dark:hover:bg-[#27272a] text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-[#2e2e33] transition-colors"
            >
              <GoogleIcon name="info" className="text-[#0f3260] dark:text-zinc-200" size={16} />
            </button>

            {/* Edit the single registered farm */}
            <button
              id="sidebar-edit-farm-icon-btn"
              onClick={onOpenFarmEditor}
              title={lang === 'es' ? 'Editar estancia' : 'Edit farm'}
              aria-label={lang === 'es' ? 'Editar estancia' : 'Edit farm'}
              className="h-8 flex items-center justify-center bg-white dark:bg-[#1c1c1e] hover:bg-slate-100 dark:hover:bg-[#27272a] text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-[#2e2e33] transition-colors"
            >
              <GoogleIcon name="edit" className="text-[#0f3260] dark:text-sky-300" size={16} />
            </button>

            {/* 3. Dark Mode Toggle */}
            <button
              id="sidebar-darkmode-icon-btn"
              onClick={onToggleDarkMode}
              title={
                isDarkMode
                  ? (lang === 'es' ? 'Modo Claro (Desactivar modo oscuro)' : 'Light Mode')
                  : (lang === 'es' ? 'Modo Oscuro (Activar modo noche)' : 'Dark Mode')
              }
              className="h-8 flex items-center justify-center bg-white dark:bg-[#1c1c1e] hover:bg-slate-100 dark:hover:bg-[#27272a] text-slate-700 dark:text-zinc-200 border border-slate-300 dark:border-[#2e2e33] transition-colors"
            >
              <GoogleIcon
                name={isDarkMode ? 'light_mode' : 'dark_mode'}
                className={isDarkMode ? 'text-amber-400' : 'text-[#0f3260] dark:text-zinc-300'}
                size={16}
              />
            </button>

            {/* 4. Language Switch */}
            <button
              id="sidebar-lang-icon-btn"
              onClick={onToggleLang}
              title={lang === 'es' ? 'Idioma: Español (Cambiar a English)' : 'Language: English (Switch to Spanish)'}
              className="h-8 flex items-center justify-center bg-white dark:bg-[#1c1c1e] hover:bg-slate-100 dark:hover:bg-[#27272a] border border-slate-300 dark:border-[#2e2e33] transition-colors"
            >
              <FlagIcon country={lang === 'es' ? 'AR' : 'US'} size="xs" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
