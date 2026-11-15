/**
 * Series agroclimáticas NASA POWER para el motor de rotaciones de ArgField.
 *
 * Fuente oficial: https://power.larc.nasa.gov/ (documentación de la API diaria:
 * https://power.larc.nasa.gov/docs/services/api/temporal/daily/).
 *
 * Decisiones documentadas:
 *  - Se usa el endpoint DIARIO y se agrega en el cliente. El endpoint
 *    "climatology" devuelve para T2M_MAX/T2M_MIN el EXTREMO mensual del período
 *    (verificado: enero en Chaco, 42.9 °C frente a 34.6 °C de media de máximos),
 *    por lo que no sirve para FAO-56. Aquí se calcula la media de los máximos
 *    diarios de cada mes, que sí corresponde a la ecuación.
 *  - Parámetros: T2M, T2M_MAX, T2M_MIN (°C), PRECTOTCORR (mm/día),
 *    ALLSKY_SFC_SW_DWN (MJ/m²/día), RH2M (%), WS2M (m/s a 2 m).
 *  - Valores de relleno (-999) se tratan como faltantes, nunca como cero.
 *  - La climatología histórica NO es un pronóstico meteorológico.
 */

import { meanOf, cvOf, monthlyTotalMm, extremeDayCount, round3 } from './statistics';

export const POWER_PARAMETERS = ['T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'ALLSKY_SFC_SW_DWN', 'RH2M', 'WS2M'] as const;
export type PowerParameter = (typeof POWER_PARAMETERS)[number];

export interface PowerDailyResponse {
  geometry: { type: string; coordinates: [number, number, number] };
  header: { title: string; api: { name: string; version: string }; sources: string[]; fill_value: number; time_standard: string; start?: string; end?: string };
  properties: { parameter: Record<string, Record<string, number>> };
  messages?: string[];
}

export interface MonthlyClimateCell {
  /** 1 = enero … 12 = diciembre. */
  month: number;
  /** Media mensual de la temperatura media diaria (°C). */
  tMeanC: number | null;
  /** Media mensual de los máximos diarios (°C) — no es el extremo. */
  tMaxC: number | null;
  /** Media mensual de los mínimos diarios (°C). */
  tMinC: number | null;
  /** Precipitación acumulada media del mes (mm). */
  precipMm: number | null;
  /** CV interanual de la precipitación del mes (2016-2025). */
  precipCv: number | null;
  /** Radiación solar media (MJ/m²/día). */
  radiationMj: number | null;
  /** Humedad relativa media (%) . */
  rhPct: number | null;
  /** Viento medio a 2 m (m/s). */
  windMs: number | null;
  /** Días/mes con Tmax ≥ 35 °C, promedio del período. */
  extremeHeatDays35: number | null;
  /** Días/mes con Tmin < 0 °C, promedio del período. */
  frostDays: number | null;
  /** Días de lluvia/mes (P ≥ 1 mm), promedio del período; base para discretizar escorrentía. */
  rainDaysMean: number | null;
  /** Campañas (años) con datos de precipitación válidos para este mes. */
  precipYears: number;
}

export interface ClimateDataset {
  lat: number;
  lng: number;
  /** Altitud según POWER (m). */
  elevationM: number;
  years: { start: number; end: number };
  monthly: MonthlyClimateCell[]; // índice 0 = enero
  /** Precipitación anual media del período (mm). */
  annualPrecipMm: number | null;
  provenance: {
    url: string;
    apiName: string;
    apiVersion: string;
    sources: string[];
    fetchedAtIso: string;
    timeStandard: string;
    resolutionNote: string;
  };
}

export interface PowerFetchOptions {
  startYear: number;
  endYear: number;
  signal?: AbortSignal;
  /** Inyectable para pruebas (fixture etiquetado como sintético). */
  fetchImpl?: typeof fetch;
  /** Prefijo de proxy opcional (en la app se usa /proxy/power). */
  baseUrl?: string;
}

export const DEFAULT_POWER_START_YEAR = 2016;
export const DEFAULT_POWER_END_YEAR = 2025;

export function buildPowerDailyUrl(lat: number, lng: number, startYear: number, endYear: number, baseUrl = 'https://power.larc.nasa.gov'): string {
  const params = new URLSearchParams({
    parameters: POWER_PARAMETERS.join(','),
    community: 'AG',
    latitude: String(lat),
    longitude: String(lng),
    start: `${startYear}0101`,
    end: `${endYear}1231`,
    format: 'JSON'
  });
  return `${baseUrl}/api/temporal/daily/point?${params.toString()}`;
}

function fillToNull(value: number | undefined, fillValue: number): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) return null;
  if (value === fillValue || value <= -1e30) return null;
  return value;
}

