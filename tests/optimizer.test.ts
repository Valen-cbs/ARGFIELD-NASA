import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { evaluateRotations, defaultEngineDeps, mapCropToCropId } from '../src/engine/engine';
import { aggregatePowerDaily, parsePowerDaily } from '../src/engine/climate';
import type { RotationEngineInput } from '../src/engine/engineTypes';
import { CROP_AGRONOMY } from '../src/engine/agronomy';
import { buildEngineInput, planFromAlternative } from '../src/services/rotationEngineAdapter';
import { EngineComparison } from '../src/components/EngineComparison';
import type { FarmProfile } from '../src/types';

const years = { start: 2016, end: 2025 };
const nowIso = '2026-11-15T18:00:00Z';
const climate = aggregatePowerDaily(parsePowerDaily(JSON.parse(readFileSync('tests/fixtures/power-chaco-2016-2025.json', 'utf8')), years), years, nowIso, 'tests/fixtures/power-chaco-2016-2025.json');
const deps = { ...defaultEngineDeps, climateCacheId: 'optimizer-real-chaco-no-magyp', fetchClimate: async () => climate, loadProvincial: async () => null, loadDepartamental: async () => null };
const input: RotationEngineInput = {
  lat: -26.786, lng: -60.443, province: 'Chaco', region: 'norte', currentCropIds: ['Soja 1ra'],
  previousCropId: 'soja1', irrigationAvailable: false, soil: { type: 'mollisol_deep' },
  constraints: { horizonCampaigns: 3 }, priorities: { priority: 'conserve_moisture' }, nowIso
};
const markup = (result: Awaited<ReturnType<typeof evaluateRotations>>) => renderToStaticMarkup(createElement(EngineComparison, { result }));

test('prospective real POWER scenario without history or MAGyP ranks multiple justified sequences', async () => {
  const r = await evaluateRotations(input, deps);
  assert.equal(r.baseline, null);
  assert.ok(r.diagnostics.generated > 20);
  assert.equal(r.diagnostics.evaluated, r.diagnostics.generated);
  assert.ok(r.diagnostics.viable >= 3);
  assert.equal(r.diagnostics.outcome, 'viable');
  assert.equal(r.magyp, null);
  assert.equal(r.diagnostics.comparison, 'no_history');
  for (const [i, a] of r.alternatives.entries()) {
    assert.equal(a.sequence.length, 3);
    assert.equal(a.exclusions.length, 0);
    assert.ok(a.score! > 0 && a.score! <= 1);
    if (i) assert.ok(a.score! <= r.alternatives[i - 1].score!);
    assert.ok(a.justification.length > 3);
    assert.ok(a.criteria.find(c => c.id === 'clima_aptitud')!.value! > 0);
    assert.equal(a.criteria.find(c => c.id === 'estabilidad_regional')!.value, null);
    assert.ok(a.completeness < 1);
    assert.ok(a.steps.every(s => s.balance.ok));
    assert.notEqual(a.sequence[0].primary, 'soja1');
    assert.ok(a.sequence.every((s, j) => !j || s.primary !== a.sequence[j - 1].primary));
    assert.ok(a.sequence.every(s => CROP_AGRONOMY[s.primary]));
  }
  assert.equal((markup(r).match(/<th class="p-2">Alternativa:/g) ?? []).length, 3);
  assert.match(markup(r), /Comparación histórica opcional/);
});

test('one viable sequence is displayed even if identical to declared history', async () => {
  const limited = { ...input, constraints: { horizonCampaigns: 2, excludedCrops: ['soja1', 'soja2', 'trigo', 'girasol'] as const }, previousCropId: 'maiz' };
  const r = await evaluateRotations({ ...limited, constraints: { ...limited.constraints, excludedCrops: [...limited.constraints.excludedCrops] } }, deps);
  assert.equal(r.diagnostics.generated, 1);
  assert.equal(r.alternatives.length, 1);
  assert.deepEqual(r.alternatives[0].sequence.map(s => s.primary), ['sorgo', 'maiz']);
  const withHistory = await evaluateRotations({ ...limited, constraints: { ...limited.constraints, excludedCrops: [...limited.constraints.excludedCrops] }, currentRotation: [{ primary: 'sorgo' }, { primary: 'maiz' }] }, deps);
  assert.equal(withHistory.alternatives.length, 1, 'matching baseline must not delete the only prospective candidate');
  assert.equal(withHistory.alternatives[0].score, withHistory.baseline!.score);
  assert.match(markup(withHistory), /única alternativa viable/);
});

