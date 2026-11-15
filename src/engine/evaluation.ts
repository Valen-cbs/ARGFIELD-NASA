/**
 * Evaluación multicriterio de rotaciones (etapa 5 del motor).
 *
 * Agregación documentada: S(r) = Σ_i w_i · f_i(r), con f_i ∈ [0,1].
 *  - Las restricciones EXCLUYENTES se aplican primero: una rotación agronómicamente
 *    incompatible no se compensa con buenos puntajes en otros criterios.
 *  - Las f_i de criterios con datos faltantes se marcan null (nunca 1 ni 0):
 *    la agregación renormaliza los pesos de los criterios disponibles y el
 *    resultado informa el nivel de completitud.
 *  - Los pesos son decisiones del modelo asociadas a la prioridad declarada por
 *    el productor (con posibilidad de ajuste); NO son constantes científicas.
 *
 * El CV de MAGyP describe la dispersión interanual REGIONAL; aquí se usa como
 * estabilidad relativa (1/(1+CV)) comparando series de igual escala, y JAMÁS
 * como probabilidad de fracaso ni como rendimiento esperado del lote.
 */

import { CropId, CROP_AGRONOMY, CropAgronomy } from './agronomy';
import { MonthlyClimateCell } from './climate';
import { SoilProfile, runCampaignWaterBalance, totalAvailableWaterMm, defaultInitialStorage, storageFromVolumetricPct, kcByMonthFor, WaterBalanceResult } from './soil';
import { SoilTexture } from './soil';
import { temperatureSuitability, sowingWindowStatus, TemperatureSuitabilityResult } from './suitability';
import { MagypSelection } from './magyp';
import { ClimateScenario } from './scenarios';
import { SequenceCandidate, RegionKeyLike } from './rotationGenerator';
import { meanOf, round3, seasonLabel } from './statistics';
import type { SatelliteEvidence } from './engineTypes';

export type CriterionId = 'clima_aptitud' | 'agua_compatibilidad' | 'suelo_compatibilidad' | 'cobertura_suelo' | 'diversificacion' | 'sucesion' | 'estabilidad_regional';

export interface CriterionResult {
  id: CriterionId;
  label: string;
  weight: number;
  value: number | null;
  unavailableReason?: string;
  detail: string;
}

export interface Exclusion {
  stepIndex: number | null; // campaña afectada (0-based) o null si es global
  crop: string | null;
  rule: string;
  reason: string;
}

export interface StepEvidence {
  stepIndex: number;
  campaign: string;
  primary: CropId;
  secondary?: 'soja2';
  sowMonth: number;
  windowKnown: boolean;
  windowStatus: 'ok' | 'unknown' | 'outside';
  windowDetail: string;
  etoMm: number | null;
  balance: WaterBalanceResult;
  initialStorageSource: string;
  initialStorageProductId?: string;
  initialStorageObservedAt?: string | null;
  tawMm: number;
  temperature: TemperatureSuitabilityResult;
  soilScore: number | null;
  soilDetail: string;
  successionPenalty: number;
  successionDetail: string;
  coverMonths: number;
  regionalStats: { scale: string; campaigns: number; weightedYieldKgHa: number | null; cv: number | null } | null;
  regionalNote: string;
}

export interface CandidateEvaluation {
  candidate: SequenceCandidate;
  score: number | null;
  completeness: number;
  criteria: CriterionResult[];
  exclusions: Exclusion[];
  warnings: string[];
  steps: StepEvidence[];
  scenarioId: ClimateScenario['id'];
}

export interface EvaluationContext {
  scenario: ClimateScenario;
  monthly: MonthlyClimateCell[];
  rainDaysByMonth: Array<number | null>;
  etoMmByMonth: Array<number | null>;
  soil: SoilProfile;
  irrigationAvailable: boolean;
  maxMonthlyIrrigationMm: number | null;
  magyp: MagypSelection | null;
  satellite: SatelliteEvidence[];
  region: RegionKeyLike | undefined;
  previousCrop: CropId | null;
  weights: Record<CriterionId, number>;
  priorityLabel: string;
  seasonalityNote: string;
}