export function parsePowerDaily(json: unknown, requestedYears: { start: number; end: number }): PowerDailyResponse {
  const data = json as PowerDailyResponse;
  if (!data || typeof data !== 'object') throw new Error('POWER no devolvió un objeto JSON.');
  if (!data.properties?.parameter) throw new Error('POWER devolvió una respuesta sin parámetros.');
  for (const p of POWER_PARAMETERS) {
    if (!data.properties.parameter[p]) throw new Error(`POWER no incluyó el parámetro ${p}.`);
  }
  const geo = data.geometry?.coordinates;
  if (!Array.isArray(geo) || geo.length < 2) throw new Error('POWER devolvió una geometría sin coordenadas.');
  return data;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Agrega una respuesta diaria de POWER (2016-2025 por defecto) en climatología mensual documentada. */
export function aggregatePowerDaily(response: PowerDailyResponse, years: { start: number; end: number }, fetchedAtIso: string, requestUrl: string): ClimateDataset {
  const fill = response.header?.fill_value ?? -999;
  const params = response.properties.parameter;
  const monthly: MonthlyClimateCell[] = [];
  for (let month = 1; month <= 12; month++) {
    const tMeans: Array<number | null> = [];
    const tMaxes: Array<number | null> = [];
    const tMins: Array<number | null> = [];
    const precipTotals: Array<number | null> = [];
    const radiation: Array<number | null> = [];
    const rh: Array<number | null> = [];
    const wind: Array<number | null> = [];
    const heatDays: number[] = [];
    const frostDays: number[] = [];
    const rainDays: number[] = [];
    for (let year = years.start; year <= years.end; year++) {
      const dayKeys = Object.keys(params.T2M).filter(k => {
        const y = Number(k.slice(0, 4)), m = Number(k.slice(4, 6));
        return y === year && m === month;
      });
      if (!dayKeys.length) continue;
      const col = <T,>(param: string, picker: (v: number | null) => T | null): Array<T | null> =>
        dayKeys.map(k => picker(fillToNull(params[param][k], fill)));
      tMeans.push(meanOf(col('T2M', v => v)));
      tMaxes.push(meanOf(col('T2M_MAX', v => v)));
      tMins.push(meanOf(col('T2M_MIN', v => v)));
      precipTotals.push(monthlyTotalMm(col('PRECTOTCORR', v => v), month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1]));
      radiation.push(meanOf(col('ALLSKY_SFC_SW_DWN', v => v)));
      rh.push(meanOf(col('RH2M', v => v)));
      wind.push(meanOf(col('WS2M', v => v)));
      const heat = extremeDayCount(col('T2M_MAX', v => v), 35);
      if (heat !== null) heatDays.push(heat);
      const frost = frostDayCount(col('T2M_MIN', v => v));
      if (frost !== null) frostDays.push(frost);
      const rainDayCount = col('PRECTOTCORR', v => v).filter(v => v !== null && v >= 1).length;
      rainDays.push(rainDayCount);
    }
    const validPrecipYears = precipTotals.filter((v): v is number => v !== null).length;
    monthly.push({
      month,
      tMeanC: meanOf(tMeans),
      tMaxC: meanOf(tMaxes),
      tMinC: meanOf(tMins),
      precipMm: meanOf(precipTotals),
      precipCv: validPrecipYears >= 5 ? cvOf(precipTotals.filter((v): v is number => v !== null)) : null,
      radiationMj: meanOf(radiation),
      rhPct: meanOf(rh),
      windMs: meanOf(wind),
      extremeHeatDays35: heatDays.length ? heatDays.reduce((s, x) => s + x, 0) / heatDays.length : null,
      frostDays: frostDays.length ? frostDays.reduce((s, x) => s + x, 0) / frostDays.length : null,
      rainDaysMean: rainDays.length ? rainDays.reduce((s, x) => s + x, 0) / rainDays.length : null,
      precipYears: validPrecipYears
    });
  }
  const annual = meanOf(monthly.map(m => m.precipMm));
  return {
    lat: response.geometry.coordinates[1],
    lng: response.geometry.coordinates[0],
    elevationM: Number.isFinite(response.geometry.coordinates[2]) ? response.geometry.coordinates[2] : 0,
    years,
    monthly,
    annualPrecipMm: annual === null ? null : annual * 12,
    provenance: {
      url: requestUrl,
      apiName: response.header?.api?.name ?? 'POWER Daily API',
      apiVersion: response.header?.api?.version ?? '',
      sources: response.header?.sources ?? [],
      fetchedAtIso,
      timeStandard: response.header?.time_standard ?? 'LST',
      resolutionNote: 'Celda ~0.4° × 0.5° de MERRA-2; representa el entorno regional, no el microclima del lote.'
    }
  };
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Días con Tmin < 0 °C en el mes (heladas meteorológicas). */
function frostDayCount(dailyMin: Array<number | null>): number | null {
  const valid = dailyMin.filter((x): x is number => x !== null && Number.isFinite(x));
  if (valid.length < 10) return null;
  return valid.filter(v => v < 0).length;
}

export async function fetchPowerDaily(lat: number, lng: number, options: PowerFetchOptions): Promise<ClimateDataset> {
  const { startYear, endYear } = options;
  const url = buildPowerDailyUrl(lat, lng, startYear, endYear, options.baseUrl ?? (typeof window !== 'undefined' ? '/proxy/power' : 'https://power.larc.nasa.gov'));
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await doFetch(url, { signal: options.signal ? mergeSignals(options.signal, controller.signal) : controller.signal });
    if (!response.ok) throw new Error(`POWER HTTP ${response.status}`);
    const json = await response.json();
    return aggregatePowerDaily(parsePowerDaily(json, { start: startYear, end: endYear }), { start: startYear, end: endYear }, new Date().toISOString(), url);
  } finally {
    clearTimeout(timeout);
  }
}

