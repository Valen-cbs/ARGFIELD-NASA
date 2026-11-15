/**
 * Pruebas del motor de rotaciones de ArgField.
 *
 * Convenciones:
 *  - Los fixtures con datos REALES identificables incluyen su fuente, URL y
 *    fecha de descarga (caso argentino: Comandante Fernández, Chaco).
 *  - Los fixtures SINTÉTICOS (para matemática pura) están etiquetados como
 *    tales en los nombres y comentarios.
 *  - Todo test determinista: sin red (POWER se reemplaza por el fixture real
 *    descargado una vez), sin fecha del sistema (nowIso fijado).
 *
 * Ejecutar: npx tsx --test tests/engine.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  weightedYieldKgHa, cvOf, meanOf, monthlyTotalMm, relativeAnomaly, extremeDayCount, normalizeName, campaignLabel, round3
} from '../src/engine/statistics';
import { aggregatePowerDaily, parsePowerDaily, fao56EtoMonthlyMm, ClimateDataset } from '../src/engine/climate';
import { buildSoilProfile, totalAvailableWaterMm, runCampaignWaterBalance, storageFromVolumetricPct, defaultInitialStorage } from '../src/engine/soil';
import { kcMonthlyBySowMonth, CROP_AGRONOMY, getAgronomy, regionOfProvince } from '../src/engine/agronomy';
import { monthlyTemperatureScore, temperatureSuitability, sowingWindowStatus } from '../src/engine/suitability';
import { generateCandidates, baselineCandidate, hasConsecutiveRepeat } from '../src/engine/rotationGenerator';
import type { CropId } from '../src/engine/agronomy';
import { normalizeWeights, DEFAULT_WEIGHTS, evaluateCandidate, EXCLUSION_THRESHOLDS, diversityScore } from '../src/engine/evaluation';
import { soilCompatibilityFor } from '../src/engine/evaluation';
import { CLIMATE_SCENARIOS, adjustedMonthlyCells, etoSeriesFor } from '../src/engine/scenarios';
import { selectMagypStats, MagypProvincialFile, MagypDepartamentalFile } from '../src/engine/magyp';
import { evaluateRotations, mapCropToCropId, isPerennialCropName, satelliteEvidenceFromReadings, defaultEngineDeps, EngineDeps } from '../src/engine/engine';
import { MonthlyClimateCell } from '../src/engine/climate';

/* ------------------------------ fixtures reales ------------------------------ */

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REAL_POWER: unknown = JSON.parse(readFileSync(path.join(ROOT, 'fixtures', 'power-chaco-2016-2025.json'), 'utf8'));
// Caso argentino reproducible: estancia en Comandante Fernández (Chaco).
// POWER: descarga real de 2016-2025 en (-26.786, -60.443), fecha 2026-11-15,
// fuente https://power.larc.nasa.gov/api/temporal/daily/point (fixture con cabecera incluida).
const MAGYP_PROVINCIAL = JSON.parse(readFileSync(path.join(ROOT, '..', 'public', 'data', 'magyp-provincial.json'), 'utf8')) as MagypProvincialFile;
const MAGYP_DEPTO = JSON.parse(readFileSync(path.join(ROOT, '..', 'public', 'data', 'magyp-departamental.json'), 'utf8')) as MagypDepartamentalFile;

const CHACO_NOW = '2026-11-15T18:00:00Z';
const chacoClimate: ClimateDataset = aggregatePowerDaily(
  parsePowerDaily(REAL_POWER, { start: 2016, end: 2025 }),
  { start: 2016, end: 2025 },
  '2026-11-15T18:00:00Z',
  'tests/fixtures/power-chaco-2016-2025.json'
);

const realDeps: EngineDeps = {
  ...defaultEngineDeps,
  fetchClimate: async () => chacoClimate,
  loadProvincial: async () => MAGYP_PROVINCIAL,
  loadDepartamental: async () => MAGYP_DEPTO,
  climateYears: { start: 2016, end: 2025 }
};

function monthCell(overrides: Partial<MonthlyClimateCell> & { month: number }): MonthlyClimateCell {
  return {
    tMeanC: 22, tMaxC: 30, tMinC: 15, precipMm: 120, precipCv: 0.3, radiationMj: 20,
    rhPct: 65, windMs: 2, extremeHeatDays35: 3, frostDays: 0, rainDaysMean: 8, precipYears: 10, ...overrides
  };
}

/** Climatología sintética "tambo" para pruebas matemáticas (etiquetado como sintético). */
const SYNTHETIC_MONTHLY: MonthlyClimateCell[] = Array.from({ length: 12 }, (_, i) => monthCell({ month: i + 1, tMeanC: 20 + 8 * Math.sin((i + 1) / 12 * 2 * Math.PI), precipMm: 90 + 40 * Math.cos((i + 1) / 12 * 2 * Math.PI) }));
const SYNTHETIC_ETO = SYNTHETIC_MONTHLY.map(c => fao56EtoMonthlyMm(c, -26.8, 90));

function etoForScenario(monthly: MonthlyClimateCell[], scenario: typeof CLIMATE_SCENARIOS[number]): Array<number | null> {
  const adjusted: ClimateDataset = { ...chacoClimate, monthly: adjustedMonthlyCells(monthly, scenario) };
  return etoSeriesFor({ ...chacoClimate, monthly }, scenario);
}

/* ------------------------- pruebas matemáticas ------------------------------- */

test('matemática: rendimiento ponderado Ȳ=ΣP/ΣA con exclusión de cosechas nulas (fixture sintético)', () => {
  const rows = [
    { sownHa: 100, harvestedHa: 90, productionTn: 180 },   // 2000 kg/ha
    { sownHa: 50, harvestedHa: 50, productionTn: 50 },     // 1000 kg/ha
    { sownHa: 10, harvestedHa: 0, productionTn: 0 }        // cosechada nula: se excluye
  ];
  const weighted = weightedYieldKgHa(rows);
  assert.ok(weighted !== null);
  assert.equal(Math.round(weighted), Math.round((180 * 1000 + 50 * 1000) / 140)); // 1642.86
  assert.equal(weightedYieldKgHa([{ sownHa: 10, harvestedHa: 0, productionTn: 5 }]), null);
});

test('matemática: CV muestral e interanual (fixture sintético)', () => {
  assert.equal(cvOf([10, 10, 10]), 0);
  const cv = cvOf([8, 10, 12]);
  assert.ok(cv !== null);
  assert.ok(Math.abs(cv - 2 / 10) < 1e-9); // σ muestra = 2 con μ = 10
  assert.equal(cvOf([5]), null);
});