export const CRITERION_LABELS: Record<CriterionId, string> = {
  clima_aptitud: 'Aptitud térmica (EcoCrop sobre POWER)',
  agua_compatibilidad: 'Compatibilidad hídrica (balance FAO-56)',
  suelo_compatibilidad: 'Compatibilidad con el suelo declarado',
  cobertura_suelo: 'Cobertura del suelo / residuos',
  diversificacion: 'Diversificación de familias',
  sucesion: 'Compatibilidad de sucesión',
  estabilidad_regional: 'Estabilidad regional (MAGyP)'
};

/** Pesos por defecto por prioridad del productor (decisiones del modelo, documentadas). */
export const DEFAULT_WEIGHTS: Record<string, Record<CriterionId, number>> = {
  conserve_moisture: { clima_aptitud: 0.15, agua_compatibilidad: 0.25, suelo_compatibilidad: 0.15, cobertura_suelo: 0.20, diversificacion: 0.10, sucesion: 0.05, estabilidad_regional: 0.10 },
  build_soil_organic: { clima_aptitud: 0.05, agua_compatibilidad: 0.10, suelo_compatibilidad: 0.25, cobertura_suelo: 0.20, diversificacion: 0.15, sucesion: 0.15, estabilidad_regional: 0.10 },
  drought_resilience: { clima_aptitud: 0.20, agua_compatibilidad: 0.25, suelo_compatibilidad: 0.10, cobertura_suelo: 0.05, diversificacion: 0.10, sucesion: 0.10, estabilidad_regional: 0.20 },
  erosion_control: { clima_aptitud: 0.05, agua_compatibilidad: 0.15, suelo_compatibilidad: 0.20, cobertura_suelo: 0.30, diversificacion: 0.10, sucesion: 0.10, estabilidad_regional: 0.10 },
  maximize_margin: { clima_aptitud: 0.20, agua_compatibilidad: 0.15, suelo_compatibilidad: 0.10, cobertura_suelo: 0.10, diversificacion: 0.10, sucesion: 0.10, estabilidad_regional: 0.25 }
};

/** Aplica ajustes opcionales del productor y renormaliza a suma 1. */
export function normalizeWeights(weights: Record<CriterionId, number>, overrides?: Partial<Record<CriterionId, number>>): Record<CriterionId, number> {
  const merged = { ...weights };
  for (const [k, v] of Object.entries(overrides ?? {})) {
    const key = k as CriterionId;
    if (typeof v === 'number' && v >= 0 && merged[key] !== undefined) merged[key] = v;
  }
  const total = Object.values(merged).reduce((s, x) => s + x, 0);
  if (total <= 0) return merged;
  return Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, v / total])) as Record<CriterionId, number>;
}

/** Umbrales excluyentes documentados (decisiones del modelo, no constantes biológicas). */
export const EXCLUSION_THRESHOLDS = {
  waterSupplyDemand: 0.4, // (P+I)/ETc mínimo para cultivos no rústicos en secano
  soilScore: 0.35,
  temperatureScore: 0.25
} as const;

interface CampaignCropEntry { crop: CropAgronomy; role: 'primary' | 'secondary'; stepIndex: number }

function campaignCrops(candidate: SequenceCandidate): CampaignCropEntry[] {
  const entries: CampaignCropEntry[] = [];
  candidate.steps.forEach((step, index) => {
    entries.push({ crop: CROP_AGRONOMY[step.primary], role: 'primary', stepIndex: index });
    if (step.secondary) entries.push({ crop: CROP_AGRONOMY[step.secondary], role: 'secondary', stepIndex: index });
  });
  return entries;
}

/** Estabilidad relativa 1/(1+CV) de la serie MAGyP; null si la serie no es representativa. */
function stabilityScore(cv: number | null, campaigns: number): { value: number | null; reason: string } {
  if (cv === null || campaigns < 8) {
    return { value: null, reason: `Serie regional insuficiente para estabilidad (campañas=${campaigns}${cv === null ? ', CV no calculable' : ''}); criterio marcado como no disponible para este cultivo.` };
  }
  return { value: 1 / (1 + cv), reason: `CV interanual ${Math.round(cv * 100)}% sobre ${campaigns} campañas → estabilidad relativa 1/(1+CV) = ${round3(1 / (1 + cv))}.` };
}

