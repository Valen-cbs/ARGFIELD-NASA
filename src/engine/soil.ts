/**
 * Balance hídrico mensual simplificado y documentado del motor de rotaciones.
 *
 * Ecuación conceptual (por mes t, dentro de la ventana de la campaña):
 *   S_t+1 = S_t + P_t + I_t − ETa_t − R_t − D_t
 * con S acotado físicamente a [0, TAW] (agua disponible entre punto de marchitez
 * y capacidad de campo, en mm sobre la profundidad explorada por la raíz).
 *
 * Componentes y justificación:
 *  - P_t: precipitación mensual NASA POWER (PRECTOTCORR agregado), con factor de
 *    escenario si corresponde (hipotético, documentado).
 *  - R_t (escorrentía): método SCS-CN mensualizado (Smax = 25400/CN − 254;
 *    Q = (P−Ia)²/(P+0.8·Smax) si P > Ia con Ia = 0.2·Smax). Es una
 *    simplificación declarada de un método público, no un dato medido del lote.
 *  - ET0: FAO-56 Penman-Monteith mensual (src/engine/climate.ts).
 *  - ETc = Kc · ET0 (FAO-56, coeficiente único por etapa).
 *  - ETa = Ks · Kc · ET0 con Ks = (TAW − Dr)/(TAW − RAW) (FAO-56 ec. 84), que
 *    aplicA el ajuste por estrés hídrico; NUNCA ETa = Kc·ET0 con déficit.
 *  - I_t: riego COMPLEMENTARIO aplicado SOLO si el productor declara riego
 *    disponible Y declara el volumen mensual aplicable (maxMonthlyIrrigationMm).
 *    La disponibilidad y la cantidad son datos distintos: sin volumen declarado
 *    el balance corre en secano (I = 0) y se documenta; NO se asume un caudal
 *    por omisión. Sin riego, I = 0.
 *  - D_t: drenaje profundo = exceso sobre capacidad de campo.
 *
 * Unidades: mm por mes. El paso mensual es una simplificación declarada del
 * balance diario: subestima pulsos cortos y lo documenta cada resultado.
 */

import { CROP_AGRONOMY, CropId, kcMonthlyBySowMonth } from './agronomy';
import { MonthlyClimateCell } from './climate';
import { meanOf, round3 } from './statistics';

export type SoilTexture = 'mollisol_deep' | 'sandy_loam' | 'clay_vertisol' | 'aridisol_calcareous';

export interface DeclaredSoilProperties {
  /** Profundidad efectiva declarada por el productor (m). */
  depthM?: number;
  /** Agua útil total declarada (mm/m). */
  tawMmPerM?: number;
  /** Capacidad de campo declarada (% vol). Con la PMP habilita la conversión de lecturas volumétricas a agua útil. */
  fieldCapacityPctVol?: number;
  /** Punto de marchitez permanente declarado (% vol). Debe ser menor que la capacidad de campo. */
  wiltingPointPctVol?: number;
  /** Materia orgánica declarada (%). Informativa; no entra al balance. */
  organicMatterPct?: number;
  /** Drenaje declarado ('bueno' | 'regular' | 'lento'). */
  drainage?: 'good' | 'fair' | 'slow';
}

/** Puntos de humedad del perfil en % vol, necesarios para convertir lecturas volumétricas (θ) en agua útil. */
export interface SoilMoisturePoints {
  fieldCapacityPctVol: number;
  wiltingPointPctVol: number;
  /** 'declared' = valores declarados por el productor; 'texture-catalog' = estimación por textura del catálogo. */
  source: 'declared' | 'texture-catalog';
}

export interface SoilProfile {
  texture: SoilTexture;
  /** Profundidad efectiva del perfil (m). */
  depthM: number;
  /** Agua útil (mm/m). */
  tawMmPerM: number;
  /** Puntos de humedad (CC y PMP, % vol); sin ellos la conversión de lecturas volumétricas NO es válida. */
  moisturePoints: SoilMoisturePoints | null;
  /** Número de curva SCS mensualizado usado para escorrentía. */
  curveNumber: number;
  /** Clase de drenaje cualitativa. */
  drainage: 'good' | 'fair' | 'slow';
  /** true = propiedades declaradas manualmente por el productor; false = derivadas del tipo de suelo. */
  declared: boolean;
  notes: string[];
}