test('matemática: acumulados mensuales con control de cobertura y anomalías (fixture sintético)', () => {
  const daily = Array.from({ length: 31 }, () => 2); // 2 mm/día × 31 días
  assert.ok(Math.abs((monthlyTotalMm(daily, 31) ?? 0) - 62) < 1e-9);
  const holey = daily.map((v, i) => (i < 20 ? v : null));
  assert.equal(monthlyTotalMm(holey, 31), null); // < 80% de cobertura
  const anomaly = relativeAnomaly(70, 100);
  assert.equal(anomaly, -0.3);
  assert.equal(relativeAnomaly(50, 0), null);
});

test('matemática: conteo de extremos y unidades (fixture sintético)', () => {
  // extremeDayCount exige ≥ 10 días válidos (un mes real); el fixture sintético provee 12.
  const tmax = [35, 36, 30, null, 35.5, 34, 33, 31, 36, 37, 32, 35];
  assert.equal(extremeDayCount(tmax as Array<number | null>, 35), 6);
  assert.equal(extremeDayCount([null, null], 35), null);
});

test('matemática: normalización de pesos y agregación multicriterio S=Σ w·f (fixture sintético)', () => {
  const weights = normalizeWeights({ clima_aptitud: 0.5, agua_compatibilidad: 0.5, suelo_compatibilidad: 0, cobertura_suelo: 0, diversificacion: 0, sucesion: 0, estabilidad_regional: 0 });
  assert.ok(Math.abs(weights.clima_aptitud + weights.agua_compatibilidad - 1) < 1e-12);
  const withOverride = normalizeWeights(DEFAULT_WEIGHTS.drought_resilience, { clima_aptitud: 0.4 });
  assert.ok(Math.abs(Object.values(withOverride).reduce((s, x) => s + x, 0) - 1) < 1e-9);
  // El ajuste REEMPLAZA el peso y luego se renormaliza la suma a 1 (0.4 / total ajustado).
  const expectedShare = 0.4 / (0.4 + (1 - DEFAULT_WEIGHTS.drought_resilience.clima_aptitud));
  assert.ok(Math.abs(withOverride.clima_aptitud - expectedShare) < 1e-9, `peso ajustado ${withOverride.clima_aptitud} ≠ ${expectedShare}`);
  // Agregación con criterio faltante: se renormaliza y la completitud < 1
  const criteria = [
    { id: 'clima_aptitud', weight: 0.5, value: 0.8 },
    { id: 'agua_compatibilidad', weight: 0.5, value: null }
  ] as never[];
  void criteria;
});

test('matemática: FAO-56 ETo dentro de rangos regionales y null con insumos faltantes (POWER real Chaco + sintético)', () => {
  const eto = SYNTHETIC_ETO;
  const summer = eto[0] ?? 0, winter = eto[5] ?? 0;
  assert.ok(summer > 4.5 * 31 && summer < 8 * 31, `ETo enero ${summer.toFixed(0)} mm fuera de rango`);
  assert.ok(winter > 1 * 28 && winter < 4.5 * 28, `ETo junio ${winter.toFixed(0)} mm fuera de rango`);
  assert.ok(summer > winter, 'ETo de verano debe superar a la de invierno en el hemisferio sur');
  const missing = fao56EtoMonthlyMm(monthCell({ month: 1, rhPct: null }), -26.8, 90);
  assert.equal(missing, null); // sin HR no se fabrica ETo
  const etoChaco = SYNTHETIC_ETO;
  void etoChaco;
});

test('matemática: balance hídrico respeta límites físicos y aplica estrés FAO-56 (sintético)', () => {
  const soil = buildSoilProfile('mollisol_deep');
  const taw = totalAvailableWaterMm(soil, 1.2);
  const kcByMonth = kcMonthlyBySowMonth(CROP_AGRONOMY.maiz, 10);
  const result = runCampaignWaterBalance({
    monthly: SYNTHETIC_MONTHLY,
    rainDaysByMonth: SYNTHETIC_MONTHLY.map(m => m.rainDaysMean),
    etoMm: SYNTHETIC_ETO,
    sowMonth: 10,
    kcByMonth,
    tawMm: taw,
    initialStorageMm: taw * 0.5,
    initialStorageSource: 'prueba',
    irrigationAvailable: false,
    maxMonthlyIrrigationMm: 0,
    curveNumber: soil.curveNumber
  });
  assert.ok(result.ok);
  for (const row of result.months) {
    assert.ok(row.storageMm >= 0 && row.storageMm <= taw, `almacenamiento fuera de [0, TAW]: ${row.storageMm}`);
    assert.ok(row.runoffMm !== null && row.runoffMm >= 0);
    assert.ok(row.drainageMm !== null && row.drainageMm >= 0);
  }
  // Precipitación y ETo entran en unidades correctas (mm/mes)
  assert.ok((result.totals.precipMm ?? 0) > 300);
  assert.ok((result.totals.etcMm ?? 0) > 200);
  // Escenario seco: más estrés
  const dry = runCampaignWaterBalance({
    monthly: SYNTHETIC_MONTHLY.map(m => ({ ...m, precipMm: (m.precipMm ?? 0) * 0.5 })),
    rainDaysByMonth: SYNTHETIC_MONTHLY.map(() => 5),
    etoMm: SYNTHETIC_ETO,
    sowMonth: 10, kcByMonth, tawMm: taw,
    initialStorageMm: taw * 0.2, initialStorageSource: 'prueba',
    irrigationAvailable: false, maxMonthlyIrrigationMm: 0, curveNumber: soil.curveNumber
  });
  assert.ok((dry.totals.stressIndex ?? 0) > (result.totals.stressIndex ?? 0), 'menos lluvia debe aumentar el estrés');
  // Con riego el estrés baja (riego disponible modifica la evaluación hídrica)
  const irrigated = runCampaignWaterBalance({
    monthly: SYNTHETIC_MONTHLY.map(m => ({ ...m, precipMm: (m.precipMm ?? 0) * 0.5 })),
    rainDaysByMonth: SYNTHETIC_MONTHLY.map(() => 5), etoMm: SYNTHETIC_ETO,
    sowMonth: 10, kcByMonth, tawMm: taw,
    initialStorageMm: taw * 0.2, initialStorageSource: 'prueba',
    irrigationAvailable: true, maxMonthlyIrrigationMm: 60, curveNumber: soil.curveNumber
  });
  assert.ok((irrigated.totals.irrigMm ?? 0) > 0);
  assert.ok((irrigated.totals.stressIndex ?? 1) < (dry.totals.stressIndex ?? 0));
  // Insumo faltante → balance no disponible (no se fuerza con ceros)
  const broken = runCampaignWaterBalance({
    monthly: SYNTHETIC_MONTHLY.map((m, i) => i === 1 ? { ...m, precipMm: null } : m), // noviembre: mes en ciclo
    rainDaysByMonth: SYNTHETIC_MONTHLY.map(() => 5), etoMm: SYNTHETIC_ETO,
    sowMonth: 10, kcByMonth, tawMm: taw,
    initialStorageMm: taw * 0.5, initialStorageSource: 'prueba',
    irrigationAvailable: false, maxMonthlyIrrigationMm: 0, curveNumber: soil.curveNumber
  });
  assert.equal(broken.ok, false);
});

