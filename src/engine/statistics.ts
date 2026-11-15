/**
 * Estadística pura del motor de rotaciones de ArgField.
 *
 * Todas las funciones son deterministas, sin acceso a red ni a la fecha actual,
 * y trabajan con unidades explícitas (ha, tn, kg/ha, mm, °C).
 * Los fixtures sintéticos que las prueban están etiquetados como tales en tests/.
 */

export interface YieldRow {
  /** Superficie sembrada (ha). */
  sownHa: number;
  /** Superficie cosechada (ha). Los registros con valor nulo o no positivo se excluyen del rendimiento. */
  harvestedHa: number;
  /** Producción (tn). */
  productionTn: number;
}

/** Ȳ = Σ_t P_t / Σ_t A_t (expresado en kg/ha: producción tn × 1000). */
export function weightedYieldKgHa(rows: YieldRow[]): number | null {
  const valid = rows.filter(r => Number.isFinite(r.harvestedHa) && r.harvestedHa > 0 && Number.isFinite(r.productionTn) && r.productionTn >= 0);
  if (!valid.length) return null;
  const prodKg = valid.reduce((s, r) => s + r.productionTn * 1000, 0);
  const area = valid.reduce((s, r) => s + r.harvestedHa, 0);
  if (area <= 0) return null;
  return prodKg / area;
}

/** Desvío estándar muestral de una lista de valores finitos. */
export function sampleSd(values: number[]): number | null {
  const v = values.filter(Number.isFinite);
  if (v.length < 2) return null;
  const mu = v.reduce((s, x) => s + x, 0) / v.length;
  const variance = v.reduce((s, x) => s + (x - mu) ** 2, 0) / (v.length - 1);
  return Math.sqrt(variance);
}

export function meanOf(values: Array<number | null>): number | null {
  const v = values.filter((x): x is number => x !== null && Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((s, x) => s + x, 0) / v.length;
}

/** CV muestral = σ(Y_t) / μ(Y_t). No es una probabilidad de fracaso. */
export function cvOf(values: number[]): number | null {
  const v = values.filter(Number.isFinite);
  if (v.length < 2) return null;
  const mu = v.reduce((s, x) => s + x, 0) / v.length;
  if (mu === 0) return null;
  const sd = sampleSd(v);
  return sd === null ? null : sd / mu;
}

/** Promedio diario acumulado a total mensual: mm/día × días del mes, con control de cobertura (≥80% de días válidos). */
export function monthlyTotalMm(dailyMm: Array<number | null>, daysInMonth: number): number | null {
  const valid = dailyMm.filter((x): x is number => x !== null && Number.isFinite(x) && x >= 0);
  if (dailyMm.length === 0 || valid.length < Math.ceil(dailyMm.length * 0.8)) return null;
  return (valid.reduce((s, x) => s + x, 0) / valid.length) * daysInMonth;
}

/** Días de un mes con Tmax ≥ umbral (p. ej. 35 °C). */
export function extremeDayCount(dailyMax: Array<number | null>, thresholdC: number): number | null {
  const valid = dailyMax.filter((x): x is number => x !== null && Number.isFinite(x));
  if (valid.length < 10) return null;
  return valid.filter(v => v >= thresholdC).length;
}

/** Anomalía relativa (actual − referencia) / referencia; null si la referencia no es utilizable. */
export function relativeAnomaly(current: number, reference: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(reference) || Math.abs(reference) < 1e-9) return null;
  return (current - reference) / reference;
}

/** Pendiente OLS de una serie (x creciente); describe tendencias, no las proyecta. */
export function olsSlope(points: Array<{ x: number; y: number }>): number | null {
  const pts = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (pts.length < 3) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0, sxx = 0;
  for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; }
  if (sxx === 0) return null;
  return sxy / sxx;
}

/** Normaliza nombres (sin acentos, mayúsculas, sin signos) para cruzar MAGyP ↔ OpenStreetMap ↔ registro. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Rótulo de campaña por año de siembra (2026 → 2026/27). */
export function seasonLabel(sowYear: number): string {
  return `${sowYear}/${String(sowYear + 1).slice(2)}`;
}

/**
 * Rótulo oficial de campaña a partir del ID MAGyP. La numeración del dataset
 * NO es estrictamente anual (54=2022/23 y 57=2023/24; 55-56 no existen), por lo
 * que debe pasarse el mapa oficial `labelsById` (meta de los JSON preprocesados).
 * El fallback aritmético (+1968) es solo aproximado y se documentó así.
 */
export function campaignLabel(campaignId: number, labelsById?: Record<string, string>): string {
  const official = labelsById?.[String(campaignId)];
  if (official) return official;
  const sowYear = campaignId + 1968;
  return `${sowYear}/${String(sowYear + 1).slice(2)}`;
}

/** Redondeo reproducible para presentaciones y comparaciones. */
export function round3(x: number | null): number | null {
  return x === null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
}
