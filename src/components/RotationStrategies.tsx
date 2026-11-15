import { EngineComparison } from './EngineComparison';
import type { EngineResult } from '../engine/engineTypes';
import { DemoBadge } from './DemoBadge';
import React, { useState, useEffect } from 'react';
import { CropRotationPlan, FarmProfile } from '../types';
import { SkeletonLoader } from './SkeletonLoader';
import { 
  Droplets, 
  Sprout, 
  ShieldCheck, 
  Layers, 
  Calendar, 
  CheckCircle2,
  Table,
  Compass,
  Zap
} from 'lucide-react';

interface RotationStrategiesProps {
  plans: CropRotationPlan[];
  farmProfile: FarmProfile;
  lang: 'es' | 'en';
  quantitative?: boolean;
  engineError?: string | null;
  engineWarnings?: string[];
  engineResult?: EngineResult | null;
  onNavigateToHome?: () => void;
  onOpenExport?: () => void;
}

export const RotationStrategies: React.FC<RotationStrategiesProps> = ({
  plans,
  farmProfile,
  lang,
  quantitative = false,
  engineError = null,
  engineResult,
  engineWarnings = []
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, [selectedPlanId]);

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const currentIndex = plans.findIndex((p) => p.id === currentPlan?.id);

  if (!currentPlan) {
    return (
      <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] p-8 text-center text-xs text-slate-500 dark:text-zinc-400">
        <EngineComparison result={engineResult} />
        {lang === 'es' ? 'No se pudieron generar planes de rotación.' : 'Could not generate rotation plans.'}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 font-sans select-none max-w-5xl mx-auto">
      {(engineError || engineWarnings.length > 0) && (
        <div role="status" className="border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-xs text-amber-950 dark:text-amber-100">
          <strong>{lang === 'es' ? 'Estado de datos del motor' : 'Engine data status'}</strong>
          {engineError && <p className="mt-1">{engineError}</p>}
          {engineWarnings.length > 0 && <ul className="mt-1 list-disc pl-5">{engineWarnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul>}
        </div>
      )}
      <EngineComparison result={engineResult} />
      {/* Unified Block: Field Context & 3 Strategy Selectors */}
      <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] shadow-xs divide-y divide-slate-200 dark:divide-[#2e2e33]">
        {/* Subdivision 1: Establishment Title & Agronomic Specs */}
        <div className="p-4 sm:p-5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {farmProfile.location.name}
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 flex flex-wrap items-center gap-x-2">
            <span>{farmProfile.location.province}</span>
            <span>•</span>
            <span>{farmProfile.location.basinName}</span>
            <span>•</span>
            <span className="font-mono">{farmProfile.fieldSizeHectares} ha</span>
            <span>•</span>
            <span className="text-[#0f3260] dark:text-sky-400 font-medium">
              {lang === 'es' ? 'Suelo' : 'Soil'}: {farmProfile.soilType.replace('_', ' ')}
            </span>
          </p>
        </div>

        {/* Subdivision 2: 3 Strategy Options (Subdivided Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-[#2e2e33]">
          {plans.map((plan, idx) => {
            const isSelected = plan.id === currentPlan.id;
            return (
              <button
                key={plan.id}
                type="button"
                id={`plan-select-${idx}`}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`p-3.5 sm:p-4 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#0f3260] text-white dark:bg-[#252528] dark:text-white'
                    : 'bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-[#222226]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-100 dark:bg-[#28282c] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#38383e]'
                    }`}>
                      {lang === 'es' ? `Estrategia 0${idx + 1}` : `Strategy 0${idx + 1}`}
                    </span>
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {quantitative ? (lang === 'es' ? 'Motor cuantitativo' : 'Quantitative engine') : (lang === 'es' ? 'Orientativo' : 'Qualitative')}
                    </span>
                  </div>

                  <div className="font-bold text-xs sm:text-sm leading-snug">
                    {plan.title}
                  </div>

                  <div className={`text-[11px] mt-1.5 line-clamp-2 leading-relaxed ${
                    isSelected ? 'text-blue-100 dark:text-zinc-300' : 'text-slate-500 dark:text-zinc-400'
                  }`}>
                    {plan.theme}
                  </div>
                </div>

                <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-medium ${
                  isSelected ? 'border-white/20 text-sky-200' : 'border-slate-200 dark:border-[#2e2e33] text-slate-600 dark:text-zinc-400'
                }`}>
                  <span>{lang === 'es' ? 'Resultado cuantitativo:' : 'Quantitative result:'}</span>
                  <span className="font-mono font-bold">{quantitative ? `${plan.resilienceScore}/100` : (lang === 'es' ? 'No estimado' : 'Not estimated')}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonLoader type="card" count={1} />
          <SkeletonLoader type="table" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* 3. Hero Plan Overview Card (Metrics + Executive Rationale) */}
          <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-[#2e2e33] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    {lang === 'es' ? 'Plan Seleccionado' : 'Selected Plan'}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#0f3260] dark:text-sky-400">
                    #{currentIndex + 1}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {currentPlan.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {quantitative ? (lang === 'es' ? 'Evaluada por el motor' : 'Engine evaluated') : (lang === 'es' ? 'Alternativa orientativa' : 'Qualitative alternative')}
                </span>
                {!quantitative && <DemoBadge lang={lang} />}
              </div>
            </div>

            {/* 4 Quantitative Impact Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Metric 1: Water Savings */}
              <div className="bg-slate-50 dark:bg-[#232326] p-3 border border-slate-200 dark:border-[#2e2e33]">
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
                  <span>{lang === 'es' ? (quantitative ? 'Puntaje del motor' : 'Ahorro Hídrico') : (quantitative ? 'Engine score' : 'Water Savings')}</span>
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="mt-1 text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {quantitative ? `${currentPlan.resilienceScore}/100` : (lang === 'es' ? 'No estimado' : 'Not estimated')}
                </div>
                <div className="w-full bg-slate-200 dark:bg-[#2d2d32] h-1.5 mt-2 overflow-hidden">
                  <div className="bg-slate-400 h-full w-0" />
                </div>
              </div>

              {/* Metric 2: Soil Carbon */}
              <div className="bg-slate-50 dark:bg-[#232326] p-3 border border-slate-200 dark:border-[#2e2e33]">
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
                  <span>{lang === 'es' ? 'Carbono en Suelo' : 'Soil Carbon'}</span>
                  <Sprout className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                  {lang === 'es' ? 'No estimado para este lote' : 'Not estimated for this farm'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
                  {lang === 'es' ? 'Sin medición de suelo local' : 'No local soil measurement'}
                </div>
              </div>

              {/* Metric 3: Strategic Focus */}
              <div className="bg-slate-50 dark:bg-[#232326] p-3 border border-slate-200 dark:border-[#2e2e33] col-span-2 sm:col-span-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
                  <span>{lang === 'es' ? 'Objetivo Operativo Clave' : 'Key Operational Goal'}</span>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="mt-1 text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">
                  {currentPlan.primaryGoal}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 truncate">
                  {farmProfile.location.name.split(' - ')[0]} • Cuenca {farmProfile.location.basinName}
                </div>
              </div>
            </div>

            {/* Summary Rationale Box */}
            <div className="bg-slate-50 dark:bg-[#232326] p-3.5 border border-slate-200 dark:border-[#2e2e33] space-y-1">
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#0f3260] dark:text-sky-400" />
                {lang === 'es' ? 'Fundamentación Agronómica del Plan:' : 'Agronomic Rationale:'}
              </span>
              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                {currentPlan.summary}
              </p>
            </div>
          </div>

          {/* 4. Crop Succession Chronogram (The Core Sequence) */}
          <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] shadow-xs">
            {/* View Switcher Header */}
            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-[#2e2e33] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#0f3260] dark:bg-[#252528] text-white">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'es' ? 'Secuencia y Cronograma de Siembra' : 'Crop Succession Schedule'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {lang === 'es' ? 'Alternativas para revisar según el lote' : 'Options to review for this farm'}
                  </p>
                </div>
              </div>

              {/* Toggle Cards vs Table */}
              <div className="flex items-center border border-slate-300 dark:border-[#38383e] text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1 font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-[#0f3260] text-white dark:bg-[#27272a] dark:text-zinc-100'
                      : 'bg-white dark:bg-[#1c1c1e] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#26262a]'
                  }`}
                  title={lang === 'es' ? 'Vista de tarjetas' : 'Card view'}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{lang === 'es' ? 'Cronograma' : 'Timeline'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    viewMode === 'table'
                      ? 'bg-[#0f3260] text-white dark:bg-[#27272a] dark:text-zinc-100'
                      : 'bg-white dark:bg-[#1c1c1e] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#26262a]'
                  }`}
                  title={lang === 'es' ? 'Vista de tabla' : 'Table view'}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{lang === 'es' ? 'Tabla' : 'Table'}</span>
                </button>
              </div>
            </div>

            {/* View 1: Detailed Timeline Cards */}
            {viewMode === 'cards' && (
              <div className="p-3 sm:p-4 space-y-3">
                {currentPlan.steps.map((step, idx) => {
                  const isLast = idx === currentPlan.steps.length - 1;

                  return (
                    <div 
                      key={idx}
                      className="bg-slate-50 dark:bg-[#232326] border border-slate-200 dark:border-[#2e2e33] p-3.5 sm:p-4 transition-colors relative"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-[#2f2f34] pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#0f3260] text-white dark:bg-[#2f2f35] dark:text-zinc-200">
                            {lang === 'es' ? `Paso ${idx + 1}` : `Step ${idx + 1}`}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {step.season}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                            step.waterDemand === 'low'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : step.waterDemand === 'moderate'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                          }`}>
                            {lang === 'es' ? 'Demanda' : 'Demand'}: {lang === 'es' ? 'A evaluar' : 'To assess'}
                          </span>

                          <span className="text-[10px] font-mono text-slate-600 dark:text-zinc-400 bg-white dark:bg-[#1c1c1e] px-2 py-0.5 border border-slate-200 dark:border-[#333336]">
                            {lang === 'es' ? 'Raíz:' : 'Root:'} {lang === 'es' ? 'depende de la especie' : 'species dependent'}
                          </span>
                        </div>
                      </div>

                      {/* Crop info and Benefits */}
                      <div className="pt-2.5 grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-5 space-y-1">
                          <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {step.crop}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400 italic">
                            {step.scientificName}
                          </div>
                          <div className="pt-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              {step.expectedSoilMoistureConservation}
                            </span>
                          </div>
                        </div>

                        <div className="md:col-span-7 space-y-2 text-xs">
                          <div className="bg-white dark:bg-[#1c1c1e] p-2.5 border border-slate-200 dark:border-[#2f2f34]">
                            <strong className="text-slate-800 dark:text-zinc-200 block text-[11px] mb-0.5">
                              {lang === 'es' ? 'Aporte Edáfico / INTA:' : 'Soil Benefit / INTA:'}
                            </strong>
                            <p className="text-slate-600 dark:text-zinc-300 leading-relaxed">
                              {step.soilHealthBenefit}
                            </p>
                          </div>

                          <div className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                            <strong className="text-slate-700 dark:text-zinc-300">
                              {lang === 'es' ? 'Criterio de Adaptación Climatológica:' : 'Climate Rationale:'}
                            </strong> {step.adaptationRationale}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* View 2: Compact Data Table */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-[#232326] text-slate-700 dark:text-zinc-300 font-semibold border-b border-slate-200 dark:border-[#2e2e33] text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 border-r border-slate-200 dark:border-[#2e2e33]">Campaña</th>
                      <th className="px-3 py-2.5 border-r border-slate-200 dark:border-[#2e2e33]">Cultivo</th>
                      <th className="px-3 py-2.5 border-r border-slate-200 dark:border-[#2e2e33]">Beneficio Edáfico</th>
                      <th className="px-3 py-2.5 border-r border-slate-200 dark:border-[#2e2e33]">Demanda Hídrica</th>
                      <th className="px-3 py-2.5">Conservación de Humedad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#2e2e33]">
                    {currentPlan.steps.map((step, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#232326]">
                        <td className="px-3 py-2.5 font-bold font-mono text-slate-900 dark:text-zinc-100 border-r border-slate-200 dark:border-[#2e2e33]">
                          {step.season}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-[#2e2e33]">
                          {step.crop}
                          <span className="block text-[10px] text-slate-500 dark:text-zinc-400 font-normal italic">
                            {step.scientificName}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-zinc-300 border-r border-slate-200 dark:border-[#2e2e33]">
                          {step.soilHealthBenefit}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-zinc-200 border-r border-slate-200 dark:border-[#2e2e33] uppercase text-[11px]">
                          {lang === 'es' ? 'A evaluar con asesoramiento local' : 'Assess with local advice'}
                        </td>
                        <td className="px-3 py-2.5 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-semibold">
                          {step.expectedSoilMoistureConservation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
