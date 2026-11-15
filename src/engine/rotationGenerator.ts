/**
 * Generación de alternativas de rotación para ArgField.
 *
 * Distingue explícitamente:
 *  - SECUENCIA agrícola: cultivos primarios (y segunda ocupación tras trigo)
 *    ordenados por campaña.
 *  - CALENDARIO agrícola: cada paso tiene campaña (julio Y → junio Y+1), mes de
 *    siembra nominal y ventana documentada. Una campaña no equivale a un único
 *    cultivo: trigo + soja de segunda conviven en la misma campaña.
 *
 * Reglas estructurales aplicadas AQUÍ (excluyentes, antes de puntuar):
 *  - No repetir el mismo cultivo primario en campañas consecutivas.
 *  - Soja de segunda solo existe como segunda ocupación tras trigo (misma campaña).
 *  - Solo se proponen cultivos con parámetros completos y estadística regional
 *    disponible (los cultivos sin parámetros no obtienen resultados inventados).
 *  - Estancias con cultivos perennes no reciben rotaciones anuales (el motor
 *    lo informa; no genera alternativas falsas).
 *
 * Las restricciones dependientes de clima/suelo/agua se aplican en evaluation.ts.
 */

import { CropId, CROP_AGRONOMY, PILOT_CROP_IDS, nominalSowMonth } from './agronomy';
import { seasonLabel } from './statistics';

export type RegionKeyLike = 'norte' | 'centro' | 'sur' | 'cuyo' | 'noa';

export interface GenerationOptions {
  /** Horizonte en campañas (2 o 3). */
  horizonCampaigns: number;
  /** ID de campaña MAGyP de la primera campaña (1 = 1969/70). */
  startSowYear: number;
  /** Región del establecimiento (ventanas de siembra). */
  region: RegionKeyLike | undefined;
  /** Cultivos disponibles para el generador (con parámetros y datos regionales). */
  availableCrops: CropId[];
  /** Cultivo anterior declarado (si es un cultivo piloto). */
  previousCrop: CropId | null;
  /** Campañas de doble cultivo trigo→soja2 permitidas (región con práctica documentada). */
  allowDoubleCrop: boolean;
}

export interface CampaignStep {
  /** Año de siembra de la campaña (julio de ese año → junio del año siguiente). */
  sowYear: number;
  campaign: string;
  primary: CropId;
  sowMonth: number;
  windowKnown: boolean;
  /** Segunda ocupación dentro de la misma campaña (solo soja2 tras trigo). */
  secondary?: 'soja2';
  secondarySowMonth?: number;
}

export interface SequenceCandidate {
  id: string;
  steps: CampaignStep[];
  /** true si la secuencia mantiene el cultivo actual de la estancia (línea de base). */
  isBaseline: boolean;
}

const SUMMER_PRIMARY: CropId[] = ['soja1', 'maiz', 'girasol', 'sorgo'];

function nextPrimaryOptions(options: GenerationOptions, allowTrigo: boolean): CropId[] {
  const list: CropId[] = [...SUMMER_PRIMARY.filter(c => options.availableCrops.includes(c))];
  if (allowTrigo && options.availableCrops.includes('trigo')) list.push('trigo');
  return list;
}

function stepFor(cropId: CropId, sowYear: number, options: GenerationOptions, asSecondAfterTrigo: boolean): CampaignStep | null {
  const crop = CROP_AGRONOMY[cropId];
  const window = nominalSowMonth(crop, options.region);
  if (window.month === null) return null;
  const step: CampaignStep = { sowYear, campaign: seasonLabel(sowYear), primary: cropId, sowMonth: window.month, windowKnown: window.windowKnown };
  if (asSecondAfterTrigo && options.allowDoubleCrop && options.availableCrops.includes('soja2')) {
    const soja2 = CROP_AGRONOMY.soja2;
    const soja2Window = nominalSowMonth(soja2, options.region);
    if (soja2Window.month !== null) {
      step.secondary = 'soja2';
      step.secondarySowMonth = soja2Window.month;
    }
  }
  return step;
}

/**
 * Genera todas las secuencias estructuralmente válidas de `horizonCampaigns`
 * campañas. Determinista: el orden depende solo de los cultivos disponibles.
 */