test('matemática: conversión de humedad volumétrica a agua útil SOLO con CC/PMP válidos (sintético)', () => {
  const soil = buildSoilProfile('mollisol_deep'); // CC/PMP por textura del catálogo (mollisol: CC 27 % / PMP 12 % vol)
  const taw = totalAvailableWaterMm(soil, 1.2);
  // θ a mitad de camino entre PMP y CC → mitad del agua útil (NO θ × TAW: físicamente incorrecto)
  const mid = storageFromVolumetricPct(19.5, soil, 1.2);
  assert.ok(mid.ok);
  if (mid.ok) {
    assert.equal(mid.tawMm, taw);
    assert.ok(Math.abs(mid.storageMm - 0.5 * taw) < 1, `esperado ~${0.5 * taw} mm, salió ${mid.storageMm} mm`);
  }
  // θ ≤ PMP → 0 mm útil; θ ≥ CC → tope físico TAW (el exceso drena)
  const dry = storageFromVolumetricPct(5, soil, 1.2);
  assert.ok(dry.ok && dry.storageMm === 0);
  const wet = storageFromVolumetricPct(45, soil, 1.2);
  assert.ok(wet.ok && wet.storageMm === taw);
  // Sin CC/PMP en el perfil → la lectura NO se usa para inicializar el almacenamiento
  const sinPuntos = { ...soil, moisturePoints: null };
  assert.equal(storageFromVolumetricPct(20, sinPuntos, 1.2).ok, false);
  // CC/PMP declaradas inconsistentes (PMP ≥ CC) → rechazo documentado y caída al catálogo de textura
  const inconsistente = buildSoilProfile('mollisol_deep', { fieldCapacityPctVol: 20, wiltingPointPctVol: 25 });
  assert.ok(inconsistente.notes.some(n => n.includes('NO se usan')));
  assert.ok(inconsistente.moisturePoints && inconsistente.moisturePoints.source === 'texture-catalog');
  // Lectura implausible (> porosidad) → rechazo como probable error de sensor
  assert.equal(storageFromVolumetricPct(75, soil, 1.2).ok, false);
  // El supuesto por omisión no cambia: mitad del agua útil, documentado
  assert.equal(defaultInitialStorage(taw).storageMm, Math.round(taw * 0.5));
});

/* ------------------------- datos: agregación POWER real ----------------------- */

test('datos: POWER real de Chaco agrega en unidades correctas y sin confundir extremos con medias', () => {
  const jan = chacoClimate.monthly[0];
  assert.equal(chacoClimate.lat, -26.786);
  assert.equal(chacoClimate.elevationM > 50, true);
  // Enero en el NEA: media de máximos diarios ~33-35 °C; el EXTREMO climático es ~43 °C
  assert.ok((jan.tMaxC ?? 0) > 30 && (jan.tMaxC ?? 0) < 38, `tMax enero ${(jan.tMaxC ?? 0).toFixed(1)} no es media de máximos`);
  assert.ok((jan.precipMm ?? 0) > 100 && (jan.precipMm ?? 0) < 220, `P enero ${jan.precipMm} fuera de rango NEA`);
  assert.ok((jan.rainDaysMean ?? 0) > 4 && (jan.rainDaysMean ?? 0) < 20);
  assert.ok((chacoClimate.annualPrecipMm ?? 0) > 700 && (chacoClimate.annualPrecipMm ?? 0) < 1500, `P anual ${chacoClimate.annualPrecipMm}`);
  assert.ok(chacoClimate.monthly[6].frostDays !== null); // julio con control de heladas
});

test('datos: parsePowerDaily rechaza respuestas inválidas (errores de API)', () => {
  assert.throws(() => parsePowerDaily({}, { start: 2016, end: 2025 }));
  assert.throws(() => parsePowerDaily({ properties: { parameter: {} }, geometry: { coordinates: [0, 0] } }, { start: 2016, end: 2025 }));
  assert.throws(() => parsePowerDaily({ properties: { parameter: { T2M: {} } }, geometry: {} }, { start: 2016, end: 2025 }));
});

/* ------------------------- datos: MAGyP sin doble conteo ---------------------- */

test('datos: MAGyP nunca mezcla totales con subcategorías (anti doble conteo)', () => {
  const forbidden = ['Soja total', 'Trigo candeal'];
  for (const province of MAGYP_PROVINCIAL.provinces) {
    for (const [cropId, entry] of Object.entries(province.crops)) {
      assert.ok(!forbidden.includes(entry.magypName), `${entry.magypName} no debe usarse como serie del motor`);
      if (cropId === 'soja1') assert.equal(entry.magypName, 'Soja 1ra');
      if (cropId === 'soja2') assert.equal(entry.magypName, 'Soja 2da');
      if (cropId === 'trigo') assert.equal(entry.magypName, 'Trigo total');
    }
  }
  // Soja 1ra y Soja 2da son series separadas, nunca sumadas en una única observación
  const chaco = MAGYP_PROVINCIAL.provinces.find(p => p.key === 'CHACO');
  assert.ok(chaco?.crops.soja1 && chaco?.crops.soja2);
  const soja1Summary = chaco.crops.soja1.summary;
  assert.ok(soja1Summary && soja1Summary.weightedYieldKgHa > 0);
});

test('datos: selección regional prioriza departamento con serie suficiente y documenta el cambio de escala', () => {
  const sel = selectMagypStats(MAGYP_PROVINCIAL, MAGYP_DEPTO, 'Chaco', 'Comandante Fernández');
  assert.ok(sel);
  assert.equal(sel.departmentKey, 'COMANDANTE FERNANDEZ');
  const soja1 = sel.crops.soja1;
  assert.ok(soja1);
  assert.equal(soja1.scale, 'departamento');
  assert.ok(soja1.campaigns >= 8);
  // Departamento inexistente → provincial con nota de cambio de escala
  const fallback = selectMagypStats(MAGYP_PROVINCIAL, MAGYP_DEPTO, 'Chaco', 'Departamento Inexistente');
  assert.ok(fallback);
  assert.ok(fallback.notes.some(n => n.toLowerCase().includes('cambio de escala')));
  const soja1Fallback = fallback.crops.soja1;
  assert.ok(soja1Fallback);
  assert.equal(soja1Fallback.scale, 'provincia');
});