export function evaluateCandidate(candidate: SequenceCandidate, context: EvaluationContext): CandidateEvaluation {
  const warnings: string[] = [];
  const exclusions: Exclusion[] = [];
  const entries = campaignCrops(candidate);
  const stepsEvidence: StepEvidence[] = [];

  // Cultivo anterior efectivo para la primera campaña (sucesión).
  let previousId: CropId | null = context.previousCrop;
  let previousLabel: string | null = previousId ? CROP_AGRONOMY[previousId].nameEs : null;

  for (let index = 0; index < candidate.steps.length; index++) {
    const step = candidate.steps[index];
    const primary = CROP_AGRONOMY[step.primary];
    // ---- ventana de siembra ----
    const window = sowingWindowStatus(primary, context.region, step.sowMonth);
    if (window.status === 'outside') {
      exclusions.push({ stepIndex: index, crop: primary.nameEs, rule: 'ventana_temporal', reason: `${step.campaign}: ${window.detail}` });
    }
    if (window.status === 'unknown') warnings.push(`${step.campaign}: ${window.detail}`);
    if (!step.windowKnown) warnings.push(`${step.campaign}: ventana de siembra ${primary.nameEs} sin documento regional; el mes nominal (${step.sowMonth}) proviene de la referencia general.`);
    // ---- aptitud térmica ----
    const cycleMonths = cycleMonthsOf(step.primary, step.sowMonth);
    const temp = temperatureSuitability(primary, context.monthly, cycleMonths, context.scenario.temperatureDeltaC);
    if (temp.unavailableReason) warnings.push(`${step.campaign}: ${temp.detail}`);
    else if (temp.score !== null && temp.score < EXCLUSION_THRESHOLDS.temperatureScore) {
      exclusions.push({ stepIndex: index, crop: primary.nameEs, rule: 'termicamente_inadecuado', reason: `${step.campaign}: aptitud térmica ${temp.score} < ${EXCLUSION_THRESHOLDS.temperatureScore} (umbral del modelo). ${temp.detail}` });
    }
    // ---- balance hídrico ----
    const taw = totalAvailableWaterMm(context.soil, primary.rootDepthM);
    // ---- almacenamiento inicial: SOLO lecturas vigentes (current) con conversión válida; si no, supuesto del modelo ----
    const satelliteStorage = initialStorageFromSatellite(context.satellite, context.soil, primary.rootDepthM, index, step.sowYear, step.sowMonth);
    let initial: { storageMm: number; source: string };
    if (satelliteStorage && satelliteStorage.status === 'used') {
      initial = { storageMm: satelliteStorage.storageMm, source: satelliteStorage.detail };
      warnings.push(`${step.campaign}: ${satelliteStorage.detail}`);
    } else if (satelliteStorage && satelliteStorage.status === 'rejected') {
      initial = defaultInitialStorage(taw);
      warnings.push(`${step.campaign}: ${satelliteStorage.detail} Se usa el supuesto por omisión del modelo (${initial.storageMm} mm).`);
    } else {
      initial = defaultInitialStorage(taw);
    }
    const balance = runCampaignWaterBalance({
      monthly: context.monthly,
      rainDaysByMonth: context.rainDaysByMonth,
      etoMm: context.etoMmByMonth,
      sowMonth: step.sowMonth,
      kcByMonth: kcByMonthFor(step.primary, step.sowMonth),
      tawMm: taw,
      initialStorageMm: initial.storageMm,
      initialStorageSource: initial.source,
      irrigationAvailable: context.irrigationAvailable,
      maxMonthlyIrrigationMm: context.maxMonthlyIrrigationMm,
      curveNumber: context.soil.curveNumber
    });
    if (balance.ok && !context.irrigationAvailable && primary.droughtResistance !== 'high') {
      const ratio = balance.totals.supplyDemandRatio;
      if (ratio !== null && ratio < EXCLUSION_THRESHOLDS.waterSupplyDemand) {
        exclusions.push({ stepIndex: index, crop: primary.nameEs, rule: 'agua_insuficiente_secano', reason: `${step.campaign}: oferta/(demanda) ${(ratio * 100).toFixed(0)}% < ${(EXCLUSION_THRESHOLDS.waterSupplyDemand * 100).toFixed(0)}% en secano para un cultivo de resistencia ${primary.droughtResistance} a la sequía (umbral del modelo).` });
      }
    }
    if (!balance.ok) warnings.push(`${step.campaign}: balance hídrico no disponible (${balance.missingReason ?? 'insumos faltantes'}); el criterio hídrico queda sin puntuar para esta campaña.`);
    // ---- compatibilidad con el suelo ----
    // ---- compatibilidad con el suelo: sin calibración → criterio no disponible (sin 0.5 neutral; el riego no bonifica) ----
    const soilCompat = soilCompatibilityFor(primary, context.soil.texture);
    const soilScore = soilCompat.value;
    const soilDetail = `${primary.nameEs} sobre ${context.soil.texture}${context.soil.declared ? ' (con propiedades declaradas)' : ''}: ${soilCompat.detail}` +
      (soilScore !== null && soilScore < EXCLUSION_THRESHOLDS.soilScore ? ` < umbral ${EXCLUSION_THRESHOLDS.soilScore}: incompatibilidad excluyente.` : '.');
    if (soilScore !== null && soilScore < EXCLUSION_THRESHOLDS.soilScore) {
      exclusions.push({ stepIndex: index, crop: primary.nameEs, rule: 'suelo_incompatible', reason: `${step.campaign}: ${soilDetail}` });
    }
    // ---- sucesión ----
    const penaltyAfterPrevious = previousId !== null ? (primary.successionPenalty[previousId] ?? 0) : 0;
    const repeatedAfterBaseline = previousLabel !== null && step.primary === previousId;
    const successionDetail = `${primary.nameEs} tras ${previousLabel ?? 'sin cultivo anterior registrado'}: penalización ${penaltyAfterPrevious}` +
      (repeatedAfterBaseline ? ' — REPETICIÓN del cultivo anterior (restricción estructural incumplida).' : '') +
      (step.secondary ? '; soja2 tras trigo en la misma campaña: sucesión documentada, sin penalización.' : '');
    if (repeatedAfterBaseline) {
      exclusions.push({ stepIndex: index, crop: primary.nameEs, rule: 'repeticion_mismo_cultivo', reason: `${step.campaign}: repite ${previousLabel} en campañas consecutivas (regla estructural excluyente).` });
    }
    // ---- estadística regional ----
    const stats = context.magyp?.crops[step.primary] ?? null;
    const regionalNote = stats ? `${stats.magypName} (${stats.scale}): Ȳ ${stats.weightedYieldKgHa ?? 's/d'} kg/ha en ${stats.campaigns} campañas; CV ${stats.cv ?? 's/d'}. ${stats.notes[0] ?? ''}` : `Sin serie MAGyP suficiente para ${primary.nameEs} en esta región; la estabilidad regional no se puntúa para este cultivo.`;
    stepsEvidence.push({
      stepIndex: index,
      campaign: step.campaign,
      primary: step.primary,
      secondary: step.secondary,
      sowMonth: step.sowMonth,
      windowKnown: step.windowKnown,
      windowStatus: window.status,
      windowDetail: window.detail,
      etoMm: context.etoMmByMonth[step.sowMonth - 1] ?? null,
      balance,
      initialStorageSource: initial.source,
      initialStorageProductId: satelliteStorage?.status === 'used' ? satelliteStorage.productId : undefined,
      initialStorageObservedAt: satelliteStorage?.status === 'used' ? satelliteStorage.observedAt : undefined,
      tawMm: taw,
      temperature: temp,
      soilScore,
      soilDetail,
      successionPenalty: penaltyAfterPrevious,
      successionDetail,
      coverMonths: step.secondary ? Math.max(primary.coverMonths, CROP_AGRONOMY.soja2.coverMonths) : primary.coverMonths,
      regionalStats: stats ? { scale: stats.scale, campaigns: stats.campaigns, weightedYieldKgHa: stats.weightedYieldKgHa, cv: stats.cv } : null,
      regionalNote
    });
    previousId = step.primary;
    previousLabel = primary.nameEs;
  }

  // ---- criterios agregados ----
  const climaValues = stepsEvidence.map(s => s.temperature.score);
  const aguaValues = stepsEvidence.map(s => s.balance.ok && s.balance.totals.stressIndex !== null ? 1 - s.balance.totals.stressIndex : null);
  const sueloValues = stepsEvidence.map(s => s.soilScore);
  const coberturaValues = stepsEvidence.map(s => s.coverMonths / 12);
  const diversification = diversityScore(candidate, context.magyp);
  const sucesionValues = stepsEvidence.map(s => 1 - s.successionPenalty);
  const estabilidadEntries = stepsEvidence.filter(s => s.regionalStats).map(s => stabilityScore(s.regionalStats!.cv, s.regionalStats!.campaigns));

  const criteria: CriterionResult[] = [];
  const climaValue = meanOf(climaValues);
  const aguaValue = meanOf(aguaValues);
  const sueloValue = meanOf(sueloValues);
  const coberturaValue = meanOf(coberturaValues);
  const sucesionValue = meanOf(sucesionValues);
  const estabilidadValue = meanOf(estabilidadEntries.map(e => e.value));
  if (diversification.value === null) warnings.push(diversification.reason);

  criteria.push({
    id: 'clima_aptitud',
    label: CRITERION_LABELS.clima_aptitud,
    weight: context.weights.clima_aptitud,
    value: climaValue,
    ...(climaValue === null ? { unavailableReason: 'aptitud térmica no evaluable (faltan medias mensuales del ciclo)' } : {}),
    detail: climaValue === null
      ? 'Sin puntuación: faltan temperaturas mensuales de algún mes del ciclo; no se asigna valor favorable por omisión.'
      : `Media de la aptitud trapezoidal por mes del ciclo en ${stepsEvidence.length} campaña(s) bajo el escenario "${context.scenario.label}". ${stepsEvidence[0]?.temperature.detail ?? ''}`
  });
  criteria.push({
    id: 'agua_compatibilidad',
    label: CRITERION_LABELS.agua_compatibilidad,
    weight: context.weights.agua_compatibilidad,
    value: aguaValue,
    ...(aguaValue === null ? { unavailableReason: 'balance hídrico no disponible' } : {}),
    detail: aguaValue === null
      ? 'Sin puntuación: el balance hídrico requirió insumos (P o ETo) faltantes; no se fuerza un valor.'
      : `1 − índice de estrés (1 − ΣETa/ΣETc) por campaña con suelo ${context.soil.texture}, TAW ${stepsEvidence[0]?.tawMm ?? '?'} mm y ${irrigationDescriptor(context).label}.`
  });
  criteria.push({
    id: 'suelo_compatibilidad',
    label: CRITERION_LABELS.suelo_compatibilidad,
    weight: context.weights.suelo_compatibilidad,
    value: sueloValue,
    ...(sueloValue === null ? { unavailableReason: 'sin compatibilidad calibrada cultivo-suelo para el tipo de suelo declarado' } : {}),
    detail: sueloValue === null
      ? `Sin puntuación: ningún cultivo de la secuencia tiene compatibilidad calibrada para ${context.soil.texture} en el catálogo; no se asigna valor neutral.`
      : `Media de compatibilidad cultivo-suelo del catálogo ArgField sobre ${stepsEvidence.length} campaña(s); el riego disponible no modifica este criterio. ${stepsEvidence[0]?.soilDetail ?? ''}`
  });
  criteria.push({
    id: 'cobertura_suelo',
    label: CRITERION_LABELS.cobertura_suelo,
    weight: context.weights.cobertura_suelo,
    value: coberturaValue,
    detail: 'Fracción del año con cobertura o rastrojo según meses de cobertura por cultivo (orientativo del catálogo; no es una medición de cobertura satelital).'
  });
  criteria.push({
    id: 'diversificacion',
    label: CRITERION_LABELS.diversificacion,
    weight: context.weights.diversificacion,
    value: diversification.value,
    ...(diversification.value === null ? { unavailableReason: 'sin cultivos evaluable en la secuencia' } : {}),
    detail: diversification.detail
  });
  criteria.push({
    id: 'sucesion',
    label: CRITERION_LABELS.sucesion,
    weight: context.weights.sucesion,
    value: sucesionValue,
    detail: `1 − penalización media de sucesión (mapa documentado por cultivo). ${stepsEvidence[0]?.successionDetail ?? ''}`
  });
  criteria.push({
    id: 'estabilidad_regional',
    label: CRITERION_LABELS.estabilidad_regional,
    weight: context.weights.estabilidad_regional,
    value: estabilidadValue,
    ...(estabilidadValue === null ? { unavailableReason: 'series MAGyP insuficientes para los cultivos de la secuencia' } : {}),
    detail: estabilidadValue === null
      ? 'Sin puntuación: no hay series MAGyP representativas (≥ 8 campañas) para los cultivos de la secuencia en esta escala regional.'
      : `Media de estabilidad relativa 1/(1+CV) de las series regionales utilizadas. ${estabilidadEntries[0]?.reason ?? ''}`
  });

  // ---- agregación S(r) = Σ w_i f_i con renormalización por criterios disponibles ----
  const available = criteria.filter(c => c.value !== null);
  const completeness = Math.min(1, available.reduce((s, c) => s + c.weight, 0));
  const renorm = available.reduce((s, c) => s + c.weight, 0);
  let score: number | null = null;
  if (available.length && renorm > 0) {
    score = available.reduce((s, c) => s + (c.value as number) * c.weight, 0) / renorm;
  }
  // La estabilidad con series cortas no invalida el criterio completo: se aclara.
  if (estabilidadEntries.length && estabilidadValue !== null && estabilidadEntries.some(e => e.value === null)) {
    warnings.push('La estabilidad regional promedió solo los cultivos con series MAGyP representativas; los demás quedaron sin valor.');
  }
  // Compatibilidad de suelo parcial o desconocida: se documenta, nunca se inventa un valor.
  if (stepsEvidence.some(s => s.soilScore === null) && stepsEvidence.some(s => s.soilScore !== null)) {
    warnings.push('La compatibilidad de suelo promedió solo las campañas con calibración cultivo-suelo del catálogo; las demás quedaron sin valor (sin valor neutral).');
  }
  if (stepsEvidence.length > 0 && stepsEvidence.every(s => s.soilScore === null)) {
    warnings.push('Ningún cultivo de la secuencia tiene compatibilidad calibrada para el tipo de suelo declarado: criterio de suelo sin puntuar.');
  }
  const notRanked = score === null;
  return {
    candidate,
    score: exclusions.length > 0 || notRanked ? null : score,
    completeness,
    criteria,
    exclusions,
    warnings,
    steps: stepsEvidence,
    scenarioId: context.scenario.id
  };
}

