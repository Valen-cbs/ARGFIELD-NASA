import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { CONAE_LAYERS, buildFeatureInfoUrl, resolveLayerName } from '../src/data/conaeLayers';
import { getSatelliteProduct } from '../src/data/satelliteProducts';
import { clearSatelliteMetadataCache, decodeStacValue, emptyReading, finiteValue, loadSatelliteProduct, parseFeatureInfo, parseJSON, parseWmsCapabilities, readingStatus, requestText, SatelliteServiceError, selectStacCandidates } from '../src/services/satelliteApi';
import { deriveSatelliteAlerts } from '../src/services/satelliteAlerts';
import { viaProxy } from '../src/services/proxy';
import { FarmProfile } from '../src/types';

const layer = (id: string) => CONAE_LAYERS.find(l => l.id === id)!;
const product = (id: string) => getSatelliteProduct(id)!;
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; clearSatelliteMetadataCache(); });
const now = new Date('2026-11-14T18:00:00Z');
const conaeResponses = JSON.parse(readFileSync(new URL('./fixtures/conae-feature-info.json', import.meta.url), 'utf8'));
const feature = (value: unknown) => ({ features: [{ properties: { GRAY_INDEX: value } }] });
const caps = (title = 'SAOCOM 2026-11-12') => `<?xml version="1.0"?><WMS_Capabilities><Capability><Layer queryable="1"><Title>Root</Title><Layer><Name>DSS_MSM_1</Name><Title>${title}</Title></Layer></Layer></Capability></WMS_Capabilities>`;
const item = (baseline = '04.00') => ({ id: 'public-test-scene', properties: { 's2:processing_baseline': baseline }, assets: { B04: {}, B08: {}, SCL: {}, LST_Day_1km: {} } });
const pixel = (names: string[], values: unknown[]) => ({ band_names: names.map(n => `${n}_b1`), values });

test('capabilities preserve provider dates, inherited queryability and interval end', () => {
  assert.deepEqual(parseWmsCapabilities(caps()), [{ name: 'DSS_MSM_1', title: 'SAOCOM 2026-11-12', observedAt: '2026-11-12', queryable: true }]);
  assert.equal(parseWmsCapabilities(caps('API 2026-11-07 al 2026-11-13'))[0].observedAt, '2026-11-13');
  assert.equal(parseWmsCapabilities(caps('Sin fecha'))[0].observedAt, null);
  assert.equal(parseWmsCapabilities(caps().replace('queryable="1"', 'queryable="true"'))[0].queryable, true);
});

test('capabilities reject OGC exceptions, HTML, invalid XML and DTDs', () => {
  for (const xml of ['<ServiceExceptionReport><ServiceException>No layer</ServiceException></ServiceExceptionReport>', '<html>Proxy unavailable</html>', '<broken>', '<!DOCTYPE x [<!ENTITY x SYSTEM "file:///secret">]><WMS_Capabilities/>']) assert.throws(() => parseWmsCapabilities(xml), SatelliteServiceError);
  assert.throws(() => parseJSON('<ows:ExceptionReport/>'), (e: SatelliteServiceError) => e.code === 'ogc');
  assert.throws(() => parseJSON('<html>failure</html>'), (e: SatelliteServiceError) => e.code === 'format');
});

test('valid zero rainfall survives; null, empty and NoData never become zero moisture', () => {
  assert.equal(parseFeatureInfo(feature(0), layer('lluvia_imerg')).value, 0);
  assert.equal(parseFeatureInfo(feature(0), layer('fusarium')).value, 0);
  assert.equal(parseFeatureInfo(feature(0.21), layer('smap')).value, 21);
  assert.equal(parseFeatureInfo(feature(25), layer('saocom_humedad')).value, 25);
  for (const v of [null, undefined, '', ' ', 'NaN', -9999, -32768, 255, 0]) assert.equal(parseFeatureInfo(feature(v), layer('saocom_humedad')).hasData, false);
  assert.throws(() => parseFeatureInfo({ features: [{ properties: { id: 24, date: '2026-11-12' } }] }, layer('saocom_humedad')), (e: SatelliteServiceError) => e.code === 'unsupported');
  assert.equal(parseFeatureInfo({ features: [] }, layer('smap')).value, null);
  assert.throws(() => parseFeatureInfo({ error: 'failed' }, layer('smap')), SatelliteServiceError);
  assert.equal(parseFeatureInfo(feature(-9999), layer('rinde_maiz')).hasData, false);
  assert.equal(parseFeatureInfo(feature(0), layer('inundacion')).hasData, false);
});

