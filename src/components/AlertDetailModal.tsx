import React from 'react';
import { Alert } from '../types';
import { AgencyLogo } from './AgencyLogo';
import { 
  X, 
  ArrowRight, 
  MapPin, 
  Waves, 
  Activity, 
  ShieldAlert, 
  Compass, 
  Sparkles,
  Clock
} from 'lucide-react';

interface AlertDetailModalProps {
  alert: Alert | null;
  onClose: () => void;
  onGoToRotations: () => void;
  lang: 'es' | 'en';
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  onClose,
  onGoToRotations,
  lang
}) => {
  if (!alert) return null;

  const isCritical = alert.severity === 'critical';
  const isHigh = alert.severity === 'high';

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#38383e] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl transition-colors overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-[#0f3260] dark:bg-[#161618] text-white px-4 py-3 flex items-center justify-between border-b border-[#092040] dark:border-[#2e2e33] shrink-0">
          <div className="flex items-center gap-2">
            <AgencyLogo agency={alert.source} size="xs" />
            <span className="font-bold text-xs font-mono">{alert.source}</span>
            <span className="text-slate-300 dark:text-zinc-500 text-xs">|</span>
            <span className="text-xs text-slate-200 dark:text-zinc-300">{alert.mission}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 font-bold ml-1 ${
              isCritical ? 'bg-red-500 text-white' : isHigh ? 'bg-amber-500 text-black' : 'bg-slate-600 text-white'
            }`}>
              {alert.score}/100
            </span>
          </div>

          <button
            id="close-alert-modal-btn"
            type="button"
            onClick={onClose}
            className="text-white hover:text-slate-300 dark:hover:text-zinc-300 p-1 cursor-pointer"
            title={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-xs text-slate-800 dark:text-zinc-200 overflow-y-auto flex-1">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 mb-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{alert.observationLocationName} • {alert.distanceKm} km del establecimiento</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 leading-snug">
              {alert.title}
            </h2>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-[#232326] p-3 border border-slate-200 dark:border-[#2e2e33]">
            <div>
              <span className="text-slate-400 dark:text-zinc-500 text-[10px] block uppercase font-bold">
                {lang === 'es' ? 'Lectura Actual' : 'Current Value'}
              </span>
              <span className="font-mono font-black text-sm text-slate-900 dark:text-zinc-100">
                {alert.currentValue} {alert.unit}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-zinc-500 text-[10px] block uppercase font-bold">
                {lang === 'es' ? 'Línea Base' : 'Baseline Normal'}
              </span>
              <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                {alert.baseline} {alert.unit}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-zinc-500 text-[10px] block uppercase font-bold">
                {lang === 'es' ? 'Conectividad' : 'Basin Status'}
              </span>
              <span className="font-bold text-[#0f3260] dark:text-sky-400 flex items-center gap-1">
                <Waves className="w-3 h-3 text-sky-500" />
                {alert.hydrologicalRelation === 'upstream' ? 'Cuenca Alta' : 'Lote'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-zinc-500 text-[10px] block uppercase font-bold">
                {lang === 'es' ? 'Plazo' : 'Timeframe'}
              </span>
              <span className="font-medium text-slate-700 dark:text-zinc-300 capitalize flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {alert.timeframe.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Diagnostic Box */}
          <div className="border border-slate-200 dark:border-[#2e2e33] p-3 bg-white dark:bg-[#1c1c1e] space-y-1">
            <span className="font-bold text-slate-900 dark:text-zinc-100 block text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              {lang === 'es' ? 'Diagnóstico Agronómico Satelital' : 'Agronomic Satellite Diagnosis'}
            </span>
            <p className="text-slate-600 dark:text-zinc-300 leading-relaxed text-xs">
              {alert.localImpact}
            </p>
          </div>

          {/* Action Box */}
          <div className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-[#25231c] p-3 space-y-1">
            <span className="font-bold text-amber-900 dark:text-amber-300 block text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              {lang === 'es' ? 'Acción Preventiva Sugerida' : 'Recommended Action'}
            </span>
            <p className="text-slate-700 dark:text-zinc-200 leading-relaxed text-xs">
              {alert.suggestedAction}
            </p>
          </div>

          {/* Scientific Context */}
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 border-t border-slate-200 dark:border-[#2e2e33] pt-2">
            <span className="font-semibold text-slate-700 dark:text-zinc-300">
              {lang === 'es' ? 'Contexto científico:' : 'Scientific context:'}
            </span> {alert.scientificContext}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-3 border-t border-slate-300 dark:border-[#2e2e33] bg-slate-50 dark:bg-[#161618] flex items-center justify-between shrink-0 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {lang === 'es' ? 'Cerrar' : 'Close'}
          </button>

          <button
            id="view-rotation-from-alert-btn"
            type="button"
            onClick={() => {
              onClose();
              onGoToRotations();
            }}
            className="px-4 py-2 bg-[#0f3260] dark:bg-[#252528] hover:bg-[#092040] dark:hover:bg-[#323238] text-white border border-[#0f3260] dark:border-[#3f3f46] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            <span>{lang === 'es' ? 'Ver Planes en Optimizador' : 'View in Rotation Optimizer'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