/**
 * Parámetros por tipo de suelo, derivados del catálogo SOIL_DATABASE de la app (rangos publicados por INTA).
 * Los puntos de humedad (CC/PMP en % vol) son estimaciones por textura coherentes con el agua útil del
 * catálogo: TAW[mm/m] = (CC − PMP) × 1000/100. Referencia general de rangos por textura: FAO-56 (Tabla 19,
 * agua útil por textura) — son estimaciones de catálogo, NO mediciones del lote; el productor puede
 * declarar CC/PMP reales y esos valores tienen precedencia.
 */
const SOIL_BASE: Record<SoilTexture, Omit<SoilProfile, 'texture' | 'declared' | 'notes'>> = {
  mollisol_deep: { depthM: 1.5, tawMmPerM: 150, moisturePoints: { fieldCapacityPctVol: 27, wiltingPointPctVol: 12, source: 'texture-catalog' }, curveNumber: 78, drainage: 'good' },
  sandy_loam: { depthM: 1.0, tawMmPerM: 110, moisturePoints: { fieldCapacityPctVol: 17, wiltingPointPctVol: 6, source: 'texture-catalog' }, curveNumber: 84, drainage: 'good' },
  clay_vertisol: { depthM: 1.2, tawMmPerM: 160, moisturePoints: { fieldCapacityPctVol: 36, wiltingPointPctVol: 20, source: 'texture-catalog' }, curveNumber: 82, drainage: 'slow' },
  aridisol_calcareous: { depthM: 0.8, tawMmPerM: 80, moisturePoints: { fieldCapacityPctVol: 14, wiltingPointPctVol: 6, source: 'texture-catalog' }, curveNumber: 85, drainage: 'fair' }
};

/** Valida CC/PMP declaradas: deben ser plausibles y consistentes (0 < PMP < CC ≤ 60 % vol). */
function declaredMoisturePoints(declared?: DeclaredSoilProperties): { points: SoilMoisturePoints; invalidReason?: string } | null {
  const fc = declared?.fieldCapacityPctVol;
  const wp = declared?.wiltingPointPctVol;
  if (fc === undefined && wp === undefined) return null; // nada declarado: no es una rechazo
  const plausible = (v: number | undefined) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 60;
  if (!plausible(fc) || !plausible(wp)) {
    return { points: null as unknown as SoilMoisturePoints, invalidReason: 'CC/PMP declaradas fuera del rango plausible (0–60 % vol).' };
  }
  if (wp! >= fc!) {
    return { points: null as unknown as SoilMoisturePoints, invalidReason: 'CC/PMP declaradas inconsistentes (PMP ≥ CC).' };
  }
  return { points: { fieldCapacityPctVol: fc!, wiltingPointPctVol: wp!, source: 'declared' } };
}

export function buildSoilProfile(texture: SoilTexture, declared?: DeclaredSoilProperties): SoilProfile {
  const base = SOIL_BASE[texture] ?? SOIL_BASE.mollisol_deep;
  const notes: string[] = [
    'Propiedades derivadas del tipo de suelo del registro (catálogo ArgField). No son una medición del lote.'
  ];
  const declaredFields: string[] = [];
  const depthM = declared?.depthM && declared.depthM > 0.2 && declared.depthM <= 3 ? declared.depthM : base.depthM;
  if (declared?.depthM && declared.depthM !== base.depthM) declaredFields.push(`profundidad ${declared.depthM} m`);
  const tawMmPerM = declared?.tawMmPerM && declared.tawMmPerM > 20 && declared.tawMmPerM <= 300 ? declared.tawMmPerM : base.tawMmPerM;
  if (declared?.tawMmPerM && declared.tawMmPerM !== base.tawMmPerM) declaredFields.push(`agua útil ${declared.tawMmPerM} mm/m`);
  if (declared?.organicMatterPct) declaredFields.push(`materia orgánica ${declared.organicMatterPct}% (informativa)`);
  const drainage = declared?.drainage ?? base.drainage;
  // Puntos de humedad: si el productor los declara (y son consistentes), tienen precedencia;
  // si declara valores inválidos se cae al catálogo de textura y se documenta; si no declara nada, catálogo.
  let moisturePoints: SoilMoisturePoints;
  const declaredPoints = declaredMoisturePoints(declared);
  if (declaredPoints && !declaredPoints.invalidReason) {
    moisturePoints = declaredPoints.points;
    declaredFields.push(`CC ${moisturePoints.fieldCapacityPctVol}% vol / PMP ${moisturePoints.wiltingPointPctVol}% vol`);
  } else {
    moisturePoints = { ...base.moisturePoints! };
    if (declaredPoints?.invalidReason) {
      notes.push(`CC/PMP declaradas por el productor NO se usan (${declaredPoints.invalidReason}); se usan las estimaciones por textura del catálogo.`);
    }
  }
  notes.push(`Puntos de humedad para conversión de lecturas volumétricas: CC ${moisturePoints.fieldCapacityPctVol}% / PMP ${moisturePoints.wiltingPointPctVol}% vol (${moisturePoints.source === 'declared' ? 'declarados por el productor' : 'estimados por textura del catálogo, no medidos en el lote'}).`);
  if (declaredFields.length) {
    notes.push(`Valores ajustados con propiedades DECLARADAS por el productor: ${declaredFields.join(', ')}.`);
  }
  return { texture, depthM, tawMmPerM, moisturePoints, curveNumber: base.curveNumber, drainage, declared: declaredFields.length > 0, notes };
}