test('non-finite values and arbitrary objects are invalid', () => {
  for (const v of [null, '', false, {}, [], Infinity, -Infinity, -3.4e38, 'NaN']) assert.equal(finiteValue(v), null);
  assert.equal(finiteValue('0'), 0);
});

test('real CONAE response fields retain valid measurements instead of returning NoData', () => {
  const expected: Record<string, number> = { saocom_humedad: 36, saocom_percentil: 27, smos: 6.353, lluvia_imerg: 4.2, lluvia_imerg_mensual: 124.615, fusarium: 1, estatus_hidrico: 59.985 };
  for (const [id, value] of Object.entries(expected)) {
    const result = parseFeatureInfo(conaeResponses[id], layer(id));
    assert.equal(result.hasData, true, id);
    assert.equal(result.value, value, id);
  }
  assert.equal(parseFeatureInfo(conaeResponses.smap, layer('smap')).hasData, false);
});

test('an explicit provider null cannot fall back to a different numeric field', () => {
  assert.equal(parseFeatureInfo({ features: [{ properties: { HUMEDAD_DE_SUELO: null, GRAY_INDEX: 25, id: 123 } }] }, layer('smap')).hasData, false);
  assert.equal(parseFeatureInfo({ features: [{ properties: { PA1D: 0 } }] }, layer('lluvia_imerg')).value, 0);
});

test('monthly dates come from the published interval, never the query timestamp', () => {
  const xml = '<WMS_Capabilities><Capability><Layer><Layer queryable="1"><Name>MOM_GPMIMERG_PA1M_1</Name><Title>PA mensual GPM-IMERG 2026-10</Title><Abstract>Precipitación de 2026-10-01 a 2026-10-31.</Abstract></Layer></Layer></Capability></WMS_Capabilities>';
  assert.equal(parseWmsCapabilities(xml)[0].observedAt, '2026-10-31');
});

test('stale SMAP, unknown dates and future dates are never current', () => {
  assert.equal(readingStatus('2023-11-21', 7, now), 'stale');
  assert.equal(readingStatus('2026-11-12', 7, now), 'available');
  assert.equal(readingStatus(null, 7, now), 'undated');
  assert.equal(readingStatus('invalid', 7, now), 'undated');
  assert.equal(readingStatus('2027-01-01', 7, now), 'undated');
});

test('Sentinel-2 NDVI corrects processing offsets and follows band names', () => {
  const p = pixel(['SCL', 'B08', 'B04'], [4, 5000, 2000]);
  assert.ok(Math.abs(decodeStacValue('sentinel2_ndvi', item(), p)! - 0.6) < 1e-9);
  assert.ok(Math.abs(decodeStacValue('sentinel2_ndvi', item('03.00'), p)! - 3 / 7) < 1e-9);
  const scaled = item();
  scaled.assets.B04 = { 'raster:bands': [{ scale: 0.0001, offset: -0.1 }] } as any;
  scaled.assets.B08 = { 'raster:bands': [{ scale: 0.0001, offset: -0.1 }] } as any;
  assert.ok(Math.abs(decodeStacValue('sentinel2_ndvi', scaled, p)! - 0.6) < 1e-9);
});

test('Sentinel-2 rejects cloud, shadow, missing bands and zero denominators', () => {
  for (const scl of [0, 1, 2, 3, 7, 8, 9, 10, 11, null]) assert.equal(decodeStacValue('sentinel2_ndvi', item(), pixel(['B04', 'B08', 'SCL'], [2000, 5000, scl])), null);
  assert.equal(decodeStacValue('sentinel2_ndvi', item(), pixel(['B04', 'B08', 'SCL'], [1000, 1000, 4])), null);
  assert.equal(decodeStacValue('sentinel2_ndvi', item(), pixel(['B08', 'SCL'], [5000, 4])), null);
});

