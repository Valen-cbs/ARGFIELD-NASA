/** Offline reproducible demo. POWER fixture is an actual Chaco acquisition;
 * MAGyP is deliberately absent. No live observations or yields are fabricated. */
import { readFileSync } from 'node:fs';
import { evaluateRotations, defaultEngineDeps } from '../src/engine/engine';
import { aggregatePowerDaily, parsePowerDaily } from '../src/engine/climate';
import type { RotationEngineInput } from '../src/engine/engineTypes';

const nowIso = '2026-11-15T18:00:00Z';
const years = { start: 2016, end: 2025 };
const fixture = 'tests/fixtures/power-chaco-2016-2025.json';
const climate = aggregatePowerDaily(parsePowerDaily(JSON.parse(readFileSync(fixture, 'utf8')), years), years, nowIso, fixture);
const input: RotationEngineInput = {
  lat: -26.786, lng: -60.443, province: 'Chaco', region: 'norte', hectares: 120,
  currentCropIds: ['Soja 1ra'], previousCropId: 'soja1', irrigationAvailable: false,
  soil: { type: 'mollisol_deep' }, constraints: { horizonCampaigns: 3 },
  priorities: { priority: 'conserve_moisture' }, nowIso
};
const result = await evaluateRotations(input, { ...defaultEngineDeps, climateCacheId: 'smoke-optimizer', fetchClimate: async () => climate, loadProvincial: async () => null, loadDepartamental: async () => null });
if (result.alternatives.length < 3 || result.baseline) throw new Error('Expected at least three prospective alternatives without a declared baseline.');
console.log(JSON.stringify({ input, climateFixture: fixture, diagnostics: result.diagnostics, bestThree: result.alternatives.slice(0, 3).map(a => ({ label: a.label, score: a.score, completeness: a.completeness, sequence: a.sequence, exclusions: a.exclusions, criteria: a.criteria })) }, null, 2));
