/**
 * Escenarios climáticos hipotéticos del motor de rotaciones.
 *
 * IMPORTANTE: los escenarios NO son pronósticos de NASA ni de nadie. Son
 * desplazamientos configurables sobre la climatología histórica (hipótesis
 * explícitas del modelo) que se aplican A LAS ENTRADAS (precipitación,
 * temperatura), luego se recalculan ETo (FAO-56) y todos los indicadores
 * afectados (balance hídrico, aptitud térmica). Nunca se aplican porcentajes
 * arbitrarios a la puntuación final.
 */

import { ClimateDataset, MonthlyClimateCell, etoMonthlySeries } from './climate';

export interface ClimateScenario {
  id: 'referencia' | 'precip_menor' | 'temp_mayor' | 'estres_combinado';
  label: string;
  description: string;
  /** Factor multiplicativo sobre la precipitación mensual histórica (hipotético). */
  precipitationFactor: number;
  /** Desplazamiento de temperatura sobre medias mensuales (°C, hipotético). */
  temperatureDeltaC: number;
  hypothetical: true;
}

export const CLIMATE_SCENARIOS: ClimateScenario[] = [
  { id: 'referencia', label: 'Referencia histórica', description: 'Climatología 2016-2025 de NASA POWER sin ajustes.', precipitationFactor: 1, temperatureDeltaC: 0, hypothetical: true },
  { id: 'precip_menor', label: 'Menor precipitación (−30%)', description: 'Hipótesis de precipitaciones un 30% inferiores al promedio histórico; ETo se recalcula (la humedad relativa se mantiene constante: decisión documentada).', precipitationFactor: 0.7, temperatureDeltaC: 0, hypothetical: true },
  { id: 'temp_mayor', label: 'Mayor temperatura (+2 °C)', description: 'Hipótesis de temperaturas medias +2 °C; ETo se recalcula con la misma HR, radiación y viento.', precipitationFactor: 1, temperatureDeltaC: 2, hypothetical: true },
  { id: 'estres_combinado', label: 'Estrés combinado (−30% / +2 °C)', description: 'Hipótesis combinada de menos precipitación y más temperatura; recalcula ETo y el balance completo.', precipitationFactor: 0.7, temperatureDeltaC: 2, hypothetical: true }
];

/** Aplica un escenario a la climatología mensual (sin mutar el dataset original). */
export function adjustedMonthlyCells(monthly: MonthlyClimateCell[], scenario: ClimateScenario): MonthlyClimateCell[] {
  if (scenario.precipitationFactor === 1 && scenario.temperatureDeltaC === 0) return monthly;
  return monthly.map(cell => ({
    ...cell,
    tMeanC: cell.tMeanC === null ? null : cell.tMeanC + scenario.temperatureDeltaC,
    tMaxC: cell.tMaxC === null ? null : cell.tMaxC + scenario.temperatureDeltaC,
    tMinC: cell.tMinC === null ? null : cell.tMinC + scenario.temperatureDeltaC,
    precipMm: cell.precipMm === null ? null : cell.precipMm * scenario.precipitationFactor
  }));
}

/** Serie de ETo mensual para un dataset bajo un escenario (recalculada con FAO-56). */
export function etoSeriesFor(dataset: ClimateDataset, scenario: ClimateScenario): Array<number | null> {
  if (scenario.precipitationFactor === 1 && scenario.temperatureDeltaC === 0) return etoMonthlySeries(dataset);
  const adjusted: ClimateDataset = {
    ...dataset,
    monthly: adjustedMonthlyCells(dataset.monthly, scenario),
    // La altitud y latitud no cambian con el escenario.
    elevationM: dataset.elevationM,
    lat: dataset.lat
  };
  return etoMonthlySeries(adjusted);
}
