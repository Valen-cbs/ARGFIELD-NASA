/**
 * Adaptador del motor de rotaciones hacia la aplicación ArgField.
 *
 * Responsibilities:
 *  - Convierte el perfil de la estancia (FarmProfile) + lecturas satelitales ya
 *    validadas por los servicios existentes en entradas del motor.
 *  - Resuelve el departamento/partido desde coordenadas con OpenStreetMap
 *    (Nominatim, geocodificación inversa) para anclar las estadísticas MAGyP;
 *    con caché por punto y degradación elegante (sin departamento → escala provincial).
 *  - Mapea el resultado del motor a CropRotationPlan/CropRotationStep para el
 *    componente RotationStrategies existente SIN cambiar su apariencia visual.
 *  - Si el motor no puede ejecutarse (red, datos), devuelve 'fallback' para que
 *    la app use el generador cualitativo previo; el registro de estancias y la
 *    navegación no se ven afectados.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CropRotationPlan, CropRotationStep, FarmProfile, MainCrop } from '../types';
import { SatelliteReading } from '../types/satellite';
import { EngineResult, RotationEngineInput, SatelliteEvidence } from '../engine/engineTypes';
import { evaluateRotations, mapCropToCropId, satelliteEvidenceFromReadings } from '../engine/engine';
import { ENGINE_VERSION } from '../engine/engineTypes';
import { CROP_AGRONOMY, CropId } from '../engine/agronomy';

const MAIN_CROP_LABEL: Record<MainCrop, string> = {
  soybean: 'soja',
  maize: 'maiz',
  wheat: 'trigo',
  sunflower: 'girasol',
  sorghum: 'sorgo',
  pasture: 'pastura',
  barley: 'cebada'
};

export interface OsmAdminInfo {
  department: string | null;
  province: string | null;
  source: 'nominatim' | 'registro';
}

const osmCache = new Map<string, OsmAdminInfo>();

/** Geocodificación inversa OpenStreetMap (Nominatim). Cacheada; falla en null. */
export async function reverseGeocodeAdmin(lat: number, lng: number, fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<OsmAdminInfo | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = osmCache.get(key);
  if (cached) return cached;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=10&accept-language=es`;
    const response = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as { address?: Record<string, string> };
    const address = data.address ?? {};
    const info: OsmAdminInfo = {
      department: address.county ?? address.district ?? null,
      province: address.state ?? null,
      source: 'nominatim'
    };
    osmCache.set(key, info);
    return info;
  } catch {
    return null; // sin departamento: el motor usa escala provincial y lo documenta
  }
}

export type RotationEngineStatus = 'loading' | 'ready' | 'fallback' | 'perennial';

export interface RotationEngineState {
  status: RotationEngineStatus;
  plans: CropRotationPlan[];
  engine: EngineResult | null;
  error: string | null;
  generatedAtIso: string | null;
}

const EMPTY: RotationEngineState = { status: 'loading', plans: [], engine: null, error: null, generatedAtIso: null };

export function buildEngineInput(farm: FarmProfile, readings: SatelliteEvidence[], department: string | null, nowIso: string): RotationEngineInput {
  const currentCropIds = farm.cropAllocations?.length
    ? farm.cropAllocations.map(a => a.crop)
    : [MAIN_CROP_LABEL[farm.currentCrop] ?? farm.currentCrop];
  return {
    lat: farm.location.lat,
    lng: farm.location.lng,
    province: farm.location.province,
    ...(department ? { department } : {}),
    region: farm.location.region,
    hectares: farm.fieldSizeHectares,
    currentCropIds,
    currentRotation: farm.currentRotation,
    maxMonthlyIrrigationMm: farm.maxMonthlyIrrigationMm,
    previousCropId: farm.previousCrop ?? farm.previousCrops?.at(-1),
    irrigationAvailable: farm.irrigationAvailable ?? farm.irrigation !== 'dryland',
    soil: { type: farm.soilType },
    priorities: { priority: farm.priority, label: farm.priority },
    satellite: readings,
    nowIso
  };
}

function purposeFor(cropId: CropId, isSecondary: boolean): CropRotationStep['purpose'] {
  const crop = CROP_AGRONOMY[cropId];
  if (isSecondary) return 'cash_crop';
  if (crop.nitrogenFixationKgHa > 0) return 'nitrogen_fixer';
  if (crop.coverMonths >= 6) return 'moisture_preserver';
  if (crop.rootDepthM >= 1.8) return 'deep_break';
  return 'cash_crop';
}

function waterDemandFor(supplyDemandRatio: number | null, droughtResistance: 'low' | 'medium' | 'high'): CropRotationStep['waterDemand'] {
  if (supplyDemandRatio === null) return droughtResistance === 'high' ? 'low' : 'moderate';
  if (supplyDemandRatio >= 1) return 'low';
  if (supplyDemandRatio >= 0.75) return 'moderate';
  return 'high';
}

function planFromAlternative(result: EngineResult, index: number): CropRotationPlan {
  const alternative = result.alternatives[index];
  const criteriaText = alternative.criteria
    .map(c => `${c.label}: ${c.value === null ? 's/d' : String(c.value)}/1 (peso ${String(c.weight)})${c.unavailableReason ? ' — ' + c.unavailableReason : ''}`)
    .join(' · ');
  const scenarioWarnings = alternative.warnings.length ? ` Advertencias: ${alternative.warnings.slice(0, 3).join(' ')} ${alternative.warnings.length > 3 ? '(+más en el desglose del motor)' : ''}` : '';
  const steps: CropRotationStep[] = alternative.sequence.map((entry, i) => {
    const cropId = entry.primary;
    const crop = CROP_AGRONOMY[cropId];
    const evidence = alternative.steps[i];
    return {
      season: entry.campaign,
      crop: entry.primaryLabel + (entry.secondaryLabel ? ' + ' + entry.secondaryLabel : ''),
      scientificName: crop.scientificName,
      purpose: purposeFor(cropId, false),
      waterDemand: waterDemandFor(evidence?.balance.ok ? evidence.balance.totals.supplyDemandRatio : null, crop.droughtResistance),
      rootDepthMeters: crop.rootDepthM,
      soilHealthBenefit: `${crop.agronomicNotes[0]} Aporte orientativo de residuos: ${crop.residueTnHa} tn MS/ha.`,
      adaptationRationale: evidence
        ? `Campaña ${entry.campaign}: siembra mes ${entry.sowMonth} (${evidence.windowDetail}) ETo ${evidence.etoMm !== null ? Math.round(evidence.etoMm) + ' mm/mes' : 's/d'}; ${evidence.balance.ok && evidence.balance.totals.supplyDemandRatio !== null && evidence.balance.totals.stressIndex !== null ? `oferta/demanda ${(evidence.balance.totals.supplyDemandRatio * 100).toFixed(0)}%, estrés ${(evidence.balance.totals.stressIndex * 100).toFixed(0)}%` : 'balance no disponible'}. ${evidence.temperature.detail}`
        : `Campaña ${entry.campaign}: siembra mes ${entry.sowMonth}.`,
      expectedSoilMoistureConservation: evidence?.balance.ok && evidence.balance.totals.stressIndex !== null
        ? `Estrés hídrico ${(evidence.balance.totals.stressIndex * 100).toFixed(0)}% (1 − ΣETa/ΣETc) con agua útil ${evidence.tawMm} mm`
        : 'No estimado: insumos climáticos insuficientes.'
    };
  });
  return {
    id: alternative.id,
    title: `${index + 1}. ${alternative.label}`,
    theme: alternative.isBaseline ? 'Continuidad del manejo actual (línea de base)' : `Secuencia ${alternative.horizonCampaigns} campaña(s) priorizada por ${result.input.priorities.label}`,
    resilienceScore: alternative.score === null ? 0 : Math.round(alternative.score * 100),
    primaryGoal: `Comparar la secuencia contra la línea de base bajo el escenario "${alternative.scenarioLabel}" según las prioridades declaradas.`,
    waterSavingsPct: 0,
    soilCarbonPotential: 'No estimado: ArgField no aplica un modelo validado de carbono orgánico (requeriría mediciones del lote).',
    summary: `Puntaje S(r)=Σ wᵢ·fᵢ = ${alternative.score !== null ? String(alternative.score) : 's/d'} con completitud ${String(alternative.completeness)}. Desglose: ${criteriaText}.${scenarioWarnings}`,
    steps,
    nasaDataTrigger: result.provenance.climate
      ? `NASA POWER ${result.provenance.climate.years.start}-${result.provenance.climate.years.end} (MERRA-2, ~0.5°)${result.provenance.satellite.some(s => s.used) ? '; lecturas satelitales recientes usadas como evidencia de condición actual' : ''}.`
      : 'Sin serie NASA POWER disponible: solo criterios de manejo evaluados.'
  };
}

/** Hook principal de integración: ejecuta el motor con datos reales y adapta la salida.
 *  `enabled=false` (sin estancia activa) no consulta datos ni bloquea la app. */
export function useRotationEngine(farm: FarmProfile, readings: SatelliteReading[], enabled = true): RotationEngineState {
  const locationKey = `${farm.location.lat},${farm.location.lng}`;
  const rotationKey = JSON.stringify(farm.currentRotation ?? []);
  const cropAllocationsKey = JSON.stringify(farm.cropAllocations ?? []);
  const previousCropsKey = JSON.stringify(farm.previousCrops ?? []);
  const [state, setState] = useState<RotationEngineState>(EMPTY);
  const runId = useRef(0);
  useEffect(() => {
    if (!enabled) {
      runId.current += 1;
      setState(EMPTY);
      return;
    }
    const controller = new AbortController();
    const currentRun = ++runId.current;
    setState(EMPTY);
    const run = async () => {
      try {
        const nowIso = new Date().toISOString();
        const evidence = satelliteEvidenceFromReadings(readings.filter(r => !r.location || (r.location.lat === farm.location.lat && r.location.lng === farm.location.lng)), new Date(nowIso));
        const admin = await reverseGeocodeAdmin(farm.location.lat, farm.location.lng, fetch, controller.signal);
        if (controller.signal.aborted || currentRun !== runId.current) return;
        const input = buildEngineInput(farm, evidence, admin?.department ?? null, nowIso);
        const result = await evaluateRotations(input);
        if (controller.signal.aborted || currentRun !== runId.current) return;
        if (!result.alternatives.length && /perennes/i.test(result.warnings[0] ?? '')) {
          setState({ status: 'perennial', plans: [], engine: result, error: result.warnings[0], generatedAtIso: result.generatedAtIso });
          return;
        }
        if (!result.alternatives.length) {
          setState({ status: 'fallback', plans: [], engine: result, error: result.warnings[0] ?? 'Sin alternativas viables con los datos disponibles.', generatedAtIso: result.generatedAtIso });
          return;
        }
        setState({
          status: 'ready',
          plans: result.alternatives.map((_, index) => planFromAlternative(result, index)),
          engine: result,
          error: null,
          generatedAtIso: result.generatedAtIso
        });
      } catch (error) {
        if (controller.signal.aborted || currentRun !== runId.current) return;
        setState({ status: 'fallback', plans: [], engine: null, error: error instanceof Error ? error.message : 'Fallo del motor de rotaciones.', generatedAtIso: null });
      }
    };
    void run();
    return () => controller.abort();
  }, [rotationKey, farm.maxMonthlyIrrigationMm, locationKey, farm.location.province, farm.location.region, farm.fieldSizeHectares, cropAllocationsKey, previousCropsKey, enabled, farm.soilType, farm.irrigation, farm.priority, farm.irrigationAvailable, farm.currentCrop, farm.previousCrop, readings]);
  return state;
}

export const ROTATION_ENGINE_VERSION = ENGINE_VERSION;