/** Agua útil total (mm) limitada por la raíz del cultivo y el perfil. */
export function totalAvailableWaterMm(profile: SoilProfile, rootDepthM: number): number {
  const effectiveDepth = Math.max(0.2, Math.min(profile.depthM, rootDepthM));
  return Math.round(effectiveDepth * profile.tawMmPerM);
}

/** Resultado de la conversión de una lectura volumétrica (θ, % vol) a almacenamiento útil (mm). */
export type VolumetricStorageResult =
  | { ok: true; storageMm: number; tawMm: number; detail: string }
  | { ok: false; tawMm: number; reason: string };

/**
 * Convierte humedad volumétrica (θ, % vol) en almacenamiento de agua útil (mm).
 *
 * Conversión físicamente válida (FAO-56, ec. 42–43 sobre el estado de humedad del perfil):
 *   S₀ = (θ − PMP) / (CC − PMP) × TAW   con (θ − PMP)/(CC − PMP) acotado a [0, 1]
 * — NO es válido multiplicar θ por TAW: eso trataría todo el agua del suelo (incluso la
 *   retenida bajo el punto de marchitez) como agua disponible.
 * La conversión SOLO es válida cuando el perfil tiene puntos de humedad (CC y PMP) definidos
 * y consistentes; si no existen, la lectura NO se usa para inicializar el almacenamiento.
 * Además: θ fuera del rango físico plausible (0–60 % vol, porosidad máxima de suelos minerales)
 * se rechaza como error de sensor; θ ≤ PMP da 0 mm útil; θ ≥ CC da el tope TAW (exceso drena).
 */
export function storageFromVolumetricPct(pctVol: number, profile: SoilProfile, rootDepthM: number): VolumetricStorageResult {
  const tawMm = totalAvailableWaterMm(profile, rootDepthM);
  if (!Number.isFinite(pctVol)) {
    return { ok: false, tawMm, reason: 'la lectura no es un número finito' };
  }
  if (pctVol < 0 || pctVol > 60) {
    return { ok: false, tawMm, reason: `lectura ${pctVol} % vol fuera del rango físico plausible (0–60 % vol): probable error de sensor` };
  }
  const points = profile.moisturePoints;
  if (!points) {
    return { ok: false, tawMm, reason: 'el perfil no tiene puntos de humedad (CC/PMP) definidos: la conversión % vol → agua útil no es válida y la lectura no se usa' };
  }
  if (!(points.wiltingPointPctVol < points.fieldCapacityPctVol)) {
    return { ok: false, tawMm, reason: 'parámetros de humedad inconsistentes (PMP ≥ CC): la conversión no es válida y la lectura no se usa' };
  }
  const fraction = Math.max(0, Math.min(1, (pctVol - points.wiltingPointPctVol) / (points.fieldCapacityPctVol - points.wiltingPointPctVol)));
  const origin = points.source === 'declared' ? 'declarados por el productor' : 'estimados por textura del catálogo (no medidos en el lote)';
  return {
    ok: true,
    storageMm: Math.round(fraction * tawMm),
    tawMm,
    detail: `Almacenamiento inicial desde humedad volumétrica θ = ${pctVol}% vol: con PMP ${points.wiltingPointPctVol}% y CC ${points.fieldCapacityPctVol}% (${origin}), fracción de agua útil (θ−PMP)/(CC−PMP) = ${fraction.toFixed(2)} → ${Math.round(fraction * tawMm)} mm de TAW ${Math.round(tawMm)} mm. Conversión sobre la profundidad indicada; no extrapola humedad a capas no observadas.`
  };
}