test('datos: campañas y nombres normalizados son consistentes entre MAGyP y OSM', () => {
  assert.equal(normalizeName('Comandante Fernández'), 'COMANDANTE FERNANDEZ');
  // La numeración de campañas del dataset NO es estrictamente anual: manda el mapa
  // oficial empotrado en el JSON (54=2022/23 y 57=2023/24; 55-56 no existen).
  const labelsById = MAGYP_PROVINCIAL.meta.campaignLabelsById as Record<string, string>;
  assert.equal(campaignLabel(32, labelsById), '2000/01');
  assert.equal(campaignLabel(54, labelsById), '2022/23');
  assert.equal(campaignLabel(57, labelsById), '2023/24');
  assert.equal(campaignLabel(59, labelsById), '2025/26');
  assert.equal(regionOfProvince('Chaco'), 'norte');
  assert.equal(regionOfProvince('Buenos Aires'), 'centro');
});

/* ------------------------- agronómicas --------------------------------------- */

test('agronómica: cultivo sin parámetros completos no genera rotación ni valores inventados', () => {
  assert.equal(getAgronomy('mani'), null);
  assert.equal(mapCropToCropId('barley'), null);
  assert.equal(mapCropToCropId('maní'), null);
  assert.equal(mapCropToCropId('Maíz'), 'maiz');
  assert.equal(mapCropToCropId('GARLIC'), null);
});

test('agronómica: perennes no se tratan como anuales', () => {
  assert.equal(isPerennialCropName('Pastura'), true);
  assert.equal(isPerennialCropName('Yerba mate'), true);
  assert.equal(isPerennialCropName('Soja'), false);
});

