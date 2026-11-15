import React from 'react';
import { Alert } from '../types';
import { AgencyLogo } from './AgencyLogo';
import { formatReadingDate } from './SatelliteReadings';
import { 
  AlertTriangle, 
  ArrowRight, 
  Waves, 
  Compass, 
  Radio, 
  Clock, 
  MapPin
} from 'lucide-react';

interface AlertCardProps {
  alert: Alert;
  onSelect: (alert: Alert) => void;
  lang: 'es' | 'en';
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onSelect, lang }) => {
  // Hydrological relation label
  const connectivityLabel = (() => {
    switch (alert.hydrologicalRelation) {
      case 'upstream':
        return lang === 'es' ? 'Cuenca Alta (Aguas Arriba)' : 'Upstream Basin';
      case 'same_basin':
        return lang === 'es' ? 'Misma Cuenca' : 'Same Basin';
      case 'shared_aquifer':
        return lang === 'es' ? 'Acuífero Compartido' : 'Shared Aquifer';
      case 'direct_field':
        return lang === 'es' ? 'Sobre el Lote' : 'Direct Field';
      default:
        return lang === 'es' ? 'Regional' : 'Regional';
    }
  })();

  return (
    <div
      id={`alert-card-${alert.id}`}
      onClick={() => onSelect(alert)}
      className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] p-4 transition-all hover:border-[#0f3260] dark:hover:border-sky-500 cursor-pointer shadow-xs space-y-2.5"
    >
      {/* 1. Header: Source, Mission and Hydrological Relation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-[#2e2e33] pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <AgencyLogo agency={alert.source} size="xs" />
          <span className="font-bold text-xs text-[#0f3260] dark:text-sky-400 font-mono">
            {alert.source}
          </span>
          <span className="text-slate-300 dark:text-zinc-600">|</span>
          <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
            {alert.mission}
          </span>
          <span className="text-slate-300 dark:text-zinc-600">•</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-[#252528] px-2 py-0.5 border border-slate-200 dark:border-[#38383e]">
            <Waves className="w-3 h-3 text-sky-500" />
            {connectivityLabel}
          </span>
        </div>

      </div>

      {/* 2. Title & Immediate Location */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mb-0.5">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{alert.observationLocationName} ({alert.distanceKm} km del lote)</span>
        </div>
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-zinc-100 leading-snug">
          {alert.title}
        </h3>
      </div>

      {/* 3. Structured Sensor Data Box */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 dark:bg-[#232326] p-2.5 border border-slate-200 dark:border-[#2e2e33]">
        <div>
          <span className="text-slate-400 dark:text-zinc-500 text-[10px] block uppercase font-bold">
            {lang === 'es' ? 'Lectura Actual' : 'Current Value'}
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
            {alert.currentValue} {alert.unit}
          </span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-zinc-500 text-[10px] block uppercase font-bold">
            {lang === 'es' ? 'Fecha del producto' : 'Product date'}
          </span>
          <span className="font-mono text-slate-700 dark:text-zinc-300">
            {formatReadingDate(alert.detectedAt, lang)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-zinc-500 text-[10px] block uppercase font-bold">
            {lang === 'es' ? 'Plazo de Impacto' : 'Timeframe'}
          </span>
          <span className="font-medium text-slate-700 dark:text-zinc-300 capitalize flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400 inline" />
            {alert.timeframe.replace('_', ' ')}
          </span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-zinc-500 text-[10px] block uppercase font-bold">
            {lang === 'es' ? 'Sensor Satelital' : 'Satellite Sensor'}
          </span>
          <span className="font-mono text-slate-700 dark:text-zinc-300 truncate block">
            {alert.instrument}
          </span>
        </div>
      </div>

      {/* 4. Recommended Action Row */}
      <div className="text-xs text-slate-700 dark:text-zinc-300 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#2a2a2e]">
        <span className="truncate pr-3 text-[11px] sm:text-xs">
          <strong className="text-slate-900 dark:text-zinc-100">{lang === 'es' ? 'Acción sugerida:' : 'Action:'}</strong> {alert.suggestedAction}
        </span>
        <button
          type="button"
          className="text-[#0f3260] dark:text-sky-400 hover:text-slate-900 dark:hover:text-white font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>{lang === 'es' ? 'Detalles' : 'Details'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
