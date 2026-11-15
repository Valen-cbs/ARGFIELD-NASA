/**
 * Base agronómica del motor de rotaciones de ArgField.
 *
 * Cultivos piloto: Soja 1ra, Soja 2da, Maíz, Trigo, Girasol y Sorgo.
 * El catálogo MAGyP completo (src/data/magypCrops.ts) sigue disponible para el
 * registro de estancias; el motor solo genera rotaciones con cultivos que tienen
 * parámetros completos y trazables aquí.
 *
 * Procedencia por grupo de parámetros (cada campo documenta su fuente):
 *  - Coeficientes de cultivo, fracciones de agotamiento (p) y profundidades:
 *    FAO-56 (Allen et al., 1998) Tablas 11, 12 y 22 — valores por defecto con
 *    rangos publicados; el punto elegido se marca como decisión del modelo.
 *  - Rangos de temperatura: resúmenes orientativos de la base FAO EcoCrop
 *    (https://ecocrop.fao.org) y GAEZ (https://www.fao.org/gaez/en). NO son
 *    calibraciones argentinas específicas.
 *  - Ventanas de siembra: orientativas por macroregión, basadas en guías de
 *    difusión regionales (INTA/AACARA); deben verificarse localmente.
 *  - Rendimientos regionales y superficies: MAGyP (datos preprocesados, ver
 *    src/engine/magyp.ts). No se modelan rendimientos del lote individual.
 *  - Descripciones de suelo: catálogo local SOIL_DATABASE (src/data/crops.ts).
 *
 * Unidades: días, meses (1-12), °C, mm, m, kg N/ha, tn MS/ha.
 */

import type { SoilType, RegionKey } from '../types';

export type CropId = 'soja1' | 'soja2' | 'maiz' | 'trigo' | 'girasol' | 'sorgo';

export const PILOT_CROP_IDS: CropId[] = ['soja1', 'soja2', 'maiz', 'trigo', 'girasol', 'sorgo'];

export interface SowingWindow {
  startMonth: number;
  endMonth: number;
}

export interface CropAgronomy {
  id: CropId;
  nameEs: string;
  scientificName: string;
  /** Catálogo MAGyP correspondiente (serie estadística usada). */
  magypName: string;
  /** Cultivos MAGyP EXCLUIDOS para evitar doble conteo con esta serie. */
  magypExcluded: string[];
  family: 'Fabaceae' | 'Poaceae' | 'Asteraceae';
  lifecycle: 'annual';
  season: 'summer' | 'winter';
  /** Puede sembrarse como segunda ocupación tras trigo dentro de la misma campaña. */
  doubleCropAfterWheat: boolean;
  cycleDays: number;
  /** Duración por etapa FAO-56 (días) [inicial, desarrollo, mitad, final]. */
  stageDays: [number, number, number, number];
  /** Kc único por etapa (FAO-56 Tabla 12): [inicial, mitad, final]. */
  kc: { initial: number; mid: number; end: number };
  /** Fracción de agotamiento permitido p (FAO-56 Tabla 12). */
  depletionFraction: number;
  /** Profundidad radicular efectiva (m) — decisión del modelo dentro del rango FAO-56 Tabla 22. */
  rootDepthM: number;
  /** Temperaturas (°C): rango óptimo y absoluto, orientativas según EcoCrop. */
  temperature: { absMin: number; optMin: number; optMax: number; absMax: number };
  frostSensitive: boolean;
  droughtResistance: 'low' | 'medium' | 'high';
  /** Fijación biológica de N: aporte neto orientativo (kg N/ha) al cultivo siguiente. */
  nitrogenFixationKgHa: number;
  /** Residuos: aporte orientativo de materia seca (tn MS/ha). */
  residueTnHa: number;
  /** Cobertura del suelo que deja la secuencia (meses/año con cobertura o rastrojo). */
  coverMonths: number;
  /** Ventanas de siembra por macroregión; 'unknown' = sin documento regional (se advierte). */
  sowingWindows: Partial<Record<RegionKey, SowingWindow[]>> | { default: SowingWindow[] };
  /** Compatibilidad con tipos de suelo (0-1), decisión del modelo derivada del catálogo de suelos. */
  soilCompatibility: Partial<Record<SoilType, number>>;
  /** Penalizaciones de sucesión (0-1) sobre el criterio de sucesión, por cultivo anterior. */
  successionPenalty: Partial<Record<CropId, number>>;
  /** Notas agronómicas para la justificación. */
  agronomicNotes: string[];
}

