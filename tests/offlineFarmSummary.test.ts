import test from 'node:test';
import assert from 'node:assert/strict';
import { offlineFarmSummary } from '../src/services/offlineFarmSummary';

test('offline farm summary reports only supplied status data', () => {
  const summary = offlineFarmSummary({
    name: 'Bariloche', province: 'Río Negro', weather: { temperature: 8 },
    forecast: [{ rain: 2 }, { rain: 3 }], readings: [{ status: 'available' }, { status: 'no_data' }], optimizerStatus: 'ready'
  }, 'es');
  assert.match(summary, /Bariloche, Río Negro/);
  assert.match(summary, /1 de 2/);
  assert.match(summary, /5\.0 mm/);
});
