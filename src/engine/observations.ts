import { getSatelliteProduct } from '../data/satelliteProducts';
import type { SatelliteEvidence, EngineResult } from './engineTypes';
import type { SatelliteReading } from '../types/satellite';

type Reading = Pick<SatelliteReading, 'productId' | 'value' | 'unit' | 'observedAt'> & Omit<Partial<SatelliteReading>, 'status'> & { status: string };
const kinds: Record<string, SatelliteEvidence['kind']> = {
  saocom_humedad: 'soilMoistureVolumetric', smap: 'soilMoistureVolumetric',
  lluvia_imerg: 'precipRecentMm', lluvia_imerg_mensual: 'precipMonthMm',
  sentinel2_ndvi: 'vegetationIndex', modis_lst: 'surfaceTempC'
};

/** One validation policy at both the service boundary and engine boundary. */
export function validObservation(s: Pick<SatelliteEvidence, 'productId' | 'value' | 'unit' | 'observedAt' | 'current' | 'status'>, now: Date): boolean {
  const p = getSatelliteProduct(s.productId);
  if (!p || !s.current || s.value === null || !Number.isFinite(s.value) || !s.observedAt) return false;
  if (s.status !== undefined && s.status !== 'available') return false;
  const age = (now.getTime() - Date.parse(s.observedAt)) / 86400000;
  if (!Number.isFinite(age) || age < 0 || age > p.maxAgeDays) return false;
  const expected = p.kind === 'wms' ? p.wms.measure?.unit : p.unit;
  if (s.unit !== expected) return false;
  const min = p.kind === 'wms' ? p.wms.measure?.min : p.id === 'sentinel2_ndvi' ? -1 : -100;
  const max = p.kind === 'wms' ? p.wms.measure?.max : p.id === 'sentinel2_ndvi' ? 1 : 100;
  if (min === undefined || max === undefined || s.value < min || s.value > max) return false;
  if (p.kind === 'wms' && p.wms.measure?.noData?.includes(s.value)) return false;
  return !['smap', 'saocom_humedad'].includes(s.productId) || s.value <= 60;
}

export function evidenceFromReadings(readings: Reading[], now: Date): SatelliteEvidence[] {
  return readings.flatMap(r => {
    const p = getSatelliteProduct(r.productId);
    if (!p) return [];
    const s: SatelliteEvidence = {
      productId: p.id, productLabel: p.name.es, kind: kinds[p.id] ?? 'other', value: r.value,
      unit: r.unit, observedAt: r.observedAt,
      ageDays: r.observedAt ? (now.getTime() - Date.parse(r.observedAt)) / 86400000 : null,
      current: r.status === 'available' && !r.cached, status: r.cached ? 'cached' : r.status,
      source: r.source ?? p.source, sourceUrl: r.sourceUrl, resolutionNote: p.resolution,
      usedFor: 'Contexto; no modifica el puntaje por sí solo.', caveat: p.description.es,
      samples: r.samples
    };
    s.current = validObservation(s, now);
    return [s];
  });
}

/** Separate observed diagnostics: never add IMERG to POWER or alter rotation weights. */
export function observationIndicators(evidence: SatelliteEvidence[], now: Date): NonNullable<EngineResult['observationIndicators']> {
  const result: NonNullable<EngineResult['observationIndicators']> = [];
  for (const s of evidence.filter(s => validObservation(s, now))) {
    if (s.productId === 'estatus_hidrico') result.push({ id: 'antecedent_rainfall', productId: s.productId,
      label: 'Condición de precipitación antecedente (IMERG / CONAE)', value: s.value!, unit: s.unit,
      detail: 'Percentil API publicado: valores bajos indican menor precipitación antecedente relativa. Orienta la revisión del riesgo hídrico; no mide humedad ni se suma a POWER, ni altera S(r).' });
    const days = new Map<string, { value: number; observedAt: string; sourceUrl: string }>();
    for (const sample of s.samples ?? []) {
      const age = (now.getTime() - Date.parse(sample.observedAt)) / 86400000;
      const valid = Number.isFinite(age) && age >= 0 && age <= (s.productId === 'sentinel2_ndvi' ? 90 : 7)
        && Number.isFinite(sample.value) && (s.productId === 'sentinel2_ndvi' ? sample.value >= -1 && sample.value <= 1 : sample.value >= 0 && sample.value <= 3000);
      if (valid) days.set(sample.observedAt.slice(0, 10), sample);
    }
    const samples = [...days.values()].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
    if (s.productId === 'lluvia_imerg' && samples.length >= 5 && samples.every((v, i) => !i || Date.parse(v.observedAt) - Date.parse(samples[i - 1].observedAt) === 86400000)) {
      const mean = samples.reduce((sum, v) => sum + v.value, 0) / samples.length;
      const sd = Math.sqrt(samples.reduce((sum, v) => sum + (v.value - mean) ** 2, 0) / samples.length);
      result.push({ id: 'rain_variability', productId: s.productId, samples, label: 'Variabilidad diaria reciente de precipitación', value: sd, unit: 'mm/día (desvío poblacional)',
        detail: `${samples.length} días consecutivos, ${samples[0].observedAt} a ${samples.at(-1)!.observedAt}; media ${mean.toFixed(2)} mm/día. Diagnóstico de pulsos, no climatología ni probabilidad de inundación. No entra al balance POWER.` });
    }
    if (s.productId === 'sentinel2_ndvi' && samples.length >= 4 && Date.parse(samples.at(-1)!.observedAt) - Date.parse(samples[0].observedAt) >= 30 * 86400000) {
      result.push({ id: 'vegetation_change', productId: s.productId, samples, label: 'Cambio observado de vigor vegetal', value: samples.at(-1)!.value - samples[0].value, unit: 'Δ NDVI',
        detail: `${samples.length} fechas válidas del mismo punto, ${samples[0].observedAt} a ${samples.at(-1)!.observedAt}. Cambio entre extremos, no pronóstico. Cobertura porcentual y duración de suelo descubierto no estimadas: requieren calibración y distinguir rastrojo, agua y suelo. No reemplaza cobertura de catálogo de las rotaciones futuras.` });
    }
  }
  return result;
}