export const CROP_AGRONOMY: Record<CropId, CropAgronomy> = {
  soja1: {
    id: 'soja1',
    nameEs: 'Soja de primera',
    scientificName: 'Glycine max',
    magypName: 'Soja 1ra',
    magypExcluded: ['Soja total'],
    family: 'Fabaceae',
    lifecycle: 'annual',
    season: 'summer',
    doubleCropAfterWheat: false,
    cycleDays: 135,
    stageDays: [20, 35, 45, 35],
    kc: { initial: 0.3, mid: 1.15, end: 0.5 },
    depletionFraction: 0.5,
    rootDepthM: 1.2,
    temperature: { absMin: 10, optMin: 20, optMax: 30, absMax: 35 },
    frostSensitive: true,
    droughtResistance: 'medium',
    nitrogenFixationKgHa: 40,
    residueTnHa: 3,
    coverMonths: 4,
    sowingWindows: {
      norte: [{ startMonth: 11, endMonth: 12 }],
      noa: [{ startMonth: 11, endMonth: 12 }],
      centro: [{ startMonth: 10, endMonth: 12 }]
    },
    soilCompatibility: { mollisol_deep: 0.9, sandy_loam: 0.5, clay_vertisol: 0.7, aridisol_calcareous: 0.3 },
    successionPenalty: { soja2: 0.35, girasol: 0.15, maiz: 0.05, sorgo: 0.1, trigo: 0 },
    agronomicNotes: [
      'Fijación biológica de N con inoculación; deja escaso rastrojo protector (catálogo del sistema).',
      'Sensible al déficit hídrico en R3-R5; la repetición soja-soja limita rendimiento y salud del suelo.'
    ]
  },
  soja2: {
    id: 'soja2',
    nameEs: 'Soja de segunda (tras trigo)',
    scientificName: 'Glycine max',
    magypName: 'Soja 2da',
    magypExcluded: ['Soja total'],
    family: 'Fabaceae',
    lifecycle: 'annual',
    season: 'summer',
    doubleCropAfterWheat: true,
    cycleDays: 120,
    stageDays: [15, 30, 45, 30],
    kc: { initial: 0.3, mid: 1.15, end: 0.5 },
    depletionFraction: 0.5,
    rootDepthM: 1.1,
    temperature: { absMin: 10, optMin: 20, optMax: 30, absMax: 35 },
    frostSensitive: true,
    droughtResistance: 'medium',
    nitrogenFixationKgHa: 30,
    residueTnHa: 2.5,
    coverMonths: 3,
    sowingWindows: {
      norte: [{ startMonth: 12, endMonth: 1 }],
      noa: [{ startMonth: 12, endMonth: 1 }],
      centro: [{ startMonth: 12, endMonth: 1 }]
    },
    soilCompatibility: { mollisol_deep: 0.85, sandy_loam: 0.45, clay_vertisol: 0.65, aridisol_calcareous: 0.25 },
    successionPenalty: { soja1: 0.3, girasol: 0.15, maiz: 0.05, sorgo: 0.1, trigo: 0 },
    agronomicNotes: [
      'Solo tiene sentido como segunda ocupación tras trigo; aprovecha la ventana dic-enero.',
      'Mayor riesgo hídrico: siembra tardía y llenado de grano hacia el final del verano.'
    ]
  },
  maiz: {
    id: 'maiz',
    nameEs: 'Maíz',
    scientificName: 'Zea mays',
    magypName: 'Maíz',
    magypExcluded: [],
    family: 'Poaceae',
    lifecycle: 'annual',
    season: 'summer',
    doubleCropAfterWheat: false,
    cycleDays: 140,
    stageDays: [25, 40, 50, 25],
    kc: { initial: 0.3, mid: 1.2, end: 0.6 },
    depletionFraction: 0.55,
    rootDepthM: 1.8,
    temperature: { absMin: 10, optMin: 15, optMax: 30, absMax: 38 },
    frostSensitive: true,
    droughtResistance: 'medium',
    nitrogenFixationKgHa: 0,
    residueTnHa: 10,
    coverMonths: 6,
    sowingWindows: {
      norte: [{ startMonth: 9, endMonth: 10 }, { startMonth: 12, endMonth: 1 }],
      noa: [{ startMonth: 9, endMonth: 10 }, { startMonth: 12, endMonth: 1 }],
      centro: [{ startMonth: 9, endMonth: 11 }]
    },
    soilCompatibility: { mollisol_deep: 1, sandy_loam: 0.6, clay_vertisol: 0.7, aridisol_calcareous: 0.35 },
    successionPenalty: { trigo: 0.25, sorgo: 0.25, soja1: 0, soja2: 0, girasol: 0.1, maiz: 0.5 },
    agronomicNotes: [
      'Alto aporte de carbono y rastrojo abundante con alta relación C/N (catálogo del sistema).',
      'Crítico el estrés térmico-hídrico 15 días antes y después de VT/R1.'
    ]
  },
  trigo: {
    id: 'trigo',
    nameEs: 'Trigo',
    scientificName: 'Triticum aestivum',
    magypName: 'Trigo total',
    magypExcluded: ['Trigo candeal'],
    family: 'Poaceae',
    lifecycle: 'annual',
    season: 'winter',
    doubleCropAfterWheat: false,
    cycleDays: 160,
    stageDays: [25, 60, 45, 30],
    kc: { initial: 0.3, mid: 1.15, end: 0.35 },
    depletionFraction: 0.55,
    rootDepthM: 1.4,
    temperature: { absMin: 5, optMin: 10, optMax: 25, absMax: 30 },
    frostSensitive: false,
    droughtResistance: 'medium',
    nitrogenFixationKgHa: 0,
    residueTnHa: 4,
    coverMonths: 8,
    sowingWindows: {
      norte: [{ startMonth: 6, endMonth: 7 }],
      noa: [{ startMonth: 6, endMonth: 7 }],
      centro: [{ startMonth: 6, endMonth: 8 }]
    },
    soilCompatibility: { mollisol_deep: 0.9, sandy_loam: 0.5, clay_vertisol: 0.6, aridisol_calcareous: 0.6 },
    successionPenalty: { maiz: 0.2, sorgo: 0.2, soja1: 0, soja2: 0, girasol: 0.05, trigo: 0.45 },
    agronomicNotes: [
      'Cobertura invernal del suelo; habilita soja de segunda y conserva humedad tras cosecha.',
      'Golpes de calor en espigazón/llenado y heladas tardías son el principal riesgo (catálogo del sistema).'
    ]
  },
  girasol: {
    id: 'girasol',
    nameEs: 'Girasol',
    scientificName: 'Helianthus annuus',
    magypName: 'Girasol',
    magypExcluded: [],
    family: 'Asteraceae',
    lifecycle: 'annual',
    season: 'summer',
    doubleCropAfterWheat: false,
    cycleDays: 120,
    stageDays: [25, 30, 40, 25],
    kc: { initial: 0.3, mid: 1.05, end: 0.4 },
    depletionFraction: 0.45,
    rootDepthM: 2.2,
    temperature: { absMin: 8, optMin: 18, optMax: 30, absMax: 36 },
    frostSensitive: true,
    droughtResistance: 'high',
    nitrogenFixationKgHa: 0,
    residueTnHa: 5,
    coverMonths: 4,
    sowingWindows: {
      norte: [{ startMonth: 7, endMonth: 9 }],
      noa: [{ startMonth: 8, endMonth: 9 }],
      centro: [{ startMonth: 9, endMonth: 10 }]
    },
    soilCompatibility: { mollisol_deep: 0.8, sandy_loam: 0.8, clay_vertisol: 0.6, aridisol_calcareous: 0.6 },
    successionPenalty: { soja1: 0.1, soja2: 0.1, maiz: 0.05, sorgo: 0.05, trigo: 0, girasol: 0.4 },
    agronomicNotes: [
      'Raíz pivotante profunda que explora estratos freáticos y rompe capas densas (catálogo del sistema).',
      'Poca tolerancia al encharcamiento prolongado; rastrojo de rápida degradación.'
    ]
  },
  sorgo: {
    id: 'sorgo',
    nameEs: 'Sorgo granífero',
    scientificName: 'Sorghum bicolor',
    magypName: 'Sorgo',
    magypExcluded: [],
    family: 'Poaceae',
    lifecycle: 'annual',
    season: 'summer',
    doubleCropAfterWheat: false,
    cycleDays: 125,
    stageDays: [20, 30, 45, 30],
    kc: { initial: 0.3, mid: 1.05, end: 0.6 },
    depletionFraction: 0.55,
    rootDepthM: 2,
    temperature: { absMin: 10, optMin: 20, optMax: 32, absMax: 38 },
    frostSensitive: true,
    droughtResistance: 'high',
    nitrogenFixationKgHa: 0,
    residueTnHa: 7,
    coverMonths: 5,
    sowingWindows: {
      norte: [{ startMonth: 10, endMonth: 12 }],
      noa: [{ startMonth: 10, endMonth: 12 }],
      centro: [{ startMonth: 10, endMonth: 11 }]
    },
    soilCompatibility: { mollisol_deep: 0.7, sandy_loam: 0.9, clay_vertisol: 0.8, aridisol_calcareous: 0.8 },
    successionPenalty: { maiz: 0.25, trigo: 0.2, soja1: 0.05, soja2: 0.05, girasol: 0.05, sorgo: 0.5 },
    agronomicNotes: [
      'Cereal rústico C4: alta biomasa radicular, tolera suelos marginales y sequía (catálogo del sistema).',
      'Sensible al frío en implantación; pulgón amarillo bajo estrés térmico.'
    ]
  }
};