export interface WaterBalanceInput {
  /** Climatología mensual del escenario (P ajustado; ET0 incluida o recalculada por el llamador). */
  monthly: MonthlyClimateCell[];
  /** Días de lluvia medios por mes (P ≥ 1 mm) del período climático; base para discretizar la escorrentía. */
  rainDaysByMonth: Array<number | null>;
  /** ETo mensual (mm) del escenario, índice 0 = enero. */
  etoMm: Array<number | null>;
  /** Mes de siembra nominal (1-12). */
  sowMonth: number;
  /** Kc por mes (0 fuera del ciclo) — de kcMonthlyBySowMonth. */
  kcByMonth: number[];
  /** Agua útil total del perfil efectivo (mm). */
  tawMm: number;
  /** Almacenamiento inicial (mm), [0, TAW]. */
  initialStorageMm: number;
  initialStorageSource: string;
  irrigationAvailable: boolean;
  /**
   * Tope mensual de riego COMPLEMENTARIO DECLARADO por el productor (mm).
   * null = riego declarado disponible pero SIN volumen declarado: el balance corre en
   * secano (I = 0) y se documenta. La disponibilidad y la cantidad son datos distintos;
   * el modelo NO asume un caudal por omisión.
   */
  maxMonthlyIrrigationMm: number | null;
  curveNumber: number;
}

export interface MonthlyBalanceRow {
  month: number;
  precipMm: number | null;
  etoMm: number | null;
  kc: number;
  etcMm: number | null;
  irrigMm: number;
  runoffMm: number | null;
  drainageMm: number | null;
  etRealMm: number | null;
  ks: number | null;
  storageMm: number;
}

export interface WaterBalanceResult {
  ok: boolean;
  missingReason?: string;
  months: MonthlyBalanceRow[];
  totals: {
    precipMm: number | null;
    irrigMm: number;
    runoffMm: number | null;
    drainageMm: number | null;
    etcMm: number | null;
    etRealMm: number | null;
    stressIndex: number | null; // 1 − ΣETa/ΣETc
    supplyDemandRatio: number | null; // (P+I)/ETc
    finalStorageMm: number | null;
    monthsStressed: number;
  };
}

/**
 * Balance mensual de una campaña. Si falta P o ETo de un mes del ciclo,
 * devuelve ok=false con la razón (no se sustituye por cero ni por promedios).
 * El riego declarado disponible pero sin volumen declarado NO agrega agua (I = 0).
 */
