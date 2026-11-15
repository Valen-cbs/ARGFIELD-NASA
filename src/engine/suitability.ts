/**
 * Aptitud climática del motor de rotaciones (enfoque tipo FAO EcoCrop).
 *
 * Se evalúa la compatibilidad entre la climatología histórica regional (NASA
 * POWER agregada) y los requerimientos de cada cultivo con funciones
 * matemáticas explícitas:
 *
 *  - Temperatura: función trapezoidal por mes del ciclo. 1 dentro del rango
 *    óptimo [optMin, optMax]; descenso lineal entre óptimo y absoluto
 *    (absMin/optMin y optMax/absMax); 0 fuera del rango absoluto. Los umbrales
 *    provienen de la base agronómica (referencias EcoCrop) y son orientativos:
 *    NO son límites biológicos exactos.
 *  - Heladas: si un mes del ciclo tiene días con Tmin < 0 °C y el cultivo es
 *    sensible a helada, se aplica un factor 0.7 a la puntuación de ese mes
 *    (decisión del modelo, documentada).
 *  - Precipitación de la ventana: la aptitud hídrica se calcula con el balance
 *    hídrico (src/engine/soil.ts), no con umbrales fijos de lluvia.
 */

import { CropAgronomy } from './agronomy';
import { MonthlyClimateCell } from './climate';
import { meanOf, round3 } from './statistics';

export const FROST_PENALTY = 0.7;

/** Puntuación trapezoidal de un mes según temperatura media (°C). */
export function monthlyTemperatureScore(tMeanC: number, crop: CropAgronomy): number {
  const { absMin, optMin, optMax, absMax } = crop.temperature;
  if (tMeanC >= optMin && tMeanC <= optMax) return 1;
  if (tMeanC < optMin) {
    if (tMeanC < absMin) return 0;
    return (tMeanC - absMin) / (optMin - absMin);
  }
  // tMeanC > optMax
  if (tMeanC > absMax) return 0;
  return (absMax - tMeanC) / (absMax - optMax);
}

export interface TemperatureSuitabilityResult {
  score: number | null;
  months: Array<{ month: number; tMeanC: number; score: number; frostAdjustment: boolean }>;
  detail: string;
  unavailableReason?: string;
}

/**
 * Aptitud térmica del ciclo: media de la puntuación trapezoidal de cada mes del
 * ciclo del cultivo, con ajuste por heladas para cultivos sensibles.
 * `tDeltaC` permite evaluar escenarios hipotéticos (+ΔT).
 */
export function temperatureSuitability(crop: CropAgronomy, monthly: MonthlyClimateCell[], cycleMonths: number[], tDeltaC = 0): TemperatureSuitabilityResult {
  const cells = cycleMonths.map(m => monthly[m - 1]);
  const missing = cells.filter(c => !c || c.tMeanC === null || c.tMinC === null).length;
  if (missing > 0) {
    return {
      score: null,
      months: [],
      detail: `No se pudo evaluar la aptitud térmica: faltan datos de temperatura para ${missing} mes(es) del ciclo.`,
      unavailableReason: 'temperatura_mensual_faltante'
    };
  }
  const months = cells.map((cell, index) => {
    const tMean = (cell!.tMeanC as number) + tDeltaC;
    let score = monthlyTemperatureScore(tMean, crop);
    const frostAdjustment = crop.frostSensitive && (cell!.frostDays ?? 0) > 0 && tMean < crop.temperature.optMin;
    if (frostAdjustment) score *= FROST_PENALTY;
    return { month: cycleMonths[index], tMeanC: Math.round(tMean * 10) / 10, score: round3(score) ?? 0, frostAdjustment };
  });
  const score = round3(meanOf(months.map(m => m.score)));
  const minScore = Math.min(...months.map(m => m.score));
  const detail = `Aptitud térmica del ciclo (${crop.nameEs}): media ${score} entre ${months.length} meses; mínimo mensual ${minScore}` +
    (tDeltaC ? ` bajo escenario +${tDeltaC} °C.` : '.');
  return { score, months, detail };
}

/**
 * Verificación de ventana de siembra: 'ok' si existe ventana documentada para la
 * región y el mes nominal cae dentro; 'unknown' si no hay documento regional
 * (se advierte, no se excluye); 'outside' si hay documento y no coincide.
 */
export function sowingWindowStatus(
  crop: CropAgronomy,
  region: string | undefined,
  sowMonth: number | null
): { status: 'ok' | 'unknown' | 'outside'; detail: string } {
  if (sowMonth === null) return { status: 'outside', detail: 'Sin mes de siembra determinable: el cultivo no tiene ventana documentada para esta región.' };
  const windows = (crop.sowingWindows as Record<string, Array<{ startMonth: number; endMonth: number }>> | undefined);
  const regionWindows = region && windows?.[region] ? windows[region] : undefined;
  if (!regionWindows?.length) {
    return { status: 'unknown', detail: `Ventana de siembra no documentada para la región "${region ?? 'sin región'}"; se evalúa con la aptitud térmica y se advierte.` };
  }
  const inside = regionWindows.some(w => inWindow(sowMonth, w));
  return inside
    ? { status: 'ok', detail: `Mes de siembra ${sowMonth} dentro de la ventana documentada (${regionWindows.map(w => `${w.startMonth}-${w.endMonth}`).join(' / ')}).` }
    : { status: 'outside', detail: `Mes de siembra ${sowMonth} fuera de las ventanas documentadas para la región (${regionWindows.map(w => `${w.startMonth}-${w.endMonth}`).join(' / ')}).` };
}

function inWindow(month: number, w: { startMonth: number; endMonth: number }): boolean {
  if (w.startMonth <= w.endMonth) return month >= w.startMonth && month <= w.endMonth;
  return month >= w.startMonth || month <= w.endMonth; // ventana que cruza diciembre
}

/** Precipitación acumulada de los meses indicados (mm); null si falta algún mes del ciclo. */
export function seasonPrecipMm(monthly: MonthlyClimateCell[], months: number[]): number | null {
  let total = 0;
  for (const m of months) {
    const cell = monthly[m - 1];
    if (!cell || cell.precipMm === null) return null;
    total += cell.precipMm;
  }
  return total;
}
