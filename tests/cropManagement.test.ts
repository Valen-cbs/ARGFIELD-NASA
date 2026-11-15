import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MAGYP_CROPS } from '../src/data/magypCrops';
import { CROP_MANAGEMENT_PROFILES, recommendCropManagement, resolveManagementCrop } from '../src/engine/cropManagement';
import { defaultEngineDeps, evaluateRotations, isPerennialCropName } from '../src/engine/engine';
import type { RotationEngineInput } from '../src/engine/engineTypes';
import { RotationStrategies } from '../src/components/RotationStrategies';
import type { FarmProfile } from '../src/types';

const input: RotationEngineInput = {
  lat: -26.786, lng: -60.443, province: 'Chaco', region: 'norte',
  irrigationAvailable: false, soil: { type: 'sandy_loam' },
  priorities: { priority: 'conserve_moisture' }, nowIso: '2026-11-15T18:00:00Z'
};
const deps = {
  ...defaultEngineDeps, climateCacheId: 'management-no-network',
  fetchClimate: async () => { throw new Error('offline'); },
  loadProvincial: async () => null, loadDepartamental: async () => null
};

test('all 41 catalogue entries have distinct complete management profiles', () => {
  assert.equal(MAGYP_CROPS.length, 41);
  assert.deepEqual(Object.keys(CROP_MANAGEMENT_PROFILES).sort(), [...MAGYP_CROPS].sort());
  assert.equal(new Set(Object.values(CROP_MANAGEMENT_PROFILES).map(value => JSON.stringify(value))).size, 41);
  for (const crop of MAGYP_CROPS) {
    assert.equal(resolveManagementCrop(crop.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')), crop);
    const [recommendation] = recommendCropManagement({ ...input, currentCropIds: [crop] });
    assert.equal(recommendation.crop, crop);
    assert.equal(recommendation.actions.length, 4);
    assert.ok(recommendation.actions.every(action => action.detail.length > 30));
  }
});

test('normal engine entry point returns recommendations for every catalogue entry offline', async () => {
  for (const crop of MAGYP_CROPS) {
    const result = await evaluateRotations({ ...input, currentCropIds: [crop] }, deps);
    assert.equal(result.managementRecommendations?.[0].crop, crop);
    assert.ok(result.managementRecommendations?.[0].actions.length);
    assert.notEqual(result.diagnostics.outcome, 'unsupported_perennial');
    assert.doesNotMatch(result.warnings.join(' '), /no tiene parámetros completos/);
  }
});

test('mixed farms retain every crop and deduplicate aliases without merging aggregate entries', async () => {
  const result = await evaluateRotations({ ...input, currentCropIds: [...MAGYP_CROPS, 'maize', 'Ajo'] }, deps);
  assert.equal(result.managementRecommendations?.length, 41);
  assert.deepEqual(result.managementRecommendations?.map(item => item.crop), [...MAGYP_CROPS]);
});

test('priority, irrigation, texture and predecessor shape the recommendations', () => {
  const [water] = recommendCropManagement({ ...input, currentCropIds: ['Ajo'] });
  assert.equal(water.actions[0].objective, 'water');
  assert.match(water.context.join(' '), /Secano.*franco arenoso/);
  const [margin] = recommendCropManagement({ ...input, currentCropIds: ['Ajo'], priorities: { priority: 'maximize_margin' }, irrigationAvailable: true, maxMonthlyIrrigationMm: 30, soil: { type: 'clay_vertisol' }, previousCropId: 'Cebolla total' });
  assert.equal(margin.actions[0].objective, 'margin');
  assert.match(margin.context.join(' '), /30 mm\/mes.*arcilloso.*Cebolla total/);
  const [unknownVolume] = recommendCropManagement({ ...input, currentCropIds: ['Arroz'], irrigationAvailable: true });
  assert.match(unknownVolume.context.join(' '), /Registrar volumen/);
});

test('perennials and sugarcane receive management without annual replacement sequences', async () => {
  for (const crop of MAGYP_CROPS.filter(crop => CROP_MANAGEMENT_PROFILES[crop].system !== 'annual')) {
    assert.equal(isPerennialCropName(crop), true);
    const result = await evaluateRotations({ ...input, currentCropIds: [crop] }, deps);
    assert.equal(result.diagnostics.outcome, 'management');
    assert.equal(result.alternatives.length, 0);
    assert.deepEqual(result.diagnostics.generationBlocks, []);
  }
  for (const crop of ['Cártamo', 'Lenteja', 'Trigo total', 'Cebada total']) assert.equal(isPerennialCropName(crop), false);
});

test('optimizer UI displays all registered crops and the management actions', async () => {
  const result = await evaluateRotations({ ...input, currentCropIds: [...MAGYP_CROPS] }, deps);
  const farm = {
    currentCrop: 'soybean', fieldSizeHectares: 410, soilType: 'sandy_loam', irrigation: 'dryland', priority: 'conserve_moisture',
    location: { name: 'Prueba de cobertura', lat: input.lat, lng: input.lng, province: 'Chaco', region: 'norte' },
    cropAllocations: MAGYP_CROPS.map(crop => ({ crop, hectares: 10 }))
  } as FarmProfile;
  const html = renderToStaticMarkup(createElement(RotationStrategies, { farmProfile: farm, engineResult: result, plans: [], lang: 'es', engineLoading: false }));
  assert.match(html, /Recomendaciones por cultivo/);
  for (const crop of MAGYP_CROPS) assert.match(html, new RegExp(`<h3[^>]*>${crop}</h3>`), crop);
});

test('optimizer UI shows qualitative management without a misleading fallback error', async () => {
  const result = await evaluateRotations({ ...input, currentCropIds: ['Ajo'] }, deps);
  const farm = {
    currentCrop: 'soybean', fieldSizeHectares: 410, soilType: 'sandy_loam', irrigation: 'dryland', priority: 'conserve_moisture',
    location: { name: 'Prueba de cobertura', lat: input.lat, lng: input.lng, province: 'Chaco', region: 'norte' },
    cropAllocations: [{ crop: 'Ajo', hectares: 410 }]
  } as FarmProfile;
  const html = renderToStaticMarkup(createElement(RotationStrategies, {
    farmProfile: farm,
    engineResult: result,
    engineError: 'El motor aún no modela este cultivo.',
    plans: [],
    lang: 'es',
    engineLoading: false
  }));
  assert.match(html, /aria-label="Detalles del motor"/);
  assert.match(html, /Ajo/);
  assert.doesNotMatch(html, /Orientación cualitativa/);
  assert.doesNotMatch(html, /El motor aún no modela este cultivo/);
  assert.doesNotMatch(html, /se requieren datos de cada lote/);
  const sectionOrder = [
    html.indexOf('Optimizá tus cultivos'),
    html.indexOf('Estancia evaluada'),
    html.indexOf('Resumen de IA')
  ];
  assert.ok(sectionOrder.every(index => index >= 0));
  assert.deepEqual(sectionOrder, [...sectionOrder].sort((a, b) => a - b));
});
