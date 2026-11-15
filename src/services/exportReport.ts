import type { Alert, CropRotationPlan, FarmProfile } from '../types';
import type { SatelliteReading } from '../types/satellite';
import type { RotationEngineState } from './rotationEngineAdapter';
import { ENGINE_VERSION } from '../engine/engineTypes';

export function buildExportReport(farmProfile: FarmProfile, alerts: Alert[], readings: SatelliteReading[], plans: CropRotationPlan[], engineState?: RotationEngineState, now = new Date()) {
  return {
    exportTimestamp: now.toISOString(), platform: 'Argfield (NASA Space Apps)',
    dataNotice: 'Satellite observations retain provider, dates and quality. Open-Meteo supplies weather forecasts. Rotation scores are model indicators, not validated yield, water savings or carbon predictions.',
    rotationStrategiesMode: engineState?.engine ? 'model' : 'qualitative',
    engineVersion: ENGINE_VERSION, engineStatus: engineState?.status ?? 'fallback',
    engineError: engineState?.error ?? null,
    // Preserve null scores, baseline, exclusions, weights and exact observation provenance.
    rotationEvaluation: engineState?.engine ?? null,
    satelliteReadings: readings, farmProfile, activeAlertsCount: alerts.length, alerts, rotationStrategies: plans
  };
}