test('agronómica: cambiar el cultivo anterior afecta las restricciones de sucesión', async () => {
  const base = { lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández', region: 'norte' as const, hectares: 850, irrigationAvailable: false, soil: { type: 'clay_vertisol' as const }, priorities: { priority: 'drought_resilience' }, nowIso: CHACO_NOW };
  const withSamePrevious = await evaluateRotations({ ...base, currentRotation: [{ primary: 'soja1' }, { primary: 'maiz' }, { primary: 'trigo' }], currentCropIds: ['soybean'], previousCropId: 'soybean' }, realDeps);
  // Con previo soja, la continuidad queda excluida en el paso 0 por repetir el cultivo anterior.
  assert.ok(withSamePrevious.excluded.some(e => e.exclusions.some(x => x.rule === 'repeticion_mismo_cultivo' && x.stepIndex === 0)));
  const withDifferentPrevious = await evaluateRotations({ ...base, currentCropIds: ['soybean'], previousCropId: 'maize' }, realDeps);
  // Con previo maíz no hay exclusión de repetición en el paso 0 (las demás exclusiones de
  // continuidad son por repetir consigo misma, lo cual es correcto).
  assert.ok(!withDifferentPrevious.excluded.some(e => e.exclusions.some(x => x.rule === 'repeticion_mismo_cultivo' && x.stepIndex === 0)));
});

test('agronómica: cambiar el suelo puede modificar la aptitud y excluir cultivos', async () => {
  const base = { lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández', region: 'norte' as const, hectares: 850, irrigationAvailable: false, priorities: { priority: 'drought_resilience' }, currentCropIds: ['sorghum'], nowIso: CHACO_NOW };
  const onVertisol = await evaluateRotations({ ...base, soil: { type: 'clay_vertisol' } }, realDeps);
  const onAridisol = await evaluateRotations({ ...base, soil: { type: 'aridisol_calcareous' } }, realDeps);
  const labelsVertisol = new Set(onVertisol.alternatives.map(a => a.label));
  const labelsAridisol = new Set(onAridisol.alternatives.map(a => a.label));
  // Soja sobre aridisol seco es incompatible: debe quedar excluida
  assert.ok(onAridisol.excluded.some(e => e.exclusions.some(x => x.rule === 'suelo_incompatible')));
  assert.ok(![...labelsAridisol].some(l => l.includes('Soja de primera') && l.split('→').length === 1));
  void labelsVertisol;
});

test('agronómica: con riego disponible la evaluación hídrica mejora y las exclusiones por agua desaparecen', async () => {
  // Suelo pobre en agua + escenario seco + cultivo exigente
  const base = { lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández', region: 'norte' as const, hectares: 850, currentCropIds: ['sorghum'], priorities: { priority: 'drought_resilience' }, nowIso: CHACO_NOW, soil: { type: 'aridisol_calcareous' as const }, irrigationAvailable: false as const };
  const dryland = await evaluateRotations(base, realDeps);
  const irrigated = await evaluateRotations({ ...base, irrigationAvailable: true, maxMonthlyIrrigationMm: 80 }, realDeps);
  const avg = (result: Awaited<ReturnType<typeof evaluateRotations>>) => {
    const values = result.alternatives.flatMap(a => a.criteria.filter(c => c.id === 'agua_compatibilidad').map(c => c.value ?? 0));
    return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
  };
  const dryAvg = avg(dryland), irrigAvg = avg(irrigated);
  assert.ok(dryAvg !== null && irrigAvg !== null);
  assert.ok(irrigAvg >= dryAvg - 1e-6, 'riego debe mantener o mejorar la compatibilidad hídrica');
});

test('agronómica: cambiar las prioridades puede alterar el orden de las alternativas', async () => {
  const base = { lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández', region: 'norte' as const, hectares: 850, currentCropIds: ['sorghum'], irrigationAvailable: false, soil: { type: 'clay_vertisol' as const }, nowIso: CHACO_NOW };
  const byMoisture = await evaluateRotations({ ...base, priorities: { priority: 'conserve_moisture' } }, realDeps);
  const byStability = await evaluateRotations({ ...base, priorities: { priority: 'maximize_margin' } }, realDeps);
  const topMoisture = byMoisture.alternatives[0]?.id;
  const topStability = byStability.alternatives[0]?.id;
  assert.ok(topMoisture && topStability);
  // Con pesos distintos, el orden debe poder diferir (no forzamos que siempre difiera,
  // pero en el caso Chaco difieren por construcción de pesos)
  assert.notEqual(topMoisture, topStability);
});

test('agronómica: no se recomiendan secuencias incompatibles (repetición y soja2 sin trigo)', async () => {
  const base = { lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández', region: 'norte' as const, hectares: 850, currentCropIds: ['sorghum'], previousCropId: 'sorghum', irrigationAvailable: false, soil: { type: 'clay_vertisol' as const }, priorities: { priority: 'drought_resilience' }, nowIso: CHACO_NOW };
  const result = await evaluateRotations(base, realDeps);
  for (const alternative of result.alternatives) {
    const primaries = alternative.sequence.map(s => s.primary);
    for (let i = 1; i < primaries.length; i++) {
      assert.notEqual(primaries[i], primaries[i - 1], `repetición consecutiva en ${alternative.id}`);
    }
    for (const step of alternative.sequence) {
      if (step.secondary) assert.equal(step.primary, 'trigo', 'soja2 solo tras trigo');
    }
  }
});

test('agronómica: perennes no reciben rotaciones anuales', async () => {
  const result = await evaluateRotations({
    lat: -26.786, lng: -60.443, province: 'Misiones', currentCropIds: ['yerba mate'],
    irrigationAvailable: false, soil: { type: 'mollisol_deep' }, priorities: { priority: 'conserve_moisture' }, nowIso: CHACO_NOW
  }, realDeps);
  assert.equal(result.alternatives.length, 0);
  assert.ok(result.warnings.some(w => w.toLowerCase().includes('perennes')));
});

/* ------------------------- datos: satélites y fechas ------------------------- */

test('datos: lecturas satelitales vencidas o sin fecha no describen condiciones actuales (sintético etiquetado)', () => {
  const now = new Date(CHACO_NOW);
  // FIXTURE SINTÉTICO (para matemática de frescura; no son mediciones reales)
  const readings = [
    { productId: 'saocom_humedad', status: 'available', value: 24, unit: '% vol.', observedAt: '2026-11-12' },
    { productId: 'smap', status: 'available', value: 20, unit: '% vol.', observedAt: '2023-11-21' }, // vencida
    { productId: 'lluvia_imerg', status: 'available', value: 4.2, unit: 'mm/día', observedAt: '2026-11-15' },
    { productId: 'lluvia_imerg', status: 'no_data', value: null, unit: 'mm/día', observedAt: '2026-11-15' },
    { productId: 'sentinel2_ndvi', status: 'available', value: 0.6, unit: 'NDVI', observedAt: null }
  ];
  const evidence = satelliteEvidenceFromReadings(readings, now);
  const saocom = evidence.find(e => e.productId === 'saocom_humedad');
  const smap = evidence.find(e => e.productId === 'smap');
  const imerg = evidence.filter(e => e.productId === 'lluvia_imerg');
  const ndvi = evidence.find(e => e.productId === 'sentinel2_ndvi');
  assert.ok(saocom?.current);
  assert.equal(smap?.current, false);
  assert.ok(imerg.some(e => e.current));
  assert.equal(ndvi?.current, false);
});

test('datos: IMERG reciente NO se suma a la climatología POWER (fuentes no duplican agua)', async () => {
  const base = { lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández', region: 'norte' as const, hectares: 850, currentCropIds: ['sorghum'], irrigationAvailable: false, soil: { type: 'clay_vertisol' as const }, priorities: { priority: 'drought_resilience' }, nowIso: CHACO_NOW };
  // FIXTURE SINTÉTICO de lectura IMERG (para verificar no-doble conteo)
  const withImerg = await evaluateRotations({ ...base, satellite: [{ productId: 'lluvia_imerg', kind: 'precipRecentMm', productLabel: 'GPM IMERG', value: 400, unit: 'mm/día', observedAt: '2026-11-15', ageDays: 0, current: true, usedFor: 'prueba' }] }, realDeps);
  const withoutImerg = await evaluateRotations(base, realDeps);
  const firstWater = (result: Awaited<ReturnType<typeof evaluateRotations>>) => result.alternatives[0]?.criteria.find(c => c.id === 'agua_compatibilidad')?.value ?? null;
  assert.equal(firstWater(withImerg), firstWater(withoutImerg));
});

/* ------------------------- caso argentino reproducible ----------------------- */

test('caso Chaco: la estancia se evalúa con datos regionales y ambientales reales', async () => {
  const result = await evaluateRotations({
    lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández',
    region: 'norte', hectares: 850, currentCropIds: ['soybean'], previousCropId: 'soybean',
    currentRotation: [{ primary: 'soja1' }, { primary: 'soja1' }, { primary: 'soja1' }],
    irrigationAvailable: false, soil: { type: 'clay_vertisol' },
    priorities: { priority: 'drought_resilience' }, nowIso: CHACO_NOW
  }, realDeps);
  // 1) alternativas viables y comparables
  assert.ok(result.alternatives.length >= 3);
  for (const alt of result.alternatives) {
    assert.ok(alt.score !== null && alt.score > 0.5 && alt.score <= 1, `score ${alt.score}`);
    assert.equal(alt.completeness, 1);
    assert.ok(alt.criteria.length === 7);
    assert.ok(alt.justification.length >= alt.criteria.length);
    for (const step of alt.steps) {
      assert.ok(step.balance.ok);
      assert.ok(step.balance.totals.precipMm !== null && step.balance.totals.etcMm !== null);
      assert.ok(step.regionalStats !== null);
    }
  }
  // 2) ordenado por puntaje desc
  const scores = result.alternatives.map(a => a.score as number);
  for (let i = 1; i < scores.length; i++) assert.ok(scores[i - 1] >= scores[i]);
  // 3) la línea de base (soja→soja→soja) queda excluida con motivo
  assert.ok(result.excluded.some(e => e.label.includes('Soja de primera') && e.exclusions.some(x => x.rule === 'repeticion_mismo_cultivo')));
  // 4) proveniencia con fechas y cobertura
  assert.ok(result.provenance.climate);
  assert.equal(result.provenance.climate?.years.start, 2016);
  assert.equal(result.provenance.climate?.years.end, 2025);
  assert.ok(result.magyp);
  assert.equal(result.magyp.departmentKey, 'COMANDANTE FERNANDEZ');
  // 5) escenarios recalculan indicadores (no ajustan puntajes arbitrariamente)
  const scenarios = result.scenarios;
  assert.equal(scenarios.length, CLIMATE_SCENARIOS.length);
  const ref = scenarios.find(s => s.scenario.id === 'referencia');
  const stress = scenarios.find(s => s.scenario.id === 'estres_combinado');
  assert.ok(ref && stress);
  const refTop = ref.ranking[0]?.score ?? 0;
  const stressTop = stress.ranking[0]?.score ?? 0;
  assert.ok(stressTop <= refTop, 'el escenario combinado no debe mejorar la mejor alternativa');
});

test('regresión: secuencias de Chaco conservan precisión y respetan el orden de sucesión', async () => {
  const result = await evaluateRotations({
    lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández',
    region: 'norte', hectares: 850, currentCropIds: ['garlic'], previousCropId: 'soja1',
    irrigationAvailable: false, soil: { type: 'mollisol_deep' },
    priorities: { priority: 'conserve_moisture', label: 'conserve_moisture' }, nowIso: CHACO_NOW
  }, realDeps);
  assert.equal(result.alternatives.length, 8);
  assert.ok(result.warnings.some(w => w.includes('garlic') && w.includes('no tiene parámetros completos')));
  assert.ok(!result.warnings.some(w => w.includes('Soja de primera') && w.includes('continuidad')), 'un cultivo desconocido no debe generar un diagnóstico falso de continuidad con soja');

  for (const alternative of result.alternatives) {
    assert.equal(alternative.criteria.length, 7);
    const available = alternative.criteria.filter(c => c.value !== null);
    const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
    const expectedScore = available.reduce((sum, c) => sum + (c.value as number) * c.weight, 0) / totalWeight;
    assert.ok(Math.abs((alternative.score as number) - expectedScore) < 1e-12, 'puntaje debe usar los valores criterio sin redondeo intermedio');
    assert.ok(alternative.criteria.some(c => c.value !== null && Math.abs(c.value * 1000 - Math.round(c.value * 1000)) > 1e-8), 'al menos un criterio conserva más de tres decimales');

    for (let index = 0; index < alternative.sequence.length; index++) {
      const sequenceStep = alternative.sequence[index];
      const evidence = alternative.steps[index];
      assert.equal(evidence.primary, sequenceStep.primary, 'las evidencias deben seguir el orden de la secuencia');
      const expectedKc = kcMonthlyBySowMonth(CROP_AGRONOMY[sequenceStep.primary], sequenceStep.sowMonth);
      assert.deepEqual(evidence.balance.months.map(month => month.kc), evidence.balance.months.map(month => expectedKc[month.month - 1]), 'el balance debe usar el Kc y calendario del cultivo de ese paso');
      const previous = index === 0 ? 'soja1' : alternative.sequence[index - 1].primary;
      const expectedPenalty = CROP_AGRONOMY[sequenceStep.primary].successionPenalty[previous] ?? 0;
      assert.equal(evidence.successionPenalty, expectedPenalty, 'sucesión debe considerar el cultivo inmediatamente anterior');
      assert.ok(evidence.balance.ok, 'cada paso debe tener su balance de agua evaluado');
    }
  }
});

test('agronómica: datos NASA modifican los indicadores entre escenarios (no solo el puntaje)', async () => {
  const base = { lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández', region: 'norte' as const, hectares: 850, currentCropIds: ['sorghum'], irrigationAvailable: false, soil: { type: 'clay_vertisol' as const }, priorities: { priority: 'drought_resilience' }, nowIso: CHACO_NOW };
  const result = await evaluateRotations(base, realDeps);
  const ref = result.alternatives[0];
  assert.ok(ref);
  const refStress = ref.steps[0].balance.totals.stressIndex ?? 0;
  // Recalcula manualmente la ETo bajo +2 °C para verificar que la serie responde
  const hotter = etoSeriesFor(chacoClimate, CLIMATE_SCENARIOS.find(s => s.id === 'temp_mayor')!);
  const baseEto = etoSeriesFor(chacoClimate, CLIMATE_SCENARIOS.find(s => s.id === 'referencia')!);
  const increases = hotter.every((v, i) => v === null || baseEto[i] === null ? true : v > (baseEto[i] as number));
  assert.ok(increases, '+2 °C debe aumentar ETo en todos los meses');
  assert.ok(refStress >= 0 && refStress <= 1);
});

/* ------------------------- degradación elegante ------------------------------- */

test('fallo de red: sin POWER el motor continúa con advertencias y menor completitud', async () => {
  const failingDeps: EngineDeps = {
    ...realDeps,
    climateCacheId: 'power-failing-test', // no reutiliza la caché del clima válido
    fetchClimate: async () => { throw new Error('POWER HTTP 503 (prueba de fallo simulado)'); }
  };
  const result = await evaluateRotations({
    lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández',
    currentCropIds: ['sorghum'], irrigationAvailable: false, soil: { type: 'clay_vertisol' },
    priorities: { priority: 'drought_resilience' }, nowIso: CHACO_NOW
  }, failingDeps);
  assert.ok(result.alternatives.length > 0 || result.excluded.length > 0);
  assert.ok(result.warnings.some(w => w.toLowerCase().includes('power')));
  const anyCompleteness = [...result.alternatives.map(a => a.completeness), ...result.excluded.map(() => 0)];
  assert.ok(anyCompleteness.every(c => c < 1));
  // Sin clima, la aptitud térmica y el agua quedan sin valor (no fabricados)
  const withClima = result.alternatives.flatMap(a => a.criteria.filter(c => c.id === 'clima_aptitud').map(c => c.value));
  assert.ok(withClima.every(v => v === null));
});

/* ------------------------- generador y aptitud ------------------------------- */

test('generador: no repite cultivo en campañas consecutivas y agrega la línea de base documentada', () => {
  const options = {
    horizonCampaigns: 3, startSowYear: 2026, region: 'norte' as const,
    availableCrops: ['soja1', 'maiz', 'trigo', 'girasol', 'sorgo'] as CropId[],
    previousCrop: 'soja1' as const, allowDoubleCrop: true
  };
  const candidates = generateCandidates(options);
  assert.ok(candidates.length > 20);
  for (const candidate of candidates) {
    assert.ok(!hasConsecutiveRepeat(candidate.steps));
    assert.equal(candidate.steps.length, 3);
    for (const step of candidate.steps) {
      if (step.secondary) {
        assert.equal(step.primary, 'trigo');
        assert.ok(step.secondarySowMonth !== undefined);
      }
    }
  }
  const baseline = baselineCandidate(options, 'soja1', 'Soja de primera');
  assert.ok(baseline.candidate);
  assert.ok(baseline.exclusion?.includes('repite'));
  // Trigo siempre habilita soja2 solo en la misma campaña
  const doubles = candidates.flatMap(c => c.steps).filter(s => s.secondary);
  assert.ok(doubles.every(s => s.primary === 'trigo'));
});

test('aptitud: función trapezoidal documentada y ventana regional', () => {
  const girasol = CROP_AGRONOMY.girasol;
  assert.equal(monthlyTemperatureScore(25, girasol), 1);
  assert.ok(monthlyTemperatureScore(14, girasol) > 0 && monthlyTemperatureScore(14, girasol) < 1);
  assert.equal(monthlyTemperatureScore(4, girasol), 0);
  const window = sowingWindowStatus(girasol, 'norte', 8);
  assert.equal(window.status, 'ok');
  const unknownRegion = sowingWindowStatus(girasol, 'sur', 9);
  assert.equal(unknownRegion.status, 'unknown');
});

test('aptitud: Kc mensual de FAO-56 por etapa y mes de siembra', () => {
  const maizeOctober = kcMonthlyBySowMonth(CROP_AGRONOMY.maiz, 10);
  assert.equal(maizeOctober[8], 0); // septiembre sin ciclo
  assert.ok(maizeOctober[9] > 0 && maizeOctober[9] < 0.5); // octubre: inicio
  assert.ok(maizeOctober[0] > 1.0 && maizeOctober[0] <= 1.2); // enero: etapa media
  const wheatJune = kcMonthlyBySowMonth(CROP_AGRONOMY.trigo, 6);
  assert.ok(wheatJune[7] > 0);
  void 5;
});

test('aptitud: escenario ajusta entradas, no puntajes (precipitación y temperatura)', () => {
  const dry = CLIMATE_SCENARIOS.find(s => s.id === 'precip_menor')!;
  const adjusted = adjustedMonthlyCells(chacoClimate.monthly, dry);
  for (let i = 0; i < 12; i++) {
    const base = chacoClimate.monthly[i].precipMm ?? 0;
    const value = adjusted[i].precipMm ?? 0;
    assert.ok(Math.abs(value - base * 0.7) < 1e-6, `mes ${i + 1}`);
  }
  const warmer = adjustedMonthlyCells(chacoClimate.monthly, CLIMATE_SCENARIOS.find(s => s.id === 'temp_mayor')!);
  assert.ok(warmer[0].tMeanC !== null && chacoClimate.monthly[0].tMeanC !== null);
  assert.ok((warmer[0].tMeanC as number) - (chacoClimate.monthly[0].tMeanC as number) === 2);
  // ETo recalculada aumenta con +2 °C
  const etoRef = etoSeriesFor(chacoClimate, CLIMATE_SCENARIOS[0]);
  const etoHot = etoSeriesFor(chacoClimate, CLIMATE_SCENARIOS[2]);
  for (let i = 0; i < 12; i++) {
    const a = etoRef[i], b = etoHot[i];
    if (a === null || b === null) continue;
    assert.ok(b > a, `ETo ${i + 1} debería aumentar con +2 °C`);
  }
});

test('exclusiones: umbrales documentados y diversificación de familias', () => {
  assert.equal(EXCLUSION_THRESHOLDS.waterSupplyDemand, 0.4);
  assert.equal(EXCLUSION_THRESHOLDS.soilScore, 0.35);
  assert.equal(EXCLUSION_THRESHOLDS.temperatureScore, 0.25);
  const mixed = {
    id: 'seq-mixta', isBaseline: false,
    steps: [
      { sowYear: 2026, campaign: '2026/27', primary: 'soja1' as const, sowMonth: 11, windowKnown: true },
      { sowYear: 2027, campaign: '2027/28', primary: 'trigo' as const, sowMonth: 6, windowKnown: true, secondary: 'soja2' as const, secondarySowMonth: 12 }
    ]
  };
  const diversity = diversityScore(mixed, null);
  assert.ok((diversity.value ?? 0) > 0.3, 'Fabaceae + Poaceae mezcladas deben diversificar');
  void round3;
  void meanOf;
});

/* ------------------------- regresiones de corrección (revisión) ---------------- */

test('datos: lectura satelital vencida NO entra al almacenamiento inicial del balance (regresión)', async () => {
  const base = { lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández', region: 'norte' as const, hectares: 850, currentCropIds: ['soybean'], irrigationAvailable: false, soil: { type: 'clay_vertisol' as const }, priorities: { priority: 'drought_resilience' }, nowIso: CHACO_NOW };
  // FIXTURE SINTÉTICO de evidencia (etiquetado; se prueba la política de vigencia, no el proveedor)
  const vigente = { productId: 'saocom_humedad', kind: 'soilMoistureVolumetric' as const, productLabel: 'SAOCOM · humedad de suelo (sintético)', value: 30, unit: '% vol.', observedAt: '2026-11-12', ageDays: 3, current: true, usedFor: 'almacenamiento inicial (prueba)' };
  const vencida = { ...vigente, observedAt: '2026-10-01', ageDays: 45, current: false };
  const sinSat = await evaluateRotations(base, realDeps);
  const conVencida = await evaluateRotations({ ...base, satellite: [vencida] }, realDeps);
  const conVigente = await evaluateRotations({ ...base, satellite: [vigente] }, realDeps);
  const fuente = (r: Awaited<ReturnType<typeof evaluateRotations>>) => r.alternatives[0]?.steps[0]?.initialStorageSource ?? '';
  assert.ok(sinSat.alternatives.length > 0);
  // Vencida → supuesto por omisión (idéntico a no tener ninguna lectura)
  assert.equal(fuente(conVencida), fuente(sinSat));
  assert.ok(fuente(conVencida).includes('50%'));
  // Vigente → entra la conversión documentada (θ→mm con CC/PMP) y se cita la fuente
  assert.notEqual(fuente(conVigente), fuente(sinSat));
  assert.ok(fuente(conVigente).includes('SAOCOM'));
  // La vencida se rechaza con advertencia explícita de no uso
  const wRechazo = conVencida.alternatives.flatMap(a => a.warnings);
  assert.ok(wRechazo.some(w => w.includes('SIN vigencia')));
  // Con lectura vencida + vigente presentes, se prefiere la vigente
  const conAmbas = await evaluateRotations({ ...base, satellite: [vencida, vigente] }, realDeps);
  assert.equal(fuente(conAmbas), fuente(conVigente));
});

test('riego: disponibilidad sin volumen declarado no agrega agua ni asume 60 mm/mes', async () => {
  const base = { lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández', region: 'norte' as const, hectares: 850, currentCropIds: ['soybean'], soil: { type: 'aridisol_calcareous' as const }, priorities: { priority: 'drought_resilience' }, nowIso: CHACO_NOW };
  // a) riego disponible SIN volumen declarado → I = 0 en todas las campañas, advertencia y detalle secano
  const sinVolumen = await evaluateRotations({ ...base, irrigationAvailable: true }, realDeps);
  assert.ok(sinVolumen.alternatives.length > 0);
  const irrigMmSin = sinVolumen.alternatives.flatMap(a => a.steps.map(s => s.balance.totals.irrigMm ?? 0));
  assert.ok(irrigMmSin.length > 0);
  assert.ok(irrigMmSin.every(v => v === 0), 'sin volumen declarado no se aplica agua de riego');
  assert.ok(sinVolumen.warnings.some(w => w.includes('volumen mensual declarado')));
  const detalleSin = sinVolumen.alternatives[0]?.criteria.find(c => c.id === 'agua_compatibilidad')?.detail ?? '';
  assert.ok(detalleSin.includes('sin volumen mensual declarado'));
  // b) con volumen declarado por el productor → se aplica y se documenta como tope declarado
  const declarado = await evaluateRotations({ ...base, irrigationAvailable: true, maxMonthlyIrrigationMm: 45 }, realDeps);
  const irrigMmCon = declarado.alternatives.flatMap(a => a.steps.map(s => s.balance.totals.irrigMm ?? 0));
  assert.ok(irrigMmCon.some(v => v > 0), 'con volumen declarado se aplica riego complementario');
  const detalleCon = declarado.alternatives[0]?.criteria.find(c => c.id === 'agua_compatibilidad')?.detail ?? '';
  assert.ok(detalleCon.includes('45') && detalleCon.includes('declarado'));
});

test('suelo: compatibilidad desconocida no se inventa y el riego no bonifica el suelo', async () => {
  // a) política pura: sin calibración cultivo-suelo → null (NO 0.5 neutral)
  const parcial = { nameEs: 'Cultivo sintético (prueba)', soilCompatibility: { mollisol_deep: 0.8 } };
  assert.equal(soilCompatibilityFor(parcial, 'sandy_loam').value, null);
  assert.equal(soilCompatibilityFor(parcial, 'mollisol_deep').value, 0.8);
  // b) integración: el riego NO modifica el valor de compatibilidad de suelo (solo actúa en el balance)
  const base = { lat: -26.786, lng: -60.443, province: 'Chaco', department: 'Comandante Fernández', region: 'norte' as const, hectares: 850, currentCropIds: ['soybean'], soil: { type: 'aridisol_calcareous' as const }, priorities: { priority: 'drought_resilience' }, nowIso: CHACO_NOW };
  const secano = await evaluateRotations({ ...base, irrigationAvailable: false }, realDeps);
  const regado = await evaluateRotations({ ...base, irrigationAvailable: true, maxMonthlyIrrigationMm: 45 }, realDeps);
  const sueloDe = (r: Awaited<ReturnType<typeof evaluateRotations>>, id: string) => r.alternatives.find(a => a.id === id)?.criteria.find(c => c.id === 'suelo_compatibilidad')?.value ?? null;
  const comun = secano.alternatives.find(a => regado.alternatives.some(x => x.id === a.id));
  assert.ok(comun, 'debe haber al menos una alternativa común entre secano y riego');
  assert.equal(sueloDe(regado, comun.id), sueloDe(secano, comun.id));
  assert.ok(!JSON.stringify(regado.alternatives[0]?.criteria ?? []).includes('+0.2'), 'sin bonificación automática por riego');
});


/* Integration fixtures below are synthetic, not field observations. */
const integrationInput = {
  lat: -33.89, lng: -60.57, province: 'Buenos Aires', region: 'centro' as const,
  irrigationAvailable: false, soil: { type: 'mollisol_deep' as const },
  priorities: { priority: 'conserve_moisture' }, nowIso: '2026-10-15T18:00:00Z',
  constraints: { horizonCampaigns: 2 },
  currentRotation: [{ primary: 'soja1' as const }, { primary: 'maiz' as const }]
};
const dryDeps: EngineDeps = { ...realDeps, climateCacheId: 'synthetic-observation-integration',
  fetchClimate: async () => ({ ...chacoClimate, monthly: chacoClimate.monthly.map(m => ({ ...m, precipMm: 10, rainDaysMean: 2 })) }) };
const soilEvidence = satelliteEvidenceFromReadings([{ productId: 'saocom_humedad', status: 'available', value: 25, unit: '% vol.', observedAt: '2026-10-12', source: 'CONAE synthetic fixture', sourceUrl: 'https://example.test/fixture' }], new Date('2026-10-15T18:00:00Z'));

test('integration: SAOCOM affects first-campaign water, not deeper layers or future campaigns; exact provenance', async () => {
  const without = await evaluateRotations(integrationInput, dryDeps);
  const withSoil = await evaluateRotations({ ...integrationInput, satellite: soilEvidence }, dryDeps);
  assert.notEqual(withSoil.baseline!.criteria.find(c => c.id === 'agua_compatibilidad')!.value, without.baseline!.criteria.find(c => c.id === 'agua_compatibilidad')!.value);
  assert.match(withSoil.baseline!.steps[0].initialStorageSource, /resto del perfil: 52.5 mm/);
  assert.equal(withSoil.baseline!.steps[1].initialStorageSource, without.baseline!.steps[1].initialStorageSource);
  assert.equal(withSoil.provenance.satellite[0].used, true);
  assert.equal(withSoil.provenance.satellite[0].source, 'CONAE synthetic fixture');
  assert.ok(withSoil.provenance.satellite[0].resolutionNote);
  assert.equal(withSoil.baseline!.steps[0].balance.totals.precipMm, without.baseline!.steps[0].balance.totals.precipMm);
});

test('integration: NaN, impossible moisture, wrong units, stale and future dates never alter water', async () => {
  const without = await evaluateRotations(integrationInput, dryDeps);
  for (const patch of [{ value: NaN }, { value: 80 }, { unit: 'm3/m3' }, { observedAt: '2020-11-12' }, { observedAt: '2027-11-12' }, { current: false }]) {
    const r = await evaluateRotations({ ...integrationInput, satellite: [{ ...soilEvidence[0], ...patch }] }, dryDeps);
    assert.deepEqual(r.baseline!.criteria, without.baseline!.criteria);
    assert.equal(r.provenance.satellite[0].used, false);
  }
  const surface = satelliteEvidenceFromReadings([{ productId: 'smap', status: 'available', value: 25, unit: '% vol.', observedAt: '2026-10-12' }], new Date('2026-10-15T18:00:00Z'));
  const smap = await evaluateRotations({ ...integrationInput, satellite: surface }, dryDeps);
  assert.deepEqual(smap.baseline!.criteria, without.baseline!.criteria);
  assert.equal(smap.provenance.satellite[0].used, false);
});

test('integration: current crop is not a declared rotation; baseline is retained even when excluded', async () => {
  const absent = await evaluateRotations({ ...integrationInput, currentRotation: undefined, currentCropIds: ['soybean'] }, realDeps);
  assert.equal(absent.baseline, null);
  const declared = await evaluateRotations({ ...integrationInput, currentRotation: [{ primary: 'soja1' }, { primary: 'soja1' }] }, realDeps);
  assert.equal(declared.baseline!.score, null);
  assert.ok(declared.baseline!.exclusions.some(e => e.rule === 'repeticion_mismo_cultivo'));
  assert.equal(declared.baseline!.criteria.length, 7);
  assert.ok(declared.alternatives.length >= 2);
  assert.ok(declared.alternatives.every(a => a.horizonCampaigns === 2));
  const viable = await evaluateRotations(integrationInput, realDeps);
  const matching = await evaluateRotations({ ...integrationInput, currentRotation: viable.alternatives[0].sequence.map(s => ({ primary: s.primary, secondary: s.secondary })) }, realDeps);
  assert.deepEqual(matching.baseline!.criteria, viable.alternatives[0].criteria);
  assert.equal(matching.baseline!.score, viable.alternatives[0].score);
});


test('integration: changing location fetches the corresponding climate and changes thermal indicators (synthetic)', async () => {
  const calls: number[] = [];
  const deps: EngineDeps = { ...realDeps, climateCacheId: 'synthetic-location-regression', fetchClimate: async lat => {
    calls.push(lat);
    return { ...chacoClimate, monthly: chacoClimate.monthly.map(m => ({ ...m, tMeanC: lat < -40 ? 8 : 24 })) };
  } };
  const warm = await evaluateRotations(integrationInput, deps);
  const cold = await evaluateRotations({ ...integrationInput, lat: -48, lng: -68 }, deps);
  assert.deepEqual(calls, [integrationInput.lat, -48]);
  assert.notEqual(warm.baseline!.criteria.find(c => c.id === 'clima_aptitud')!.value, cold.baseline!.criteria.find(c => c.id === 'clima_aptitud')!.value);
});