export function runCampaignWaterBalance(input: WaterBalanceInput): WaterBalanceResult {
  const { monthly, etoMm, sowMonth, kcByMonth, tawMm } = input;
  const maxIrrigation = input.irrigationAvailable && input.maxMonthlyIrrigationMm !== null && input.maxMonthlyIrrigationMm > 0
    ? input.maxMonthlyIrrigationMm
    : 0;
  const months: MonthlyBalanceRow[] = [];
  // SCS-CN mensualizado
  const smax = 25400 / input.curveNumber - 254;
  const ia = 0.2 * smax;
  let storage = Math.max(0, Math.min(tawMm, input.initialStorageMm));
  let ok = true;
  let missingReason: string | undefined;
  let monthsInCycle = 0;
  let totalPrecip = 0, hasPrecip = false;
  let totalIrrig = 0;
  let totalRunoff = 0, hasRunoff = false;
  let totalDrain = 0, hasDrain = false;
  let totalEtc = 0, hasEtc = false;
  let totalEta = 0;
  let monthsStressed = 0;
  for (let offset = 0; offset < 12; offset++) {
    const month = ((sowMonth - 1 + offset) % 12) + 1;
    const kc = kcByMonth[month - 1];
    if (kc <= 0) continue;
    monthsInCycle++;
    const cell = monthly[month - 1];
    const eto = etoMm[month - 1];
    if (!cell || cell.precipMm === null) { ok = false; missingReason = `Falta precipitación mensual (${month}).`; }
    if (eto === null || eto === undefined) { ok = false; missingReason = `Falta ETo mensual (${month}) por insumos climáticos incompletos.`; }
    const p = ok ? cell.precipMm as number : 0;
    // Escorrentía SCS-CN por pulso: el método se calibró para lluvias de evento,
    // no para totales mensuales. Se divide la precipitación del mes entre sus
    // días de lluvia medios (NASA POWER) y se suma la escorrentía de cada pulso.
    // Sin dato de días de lluvia, cae a un único pulso mensual (se documenta).
    const rainDays = input.rainDaysByMonth[month - 1];
    const events = rainDays !== null && rainDays !== undefined && rainDays >= 1 ? Math.min(30, Math.round(rainDays)) : 1;
    let q = 0;
    if (events > 1) {
      const perEvent = p / events;
      for (let e = 0; e < events; e++) {
        if (perEvent > ia) q += (perEvent - ia) ** 2 / (perEvent + 0.8 * smax);
      }
    } else if (p > ia) {
      q = (p - ia) ** 2 / (p + 0.8 * smax);
    }
    // Riego complementario: cubre el agotamiento previo hasta el tope mensual
    const depletionBefore = tawMm - storage;
    const irrig = maxIrrigation > 0 ? Math.min(maxIrrigation, Math.max(0, depletionBefore)) : 0;
    // Recarga del almacén
    const storageAfterInputs = Math.min(tawMm, storage + p - q + irrig);
    const drain = Math.max(0, storage + p - q + irrig - tawMm);
    // Estrés hídrico (FAO-56 ec. 82-84)
    let etcMm: number | null = null;
    let ks: number | null = null;
    let etaMm: number | null = null;
    if (eto !== null && eto !== undefined) {
      etcMm = kc * eto;
      const raw = 0.5 * tawMm; // RAW aproximado con p medio 0.5 en el paso mensual (se documenta)
      const depletion = tawMm - storageAfterInputs;
      ks = depletion <= raw ? 1 : Math.max(0, Math.min(1, (tawMm - depletion) / (tawMm - raw)));
      etaMm = ks * etcMm;
      if (ks < 1) monthsStressed++;
    }
    storage = Math.max(0, Math.min(tawMm, storageAfterInputs - (etaMm ?? 0)));
    months.push({
      month,
      precipMm: ok ? round3(p) : null,
      etoMm: eto === null || eto === undefined ? null : round3(eto),
      kc,
      etcMm: round3(etcMm),
      irrigMm: round3(irrig) ?? 0,
      runoffMm: round3(q),
      drainageMm: round3(drain),
      etRealMm: round3(etaMm),
      ks: round3(ks),
      storageMm: round3(storage) ?? 0
    });
    totalPrecip += p; hasPrecip = true;
    totalIrrig += irrig;
    totalRunoff += q; hasRunoff = true;
    totalDrain += drain; hasDrain = true;
    if (etcMm !== null) { totalEtc += etcMm; hasEtc = true; totalEta += etaMm ?? 0; }
    if (monthsInCycle >= 6) break; // ciclos de hasta ~6 meses cubren todos los cultivos piloto
  }
  if (monthsInCycle === 0) return { ok: false, missingReason: 'El mes de siembra no coincide con ninguna campaña del cultivo.', months: [], totals: emptyTotals() };
  if (!ok) return { ok: false, missingReason: missingReason ?? 'Insumos climáticos incompletos para el ciclo.', months, totals: emptyTotals() };
  const stressIndex = hasEtc && totalEtc > 0 ? 1 - totalEta / totalEtc : null;
  const supplyDemand = hasEtc && totalEtc > 0 ? (totalPrecip + totalIrrig) / totalEtc : null;
  return {
    ok: true,
    months,
    totals: {
      precipMm: hasPrecip ? round3(totalPrecip) : null,
      irrigMm: round3(totalIrrig) ?? 0,
      runoffMm: hasRunoff ? round3(totalRunoff) : null,
      drainageMm: hasDrain ? round3(totalDrain) : null,
      etcMm: hasEtc ? round3(totalEtc) : null,
      etRealMm: hasEtc ? round3(totalEta) : null,
      stressIndex: round3(stressIndex),
      supplyDemandRatio: round3(supplyDemand),
      finalStorageMm: round3(storage),
      monthsStressed
    }
  };
}

function emptyTotals(): WaterBalanceResult['totals'] {
  return { precipMm: null, irrigMm: 0, runoffMm: null, drainageMm: null, etcMm: null, etRealMm: null, stressIndex: null, supplyDemandRatio: null, finalStorageMm: null, monthsStressed: 0 };
}

/** Kc por mes para un cultivo piloto y mes de siembra dado. */
export function kcByMonthFor(cropId: CropId, sowMonth: number): number[] {
  const crop = CROP_AGRONOMY[cropId];
  return kcMonthlyBySowMonth(crop, sowMonth);
}

/** Almacenamiento inicial por defecto: 50% del agua útil (decisión del modelo, se documenta). */
export function defaultInitialStorage(tawMm: number): { storageMm: number; source: string } {
  return {
    storageMm: Math.round(tawMm * 0.5),
    source: `Sin lectura reciente de humedad de suelo: se asume 50% del agua útil (${Math.round(tawMm * 0.5)} mm). Suposición explícita del modelo, no una medición.`
  };
}

export function meanStorageMonths(months: MonthlyBalanceRow[]): number | null {
  return round3(meanOf(months.map(m => m.storageMm)));
}
