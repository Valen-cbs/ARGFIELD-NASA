import React from 'react';

interface DemoBadgeProps {
  lang: 'es' | 'en';
  className?: string;
}

/**
 * Marca un valor como simulado. Mientras la app no consulte los servicios
 * reales, todo número que no venga del mapa de CONAE debe llevar esta etiqueta.
 */
export const DemoBadge: React.FC<DemoBadgeProps> = ({ lang, className = '' }) => {
  const title =
    lang === 'es'
      ? 'Valor simulado para la demo. Las capas reales de CONAE están en el Mapa.'
      : 'Simulated value for the demo. Real CONAE layers are on the Map.';
  return (
    <span
      title={title}
      className={`inline-flex items-center px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 ${className}`}
    >
      {lang === 'es' ? 'Demo' : 'Demo'}
    </span>
  );
};

interface DemoBannerProps {
  lang: 'es' | 'en';
  onGoToMap: () => void;
  onDismiss: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ lang, onGoToMap, onDismiss }) => {
  const es = lang === 'es';
  return (
    <div
      role="status"
      className="mb-3 sm:mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 bg-amber-50 border border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100 text-xs"
    >
      <DemoBadge lang={lang} />
      <span className="flex-1 min-w-[220px]">
        {es
          ? 'Modo demo: los números de tarjetas, alertas, clima y rotaciones son simulados. El Mapa muestra capas reales de CONAE.'
          : 'Demo mode: numbers in cards, alerts, weather and rotations are simulated. The Map shows real CONAE layers.'}
      </span>
      <button
        type="button"
        onClick={onGoToMap}
        className="font-semibold underline underline-offset-2 cursor-pointer"
      >
        {es ? 'Ver datos reales en el mapa' : 'See real data on the map'}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="text-amber-800 dark:text-amber-300 cursor-pointer"
        aria-label={es ? 'Ocultar aviso de demo' : 'Hide demo notice'}
      >
        {es ? 'Ocultar' : 'Hide'}
      </button>
    </div>
  );
};
