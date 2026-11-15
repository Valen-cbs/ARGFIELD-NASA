/**
 * Tipos públicos del motor de rotaciones de ArgField.
 *
 * El motor NO depende de React ni del DOM: el orquestador (src/engine/engine.ts)
 * recibe entradas planas y dependencias inyectables, para que funcione igual en
 * el navegador y en pruebas de Node.
 */

import type { CropId } from './agronomy';
import type { SequenceCandidate, RegionKeyLike } from './rotationGenerator';
import type { CriterionResult, Exclusion, StepEvidence, CriterionId } from './evaluation';
import type { ClimateScenario } from './scenarios';
import type { ClimateDataset } from './climate';
import type { SoilProfile, DeclaredSoilProperties } from './soil';
import type { MagypSelection } from './magyp';

export type { CriterionId, CriterionResult, Exclusion, StepEvidence };
export type { CropId };
export type { RegionKeyLike };
export type { ClimateDataset, SoilProfile, DeclaredSoilProperties, MagypSelection, ClimateScenario };

export type { SequenceCandidate };

/** Evidencia satelital validada que el motor acepta como entrada. */
export interface SatelliteEvidence {
  productId: string;
  kind: 'soilMoistureVolumetric' | 'precipRecentMm' | 'precipMonthMm' | 'vegetationIndex' | 'surfaceTempC' | 'other';
  productLabel: string;
  value: number | null;
  unit: string;
  /** Fecha oficial de observación informada por el proveedor (nunca la fecha de consulta). */
  observedAt: string | null;
  ageDays: number | null;
  current: boolean; // observación dentro de la ventana de frescura del producto
  resolutionNote?: string;
  usedFor: string;
  caveat?: string;
  source?: string;
  sourceUrl?: string;
  status?: string;
  samples?: Array<{ value: number; observedAt: string; sourceUrl: string }>;
}

export interface FarmerConstraints {
  /** Cultivos piloto que el productor no desea considerar. */
  excludedCrops?: CropId[];
  /** Cultivos piloto que el productor quiere forzar en alguna campaña (si son compatibles). */
  preferredCrops?: CropId[];
  /** Horizonte prospectivo en campañas (2-3), independiente de la rotación declarada. */
  horizonCampaigns?: number;
  /** Ajuste de pesos por criterio (se renormaliza). */
  weightOverrides?: Partial<Record<CriterionId, number>>;
}

export interface RotationEngineInput {
  lat: number;
  lng: number;
  province?: string;
  department?: string;
  region?: RegionKeyLike;
  hectares?: number;
  /** Cultivos actuales del establecimiento (nombres del catálogo o IDs de cultivo piloto). */
  currentCropIds?: string[];
  /** Secuencia declarada, una entrada por campaña; jamás inferida del cultivo actual. */
  currentRotation?: Array<{ primary: CropId; secondary?: 'soja2' }>;
  previousCropId?: string;
  irrigationAvailable: boolean;
  /** Volumen mensual de riego DECLARADO por el productor (mm). Sin valor: riego disponible sin volumen declarado (el balance corre en secano y se advierte; no se asume caudal). */
  maxMonthlyIrrigationMm?: number;
  soil: { type: SoilProfile['texture']; declared?: DeclaredSoilProperties };
  priorities: { priority: string; label?: string; overrides?: FarmerConstraints['weightOverrides'] };
  constraints?: FarmerConstraints;
  /** Lecturas satelitales ya validadas por los servicios existentes (opcional). */
  satellite?: SatelliteEvidence[];
  /** Fecha de referencia del cálculo (por defecto se inyecta desde fuera; determinismo). */
  nowIso?: string;
}

export interface EngineProvenance {
  climate: {
    source: string;
    url: string;
    fetchedAtIso: string;
    years: { start: number; end: number };
    resolutionNote: string;
    altitudeM: number;
  } | null;
  magyp: { source: string; downloadedAt: string | null; note: string } | null;
  satellite: Array<{ productId: string; productLabel: string; observedAt: string | null; used: boolean; reason: string; source?: string; sourceUrl?: string; resolutionNote?: string; validity?: string; samples?: SatelliteEvidence['samples'] }>;
  osm: { source: string; note: string } | null;
}

/** Counts refer to prospective sequences in the reference scenario, never to the baseline. */
export interface OptimizationDiagnostics {
  outcome: 'viable' | 'no_candidates' | 'incompatible_constraints' | 'insufficient_data' | 'calculation_error' | 'integration_error' | 'unsupported_perennial';
  generated: number;
  evaluated: number;
  viable: number;
  returned: number;
  horizonCampaigns: number;
  region: RegionKeyLike | undefined;
  rejections: Array<{ rule: string; count: number; example: string }>;
  generationBlocks: string[];
  missingInputs: string[];
  errors: Array<{ candidateId: string; scenarioId: string; message: string }>;
  scenarios: Array<{ id: string; evaluated: number; viable: number }>;
  comparison: 'no_history' | 'unavailable_history' | 'different_horizon' | 'single_alternative' | 'available';
}

export interface EngineResult {
  /** Alternativas ordenadas por S(r) desc (excluyentes fuera; null score al final). */
  alternatives: EngineAlternative[];
  diagnostics: OptimizationDiagnostics;
  baseline?: EngineAlternative | null;
  observationIndicators?: Array<{ id: string; label: string; value: number; unit: string; detail: string; productId: string; samples?: SatelliteEvidence['samples'] }>;
  /** Rotaciones excluidas por reglas, con el motivo. */
  excluded: Array<{ id: string; exclusions: Exclusion[]; label: string }>;
  scenarios: Array<{ scenario: ClimateScenario; ranking: Array<{ id: string; score: number | null; completeness: number }> }>;
  warnings: string[];
  provenance: EngineProvenance;
  completeness: number;
  referenceScenarioId: ClimateScenario['id'];
  input: RotationEngineInput;
  generatedAtIso: string;
  /** Series MAGyP usadas (para el desglose por cultivo). */
  magyp: MagypSelection | null;
  notes: string[];
}

export interface EngineAlternative {
  id: string;
  label: string;
  isBaseline: boolean;
  sequence: Array<{ campaign: string; sowYear: number; primary: CropId; primaryLabel: string; sowMonth: number; secondary?: 'soja2'; secondaryLabel?: string }>;
  horizonCampaigns: number;
  score: number | null;
  completeness: number;
  criteria: CriterionResult[];
  exclusions: Exclusion[];
  warnings: string[];
  steps: StepEvidence[];
  justification: string[];
  scenarioId: ClimateScenario['id'];
  scenarioLabel: string;
}

export const ENGINE_VERSION = '1.1.0';
