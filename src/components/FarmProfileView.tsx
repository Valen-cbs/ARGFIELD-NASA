import { WeekOutlook } from './home/WeekOutlook';
import type { FieldForecast } from '../services/fieldForecast';
import type { RotationEngineState } from '../services/rotationEngineAdapter';
import { SatelliteReadings } from './SatelliteReadings';
import { SatelliteReading } from '../types/satellite';
import React from 'react';
import { FarmProfile, FarmerPriority, Alert } from '../types';
import { WeatherBrief } from '../services/weatherAlerts';
import { 
  Droplets, 
  Sprout, 
  ShieldCheck, 
  TrendingUp, 
  Pencil, 
  ArrowRight, 
  Compass
} from 'lucide-react';

interface FarmProfileViewProps {
  farmProfile: FarmProfile;
  alerts?: Alert[];
  readings: SatelliteReading[];
  onRefreshData: () => void;
  onOpenEditFarm: () => void;
  onOpenExport?: () => void;
  onNavigateToOptimizer?: () => void;
  onNavigateToAlerts?: () => void;
  onNavigateToWeather?: () => void;
  lang: 'es' | 'en';
  weatherSummary: WeatherBrief | null;
  forecast: FieldForecast | null;
  rotationEngine: RotationEngineState;
}

export const FarmProfileView: React.FC<FarmProfileViewProps> = ({
  farmProfile,
  alerts,
  readings,
  onRefreshData,
  onOpenEditFarm,
  onOpenExport,
  onNavigateToOptimizer,
  onNavigateToAlerts,
  onNavigateToWeather,
  lang,
  weatherSummary, forecast, rotationEngine
}) => {
  const topAlert = alerts && alerts.length > 0 
    ? alerts.find(a => a.severity === 'critical') || alerts[0]
    : null;
  const criticalCount = alerts ? alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length : 0;

  // Home and optimizer use the same evaluated alternatives and provenance.
  const topPlan = rotationEngine.plans[0];
  const strategy = {
    title: topPlan?.title ?? (rotationEngine.status === 'loading' ? (lang === 'es' ? 'Evaluando alternativas…' : 'Evaluating alternatives…') : (lang === 'es' ? 'Sin alternativa evaluable' : 'No evaluated alternative')),
    desc: topPlan?.summary ?? rotationEngine.error ?? (lang === 'es' ? 'Revisá los datos y la comparación en el Optimizador.' : 'Review inputs and comparison in the optimizer.'),
    benefitWater: lang === 'es' ? 'No estimado' : 'Not estimated',
    benefitSoil: lang === 'es' ? 'Sin medición local' : 'No local measurement'
  };

  const prioritiesList: Array<{ id: FarmerPriority; label: string; icon: React.ReactNode }> = [
    { 
      id: 'conserve_moisture', 
      label: lang === 'es' ? 'Cuidar Agua' : 'Conserve Water',
      icon: <Droplets className="w-4 h-4" />
    },
    { 
      id: 'build_soil_organic', 
      label: lang === 'es' ? 'Salud del Suelo' : 'Soil Health',
      icon: <Sprout className="w-4 h-4" />
    },
    { 
      id: 'drought_resilience', 
      label: lang === 'es' ? 'Resistir Sequía' : 'Drought Resilience',
      icon: <ShieldCheck className="w-4 h-4" />
    },
    { 
      id: 'maximize_margin', 
      label: lang === 'es' ? 'Margen Económico' : 'Economic Margin',
      icon: <TrendingUp className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-4 pb-12 font-sans select-none">
      {/* 1. Header: Farm Name, Location & Edit */}
      <div className="bg-white dark:bg-[#1c1c1e] p-4 sm:p-5 border border-slate-300 dark:border-[#2e2e33] flex items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-[#0f3260] text-white dark:bg-[#252528] dark:text-zinc-200">
              <Compass className="w-3.5 h-3.5" />
              {lang === 'es' ? 'Lote y Diagnóstico' : 'Field & Diagnostics'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            {farmProfile.location.name}
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 flex flex-wrap items-center gap-x-2">
            <span>{farmProfile.location.province}</span>
            <span>•</span>
            <span>{farmProfile.location.basinName}</span>   
            <span>•</span>
            <span>{farmProfile.fieldSizeHectares} ha</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
        
        </div>
      </div>

      <WeekOutlook forecast={forecast} lang={lang} />
      {farmProfile.cropAllocations && farmProfile.cropAllocations.length > 0 && <section className="border border-slate-300 bg-white p-4 dark:border-zinc-700 dark:bg-[#1c1c1e]"><h2 className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-zinc-300">{lang === 'es' ? 'Cultivos registrados' : 'Registered crops'}</h2><div className="mt-2 flex flex-wrap gap-2">{farmProfile.cropAllocations.map(item => <span key={item.crop} className="border border-slate-200 px-2.5 py-1 text-xs dark:border-zinc-700">{item.crop} · {item.hectares.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US')} ha</span>)}</div></section>}

      <SatelliteReadings readings={readings} lang={lang} onRefresh={onRefreshData} onLocateField={onOpenEditFarm} />

      <section className="grid gap-px border border-slate-300 bg-slate-200 dark:border-zinc-700 dark:bg-zinc-700 sm:grid-cols-3">
        <div className="bg-white p-4 dark:bg-[#1c1c1e]"><div className="text-[11px] font-bold uppercase text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Clima actual · Open-Meteo' : 'Current weather · Open-Meteo'}</div>{weatherSummary ? <><div className="mt-1 text-2xl font-bold">{weatherSummary.temperature.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { maximumFractionDigits: 1 })} °C</div><div className="text-xs text-slate-600 dark:text-zinc-400">{lang === 'es' ? 'Humedad' : 'Humidity'}: {weatherSummary.humidity ?? '—'}%</div></> : <div className="mt-2 text-xs text-slate-500">{lang === 'es' ? 'Pronóstico no disponible para este punto.' : 'Forecast unavailable for this point.'}</div>}</div>
        <div className="bg-white p-4 dark:bg-[#1c1c1e]"><div className="text-[11px] font-bold uppercase text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Temperatura de hoy' : 'Today’s temperature'}</div><div className="mt-1 text-lg font-bold">{weatherSummary?.todayMin ?? '—'}° / {weatherSummary?.todayMax ?? '—'}°C</div><div className="text-xs text-slate-600 dark:text-zinc-400">{lang === 'es' ? 'Mínima / máxima pronosticada' : 'Forecast minimum / maximum'}</div></div>
        <div className="bg-white p-4 dark:bg-[#1c1c1e]"><div className="text-[11px] font-bold uppercase text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Lluvia · próximos 3 días' : 'Rain · next 3 days'}</div><div className="mt-1 text-lg font-bold">{weatherSummary?.nextThreeDayRain?.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { maximumFractionDigits: 1 }) ?? '—'} mm</div><div className="text-xs text-slate-600 dark:text-zinc-400">{weatherSummary?.updatedAt ? `${lang === 'es' ? 'Actualizado' : 'Updated'} ${new Date(weatherSummary.updatedAt).toLocaleString(lang === 'es' ? 'es-AR' : 'en-US')}` : lang === 'es' ? 'Fecha no disponible' : 'Date unavailable'}</div></div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33]">
        <div className="text-xs text-slate-700 dark:text-zinc-300">
          <strong>{criticalCount} {lang === 'es' ? 'avisos de prioridad alta' : 'high priority notices'}</strong>
          <p className="mt-1">{topAlert?.title ?? (lang === 'es' ? 'Sin avisos generados. Revisá la cobertura y la fecha de cada fuente.' : 'No notices generated. Check coverage and dates for each source.')}</p>
        </div>
        <button type="button" onClick={onNavigateToAlerts} className="text-xs font-bold text-[#0f3260] dark:text-sky-300 cursor-pointer">{lang === 'es' ? 'Ver avisos' : 'View notices'}</button>
        <button type="button" onClick={onNavigateToWeather} className="flex items-center gap-2 text-xs font-bold text-[#0f3260] dark:text-sky-300 cursor-pointer">{lang === 'es' ? 'Ver clima' : 'View weather'}</button>
      </div>

      {/* 3. Combined Block (Image 1 Request): Farmer Priority + Resulting Recommended Strategy in One Subdivided Container */}
      <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] shadow-xs divide-y divide-slate-200 dark:divide-[#2e2e33]">
        {/* Subdivision A: Prioridad del Productor */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {lang === 'es' ? 'Prioridad del Productor' : 'Farmer Priorities'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                {lang === 'es' ? 'Selecciona tu objetivo de campaña para orientar la rotación del lote' : 'Select your seasonal target to tailor crop sequence options'}
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 shrink-0">
              {lang === 'es' ? 'Pilar NASA Field Shift' : 'NASA Field Shift Pillar'}
            </span>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 p-3 text-xs dark:border-zinc-700 dark:bg-[#232326]">
            {prioritiesList.find(item => item.id === farmProfile.priority)?.icon}
            <span className="font-bold">{prioritiesList.find(item => item.id === farmProfile.priority)?.label}</span>
          </div>
        </div>

        {/* Subdivision B: Estrategia Recomendada (Directly linked to selected priority) */}
        <div className="p-4 sm:p-5 bg-slate-50/60 dark:bg-[#202023]/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#0f3260] text-white dark:bg-[#252528] dark:text-sky-300">
{lang === 'es' ? 'Orientación de manejo' : 'Management guidance'}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {strategy.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                {strategy.desc}
              </p>

              <div className="flex items-center gap-3 pt-1">
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Agua preservada:' : 'Water saved:'}</span>
                  <span className="font-mono font-bold text-[#0f3260] dark:text-sky-400">{strategy.benefitWater}</span>
                </div>
                <span className="text-slate-300 dark:text-zinc-600">•</span>
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Aporte al suelo:' : 'Soil gain:'}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{strategy.benefitSoil}</span>
                </div>
              </div>
            </div>

            {onNavigateToOptimizer && (
              <button
                type="button"
                id="home-view-optimizer-btn"
                onClick={onNavigateToOptimizer}
                className="px-4 py-2.5 bg-[#0f3260] text-white dark:bg-sky-500 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider hover:bg-[#0a2344] dark:hover:bg-sky-400 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>{lang === 'es' ? 'Ver Planes en Optimizador' : 'Explore in Optimizer'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