function cycleMonthsOf(cropId: CropId, sowMonth: number): number[] {
  return kcByMonthFor(cropId, sowMonth)
    .map((kc, i) => ({ kc, month: i + 1 }))
    .filter(e => e.kc > 0)
    .map(e => e.month);
}

/** Diversificación: entropía normalizada de familias (Fabaceae/Poaceae/Asteraceae) sobre todos los cultivos de la secuencia. */
export function diversityScore(candidate: SequenceCandidate, _magyp: MagypSelection | null): { value: number | null; reason: string; detail: string } {
  const entries = campaignCrops(candidate);
  if (!entries.length) return { value: null, reason: 'Secuencia vacía; no se puntúa diversificación.', detail: '' };
  const families = new Map<string, number>();
  for (const e of entries) families.set(e.crop.family, (families.get(e.crop.family) ?? 0) + 1);
  const total = entries.length;
  let shannon = 0;
  for (const count of families.values()) {
    const p = count / total;
    shannon -= p * Math.log(p);
  }
  const maxPossible = Math.log(3); // 3 familias presentes en el conjunto piloto
  const value = shannon / maxPossible;
  const names = [...families.entries()].map(([f, c]) => `${f}×${c}`).join(', ');
  return {
    value,
    reason: '',
    detail: `Entropía de familias (Shannon normalizada por ln(3)): ${names} → ${round3(value)}. Doble ocupación (soja2) cuenta como componente de la secuencia.`
  };
}