export function generateCandidates(options: GenerationOptions): SequenceCandidate[] {
  const horizon = Math.max(1, Math.min(3, Math.round(options.horizonCampaigns)));
  const candidates: SequenceCandidate[] = [];
  const previous = options.previousCrop;
  // La campaña 0 no puede repetir el cultivo anterior como primario (misma regla de consecutivos).
  const firstOptions = nextPrimaryOptions(options, true).filter(c => c !== previous);
  const push = (steps: CampaignStep[]) => {
    const id = 'seq-' + steps.map(s => s.primary + (s.secondary ? '+' + s.secondary : '')).join('|');
    if (!candidates.some(c => c.id === id)) candidates.push({ id, steps, isBaseline: false });
  };
  const build = (level: number, previousPrimary: CropId | null, steps: CampaignStep[]) => {
    if (level === horizon) { if (steps.length) push(steps); return; }
    const sowYear = options.startSowYear + level;
    const optionsForLevel = level === 0 ? firstOptions : nextPrimaryOptions(options, true).filter(c => c !== previousPrimary);
    for (const cropId of optionsForLevel) {
      const isTrigo = cropId === 'trigo';
      const step = stepFor(cropId, sowYear, options, isTrigo);
      if (!step) continue;
      if (!isTrigo) {
        // No se permite soja2 sola (sin trigo previo en la misma campaña).
        build(level + 1, cropId, [...steps, step]);
      } else {
        const plain: CampaignStep = { ...step, secondary: undefined, secondarySowMonth: undefined };
        build(level + 1, cropId, [...steps, plain]);
        if (step.secondary) build(level + 1, cropId, [...steps, step]);
      }
    }
  };
  build(0, null, []);
  // La línea de base "continuidad" se agrega desde el motor (baselineCandidate),
  // para documentar la exclusión cuando la continuidad viola las reglas de sucesión.
  return candidates.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Línea de base "continuidad": mismas campañas con el cultivo actual.
 * Se devuelve SIEMPRE junto con el motivo por el que sería excluida (si lo hay),
 * para que la evaluación documente por qué la continuidad no es recomendable.
 */
export function baselineCandidate(options: GenerationOptions, currentCrop: CropId | null, currentCropLabel: string | null): { candidate: SequenceCandidate | null; exclusion: string | null } {
  if (!currentCrop) {
    return { candidate: null, exclusion: currentCropLabel ? `El cultivo actual (${currentCropLabel}) no tiene parámetros completos: no se evalúa continuidad y no se fabrican resultados para él.` : null };
  }
  const crop = CROP_AGRONOMY[currentCrop];
  const steps: CampaignStep[] = [];
  for (let level = 0; level < Math.max(1, Math.min(3, Math.round(options.horizonCampaigns))); level++) {
    const sowYear = options.startSowYear + level;
    const step = stepFor(currentCrop, sowYear, options, false);
    if (!step) return { candidate: null, exclusion: `El cultivo actual (${crop.nameEs}) no tiene ventana de siembra documentada para esta región.` };
    steps.push(step);
  }
  const candidate: SequenceCandidate = { id: 'seq-continuidad', steps, isBaseline: true };
  const repeated = options.previousCrop === currentCrop;
  return { candidate, exclusion: repeated ? `La continuidad con ${crop.nameEs} repite el cultivo anterior en la primera campaña: se lista solo como referencia y no será recomendada por las reglas de sucesión.` : null };
}

/** Verificación estructural de consecutivos (útil para pruebas). */
export function hasConsecutiveRepeat(steps: Array<{ primary: CropId }>): boolean {
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].primary === steps[i - 1].primary) return true;
  }
  return false;
}

/** Rotaciones de cultivos piloto disponibles: cultivos con parámetros completos; los demás no se generan. */
export function rotatableCrops(): CropId[] {
  return [...PILOT_CROP_IDS];
}

/** Exact declared sequence; no repetition or padding is inferred. */
export function declaredRotationCandidate(options: GenerationOptions, rotation: Array<{ primary: CropId; secondary?: 'soja2' }>): { candidate: SequenceCandidate | null; exclusion: string | null } {
  if (rotation.length < 2 || rotation.length > 3 || rotation.some(r => !PILOT_CROP_IDS.includes(r.primary) || r.primary === 'soja2' || (r.secondary && (r.primary !== 'trigo' || r.secondary !== 'soja2' || !options.allowDoubleCrop)))) return { candidate: null, exclusion: 'Rotación declarada incompatible: usar 2–3 campañas piloto; soja2 solo tras trigo en región compatible. No se reemplaza por otra rotación.' };
  const steps = rotation.map((r, i) => stepFor(r.primary, options.startSowYear + i, { ...options, availableCrops: [...PILOT_CROP_IDS] }, !!r.secondary));
  if (steps.some(s => !s)) return { candidate: null, exclusion: 'Rotación declarada sin ventana de siembra disponible.' };
  return { candidate: { id: 'seq-declarada', isBaseline: true, steps: steps as CampaignStep[] }, exclusion: null };
}
