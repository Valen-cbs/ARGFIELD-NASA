import React from 'react';

interface EngineNoticeProps {
  lang: 'es' | 'en';
  onGoToMap: () => void;
  onDismiss: () => void;
}

/* export const EngineNotice: React.FC<EngineNoticeProps> = ({ lang, onGoToMap, onDismiss }) => {
  const es = lang === 'es';
  return (
    <div
      role="status"
      className="mb-3 sm:mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 bg-amber-50 border border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100 text-xs"
    >
      <span className="flex-1 min-w-[220px]">
        {es
          ? 'Las estrategias cuantitativas se calculan con el motor de rotaciones y muestran sus fuentes y advertencias. El ahorro de agua y el carbono del suelo no se estiman; si faltan insumos, el optimizador lo indica.'
          : 'Quantitative strategies are calculated by the rotation engine and show their sources and warnings. Water savings and soil carbon are not estimated; missing inputs are reported by the optimizer.'}
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
        aria-label={es ? 'Ocultar aviso del motor' : 'Hide engine notice'}
      >
        {es ? 'Ocultar' : 'Hide'}
      </button>
    </div>
  );
}; */
