import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evidenceFromReadings, observationIndicators } from '../src/engine/observations';
import { regionalMissions, regionalSourcePolicy } from '../src/data/regionalSources';
import { buildEngineInput } from '../src/services/rotationEngineAdapter';
import type { FarmProfile } from '../src/types';

const now = new Date('2026-11-15T18:00:00Z');
const rain = (values: number[]) => evidenceFromReadings([{
  productId: 'lluvia_imerg', status: 'available', value: values.at(-1)!, unit: 'mm/día', observedAt: '2026-11-15',
  samples: values.map((value, i) => ({ value, observedAt: `2026-11-${11 + i}`, sourceUrl: 'https://example.test/synthetic-rain' }))
}], now);

test('IMERG variability changes with observed pulses; duplicates, gaps and insufficient series excluded (synthetic)', () => {
  const constant = observationIndicators(rain([2, 2, 2, 2, 2]), now);
  const pulses = observationIndicators(rain([0, 0, 10, 0, 0]), now);
  assert.equal(constant[0].value, 0);
  assert.equal(pulses[0].value, 4);
  const gapped = rain([0, 0, 10, 0, 0]);
  gapped[0].samples![0].observedAt = '2026-11-09';
  assert.equal(observationIndicators(gapped, now).length, 0);
  const duplicate = rain([0, 0, 10, 0, 0]);
  duplicate[0].samples![0].observedAt = '2026-11-12';
  assert.equal(observationIndicators(duplicate, now).length, 0);
});

test('IMERG API percentile is a current hydrological diagnostic, not a rainfall sum (synthetic)', () => {
  const input = evidenceFromReadings([{ productId: 'estatus_hidrico', status: 'available', value: 12, unit: 'percentil API', observedAt: '2026-11-14' }], now);
  assert.equal(observationIndicators(input, now)[0].value, 12);
  input[0].current = false;
  assert.equal(observationIndicators(input, now).length, 0);
});

test('NDVI requires four distinct valid dates spanning 30 days; never claims coverage from a pixel (synthetic)', () => {
  const evidence = evidenceFromReadings([{ productId: 'sentinel2_ndvi', status: 'available', value: 0.6, unit: 'NDVI', observedAt: '2026-11-14',
    samples: ['2026-10-01', '2026-10-15', '2026-11-01', '2026-11-14'].map((observedAt, i) => ({ value: 0.3 + i * 0.1, observedAt, sourceUrl: 'https://example.test/synthetic-ndvi' })) }], now);
  assert.ok(Math.abs(observationIndicators(evidence, now)[0].value - 0.3) < 1e-10);
  assert.match(observationIndicators(evidence, now)[0].detail, /no estimadas/);
  evidence[0].samples!.pop();
  assert.equal(observationIndicators(evidence, now).length, 0);
});

test('offline cached data and bad values are excluded at service boundary', () => {
  const r = { productId: 'saocom_humedad', status: 'available', value: 24, unit: '% vol.', observedAt: '2026-11-12' };
  for (const patch of [{ cached: true }, { status: 'error' }, { value: NaN }, { unit: 'NDVI' }, { observedAt: null }]) {
    assert.equal(evidenceFromReadings([{ ...r, ...patch }], now)[0].current, false);
  }
});

test('regional priority preserves all 15 sources including European NEA and Canadian Patagonia', () => {
  const nea = { lat: -27, lng: -59 }, south = { lat: -48, lng: -68 };
  assert.deepEqual(regionalSourcePolicy(nea).preferred, ['AEB', 'AEP']);
  assert.equal(regionalMissions(nea).length, 15);
  assert.ok(regionalMissions(nea).some(m => m.id === 'sentinel2'));
  assert.ok(regionalMissions(south).some(m => m.id === 'radarsat_rcm'));
  assert.equal(regionalMissions(nea).find(m => m.id === 'guaranisat1')!.productIds.length, 0);
});

test('adapter carries explicit rotation, location, soil, irrigation amount and priorities without inferred baseline', () => {
  const farm = { location: { lat: -34, lng: -60, province: 'Buenos Aires', region: 'centro' }, currentCrop: 'soybean', irrigation: 'dryland', soilType: 'mollisol_deep', priority: 'conserve_moisture', fieldSizeHectares: 20 } as FarmProfile;
  assert.equal(buildEngineInput(farm, [], null, now.toISOString()).currentRotation, undefined);
  const changed = buildEngineInput({ ...farm, location: { ...farm.location, lat: -25, lng: -65 }, soilType: 'sandy_loam', irrigationAvailable: true, maxMonthlyIrrigationMm: 40, priority: 'erosion_control', currentRotation: [{ primary: 'maiz' }, { primary: 'girasol' }] }, [], 'Departamento', now.toISOString());
  assert.equal(changed.lat, -25);
  assert.equal(changed.soil.type, 'sandy_loam');
  assert.equal(changed.maxMonthlyIrrigationMm, 40);
  assert.equal(changed.priorities.priority, 'erosion_control');
  assert.equal(changed.currentRotation![0].primary, 'maiz');
});
