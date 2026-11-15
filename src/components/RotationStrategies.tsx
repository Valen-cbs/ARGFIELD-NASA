import { IntelligentAnalysis } from './IntelligentAnalysis';
import { RotationTechnicalDetails } from './RotationTechnicalDetails';
import { CropManagementRecommendations } from './CropManagementRecommendations';
import { OptimizationDiagnostics } from './OptimizationDiagnostics';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { GoogleIcon } from './GoogleIcon';

type Props = ComponentProps<typeof RotationTechnicalDetails>;
const panel = 'border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#1c1c1e] shadow-sm';
const mainCropNames: Record<Props['farmProfile']['currentCrop'], string> = {
  soybean: 'Soja',
  maize: 'Maíz',
  wheat: 'Trigo',
  sunflower: 'Girasol',
  sorghum: 'Sorgo',
  pasture: 'Pastura',
  barley: 'Cebada'
};
const priorityNames: Record<Props['farmProfile']['priority'], string> = {
  conserve_moisture: 'Conservar humedad',
  build_soil_organic: 'Mejorar suelo',
  drought_resilience: 'Resiliencia a sequía',
  erosion_control: 'Control de erosión',
  maximize_margin: 'Maximizar margen'
};

function EngineRawDetails({ result }: { result: NonNullable<Props['engineResult']> }) {
  return (
    <section aria-label="Datos técnicos del motor" className={`${panel} space-y-3 p-4 sm:p-5`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">Salida técnica</p>
        <h3 className="mt-1 text-lg font-bold">Datos sin resumir</h3>
      </div>
      <OptimizationDiagnostics result={result} />
      <details className="border border-slate-300 p-4 text-xs dark:border-zinc-700">
        <summary className="cursor-pointer font-bold">Respuesta completa del motor · JSON</summary>
        <pre className="mt-3 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words bg-slate-50 p-3 font-mono text-[11px] leading-relaxed dark:bg-zinc-900">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </section>
  );
}

export function RotationStrategies(props: Props) {
  const { engineResult: result, engineLoading, engineError, farmProfile } = props;
  const [selected, setSelected] = useState('');
  const [dialog, setDialog] = useState<'alerts' | 'details' | null>(null);
  const top = result?.alternatives[0];
  const management = result?.managementRecommendations ?? [];
  const choice = result?.alternatives.find(alternative => alternative.id === selected) ?? top;
  const managementOnly = management.length > 0 && !top;
  const warnings = [...new Set([...(result?.warnings ?? props.engineWarnings ?? []), ...(choice?.warnings ?? [])])];
  const cropAllocations = [...(farmProfile.cropAllocations ?? [])].sort((a, b) => b.hectares - a.hectares);
  const cultivatedCrops = cropAllocations.length
    ? cropAllocations
    : [{ crop: mainCropNames[farmProfile.currentCrop], hectares: farmProfile.fieldSizeHectares }];
  const hasIrrigation = farmProfile.irrigationAvailable ?? farmProfile.irrigation !== 'dryland';
  const location = [
    farmProfile.location.province,
    farmProfile.location.basinName,
    `${farmProfile.fieldSizeHectares} ha`,
    farmProfile.soilType.replace(/_/g, ' ')
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12 text-slate-900 dark:text-zinc-100">
      <header className="border-b border-slate-200 pb-4 dark:border-zinc-700">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-800 dark:text-sky-300">
          <GoogleIcon name="eco" className="h-4 w-4" />
          Optimización de cultivos
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{result?.diagnostics.outcome === 'management' ? 'Optimizá tus cultivos' : 'Tu próxima rotación'}</h1>
      </header>

      <section aria-label="Estancia evaluada" className={`${panel} p-4 sm:p-5`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Estancia evaluada</p>
            <h2 className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">{farmProfile.location.name}</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">{location.join(' · ')}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              aria-label={`Avisos del motor, ${warnings.length} avisos`}
              aria-haspopup="dialog"
              onClick={() => setDialog('alerts')}
              className="relative inline-flex min-h-10 items-center gap-2 border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <GoogleIcon name="notifications" className="h-5 w-5" />
              {warnings.length > 0 && <span className="grid min-h-5 min-w-5 place-items-center bg-amber-500 px-1 text-[11px] font-bold text-white">{warnings.length}</span>}
            </button>
            <button
              type="button"
              aria-label="Detalles del motor"
              aria-haspopup="dialog"
              onClick={() => setDialog('details')}
              className="inline-flex min-h-10 items-center gap-2 border border-[#0f3260] bg-[#0f3260] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#092040] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-zinc-500 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            >
              <GoogleIcon name="tune" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-zinc-700">
          <span className="mr-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">Cultivos:</span>
          {cultivatedCrops.map(({ crop, hectares }) => (
            <span key={crop} className="border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              {crop} · {hectares.toLocaleString('es-AR')} ha
            </span>
          ))}
          <span className="border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-zinc-700 dark:text-zinc-400">Suelo · {farmProfile.soilType.replace(/_/g, ' ')}</span>
          <span className="border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-zinc-700 dark:text-zinc-400">{hasIrrigation ? 'Con riego' : 'Secano'}</span>
          <span className="border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-zinc-700 dark:text-zinc-400">Prioridad · {priorityNames[farmProfile.priority]}</span>
        </div>
      </section>

      {engineLoading && (
        <p role="status" className={`${panel} flex items-center gap-3 border-l-4 border-l-sky-700 p-4 text-sm`}>
          <GoogleIcon name="sync" className="h-5 w-5 animate-spin text-sky-700 dark:text-sky-300" />
          Evaluando las secuencias con los datos disponibles…
        </p>
      )}
      {engineError && !managementOnly && (
        <p role="alert" className="border border-amber-300 border-l-4 border-l-amber-600 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          {engineError}
        </p>
      )}

      {!engineLoading && management.length > 0 && <CropManagementRecommendations recommendations={management} />}

      {!engineLoading && !top && management.length === 0 && (
        <section className={`${panel} border-l-4 border-l-amber-500 p-5`}>
          <div className="flex items-start gap-3">
            <GoogleIcon name="info" className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-300" />
            <div>
              <h2 className="font-bold">{result?.diagnostics.outcome === 'unsupported_perennial' ? 'No corresponde una rotación anual' : 'Sin alternativas cuantitativas viables'}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">{result?.diagnostics.generationBlocks[0] ?? 'Revisá los avisos y el detalle del motor antes de cambiar la planificación.'}</p>
              {result?.diagnostics.generationBlocks.slice(1).map((message, index) => <p key={index} className="mt-2 text-sm">{message}</p>)}
            </div>
          </div>
        </section>
      )}

      {choice && (
        <section aria-label="Recomendación del motor" className={`${panel} overflow-hidden`}>
          <div className="border-b border-slate-200 px-5 pt-4 dark:border-zinc-700 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">Resultado del motor</p>
            <h2 className="mt-1 text-lg font-bold">Qué recomienda</h2>
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <GoogleIcon name="check" className="h-4 w-4" />
                  {choice.id === top?.id ? 'Mejor posicionada por el motor' : 'Alternativa seleccionada'}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400">{choice.horizonCampaigns} campañas · {choice.scenarioLabel}</span>
              </div>
              <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{choice.label}</h2>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Secuencia prospectiva</h3>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500">Cultivos por campaña</span>
                </div>
                <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {choice.sequence.map((step, index) => (
                    <li key={`${step.campaign}-${index}`} className="relative min-w-0 border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">{step.campaign}</span>
                        <span className="grid h-6 w-6 place-items-center bg-[#0f3260] text-xs font-bold text-white dark:bg-zinc-700">{index + 1}</span>
                      </div>
                      <p className="mt-2 font-bold leading-snug">{step.primaryLabel}</p>
                      {step.secondaryLabel && <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">+ {step.secondaryLabel}</p>}
                    </li>
                  ))}
                </ol>
              </div>

              {choice.justification.length > 0 && (
                <div className="mt-5 border-l-2 border-l-sky-700 bg-sky-50/70 px-4 py-3 dark:border-l-sky-400 dark:bg-sky-950/20">
                  <h3 className="text-sm font-bold">Por qué se destaca</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                    {choice.justification.slice(0, 3).map((reason, index) => (
                      <li key={index} className="flex gap-2">
                        <GoogleIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-sky-800 dark:text-sky-300" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <aside className="flex flex-col justify-center border-t border-slate-200 bg-slate-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/60 lg:border-l lg:border-t-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Puntaje orientativo S(r)</p>
              <p className="mt-2 font-mono text-4xl font-bold tracking-tight tabular-nums">{choice.score?.toFixed(3) ?? '—'}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">Indicador del modelo, no es un porcentaje ni una predicción de rendimiento o ahorro.</p>
            </aside>
          </div>
        </section>
      )}

      {result && !engineLoading && (top || management.length > 0) && (!engineError || managementOnly) && (
        <IntelligentAnalysis result={result} />
      )}

      {!!result?.alternatives.length && (
        <section aria-label="Comparación de alternativas">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">Explorá las opciones</p>
              <h2 className="mt-1 text-lg font-bold">Compará alternativas</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Seleccioná una para ver su secuencia y fundamentos</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.alternatives.slice(0, 3).map((alternative, index) => {
              const isSelected = choice?.id === alternative.id;
              return (
                <button
                  key={alternative.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(alternative.id)}
                  className={`${panel} group flex h-full flex-col p-4 text-left transition-colors hover:border-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:hover:border-sky-400 ${isSelected ? 'border-l-4 border-l-sky-700 bg-sky-50/70 dark:border-l-sky-400 dark:bg-sky-950/20' : ''}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Opción {index + 1}</span>
                    {isSelected && <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300">Seleccionada</span>}
                  </span>
                  <span className="mt-3 font-bold leading-snug">{alternative.sequence.map(step => `${step.primaryLabel}${step.secondaryLabel ? ` + ${step.secondaryLabel}` : ''}`).join(' → ')}</span>
                  <span className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">{alternative.justification[0] ?? 'Sin fundamentación adicional disponible.'}</span>
                  <span className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs dark:border-zinc-700">
                    <span className="text-slate-600 dark:text-zinc-400">S(r) orientativo</span>
                    <span className="font-mono font-bold tabular-nums">{alternative.score?.toFixed(3) ?? '—'}</span>
                  </span>
                  <span className="mt-2 text-[11px] text-slate-500 dark:text-zinc-500">{alternative.horizonCampaigns} campañas evaluadas</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {dialog && (
        <div
          className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6"
          onClick={event => {
            if (event.target === event.currentTarget) setDialog(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="optimizer-dialog-title"
            tabIndex={-1}
            onKeyDown={event => {
              if (event.key === 'Escape') setDialog(null);
            }}
            className={`${panel} my-auto w-full max-w-5xl`}
          >
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-zinc-700 sm:px-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">{farmProfile.location.name}</p>
                <h2 id="optimizer-dialog-title" className="mt-1 text-lg font-bold">
                  {dialog === 'alerts' ? 'Avisos del motor' : 'Detalles del motor'}
                </h2>
              </div>
              <button
                type="button"
                autoFocus
                aria-label="Cerrar ventana"
                onClick={() => setDialog(null)}
                className="grid h-10 w-10 shrink-0 place-items-center border border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <GoogleIcon name="close" className="h-5 w-5" />
              </button>
            </header>
            <div className="max-h-[calc(100vh-7rem)] overflow-y-auto p-4 sm:p-6">
              {dialog === 'alerts' ? (
                warnings.length > 0 ? (
                  <ul className="space-y-3">
                    {warnings.map((warning, index) => (
                      <li key={`${index}-${warning}`} className="flex gap-3 border-l-4 border-l-amber-500 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                        <GoogleIcon name="warning" className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                    <GoogleIcon name="check" className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                    No hay avisos para esta evaluación.
                  </p>
                )
              ) : (
                <div className="space-y-4">
                  {choice ? (
                    <div className="space-y-4">
                    <section className={`${panel} p-4 sm:p-5`}>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Alternativa seleccionada</p>
                      <h3 className="mt-1 text-lg font-bold">{choice.label}</h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
                          <p className="text-xs text-slate-500 dark:text-zinc-400">Puntaje orientativo S(r)</p>
                          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{choice.score?.toFixed(3) ?? '—'}</p>
                        </div>
                        <div className="border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
                          <p className="text-xs text-slate-500 dark:text-zinc-400">Horizonte</p>
                          <p className="mt-1 text-lg font-bold">{choice.horizonCampaigns} campañas</p>
                        </div>
                        <div className="border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
                          <p className="text-xs text-slate-500 dark:text-zinc-400">Escenario</p>
                          <p className="mt-1 text-lg font-bold">{choice.scenarioLabel}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-600 dark:text-zinc-400">El puntaje compara alternativas del modelo; no predice rendimiento ni ahorro físico.</p>
                    </section>

                    <section className={`${panel} p-4 sm:p-5`}>
                      <div className="mb-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">Cálculo</p>
                        <h3 className="mt-1 text-lg font-bold">Desglose del puntaje</h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {choice.criteria.filter(criterion => criterion.value !== null).map(criterion => (
                          <article key={criterion.id} className="border border-slate-200 p-3 dark:border-zinc-700">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-sm font-semibold">{criterion.label}</h4>
                              <span className="shrink-0 font-mono text-sm font-bold tabular-nums">{criterion.value!.toFixed(3)}</span>
                            </div>
                            <div className="mt-2 h-1.5 bg-slate-100 dark:bg-zinc-800">
                              <div className="h-full bg-sky-700 dark:bg-sky-400" style={{ width: `${Math.max(0, Math.min(1, criterion.value!)) * 100}%` }} />
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">{criterion.detail}</p>
                            <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-zinc-500">Peso en el puntaje: {criterion.weight.toFixed(2)}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                    {management.length > 0 && <CropManagementRecommendations recommendations={management} />}
                    </div>
                  ) : management.length > 0 ? (
                    <CropManagementRecommendations recommendations={management} />
                  ) : (
                    <p role="status" className="text-sm text-slate-600 dark:text-zinc-400">
                      {engineLoading ? 'El motor está calculando la evaluación…' : 'No hay una alternativa cuantitativa para detallar.'}
                    </p>
                  )}
                  {result && <EngineRawDetails result={result} />}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