/** Descriptor del riego para resultados: separa la DISPONIBILIDAD declarada del VOLUMEN declarado (nunca asume caudal). */
export function irrigationDescriptor(context: Pick<EvaluationContext, 'irrigationAvailable' | 'maxMonthlyIrrigationMm'>): { appliedMaxMm: number; label: string } {
  if (!context.irrigationAvailable) return { appliedMaxMm: 0, label: 'secano (sin riego declarado)' };
  if (context.maxMonthlyIrrigationMm === null || context.maxMonthlyIrrigationMm === undefined) {
    return { appliedMaxMm: 0, label: 'riego declarado disponible sin volumen mensual declarado: el balance corre en secano (I = 0) y el modelo NO asume un caudal' };
  }
  if (context.maxMonthlyIrrigationMm <= 0) {
    return { appliedMaxMm: 0, label: 'riego declarado disponible con volumen declarado 0 mm/mes: no se aplica agua al balance' };
  }
  return { appliedMaxMm: context.maxMonthlyIrrigationMm, label: `riego complementario con tope declarado por el productor: ${context.maxMonthlyIrrigationMm} mm/mes` };
}

/**
 * Compatibilidad cultivo-suelo del catálogo. Política (corrección de revisión):
 *  - Sin calibración para el tipo de suelo declarado → valor null (criterio NO disponible):
 *    ni valor neutral 0.5 (fabricaría información) ni exclusión por desconocimiento.
 *  - El riego disponible NO bonifica la compatibilidad de suelo (+0.2 eliminado): el riego es
 *    un factor hídrico y ya se evalúa en el balance FAO-56 (criterio de agua y exclusión de
 *    secano); la compatibilidad describe la interacción textura/raíz, que el riego no cambia.
 */