export function getAgronomy(cropId: string): CropAgronomy | null {
  return (PILOT_CROP_IDS as string[]).includes(cropId) ? CROP_AGRONOMY[cropId as CropId] : null;
}

/** Regiones documentadas; las demás (sur, cuyo) no tienen ventanas locales para estos cultivos. */
export function documentedRegions(): RegionKey[] {
  return ['norte', 'noa', 'centro'];
}

/**
 * Kc mensual (media del mes) para un cultivo sembrado en sowMonth.
 * Fuera del ciclo el Kc es 0 (el balance hídrico solo corre dentro de la campaña).
 */
export function kcMonthlyBySowMonth(crop: CropAgronomy, sowMonth: number): number[] {
  const [iniDays, devDays, midDays, lateDays] = crop.stageDays;
  const { initial, mid, end } = crop.kc;
  const stageBoundaries: Array<{ day: number; kc: number }> = [];
  let acc = 0;
  const segments: Array<{ length: number; kc: number }> = [
    { length: iniDays, kc: initial },
    { length: devDays, kc: (initial + mid) / 2 },
    { length: midDays, kc: mid },
    { length: lateDays, kc: (mid + end) / 2 }
  ];
  const tail = { length: 10, kc: end }; // últimos días de maduración
  const days = [...segments, tail];
  for (const seg of days) {
    stageBoundaries.push({ day: acc, kc: seg.kc });
    acc += seg.length;
  }
  const total = acc;
  const monthly = new Array(12).fill(0);
  // Recorre el ciclo día a día (año agrícola de 365 días, sin bisiesto en climatología media).
  const monthStart = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const monthLen = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const sowDayOfYear = monthStart[sowMonth - 1];
  for (let m = 0; m < 12; m++) {
    const mStart = (monthStart[m] - sowDayOfYear + 365) % 365;
    if (mStart >= total) { monthly[m] = 0; continue; }
    const overlapDays = Math.min(monthLen[m], total - mStart);
    let weighted = 0;
    for (let d = 0; d < overlapDays; d++) {
      const day = mStart + d;
      // Kc del día según etapa
      let kc = end;
      for (let s = stageBoundaries.length - 1; s >= 0; s--) {
        if (day >= stageBoundaries[s].day) { kc = stageBoundaries[s].kc; break; }
      }
      weighted += kc;
    }
    monthly[m] = Number((weighted / monthLen[m]).toFixed(3));
  }
  return monthly;
}