test('MODIS converts scaled Kelvin into Celsius and checks QC bits', () => {
  assert.ok(Math.abs(decodeStacValue('modis_lst', item(), pixel(['LST_Day_1km', 'QC_Day'], [15000, 0]))! - 26.85) < 1e-9);
  for (const qc of [2, 3, 192, null]) assert.equal(decodeStacValue('modis_lst', item(), pixel(['LST_Day_1km', 'QC_Day'], [15000, qc])), null);
  assert.equal(decodeStacValue('modis_lst', item(), pixel(['LST_Day_1km', 'QC_Day'], [0, 0])), null);
});

test('Sentinel-1 is radar backscatter in dB, not soil moisture', () => {
  assert.ok(Math.abs(decodeStacValue('sentinel1_radar', item(), pixel(['vv'], [0.1]))! + 10) < 1e-9);
  assert.equal(decodeStacValue('sentinel1_radar', item(), pixel(['vv'], [0])), null);
});

test('proxies are restricted to known providers and preserve query parameters', () => {
  const url = buildFeatureInfoUrl(layer('smap'), 1, 0, 0);
  assert.ok(viaProxy(url).startsWith('/proxy/conae2/geoserver/HumedadDeSuelos/wms?'));
  const params = new URL(`https://example.test${viaProxy(url)}`).searchParams;
  assert.equal(params.get('SRS'), 'EPSG:4326');
  assert.equal(params.get('X'), '50');
  assert.equal(params.get('INFO_FORMAT'), 'application/json');
  assert.throws(() => viaProxy('https://unknown.test/private'));
  assert.throws(() => viaProxy('http://geoservicios2.conae.gov.ar/wms'));
  assert.ok(resolveLayerName(layer('lluvia_imerg_mensual'), 999).endsWith('_13'));
  assert.ok(resolveLayerName(layer('saocom_humedad'), -5).endsWith('_1'));
});

test('HTTP failures are checked before parsing', async () => {
  globalThis.fetch = async () => new Response('{"features":[]}', { status: 503 });
  await assert.rejects(() => requestText('/proxy/test'), (e: SatelliteServiceError) => e.code === 'http' && e.message.includes('503'));
});

test('WMS product retains metadata date, reports NoData separately and classifies errors', async () => {
  let response = new Response(JSON.stringify(feature(24)), { headers: { 'Content-Type': 'application/json' } });
  globalThis.fetch = async url => String(url).includes('GetCapabilities') ? new Response(caps('SMAP 2023-11-21')) : response.clone();
  const result = await loadSatelliteProduct(product('saocom_humedad'), { lat: 0, lng: 0 });
  assert.equal(result.status, 'stale'); assert.equal(result.observedAt, '2023-11-21'); assert.equal(result.value, 24);
  response = new Response(JSON.stringify(feature(null)));
  assert.equal((await loadSatelliteProduct(product('saocom_humedad'), { lat: 0, lng: 0 })).status, 'no_data');
  response = new Response('<ServiceExceptionReport/>');
  assert.equal((await loadSatelliteProduct(product('saocom_humedad'), { lat: 0, lng: 0 })).errorCode, 'ogc');
  response = new Response('Failure', { status: 502 });
  assert.equal((await loadSatelliteProduct(product('saocom_humedad'), { lat: 0, lng: 0 })).errorCode, 'http');
});

test('STAC falls back from a cloudy latest scene to a valid older scene', async () => {
  const latest = { ...item(), id: 'cloudy', properties: { ...item().properties, datetime: new Date().toISOString() } };
  const clear = { ...latest, id: 'clear' };
  globalThis.fetch = async url => {
    const u = String(url);
    if (u.includes('/search?')) return Response.json({ features: [latest, clear] });
    return Response.json(pixel(['B04', 'B08', 'SCL'], [2000, 5000, u.includes('item=cloudy') ? 9 : 4]));
  };
  const result = await loadSatelliteProduct(product('sentinel2_ndvi'), { lat: 0, lng: 0 });
  assert.equal(result.value, 0.6); assert.equal(result.sceneId, 'clear');
  assert.ok(result.tileUrl?.includes('assets=visual'));
});

test('cancelled requests cannot produce an error or a reading for the next farm', async () => {
  const controller = new AbortController();
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(options.signal!.reason));
  });
  const pending = loadSatelliteProduct(product('sentinel2_ndvi'), { lat: 0, lng: 0 }, 1, controller.signal);
  controller.abort();
  await assert.rejects(() => pending);
});