export function soilCompatibilityFor(crop: Pick<CropAgronomy, 'nameEs' | 'soilCompatibility'>, texture: SoilTexture): { value: number | null; known: boolean; detail: string } {
  const base = crop.soilCompatibility[texture];
  if (typeof base !== 'number' || !Number.isFinite(base)) {
    return {
      value: null,
      known: false,
      detail: 'sin compatibilidad calibrada para el tipo de suelo declarado en el catálogo: criterio NO disponible para esta campaña (no se asigna valor neutral y no corresponde exclusión por desconocimiento)'
    };
  }
  return {
    value: base,
    known: true,
    detail: `compatibilidad de catálogo ${base} (el riego disponible no modifica la compatibilidad de suelo; su efecto hídrico se evalúa en el balance FAO-56)`
  };
}

type SatelliteInitialStorage =
  | { status: 'used'; storageMm: number; detail: string; productId: string; observedAt: string | null }
  | { status: 'rejected'; detail: string };

/**
 * SAOCOM: capa 0–50 cm únicamente, primera campaña y mes/año nominal coincidente.
 * La observación se valida otra vez a la entrada del motor. Se elige la más reciente
 * compatible; SMAP superficial no inicializa raíces. CC/PMP convierten solo la capa
 * observada; la parte profunda conserva el supuesto del 50% de agua útil.
 */
