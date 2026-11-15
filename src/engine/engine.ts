/**
 * Orquestador del motor de rotaciones de ArgField.
 *
 * Pipeline: entradas → clima NASA POWER (con caché) → estadísticas MAGyP →
 * suelo → candidatas estructurales → evaluación por escenario → ranking.
 *
 * Determinismo: el motor no consulta la fecha del sistema; usa `nowIso` de las
 * entradas (el adaptador de la app lo inyecta, los tests lo fijan). Las
 * funciones de puntaje son puras; la única asincronía es la carga de datos.
 *
 * Reglas de integración:
 *  - Reutiliza las lecturas satelitales ya validadas por los servicios de la app
 *    (SatelliteReading); no vuelve a consultar a los proveedores.
 *  - Las precipitaciones GPM IMERG recientes se usan SOLO como evidencia de
 *    condición actual; nunca se suman a la climatología POWER (son estimaciones
 *    alternativas de la misma variable).
 *  - Si una fuente falla, el motor degrada con advertencias y menor completitud;
 *    no fabrica valores ni bloquea el resto.
 */

import { validObservation, observationIndicators } from './observations';
import { CropId, CROP_AGRONOMY, PILOT_CROP_IDS, regionOfProvince } from './agronomy';
import { ClimateDataset, fetchPowerDaily, DEFAULT_POWER_START_YEAR, DEFAULT_POWER_END_YEAR } from './climate';
import { SoilProfile, buildSoilProfile } from './soil';
import { loadMagypProvincial, loadMagypDepartamental, selectMagypStats, MagypProvincialFile, MagypDepartamentalFile, MagypSelection } from './magyp';
import { generateCandidates, declaredRotationCandidate, GenerationOptions, CampaignStep } from './rotationGenerator';
import { evaluateCandidate, DEFAULT_WEIGHTS, normalizeWeights, EvaluationContext, CandidateEvaluation, CRITERION_LABELS } from './evaluation';
import { CLIMATE_SCENARIOS, ClimateScenario, adjustedMonthlyCells, etoSeriesFor } from './scenarios';
import { meanOf, round3 } from './statistics';
import { EngineResult, EngineAlternative, RotationEngineInput, SatelliteEvidence, EngineProvenance } from './engineTypes';

export interface EngineDeps {
  fetchClimate: typeof fetchPowerDaily;
  loadProvincial: (fetchImpl?: typeof fetch) => Promise<MagypProvincialFile | null>;
  loadDepartamental: (fetchImpl?: typeof fetch) => Promise<MagypDepartamentalFile | null>;
  climateYears?: { start: number; end: number };
  /** Identidad de la fuente de clima: evita reutilizar la caché entre fuentes distintas (p. ej. pruebas). */
  climateCacheId?: string;
}

export const defaultEngineDeps: EngineDeps = {
  fetchClimate: fetchPowerDaily,
  loadProvincial: loadMagypProvincial,
  loadDepartamental: loadMagypDepartamental,
  climateYears: { start: DEFAULT_POWER_START_YEAR, end: DEFAULT_POWER_END_YEAR },
  climateCacheId: 'power-daily'
};

const climateCache = new Map<string, Promise<ClimateDataset | null>>();
function climateCacheKey(lat: number, lng: number, years: { start: number; end: number }, cacheId: string): string {
  return `${cacheId}|${lat.toFixed(3)},${lng.toFixed(3)},${years.start}-${years.end}`;
}

export interface MainCropMapping {
  soybean: CropId; maize: CropId; wheat: CropId; sunflower: CropId; sorghum: CropId;
}

