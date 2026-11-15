import React from 'react';
import { ExternalLink, RefreshCw, Satellite } from 'lucide-react';
import { getSatelliteProduct } from '../data/satelliteProducts';
import { ReadingStatus, SatelliteReading } from '../types/satellite';
import { readingStatus } from '../services/satelliteApi';

const LABELS: Record<ReadingStatus, [string, string]> = {
  loading: ['Consultando…', 'Loading…'], available: ['Dato vigente', 'Current data'],
  no_data: ['Sin dato en el punto', 'No data at this point'], stale: ['Dato antiguo', 'Historical data'],
  undated: ['Fecha no informada', 'Date not provided'], error: ['No se pudo leer el dato', 'Could not read the data']
};

export function readingLabel(reading: SatelliteReading, lang: 'es' | 'en'): string {
  const reasons = {
    outside_coverage: ['Fuera de cobertura publicada', 'Outside published coverage'],
    provider_nodata: ['Sin dato en el punto', 'No data at this point'],
    quality: ['Sin píxel válido por calidad', 'No quality-approved pixel'],
    no_scenes: ['Sin escenas en el período', 'No scenes in the search period'],
    partial_failure: ['Consulta incompleta', 'Incomplete query']
  };
  const label = (reading.status === 'no_data' && reading.missingReason ? reasons[reading.missingReason] : LABELS[reading.status])[lang === 'es' ? 0 : 1];
  return reading.cached ? `${label} · ${lang === 'es' ? 'guardado' : 'saved'}` : label;
}

export function formatReadingDate(value: string | null, lang: 'es' | 'en'): string {
  if (!value || !Number.isFinite(Date.parse(value))) return lang === 'es' ? 'Fecha no informada' : 'Date not provided';
  return new Date(value).toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
}

export const ReadingDetails: React.FC<{ reading: SatelliteReading; lang: 'es' | 'en' }> = ({ reading, lang }) => {
  const es = lang === 'es';
  const product = getSatelliteProduct(reading.productId);
  const oldMissing = reading.status === 'no_data' && product && readingStatus(reading.observedAt, product.maxAgeDays) === 'stale';
  return <div className="space-y-1.5 text-xs" data-testid={`reading-${reading.productId}`}>
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold border ${reading.status === 'available' && !reading.cached ? 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800' : 'text-amber-900 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800'}`}>
      {readingLabel(reading, lang)}
    </span>
    <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
      {reading.value === null ? '—' : reading.value.toLocaleString(es ? 'es-AR' : 'en-US', { maximumFractionDigits: reading.unit === 'NDVI' ? 3 : 2 })}
      {reading.value !== null && <span className="text-xs font-normal ml-1">{reading.unit}</span>}
    </div>
    <div className="text-slate-600 dark:text-zinc-300">{es ? 'Producto:' : 'Product:'} {formatReadingDate(reading.observedAt, lang)}</div>
    {reading.status === 'error' && <p className="text-amber-800 dark:text-amber-300">{es ? reading.detail : 'Could not read this provider.'} {reading.errorCode && `(${reading.errorCode})`}</p>}
    {reading.status === 'no_data' && <p className="text-slate-500 dark:text-zinc-400">{es ? 'La respuesta no contiene un dato válido para el lote. No confirma ausencia de riesgo.' : 'The response contains no valid farm data. This does not confirm the absence of risk.'}</p>}
    {reading.status === 'no_data' && <p className="text-[10px] text-slate-500 dark:text-zinc-400">{es ? reading.detail : 'Check the source coverage, observation date and pixel quality.'}</p>}
    {oldMissing && <p className="text-[10px] text-amber-800 dark:text-amber-300">{es ? 'Además, la fecha del producto publicado está fuera del período de vigencia.' : 'The published product date is also outside the freshness period.'}</p>}
    {reading.scenesChecked !== undefined && <p className="text-[10px] text-slate-500 dark:text-zinc-400">{es ? 'Escenas revisadas en este punto:' : 'Scenes checked at this point:'} {reading.scenesChecked}</p>}
    {reading.sceneId && <details className="text-[10px] text-slate-500 dark:text-zinc-400"><summary className="cursor-pointer">{es ? 'Identificación de la escena' : 'Scene identification'}</summary><p className="break-all mt-1">{reading.sceneId}</p></details>}
    {reading.fetchedAt && <p className="text-[10px] text-slate-500 dark:text-zinc-400">{es ? 'Consultado:' : 'Retrieved:'} {new Date(reading.fetchedAt).toLocaleString(es ? 'es-AR' : 'en-US')}</p>}
    <a href={reading.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex gap-1 items-center text-[10px] text-[#0f3260] dark:text-sky-300 hover:underline">{reading.source} <ExternalLink size={10} /></a>
  </div>;
};

export const SatelliteReadings: React.FC<{ readings: SatelliteReading[]; lang: 'es' | 'en'; onRefresh?: () => void; onLocateField?: () => void }> = ({ readings, lang, onRefresh, onLocateField }) => (
  <section className="space-y-3" aria-label={lang === 'es' ? 'Lecturas satelitales del lote' : 'Farm satellite readings'}>
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white"><Satellite size={17} />{lang === 'es' ? 'Qué ve el satélite en tu lote' : 'What satellites see at your farm'}</h2>
      {onRefresh && <button type="button" onClick={onRefresh} disabled={readings.some(r => r.status === 'loading')} className="flex items-center gap-1 text-xs text-[#0f3260] dark:text-sky-300 disabled:opacity-50 cursor-pointer"><RefreshCw size={13} />{lang === 'es' ? 'Actualizar' : 'Refresh'}</button>}
    </div>
    <p className="text-xs text-slate-600 dark:text-zinc-400">{lang === 'es' ? 'Lecturas del punto elegido, no un promedio de todo el campo. Humedad volumétrica y agua útil son medidas diferentes.' : 'Readings at the selected point, not averages over the whole farm. Volumetric moisture and plant-available water are different measures.'}</p>
    <div className="p-3 border border-slate-300 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 space-y-1">
      <p>{lang === 'es' ? `${readings.filter(r => r.status === 'available').length} de ${readings.length} productos con dato vigente. Cada fuente tiene distinta cobertura, fecha y control de calidad.` : `${readings.filter(r => r.status === 'available').length} of ${readings.length} products have current data. Each source has its own coverage, date and quality checks.`}</p>
      <p>{lang === 'es' ? 'Ubicá el punto dentro del lote: el centro de una localidad puede quedar fuera de los modelos agrícolas. Un dato ausente no significa cero ni ausencia de riesgo.' : 'Place the point inside your field: a town centre may be excluded from agricultural models. Missing data does not mean zero or no risk.'}</p>
      {onLocateField && <button type="button" onClick={onLocateField} className="font-bold text-[#0f3260] dark:text-sky-300 underline cursor-pointer">{lang === 'es' ? 'Ubicar el punto de mi lote' : 'Locate my field point'}</button>}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" aria-live="polite">
      {readings.map(reading => {
        const product = getSatelliteProduct(reading.productId);
        return <article key={reading.productId} className="p-3.5 bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] space-y-2">
          <h3 className="font-bold text-xs text-slate-800 dark:text-zinc-100">{product?.name[lang]}</h3>
          <ReadingDetails reading={reading} lang={lang} />
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">{product?.description[lang]}</p>
        </article>;
      })}
    </div>
  </section>
);