function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([a, b]);
  const controller = new AbortController();
  a.addEventListener('abort', () => controller.abort(a.reason));
  b.addEventListener('abort', () => controller.abort(b.reason));
  return controller.signal;
}

/* ------------------------- FAO-56 Penman-Monteith ------------------------- */

const SIGMA = 4.903e-9; // constante de Stefan-Boltzmann (MJ K-4 m-2 día-1)

export const FAO56_SOURCE = 'FAO Irrigation and Drainage Paper 56 (Allen et al., 1998), cap. 4 — ETo Penman-Monteith mensual con medias mensuales (ecuaciones 6, 11-14, 21-36)';

function esKpa(tC: number): number {
  return 0.6108 * Math.exp(17.27 * tC / (tC + 237.3));
}

/**
 * ETo mensual (mm/mes) por FAO-56 con medias mensuales.
 * Requiere temperatura media/máxima/mínima, HR media, viento y radiación.
 * Si falta un insumo devuelve null (no se fabrica un valor aproximado).
 */
export function fao56EtoMonthlyMm(cell: MonthlyClimateCell, latitudeDeg: number, elevationM: number): number | null {
  const { tMeanC, tMaxC, tMinC, radiationMj, rhPct, windMs, month } = cell;
  if (tMeanC === null || tMaxC === null || tMinC === null || radiationMj === null || rhPct === null || windMs === null) return null;
  const days = month === 2 ? 28 : DAYS_IN_MONTH[month - 1]; // climatología, febrero = 28
  // Presión y psicrométrica (FAO-56 eq. 7-8)
  const atmPressure = 101.3 * ((293 - 0.0065 * elevationM) / 293) ** 5.26;
  const gamma = 0.665e-3 * atmPressure;
  // Pendiente de la curva de saturación en Tmedia (eq. 13)
  const delta = 4098 * esKpa(tMeanC) / (tMeanC + 237.3) ** 2;
  const es = (esKpa(tMaxC) + esKpa(tMinC)) / 2; // eq. 12 con Tmax/Tmin medias
  const ea = Math.max(0, (rhPct / 100) * es); // eq. 14 (aproximación con HRmedia), documentada
  // Radiación extraterrestre (eq. 21-25) y cielo despejado (eq. 37)
  const phi = (latitudeDeg * Math.PI) / 180;
  const J = MID_MONTH_JULIAN[month - 1];
  const dr = 1 + 0.033 * Math.cos(2 * Math.PI * J / 365);
  const solarDecl = 0.409 * Math.sin(2 * Math.PI * J / 365 - 1.39);
  const sunset = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(solarDecl))));
  const ra = (24 * 60 / Math.PI) * 0.0820 * dr * (sunset * Math.sin(phi) * Math.sin(solarDecl) + Math.cos(phi) * Math.cos(solarDecl) * Math.sin(sunset));
  const rso = (0.75 + 2e-5 * elevationM) * ra;
  const rns = 0.77 * radiationMj;
  const cloudRatio = Math.min(1, radiationMj / rso);
  const rnl = SIGMA * (((tMaxC + 273.16) ** 4 + (tMinC + 273.16) ** 4) / 2) * (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * cloudRatio - 0.35);
  const rn = rns - rnl;
  const etoDaily = (0.408 * delta * rn + gamma * (900 / (tMeanC + 273)) * windMs * (es - ea)) / (delta + gamma * (1 + 0.34 * windMs));
  if (!Number.isFinite(etoDaily) || etoDaily < 0 || etoDaily > 15) return null;
  return etoDaily * days;
}

const MID_MONTH_JULIAN = [17, 47, 75, 105, 135, 166, 196, 227, 258, 288, 319, 349];

/** Serie mensual de ETo (mm/mes) para un dataset; null cuando faltan insumos. */
export function etoMonthlySeries(dataset: ClimateDataset): Array<number | null> {
  return dataset.monthly.map(cell => fao56EtoMonthlyMm(cell, dataset.lat, dataset.elevationM));
}

export function roundClimate(dataset: ClimateDataset): ClimateDataset {
  return {
    ...dataset,
    monthly: dataset.monthly.map(m => ({
      ...m,
      tMeanC: round3(m.tMeanC), tMaxC: round3(m.tMaxC), tMinC: round3(m.tMinC),
      precipMm: round3(m.precipMm), precipCv: round3(m.precipCv),
      radiationMj: round3(m.radiationMj), rhPct: round3(m.rhPct), windMs: round3(m.windMs),
      extremeHeatDays35: round3(m.extremeHeatDays35), frostDays: round3(m.frostDays), rainDaysMean: round3(m.rainDaysMean)
    }))
  };
}