/** Traduce identificadores del registro (en inglés/español o IDs del motor) a IDs de cultivo piloto. */
export function mapCropToCropId(rawName: string): CropId | null {
  const value = (rawName ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const table: Array<[string, CropId]> = [
    ['soybean', 'soja1'], ['soja', 'soja1'], ['soja de primera', 'soja1'], ['soja1', 'soja1'], ['soja 1ra', 'soja1'],
    ['soja de segunda', 'soja2'], ['soja2', 'soja2'], ['soja 2da', 'soja2'],
    ['maize', 'maiz'], ['corn', 'maiz'], ['maiz', 'maiz'],
    ['wheat', 'trigo'], ['trigo', 'trigo'],
    ['sunflower', 'girasol'], ['girasol', 'girasol'],
    ['sorghum', 'sorgo'], ['sorgo', 'sorgo']
  ];
  const hit = table.find(([key]) => key === value);
  return hit ? hit[1] : null;
}

const PERENNIAL_HINTS = /yerba|t[eé]|lim[oó]n|mandarina|naranja|pomelo|banana|jojoba|tung|olivo|nogal|alfalfa|pastura|pastizal|perenne/i;
export function isPerennialCropName(name: string): boolean {
  return PERENNIAL_HINTS.test(name ?? '');
}

export { evidenceFromReadings as satelliteEvidenceFromReadings } from './observations';

function perennialEvidence(input: RotationEngineInput): string | null {
  const names = input.currentCropIds ?? [];
  const perennials = names.filter(n => isPerennialCropName(n) || n === 'pasture');
  if (!names.length) return null;
  if (perennials.length === names.length && names.length > 0) {
    return `El establecimiento registra solo cultivos perennes (${names.join(', ')}): no se generan rotaciones anuales, no corresponde recomendarlas.`;
  }
  return null;
}

function startSowYearFromNow(nowIso: string): number {
  const date = new Date(nowIso);
  const year = date.getUTCFullYear();
  // La campaña agrícola argentina va de julio (siembra de invierno) a junio del año siguiente.
  return date.getUTCMonth() + 1 >= 7 ? year : year - 1;
}

function sequenceLabel(steps: CampaignStep[]): string {
  return steps.map(s => {
    const primary = CROP_AGRONOMY[s.primary].nameEs;
    const secondary = s.secondary ? ` + ${CROP_AGRONOMY[s.secondary].nameEs}` : '';
    return primary + secondary;
  }).join(' → ');
}

function buildJustification(steps: CampaignStep[], evaluation: CandidateEvaluation): string[] {
  const lines: string[] = [];
  lines.push(`Secuencia: ${sequenceLabel(steps)} (${steps.length} campaña(s)).`);
  for (const step of evaluation.steps) {
    const supply = step.balance.totals.supplyDemandRatio;
    const stress = step.balance.totals.stressIndex;
    const water = step.balance.ok && supply !== null && stress !== null
      ? `oferta/demanda ${(supply * 100).toFixed(0)}%, estrés ${(stress * 100).toFixed(0)}%, ${step.balance.totals.monthsStressed} mes(es) con estrés`
      : 'balance no disponible (insumos faltantes)';
    lines.push(`${step.campaign}: ${CROP_AGRONOMY[step.primary].nameEs} siembra mes ${step.sowMonth}; ${water}; ${step.windowDetail}`);
  }
  for (const criterion of evaluation.criteria) {
    lines.push(`${criterion.label}: ${criterion.value ?? 'sin datos'} (peso ${criterion.weight.toFixed(2)}) — ${criterion.detail}`);
  }
  return lines;
}

function toAlternative(candidateId: string, evaluation: CandidateEvaluation, scenario: ClimateScenario, isBaseline: boolean): EngineAlternative {
  const steps = evaluation.candidate.steps;
  return {
    id: `${scenario.id}:${candidateId}`,
    label: sequenceLabel(steps),
    isBaseline,
    sequence: steps.map(s => ({
      campaign: s.campaign,
      sowYear: s.sowYear,
      primary: s.primary,
      primaryLabel: CROP_AGRONOMY[s.primary].nameEs,
      sowMonth: s.sowMonth,
      ...(s.secondary ? { secondary: s.secondary, secondaryLabel: CROP_AGRONOMY.soja2.nameEs } : {})
    })),
    horizonCampaigns: steps.length,
    score: evaluation.score,
    completeness: evaluation.completeness,
    criteria: evaluation.criteria,
    exclusions: evaluation.exclusions,
    warnings: evaluation.warnings,
    steps: evaluation.steps,
    justification: buildJustification(steps, evaluation),
    scenarioId: scenario.id,
    scenarioLabel: scenario.label
  };
}

/**
 * Evalúa rotaciones para una estancia. Nunca lanza por datos faltantes:
 * degrada con advertencias y menor completitud.
 */
export async function evaluateRotations(
  input: RotationEngineInput,
  deps: EngineDeps = defaultEngineDeps,
  overrides?: { fetchImpl?: typeof fetch }
): Promise<EngineResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const now = new Date(nowIso);
  input = { ...input, satellite: (input.satellite ?? []).map(s => ({ ...s, current: validObservation(s, now) })) };
  const indicators = observationIndicators(input.satellite ?? [], now);
  const years = deps.climateYears ?? { start: DEFAULT_POWER_START_YEAR, end: DEFAULT_POWER_END_YEAR };
  const warnings: string[] = [];
  const notes: string[] = [];
  let climateFailure: string | null = null;

  // ---- clima (caché por punto y ventana) ----
  const cacheKey = climateCacheKey(input.lat, input.lng, years, deps.climateCacheId ?? 'power-daily');
  let climatePromise = climateCache.get(cacheKey);
  if (!climatePromise) {
    climatePromise = deps.fetchClimate(input.lat, input.lng, { startYear: years.start, endYear: years.end, fetchImpl: overrides?.fetchImpl }).then(d => roundClimateDataset(d)).catch(error => {
      climateFailure = error instanceof Error ? error.message : String(error);
      return null;
    });
    climateCache.set(cacheKey, climatePromise);
  }
  const climate = await climatePromise;
  if (!climate) warnings.push(`No se pudo obtener la serie NASA POWER (${years.start}-${years.end})${climateFailure ? `: ${climateFailure}` : ''}. La aptitud térmica y el balance hídrico quedan sin puntuar; el resto de criterios continúa.`);

  // ---- MAGyP ----
  const [provincialResult, departamentalResult] = await Promise.allSettled([deps.loadProvincial(overrides?.fetchImpl), deps.loadDepartamental(overrides?.fetchImpl)]);
  const provincial = provincialResult.status === 'fulfilled' ? provincialResult.value : null;
  const departamental = departamentalResult.status === 'fulfilled' ? departamentalResult.value : null;
  let magyp: MagypSelection | null = null;
  if (provincial) {
    magyp = selectMagypStats(provincial, departamental, input.province, input.department);
    if (!magyp) warnings.push(`Sin estadísticas MAGyP para "${input.province ?? 'provincia desconocida'}": la estabilidad regional queda sin puntuar.`);
  } else {
    const detail = provincialResult.status === 'rejected' ? (provincialResult.reason instanceof Error ? provincialResult.reason.message : String(provincialResult.reason)) : 'respuesta vacía';
    warnings.push(`No se pudo cargar el archivo estático de estadísticas MAGyP (${detail}): estabilidad regional sin puntuar.`);
  }
  if (departamentalResult.status === 'rejected') warnings.push(`No se pudo cargar el dataset departamental MAGyP (${departamentalResult.reason instanceof Error ? departamentalResult.reason.message : String(departamentalResult.reason)}); se usará escala provincial cuando esté disponible.`);
  if (magyp) notes.push(...magyp.notes);

  // ---- perennes: no corresponde rotación anual ----
  const perennialNote = perennialEvidence(input);
  if (perennialNote) {
    return {
      alternatives: [],
      excluded: [],
      scenarios: [],
      warnings: [perennialNote, ...warnings],
      provenance: buildProvenance(climate, magyp, input.satellite ?? [], nowIso),
      completeness: 0,
      referenceScenarioId: 'referencia',
      input,
      generatedAtIso: nowIso,
      magyp,
      notes
    };
  }

  // ---- suelo ----
  const soil: SoilProfile = buildSoilProfile(input.soil.type, input.soil.declared);
  notes.push(...soil.notes);
  // Disponibilidad de riego sin volumen declarado: no se inventa un caudal (se separa
  // disponibilidad de cantidad aplicada; sin volumen el balance corre en secano).
  if (input.irrigationAvailable && (input.maxMonthlyIrrigationMm === undefined || input.maxMonthlyIrrigationMm === null)) {
    warnings.push('Riego declarado disponible sin volumen mensual declarado (maxMonthlyIrrigationMm): el balance hídrico corre en secano (I = 0) y no se asume un caudal por omisión; declará el volumen para cuantificar el riego.');
  }

  // ---- opciones de generación ----
  const excluded = new Set((input.constraints?.excludedCrops ?? []) as CropId[]);
  const availableCrops = PILOT_CROP_IDS.filter(id => !excluded.has(id));
  const horizon = Math.max(2, Math.min(3, Math.round(input.currentRotation?.length || input.constraints?.horizonCampaigns || 3)));
  const startSowYear = startSowYearFromNow(nowIso);
  const currentCropId = (input.currentCropIds ?? []).map(mapCropToCropId).find((id): id is CropId => id !== null) ?? null;
  if ((input.currentCropIds ?? []).length > 0 && currentCropId === null) {
    warnings.push(`El cultivo actual (${(input.currentCropIds ?? []).join(', ')}) no tiene parámetros completos en la base agronómica: no se fabrican resultados para él; solo se comparan cultivos piloto.`);
  }
  const previousCropId = input.previousCropId ? mapCropToCropId(input.previousCropId) : null;
  const region = input.region ?? regionOfProvince(input.province);
  const allowDoubleCrop = region === 'norte' || region === 'noa' || region === 'centro';
  const generationOptions: GenerationOptions = {
    horizonCampaigns: horizon,
    startSowYear,
    region,
    availableCrops,
    previousCrop: previousCropId,
    allowDoubleCrop
  };
  const candidates = generateCandidates(generationOptions);
  if (input.currentRotation?.length) {
    const declared = declaredRotationCandidate(generationOptions, input.currentRotation);
    if (declared.candidate) candidates.push(declared.candidate);
    if (declared.exclusion) warnings.push(declared.exclusion);
  } else warnings.push('Rotación actual no declarada: no se inventa una línea de base a partir de los cultivos actuales. Registrá 2 o 3 campañas en orden para comparar.');

  // ---- pesos ----
  const priorityKey = input.priorities.priority;
  const baseWeights = DEFAULT_WEIGHTS[priorityKey] ?? DEFAULT_WEIGHTS.drought_resilience;
  if (!DEFAULT_WEIGHTS[priorityKey]) warnings.push(`Prioridad desconocida "${priorityKey}"; se usan los pesos de resiliencia a sequía por defecto.`);
  const weights = normalizeWeights(baseWeights, input.priorities.overrides ?? input.constraints?.weightOverrides);

  // ---- evaluación por escenario ----
  const scenarios: EngineResult['scenarios'] = [];
  const allAlternatives: EngineAlternative[] = [];
  let baselineResult: EngineAlternative | null = null;
  const excludedCandidates: EngineResult['excluded'] = [];
  for (const scenario of CLIMATE_SCENARIOS) {
    // Sin clima el motor CONTINÚA: aptitud térmica y balance quedan sin puntuar
    // (null explícito, no valor favorables por omisión) y la completitud baja.
    const monthly = climate ? adjustedMonthlyCells(climate.monthly, scenario) : [];
    const etoMmByMonth = climate ? etoSeriesFor(climate, scenario) : Array.from({ length: 12 }, () => null);
    if (etoMmByMonth.every(v => v === null)) {
      warnings.push(`Escenario "${scenario.label}": sin ETo (faltan insumos FAO-56); el criterio hídrico no se puntúa en este escenario.`);
    }
    const context: EvaluationContext = {
      scenario,
      monthly,
      rainDaysByMonth: climate ? climate.monthly.map(m => m.rainDaysMean) : Array.from({ length: 12 }, () => null),
      etoMmByMonth,
      soil,
      irrigationAvailable: input.irrigationAvailable,
      maxMonthlyIrrigationMm: input.maxMonthlyIrrigationMm ?? null,
      magyp,
      satellite: input.satellite ?? [],
      region,
      previousCrop: previousCropId,
      weights,
      priorityLabel: input.priorities.label ?? priorityKey,
      seasonalityNote: ''
    };
    const evaluations = candidates.map(candidate => evaluateCandidate(candidate, context));
    const viable = evaluations.filter(e => e.exclusions.length === 0 && e.score !== null);
    const ranking = [...viable].sort((a, b) => (b.score as number) - (a.score as number) || a.candidate.id.localeCompare(b.candidate.id));
    scenarios.push({
      scenario,
      ranking: ranking.slice(0, 8).map(e => ({ id: e.candidate.id, score: e.score, completeness: e.completeness }))
    });
    for (const evaluation of evaluations) {
      const isBaseline = evaluation.candidate.isBaseline;
      const alternative = toAlternative(evaluation.candidate.id, evaluation, scenario, isBaseline);
      if (isBaseline && scenario.id === 'referencia') baselineResult = alternative;
      if (evaluation.exclusions.length > 0) {
        const alreadyListed = excludedCandidates.some(x => x.id === evaluation.candidate.id);
        if ((isBaseline || scenario.id === 'referencia') && !alreadyListed) {
          excludedCandidates.push({ id: evaluation.candidate.id, exclusions: evaluation.exclusions, label: alternative.label });
        }
        continue;
      }
      if (evaluation.score === null) {
        warnings.push(`"${alternative.label}" no pudo puntuarse en el escenario "${scenario.label}" (sin criterios disponibles).`);
        continue;
      }
      allAlternatives.push(alternative);
    }
  }

  // Ranking de la referencia: detalle completo solo para las 8 mejores;
  // los escenarios comparan por ranking compacto (id + puntaje).
  const referenceAlternatives = allAlternatives.filter(a => a.scenarioId === 'referencia' && !a.isBaseline && a.label !== baselineResult?.label);
  referenceAlternatives.sort((a, b) => (b.score as number) - (a.score as number) || a.id.localeCompare(b.id));
  const alternatives = referenceAlternatives.slice(0, 8);

  if (!alternatives.length) {
    warnings.push('No hay rotaciones viables con los datos disponibles; revisá las exclusiones y advertencias.');
  }
  const completeness = referenceAlternatives.length ? round3(meanOf(referenceAlternatives.map(a => a.completeness))) ?? 0 : 0;
  if (input.satellite?.length) {
    for (const s of input.satellite) {
      if (!s.current) warnings.push(`La observación ${s.productLabel} (${s.observedAt ?? 'sin fecha'}) no está fresca o no es válida: NO se usa para condiciones actuales.`);
    }
  }
  return {
    alternatives,
    baseline: baselineResult,
    observationIndicators: indicators,
    excluded: excludedCandidates,
    scenarios,
    warnings,
    provenance: buildProvenance(climate, magyp, input.satellite ?? [], nowIso, [...alternatives, ...(baselineResult ? [baselineResult] : [])], indicators),
    completeness,
    referenceScenarioId: 'referencia',
    input,
    generatedAtIso: nowIso,
    magyp,
    notes
  };
}

