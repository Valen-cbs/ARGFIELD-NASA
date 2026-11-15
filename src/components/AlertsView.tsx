import { SatelliteReading } from '../types/satellite';
import React, { useState, useEffect } from 'react';
import { Alert } from '../types';
import { AlertCard } from './AlertCard';
import { SkeletonLoader } from './SkeletonLoader';
import { 
  Layers, 
  ShieldAlert, 
  Waves, 
  Satellite,
  CheckCircle2,
  Filter,
  RefreshCw
} from 'lucide-react';

interface AlertsViewProps {
  alerts: Alert[];
  readings: SatelliteReading[];
  loadingData: boolean;
  onSelectAlert: (alert: Alert) => void;
  lang: 'es' | 'en';
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  readings,
  loadingData,
  onSelectAlert,
  lang
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'upstream'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, [filter]);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
  const upstreamAlerts = alerts.filter(a => a.hydrologicalRelation === 'upstream');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'critical') return a.severity === 'critical' || a.severity === 'high';
    if (filter === 'upstream') return a.hydrologicalRelation === 'upstream';
    return true;
  });

  return (
    <div className="space-y-4 pb-12 font-sans select-none max-w-5xl mx-auto">
      {/* Unified Block: Header, 4 KPIs & Filter Controls */}
      <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] shadow-xs divide-y divide-slate-200 dark:divide-[#2e2e33]">
        {/* Subdivision 1: Header (Title & Subtitle) */}
        <div className="p-4 sm:p-5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
            {lang === 'es' ? 'Monitoreo Hidroclimático Satelital' : 'Satellite Hydroclimatic Monitoring'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
            {lang === 'es' 
              ? 'Avisos de seguimiento basados en productos vigentes de CONAE. Revisá cada lectura con tu agrónomo.'
              : 'Follow-up notices based on current CONAE products. Review each reading with your agronomist.'}
          </p>
        </div>

        {/* Subdivision 2: Top Summary KPI Cards (4 subdivided columns) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-[#2e2e33] bg-slate-50/40 dark:bg-[#1e1e21]">
          {/* Total Alerts */}
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>{lang === 'es' ? 'Total Alertas' : 'Total Alerts'}</span>
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-1 text-2xl font-black font-mono text-slate-900 dark:text-white">
              {alerts.length}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
              {lang === 'es' ? 'En radio de influencia' : 'In influence radius'}
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>{lang === 'es' ? 'Alta Prioridad / Críticas' : 'High / Critical'}</span>
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="mt-1 text-2xl font-black font-mono text-red-600 dark:text-red-400">
              {criticalAlerts.length}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
              {lang === 'es' ? 'Requieren acción preventiva' : 'Action required'}
            </div>
          </div>

          {/* Upstream Alerts */}
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>{lang === 'es' ? 'Cuenca Alta (Upstream)' : 'Upstream Basin'}</span>
              <Waves className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="mt-1 text-2xl font-black font-mono text-[#0f3260] dark:text-sky-400">
              {upstreamAlerts.length}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
              {lang === 'es' ? 'Anticipación hídrica' : 'Early hydrological lead'}
            </div>
          </div>

          {/* Space Constellation */}
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>{lang === 'es' ? 'Sensores Satelitales' : 'Satellites'}</span>
              <Satellite className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 text-xs font-mono font-bold text-slate-900 dark:text-white pt-1">
              {readings.filter(r => r.status === 'available' && !r.cached).length} / {readings.length}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {lang === 'es' ? 'Productos vigentes en el punto' : 'Current products at this point'}
            </div>
          </div>
        </div>

        {/* Subdivision 3: Filter Controls Bar */}
        <div className="p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1c1c1e]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              {lang === 'es' ? 'Filtro:' : 'Filter:'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                id="filter-all-btn"
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === 'all'
                    ? 'bg-[#0f3260] text-white border-[#0f3260] dark:bg-[#27272a] dark:text-zinc-100 dark:border-[#44444a]'
                    : 'bg-slate-50 dark:bg-[#232326] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-[#333336] hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>{lang === 'es' ? 'Todas' : 'All'} ({alerts.length})</span>
              </button>

              <button
                id="filter-critical-btn"
                type="button"
                onClick={() => setFilter('critical')}
                className={`px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === 'critical'
                    ? 'bg-red-700 dark:bg-red-800 text-white border-red-700 dark:border-red-700'
                    : 'bg-slate-50 dark:bg-[#232326] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-[#333336] hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                }`}
              >
                <ShieldAlert className="w-3 h-3 text-red-500 dark:text-red-400" />
                <span>{lang === 'es' ? 'Críticas / Altas' : 'Critical'} ({criticalAlerts.length})</span>
              </button>

              <button
                id="filter-upstream-btn"
                type="button"
                onClick={() => setFilter('upstream')}
                className={`px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === 'upstream'
                    ? 'bg-[#0f3260] text-white border-[#0f3260] dark:bg-[#27272a] dark:text-zinc-100 dark:border-[#44444a]'
                    : 'bg-slate-50 dark:bg-[#232326] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-[#333336] hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                }`}
              >
                <Waves className="w-3 h-3 text-sky-400" />
                <span>{lang === 'es' ? 'Cuenca Alta' : 'Upstream'} ({upstreamAlerts.length})</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
            {filteredAlerts.length} {lang === 'es' ? 'alertas mostradas' : 'alerts displayed'}
          </div>
        </div>
      </div>

      {/* 4. Alerts List or Skeleton Loader */}
      {isLoading || loadingData ? (
        <SkeletonLoader type="card" count={3} />
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] p-8 text-center space-y-3">
          <div className="w-10 h-10 mx-auto bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-100">
            {lang === 'es' ? 'No se registran alertas bajo este filtro' : 'No alerts under this filter'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
            {lang === 'es' 
              ? 'No se activaron reglas con los datos vigentes disponibles. Los productos sin cobertura, antiguos o sin fecha no permiten descartar riesgos.'
              : 'No rules were triggered by available current data. Missing, historical or undated products cannot rule out risks.'}
          </p>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="px-3 py-1.5 text-xs font-semibold text-[#0f3260] dark:text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            {lang === 'es' ? 'Ver todas las alertas' : 'View all alerts'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onSelect={onSelectAlert}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  );
};