/** Meses del ciclo (calendario) en los que el cultivo está presente, para el balance y aptitud. */
export function cycleMonths(crop: CropAgronomy, sowMonth: number): Array<{ month: number; kc: number }> {
  const monthly = kcMonthlyBySowMonth(crop, sowMonth);
  return monthly
    .map((kc, index) => ({ month: index + 1, kc }))
    .filter(entry => entry.kc > 0);
}

/** Mes de siembra nominal de una ventana (el mes inicial). */
export function nominalSowMonth(crop: CropAgronomy, region: RegionKey | undefined): { month: number | null; windowKnown: boolean; detail: string } {
  const windows = (crop.sowingWindows as Record<string, SowingWindow[]> | undefined);
  const candidates = region && windows?.[region] ? windows[region] : undefined;
  if (candidates?.length) return { month: candidates[0].startMonth, windowKnown: true, detail: `Ventana documentada para la región: mes ${candidates[0].startMonth}-${candidates[0].endMonth}.` };
  const fallback = windows?.default;
  if (fallback?.length) return { month: fallback[0].startMonth, windowKnown: false, detail: 'Sin ventana documentada para esta región; se usa referencia general y se advierte.' };
  return { month: null, windowKnown: false, detail: 'Sin ventana de siembra documentada para esta región.' };
}

/** Origen de la ventana: región del establecimiento (si el registro la informa). */
export function regionOfProvince(province: string | undefined): RegionKey | undefined {
  const key = (province ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (!key) return undefined;
  if (['CHACO', 'FORMOSA', 'CORRIENTES', 'MISIONES', 'SANTIAGO DEL ESTERO'].some(p => key.includes(p))) return 'norte';
  if (['SALTA', 'JUJUY', 'TUCUMAN', 'CATAMARCA', 'LA RIOJA'].some(p => key.includes(p))) return 'noa';
  if (['BUENOS AIRES', 'SANTA FE', 'CORDOBA', 'LA PAMPA', 'ENTRE RIOS', 'SAN LUIS'].some(p => key.includes(p))) return 'centro';
  return undefined;
}