function roundClimateDataset(dataset: ClimateDataset): ClimateDataset {
  return dataset; // los agregadores ya redondean; punto de extensión para trazas
}

function buildProvenance(climate: ClimateDataset | null, magyp: MagypSelection | null, satellite: SatelliteEvidence[], nowIso: string, alternatives: EngineAlternative[] = [], indicators: NonNullable<EngineResult['observationIndicators']> = []): EngineProvenance {
  return {
    climate: climate ? {
      source: 'NASA POWER (Daily API, MERRA-2)',
      url: climate.provenance.url,
      fetchedAtIso: climate.provenance.fetchedAtIso,
      years: climate.years,
      resolutionNote: climate.provenance.resolutionNote,
      altitudeM: climate.elevationM
    } : null,
    magyp: magyp ? {
      source: 'MAGyP · Estimaciones Agrícolas (dataset nacional preprocesado)',
      downloadedAt: null,
      note: 'Serie departamental si tiene ≥ 8 campañas válidas; si no, provincial con cambio de escala documentado.'
    } : null,
    satellite: satellite.map(s => {
      const balanceUsed = alternatives.some(a => a.steps.some(step => step.balance.ok && step.initialStorageProductId === s.productId && step.initialStorageObservedAt === s.observedAt));
      const diagnostic = indicators.find(i => i.productId === s.productId);
      return {
        productId: s.productId, productLabel: s.productLabel, observedAt: s.observedAt,
        source: s.source, sourceUrl: s.sourceUrl, resolutionNote: s.resolutionNote,
        samples: diagnostic?.samples,
        validity: s.current ? 'Vigente y válida' : 'Excluida: fecha, unidad, valor, calidad o vigencia incompatibles (' + (s.status ?? 'validación del motor') + ')',
        used: s.current && (balanceUsed || !!diagnostic),
        reason: !s.current ? 'SIN vigencia o validez: no se utiliza.' : balanceUsed
          ? 'Agua: inicializa solo la capa 0–50 cm en la primera campaña temporalmente compatible; resto del perfil supuesto al 50%.'
          : diagnostic ? diagnostic.detail : 'Solo contexto: profundidad, fecha de siembra o serie insuficientes para el indicador; no altera el puntaje.'
      };
    }),
    osm: {
      source: 'OpenStreetMap Nominatim (geocodificación inversa)',
      note: 'Resuelve departamento/partido desde coordenadas para anclar la serie MAGyP; la resolución es aproximada en zonas rurales.'
    }
  };
}

export { CLIMATE_SCENARIOS, CRITERION_LABELS };