const farm = { location: { lat: 0, lng: 0, name: 'Synthetic test' }, currentCrop: 'wheat' } as FarmProfile;
test('a cloudy scene supplies map context without claiming a valid NDVI reading', async () => {
  const scene = { ...item(), properties: { ...item().properties, datetime: '2026-11-13T00:00:00Z' } };
  globalThis.fetch = async url => String(url).includes('/search?') ? Response.json({ features: [scene] }) : Response.json(pixel(['B04', 'B08', 'SCL'], [2000, 5000, 9]));
  const result = await loadSatelliteProduct(product('sentinel2_ndvi'), { lat: 0, lng: 0 });
  assert.equal(result.status, 'no_data'); assert.equal(result.value, null);
  assert.equal(result.observedAt, '2026-11-13T00:00:00Z'); assert.ok(result.tileUrl);
});

test('only current, dated percentile or crop-specific model data generate notices', () => {
  const p = product('saocom_percentil');
  const reading = { ...emptyReading(p), value: 10, status: 'available' as const, observedAt: '2026-11-12' };
  const alerts = deriveSatelliteAlerts([reading], farm, now);
  assert.equal(alerts.length, 1); assert.equal(alerts[0].baseline, null); assert.equal(alerts[0].trend, 'unknown');
  for (const changed of [{ ...reading, cached: true }, { ...reading, observedAt: '2023-11-21' }, { ...reading, observedAt: null }, { ...reading, value: null }, { ...reading, value: 50 }]) assert.equal(deriveSatelliteAlerts([changed], farm, now).length, 0);
  assert.equal(deriveSatelliteAlerts([{ ...reading, productId: 'sentinel2_ndvi', value: 0.2 }], farm, now).length, 0);
  const disease = { ...reading, productId: 'fusarium', value: 40 };
  assert.equal(deriveSatelliteAlerts([disease], farm, now).length, 1);
  assert.equal(deriveSatelliteAlerts([disease], { ...farm, currentCrop: 'soybean' }, now).length, 0);
});

test('acquisition search prioritizes different dates and deduplicates scene IDs', () => {
  const scene = (id: string, date: string) => ({ ...item(), id, properties: { datetime: date } });
  const selected = selectStacCandidates([scene('a', '2026-11-14'), scene('b', '2026-11-14'), scene('extra', '2026-11-14'), scene('a', '2026-11-14'), scene('c', '2026-11-13'), scene('d', '2026-11-12')], 4);
  assert.deepEqual(selected.map(s => s.id), ['a', 'b', 'c', 'd']);
});

test('published bounds distinguish outside coverage without querying a different point', async () => {
  const xml = caps().replace('<Title>Root</Title>', '<Title>Root</Title><EX_GeographicBoundingBox><westBoundLongitude>-65</westBoundLongitude><eastBoundLongitude>-57</eastBoundLongitude><southBoundLatitude>-39</southBoundLatitude><northBoundLatitude>-30</northBoundLatitude></EX_GeographicBoundingBox>');
  const requests: string[] = [];
  globalThis.fetch = async url => { requests.push(String(url)); return new Response(xml); };
  const reading = await loadSatelliteProduct(product('saocom_humedad'), { lat: -51.623, lng: -69.2168 });
  assert.equal(reading.missingReason, 'outside_coverage');
  assert.equal(reading.value, null);
  assert.equal(requests.length, 1);
});

test('a later quality-approved observation is found beyond the former four-scene limit', async () => {
  const scenes = Array.from({ length: 7 }, (_, i) => ({ ...item(), id: `scene_${i}`, properties: { ...item().properties, datetime: `2026-11-${String(14 - i).padStart(2, '0')}T00:00:00Z` } }));
  globalThis.fetch = async url => String(url).includes('/search?') ? Response.json({ features: scenes }) : Response.json(pixel(['B04', 'B08', 'SCL'], [2000, 5000, String(url).includes('scene_6') ? 4 : 9]));
  const reading = await loadSatelliteProduct(product('sentinel2_ndvi'), { lat: 0, lng: 0 });
  assert.equal(reading.value, 0.6);
  assert.equal(reading.scenesChecked, 7);
  assert.equal(reading.observedAt, '2026-11-08T00:00:00Z');
});