function initialStorageFromSatellite(satellite: SatelliteEvidence[], soil: SoilProfile, rootDepthM: number, index: number, sowYear: number, sowMonth: number): SatelliteInitialStorage | null {
  const readings = satellite.filter(s => s.kind === 'soilMoistureVolumetric' && s.value !== null);
  if (!readings.length) return null;
  if (soil.depthM < 0.5 || rootDepthM < 0.5) return { status: 'rejected', detail: 'El perfil SAOCOM 0–50 cm no representa esta profundidad efectiva menor de 50 cm.' };
  const vigente = readings.filter(s => s.current === true && s.productId === 'saocom_humedad' && s.unit === '% vol.' && Number.isFinite(s.value)).sort((a, b) => (b.observedAt ?? '').localeCompare(a.observedAt ?? '')).find(s => {
    const date = new Date(s.observedAt ?? '');
    return index === 0 && date.getUTCFullYear() === sowYear && date.getUTCMonth() + 1 === sowMonth;
  });
  if (!vigente) {
    const r = readings[0];
    return { status: 'rejected', detail: `Lectura de humedad de suelo ${r.productLabel} (observación ${r.observedAt ?? 'sin fecha'}) SIN vigencia o compatibilidad temporal/profundidad (SMAP 0–5 cm no representa raíces): no se usa para el almacenamiento inicial del balance.` };
  }
  const conversion = storageFromVolumetricPct(vigente.value as number, soil, Math.min(0.5, rootDepthM));
  if (!conversion.ok) {
    return { status: 'rejected', detail: `Lectura de humedad de suelo ${vigente.productLabel} vigente (${vigente.observedAt}) NO utilizable: ${conversion.reason}.` };
  }
  const deeperAssumed = 0.5 * Math.max(0, totalAvailableWaterMm(soil, rootDepthM) - conversion.tawMm);
  return { status: 'used', productId: vigente.productId, observedAt: vigente.observedAt, storageMm: conversion.storageMm + deeperAssumed, detail: `${conversion.detail} Fuente: ${vigente.productLabel}, observación ${vigente.observedAt}. Solo capa 0–50 cm; resto del perfil: ${deeperAssumed} mm bajo supuesto de 50% de agua útil. Inicialización mensual aproximada, no reconstrucción diaria ni pronóstico. No se reutiliza en campañas futuras.` };
}