test('horizon is configured independently of history; incompatible constraints never get relaxed', async () => {
  const noHistory = await evaluateRotations(input, deps);
  const shortHistory = await evaluateRotations({ ...input, currentRotation: [{ primary: 'maiz' }, { primary: 'soja1' }] }, deps);
  assert.deepEqual(shortHistory.alternatives, noHistory.alternatives);
  assert.equal(shortHistory.diagnostics.comparison, 'different_horizon');
  const blocked = await evaluateRotations({ ...input, constraints: { horizonCampaigns: 3, excludedCrops: ['soja1', 'soja2', 'trigo', 'girasol', 'maiz'] } }, deps);
  assert.equal(blocked.diagnostics.generated, 0);
  assert.equal(blocked.alternatives.length, 0);
  assert.equal(blocked.diagnostics.outcome, 'incompatible_constraints');
  assert.match(blocked.diagnostics.generationBlocks.join(), /sin repeticiones/);
  const required = await evaluateRotations({ ...input, constraints: { horizonCampaigns: 2, preferredCrops: ['girasol', 'sorgo', 'maiz'] } }, deps);
  assert.equal(required.alternatives.length, 0);
  assert.match(required.diagnostics.generationBlocks.join(), /requeridos/);
  for (const horizon of [1, 4, NaN]) {
    const r = await evaluateRotations({ ...input, constraints: { horizonCampaigns: horizon } }, deps);
    assert.equal(r.alternatives.length, 0);
    assert.equal(r.diagnostics.outcome, 'integration_error');
    assert.match(r.diagnostics.generationBlocks[0], /Horizonte inválido/);
  }
});

test('unsupported regional windows explain zero generation even with climate and satellite imagery', async () => {
  for (const region of ['sur', 'cuyo'] as const) {
    const r = await evaluateRotations({ ...input, region }, deps);
    assert.ok(r.provenance.climate);
    assert.equal(r.diagnostics.generated, 0);
    assert.equal(r.diagnostics.evaluated, 0);
    assert.equal(r.diagnostics.outcome, 'insufficient_data');
    assert.match(r.diagnostics.generationBlocks[0], /ventanas de siembra documentadas/);
    assert.match(markup(r), /Falta parametrización regional/);
    assert.doesNotMatch(markup(r), /<table|<th[^>]*>S\(r\)/);
  }
});

test('rejection frequency counts each candidate once per rule and surfaces actionable constraints', async () => {
  const r = await evaluateRotations({ ...input, constraints: { horizonCampaigns: 2, excludedCrops: ['trigo', 'girasol', 'sorgo', 'soja2'] }, previousCropId: 'maiz', soil: { type: 'aridisol_calcareous' } }, deps);
  assert.equal(r.diagnostics.generated, 1);
  assert.equal(r.diagnostics.viable, 0);
  assert.equal(r.diagnostics.outcome, 'incompatible_constraints');
  assert.equal(r.diagnostics.rejections.find(x => x.rule === 'suelo_incompatible')!.count, 1);
  assert.match(markup(r), /suelo_incompatible/);
});

test('loading is pending, stale is excluded, neither invents satellite influence; deterministic output', async () => {
  const base = await evaluateRotations(input, deps);
  const satellite = [{ productId: 'saocom_humedad', productLabel: 'SAOCOM', kind: 'soilMoistureVolumetric' as const, value: 30, unit: '% vol.', observedAt: '2020-01-01', ageDays: 2500, current: false, usedFor: 'test', status: 'stale' }, { productId: 'sentinel2_ndvi', productLabel: 'Sentinel-2', kind: 'vegetationIndex' as const, value: null, unit: 'NDVI', observedAt: null, ageDays: null, current: false, usedFor: 'test', status: 'loading' }];
  const r = await evaluateRotations({ ...input, satellite }, deps);
  assert.deepEqual(r.alternatives.map(({ warnings, ...a }) => a), base.alternatives.map(({ warnings, ...a }) => a));
  assert.ok(r.provenance.satellite.every(s => !s.used));
  assert.match(r.provenance.satellite[1].validity!, /pendiente/);
  assert.ok(!r.warnings.some(w => w.includes('Sentinel-2')));
  assert.deepEqual(await evaluateRotations({ ...input, satellite }, deps), r);
});

test('adapter transports configured horizon and engine result renders actual alternatives and sources', async () => {
  const farm: FarmProfile = { location: { name: 'Chaco fixture', ...input, basinId: 'test', basinName: 'test', mainRiver: 'test', province: 'Chaco', region: 'norte' }, fieldSizeHectares: 120, currentCrop: 'soybean', cropAllocations: [{ crop: 'Soja 1ra', hectares: 120 }], soilType: 'mollisol_deep', irrigation: 'dryland', priority: 'conserve_moisture', rotationConstraints: { horizonCampaigns: 2 } };
  const adapted = buildEngineInput(farm, [], null, nowIso);
  assert.equal(adapted.constraints!.horizonCampaigns, 2);
  assert.equal(adapted.currentRotation, undefined);
  assert.equal(mapCropToCropId('Soja 1ra'), 'soja1');
  assert.equal(mapCropToCropId('Trigo total'), 'trigo');
  const r = await evaluateRotations(adapted, deps);
  const plans = r.alternatives.slice(0, 3).map((_, i) => planFromAlternative(r, i));
  assert.equal(plans.length, 3);
  assert.ok(plans.every(p => p.steps.length === 2));
  assert.deepEqual(plans.map(p => p.id), r.alternatives.slice(0, 3).map(a => a.id));
  assert.match(markup(r), /NASA POWER utilizada/);
});