test('all failed quality checks preserve NoData and report the actual search count', async () => {
  globalThis.fetch = async url => String(url).includes('/search?') ? Response.json({ features: [{ ...item(), properties: { ...item().properties, datetime: '2026-11-13' } }] }) : Response.json(pixel(['B04', 'B08', 'SCL'], [2000, 5000, 9]));
  const reading = await loadSatelliteProduct(product('sentinel2_ndvi'), { lat: 0, lng: 0 });
  assert.equal(reading.missingReason, 'quality'); assert.equal(reading.value, null); assert.equal(reading.scenesChecked, 1);
});

test('MODIS checks the alternate Terra/Aqua composite before accepting an older period', async () => {
  const scenes = ['MYD_new', 'MOD_new', 'MYD_old'].map(id => ({ ...item(), id, assets: { ...item().assets, QC_Day: {} }, properties: { datetime: null, end_datetime: id.endsWith('new') ? '2026-10-31T23:59:59Z' : '2026-09-29T23:59:59Z' } }));
  globalThis.fetch = async url => String(url).includes('/search?') ? Response.json({ features: scenes }) : Response.json(pixel(['LST_Day_1km', 'QC_Day'], [15000, String(url).includes('MYD_new') ? 192 : 0]));
  const reading = await loadSatelliteProduct(product('modis_lst'), { lat: 0, lng: 0 });
  assert.equal(reading.sceneId, 'MOD_new');
  assert.equal(reading.observedAt, '2026-10-31T23:59:59Z');
  assert.equal(reading.value, 26.85);
});


test('Sentinel series uses actual scene dates and preserves latest reading while excluding clouds', async () => {
  const dates = ['2026-11-13', '2026-11-01', '2026-10-15', '2026-10-01'];
  const scenes = dates.map((date, i) => ({ ...item(), id: 'series-' + i, properties: { ...item().properties, datetime: date + 'T00:00:00Z' } }));
  globalThis.fetch = async url => String(url).includes('/search?') ? Response.json({ features: scenes }) : Response.json(pixel(['B04', 'B08', 'SCL'], [2000, 5000, String(url).includes('series-1') ? 9 : 4]));
  const result = await loadSatelliteProduct(product('sentinel2_ndvi'), { lat: -34, lng: -60 }, 1, undefined, true);
  assert.equal(result.samples!.length, 3);
  assert.equal(result.observedAt, '2026-11-13T00:00:00Z');
  assert.equal(result.samples!.at(-1)!.observedAt, '2026-10-01T00:00:00Z');
  assert.ok(result.samples!.every(s => s.sourceUrl.includes('/items/series-')));
  assert.deepEqual(result.location, { lat: -34, lng: -60 });
});


test('daily IMERG loader retains historical valid days for variability beyond current freshness window', async () => {
  const { loadSensorObservations } = await import('../src/services/dataLoader');
  const { evidenceFromReadings, observationIndicators } = await import('../src/engine/observations');
  const layers = CONAE_LAYERS.flatMap(l => Array.from({ length: l.days ? l.seriesLength ?? 7 : 1 }, (_, i) => {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    return '<Layer queryable="1"><Name>' + resolveLayerName(l, i + 1) + '</Name><Title>Fixture ' + date + '</Title></Layer>';
  })).join('');
  globalThis.fetch = async input => {
    const url = new URL(String(input), 'https://example.test');
    if (url.searchParams.get('REQUEST') === 'GetCapabilities') return new Response('<WMS_Capabilities><Capability><Layer>' + layers + '</Layer></Capability></WMS_Capabilities>');
    if (url.searchParams.get('REQUEST') === 'GetFeatureInfo') return Response.json(feature(Number((url.searchParams.get('QUERY_LAYERS') ?? '').slice(-1)) || 1));
    return Response.json({ features: [] });
  };
  const readings = await loadSensorObservations({ lat: -34, lng: -60 });
  const rain = readings.find(r => r.productId === 'lluvia_imerg')!;
  assert.equal(rain.samples!.length, 7);
  const diagnostic = observationIndicators(evidenceFromReadings([rain], new Date()), new Date());
  assert.equal(diagnostic[0].id, 'rain_variability');
  assert.equal(diagnostic[0].value, 2);
  assert.equal(diagnostic[0].samples!.length, 7);
});
