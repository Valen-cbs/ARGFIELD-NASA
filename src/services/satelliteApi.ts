import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ConaeLayer, buildFeatureInfoUrl, resolveLayerName } from '../data/conaeLayers';
import { SatelliteProduct } from '../data/satelliteProducts';
import { LatLng } from '../types';
import { DataErrorCode, SatelliteReading } from '../types/satellite';
import { viaProxy } from './proxy';

export class SatelliteServiceError extends Error {
  constructor(public code: DataErrorCode, message: string) { super(message); }
}

const DAY_MS = 86_400_000;
const asArray = <T,>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];

export async function requestText(url: string, signal?: AbortSignal): Promise<string> {
  try {
    const response = await fetch(url, { signal: AbortSignal.any([AbortSignal.timeout(18_000), ...(signal ? [signal] : [])]) });
    if (!response.ok) throw new SatelliteServiceError('http', `HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof SatelliteServiceError) throw error;
    if (error instanceof Error && error.name === 'TimeoutError') throw new SatelliteServiceError('timeout', 'El proveedor no respondió a tiempo.');
    throw new SatelliteServiceError('network', 'No se pudo contactar al proveedor.');
  }
}

export function parseJSON(text: string): any {
  if (/<(?:\w+:)?(?:ServiceExceptionReport|ServiceException|ExceptionReport|ExceptionText)\b/i.test(text)) {
    throw new SatelliteServiceError('ogc', 'El servicio devolvió una excepción OGC.');
  }
  try { return JSON.parse(text); }
  catch { throw new SatelliteServiceError('format', 'El proveedor no devolvió JSON válido.'); }
}

export interface WmsLayerMetadata { name: string; title: string; observedAt: string | null; queryable: boolean; bounds?: [number, number, number, number] }

/** Never derive acquisition dates from retrieval time or series slot. */
export function parseWmsCapabilities(xml: string): WmsLayerMetadata[] {
  if (XMLValidator.validate(xml) !== true || /<!DOCTYPE/i.test(xml)) throw new SatelliteServiceError('format', 'GetCapabilities no devolvió XML válido.');
  const doc = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, processEntities: false }).parse(xml);
  if (doc.ServiceExceptionReport || doc.ExceptionReport) throw new SatelliteServiceError('ogc', 'GetCapabilities devolvió una excepción OGC.');
  const root = doc.WMS_Capabilities ?? doc.WMT_MS_Capabilities;
  if (!root?.Capability?.Layer) throw new SatelliteServiceError('format', 'Falta el catálogo de capas WMS.');
  const result: WmsLayerMetadata[] = [];
  function visit(node: any, inheritedQueryable: boolean, inheritedBounds?: WmsLayerMetadata['bounds']) {
    const queryable = node['@_queryable'] === undefined ? inheritedQueryable : ['1', 'true'].includes(String(node['@_queryable']));
    const box = node.EX_GeographicBoundingBox;
    const oldBox = node.LatLonBoundingBox;
    const coordinates = box ? [box.westBoundLongitude, box.southBoundLatitude, box.eastBoundLongitude, box.northBoundLatitude].map(Number)
      : oldBox ? [oldBox['@_minx'], oldBox['@_miny'], oldBox['@_maxx'], oldBox['@_maxy']].map(Number) : [];
    const bounds = coordinates.length === 4 && coordinates.every(Number.isFinite) && coordinates[0] <= coordinates[2] && coordinates[1] <= coordinates[3] ? coordinates as WmsLayerMetadata['bounds'] : inheritedBounds;
    if (typeof node.Name === 'string') {
      const title = typeof node.Title === 'string' ? node.Title : node.Name;
      const date = title.match(/\b\d{4}-\d{2}-\d{2}\b/g)?.at(-1);
      let observedAt = date && Number.isFinite(Date.parse(date)) ? date : null;
      // Monthly CONAE titles contain YYYY-MM; the abstract gives the actual interval end.
      if (!observedAt && typeof node.Abstract === 'string') {
        const endDate = node.Abstract.match(/\b\d{4}-\d{2}-\d{2}\b/g)?.at(-1);
        if (endDate && Number.isFinite(Date.parse(endDate))) observedAt = endDate;
      }
      if (!observedAt) {
        const dimension = [...asArray(node.Dimension), ...asArray(node.Extent)].find((d: any) => d?.['@_name'] === 'time');
        const value = typeof dimension === 'string' ? dimension : dimension?.['#text'];
        const dates = String(value ?? '').match(/\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z)?/g);
        if (dates?.length) observedAt = dates.filter(d => Number.isFinite(Date.parse(d))).sort().at(-1) ?? null;
      }
      result.push({ name: node.Name, title, observedAt, queryable, ...(bounds ? { bounds } : {}) });
    }
    asArray(node.Layer).forEach(child => visit(child, queryable, bounds));
  }
  visit(root.Capability.Layer, false);
  return result;
}

const capabilitiesCache = new Map<string, { expiresAt: number; promise: Promise<WmsLayerMetadata[]> }>();
export function clearSatelliteMetadataCache() { capabilitiesCache.clear(); }

export async function getWmsMetadata(layer: ConaeLayer, slot: number, signal?: AbortSignal): Promise<WmsLayerMetadata> {
  signal?.throwIfAborted();
  const cached = capabilitiesCache.get(layer.url);
  let promise = cached && cached.expiresAt > Date.now() ? cached.promise : undefined;
  if (!promise) {
    promise = requestText(`${viaProxy(layer.url)}?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0`).then(parseWmsCapabilities);
    capabilitiesCache.set(layer.url, { promise, expiresAt: Date.now() + 15 * 60_000 });
    const currentPromise = promise;
    promise.catch(() => { if (capabilitiesCache.get(layer.url)?.promise === currentPromise) capabilitiesCache.delete(layer.url); });
  }
  const layers = await promise;
  signal?.throwIfAborted();
  const name = resolveLayerName(layer, slot);
  const metadata = layers.find(m => m.name === name || m.name === name.split(':').at(-1));
  if (!metadata) throw new SatelliteServiceError('unsupported', 'La capa no figura en el catálogo actual del proveedor.');
  return metadata;
}

export function readingStatus(observedAt: string | null, maxAgeDays: number, now = new Date()): 'available' | 'stale' | 'undated' {
  if (!observedAt || !Number.isFinite(Date.parse(observedAt))) return 'undated';
  const age = now.getTime() - Date.parse(observedAt);
  if (age < -DAY_MS) return 'undated';
  return age > maxAgeDays * DAY_MS ? 'stale' : 'available';
}

export function emptyReading(product: SatelliteProduct, status: SatelliteReading['status'] = 'loading'): SatelliteReading {
  return {
    productId: product.id, status, value: null,
    unit: product.kind === 'wms' ? product.wms.measure?.unit ?? '' : product.unit,
    observedAt: null, fetchedAt: null, source: product.source,
    sourceUrl: product.kind === 'wms' ? 'https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html' : `https://planetarycomputer.microsoft.com/dataset/${product.collection}`
  };
}

export function finiteValue(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || [-9999, -999, -32768, 65535].includes(num) || num < -1e30) return null;
  return num;
}

/** A feature ID or arbitrary first property is not a measurement. */
export function parseFeatureInfo(json: any, layer: ConaeLayer): { value: number | null; entries: Array<[string, string]>; hasData: boolean } {
  if (!Array.isArray(json?.features)) throw new SatelliteServiceError('format', 'GetFeatureInfo no devolvió una colección de objetos.');
  if (!json.features.length) return { value: null, entries: [], hasData: false };
  const props = json.features[0]?.properties;
  if (!props || typeof props !== 'object' || Array.isArray(props)) throw new SatelliteServiceError('format', 'GetFeatureInfo no devolvió propiedades válidas.');
  const entries: Array<[string, string]> = Object.entries(props)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .slice(0, 8).map(([k, v]) => [k, String(v).slice(0, 250)]);
  const properties = Object.entries(props);
  const candidate = layer.measure?.fields?.map(field => properties.find(([key]) => key.toUpperCase() === field.toUpperCase())).find(entry => entry !== undefined)
    ?? properties.find(([key]) => /^(gray_index|band_?1|value|pixel_value)$/i.test(key));
  if (layer.measure && !candidate) throw new SatelliteServiceError('unsupported', 'El proveedor devolvió un campo de medición desconocido. No se puede interpretar como falta de cobertura.');
  const raw = finiteValue(candidate?.[1]);
  if (!layer.measure) return { value: null, entries: candidate && raw === null ? [] : entries, hasData: candidate ? raw !== null : entries.length > 0 };
  if (raw === null || layer.measure.noData?.includes(raw)) return { value: null, entries: [], hasData: false };
  const value = raw * (layer.measure.scale ?? 1);
  if (value < layer.measure.min || value > layer.measure.max) return { value: null, entries: [], hasData: false };
  return { value: Math.round(value * 1000) / 1000, entries, hasData: true };
}

async function loadWms(product: SatelliteProduct & { kind: 'wms' }, point: LatLng, slot: number, signal?: AbortSignal): Promise<SatelliteReading> {
  const metadata = await getWmsMetadata(product.wms, slot, signal);
  const box = metadata.bounds;
  if (box && (point.lng < box[0] || point.lng > box[2] || point.lat < box[1] || point.lat > box[3])) return {
    ...emptyReading(product, 'no_data'), observedAt: metadata.observedAt, fetchedAt: new Date().toISOString(),
    missingReason: 'outside_coverage', detail: 'El punto está fuera de la extensión geográfica publicada para este producto. No se reemplaza por otra localidad.'
  };
  if (!metadata.queryable) throw new SatelliteServiceError('unsupported', 'El proveedor permite visualizar esta capa, pero no consultar valores.');
  const text = await requestText(viaProxy(buildFeatureInfoUrl(product.wms, slot, point.lat, point.lng)), signal);
  const parsed = parseFeatureInfo(parseJSON(text), product.wms);
  return {
    ...emptyReading(product), value: parsed.value, entries: parsed.entries,
    sourceUrl: buildFeatureInfoUrl(product.wms, slot, point.lat, point.lng),
    status: parsed.hasData ? readingStatus(metadata.observedAt, product.maxAgeDays) : 'no_data',
    observedAt: metadata.observedAt, fetchedAt: new Date().toISOString(),
    ...(!parsed.hasData ? { missingReason: 'provider_nodata' as const } : {}),
    detail: parsed.hasData ? metadata.title : 'El proveedor respondió sin un dato válido en este punto. No confirma ausencia de riesgo.'
  };
}

type StacItem = {
  id: string; bbox?: number[]; properties: Record<string, any>;
  assets: Record<string, { 'raster:bands'?: Array<{ scale?: number; offset?: number; nodata?: number }> }>;
};

/** Keep chronological priority and allow two scenes per date (including Terra/Aqua composites). */
export function selectStacCandidates(items: StacItem[], limit = 12): StacItem[] {
  const sorted = [...items].sort((a, b) => {
    const time = (item: StacItem) => Date.parse(item.properties.end_datetime ?? item.properties.datetime ?? item.properties.start_datetime ?? '') || 0;
    return time(b) - time(a);
  });
  const days = new Map<string, number>();
  const first: StacItem[] = [], overlap: StacItem[] = [];
  const ids = new Set<string>();
  for (const item of sorted) {
    if (ids.has(item.id)) continue;
    ids.add(item.id);
    const date = String(item.properties.end_datetime ?? item.properties.datetime ?? item.properties.start_datetime ?? item.id).slice(0, 10);
    const count = days.get(date) ?? 0;
    (count >= 2 ? overlap : first).push(item);
    days.set(date, count + 1);
  }
  return [...first, ...overlap].slice(0, limit);
}

export function pointBand(json: any, asset: string): number | null {
  if (!Array.isArray(json?.band_names) || !Array.isArray(json?.values)) throw new SatelliteServiceError('format', 'El servicio de píxeles devolvió un formato desconocido.');
  const index = json.band_names.findIndex((name: unknown) => typeof name === 'string' && (name === asset || name === `${asset}_b1`));
  return finiteValue(index < 0 ? null : json.values[index]);
}

export function decodeStacValue(productId: string, item: StacItem, pixel: any): number | null {
  if (productId === 'sentinel2_ndvi') {
    const scl = pointBand(pixel, 'SCL');
    if (scl === null || ![4, 5, 6].includes(scl)) return null;
    const red = pointBand(pixel, 'B04'), nir = pointBand(pixel, 'B08');
    if (red === null || nir === null || red <= 0 || nir <= 0) return null;
    const reflectance = (asset: string, value: number) => {
      const band = item.assets[asset]?.['raster:bands']?.[0];
      if (band?.scale !== undefined) return value * band.scale + (band.offset ?? 0);
      const baseline = Number(item.properties['s2:processing_baseline']);
      if (!Number.isFinite(baseline)) throw new SatelliteServiceError('unsupported', 'Falta la versión de procesamiento para corregir la reflectancia Sentinel-2.');
      return Math.max(0, value - (baseline >= 4 ? 1000 : 0)) / 10000;
    };
    const r = reflectance('B04', red), n = reflectance('B08', nir);
    const value = (n - r) / (n + r);
    return Number.isFinite(value) && Math.abs(value) <= 1 ? value : null;
  }
  if (productId === 'sentinel1_radar') {
    const vv = pointBand(pixel, 'vv');
    return vv !== null && vv > 0 ? 10 * Math.log10(vv) : null;
  }
  const raw = pointBand(pixel, 'LST_Day_1km'), qc = pointBand(pixel, 'QC_Day');
  if (raw === null || raw <= 0 || qc === null || !Number.isInteger(qc) || qc < 0 || qc > 255 || (qc & 3) > 1 || ((qc >> 6) & 3) > 1) return null;
  const band = item.assets.LST_Day_1km?.['raster:bands']?.[0];
  const celsius = raw * (band?.scale ?? 0.02) + (band?.offset ?? 0) - 273.15;
  return celsius >= -100 && celsius <= 100 ? celsius : null;
}

function stacTileUrl(product: SatelliteProduct & { kind: 'stac' }, item: StacItem): string {
  const params = new URLSearchParams({ collection: product.collection, item: item.id });
  if (product.id === 'sentinel2_ndvi') {
    params.set('assets', 'visual');
  } else if (product.id === 'sentinel1_radar') {
    params.set('expression', '10*log10(vv_b1)'); params.set('rescale', '-25,0'); params.set('colormap_name', 'gray');
  } else {
    params.set('expression', 'LST_Day_1km_b1*0.02-273.15'); params.set('rescale', '-10,55'); params.set('colormap_name', 'magma');
  }
  return `/proxy/planetary/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?${params}`;
}

async function loadStac(product: SatelliteProduct & { kind: 'stac' }, point: LatLng, signal?: AbortSignal, collectSeries = false): Promise<SatelliteReading> {
  const params = new URLSearchParams({ collections: product.collection,
    intersects: JSON.stringify({ type: 'Point', coordinates: [point.lng, point.lat] }), limit: '24', sortby: '-datetime',
    datetime: `${new Date(Date.now() - 90 * DAY_MS).toISOString()}/${new Date().toISOString()}` });
  const json = parseJSON(await requestText(`/proxy/planetary/api/stac/v1/search?${params}`, signal));
  if (!Array.isArray(json?.features)) throw new SatelliteServiceError('format', 'El catálogo STAC no devolvió escenas.');
  const items: StacItem[] = json.features.filter((item: StacItem) => typeof item?.id === 'string' && item.properties && product.assets.every(a => item.assets?.[a]));
  let lastError: unknown;
  let successfulPoints = 0;
  let previewItem: StacItem | undefined;
  let consecutiveFailures = 0;
  let scenesChecked = 0;
  let latestReading: SatelliteReading | undefined;
  const samples: NonNullable<SatelliteReading['samples']> = [];
  for (const item of selectStacCandidates(items)) {
    signal?.throwIfAborted();
    scenesChecked++;
    try {
      const pixelParams = new URLSearchParams({ collection: product.collection, item: item.id });
      product.assets.forEach(a => pixelParams.append('assets', a));
      const pixel = parseJSON(await requestText(`/proxy/planetary/api/data/v1/item/point/${point.lng},${point.lat}?${pixelParams}`, signal));
      const value = decodeStacValue(product.id, item, pixel);
      successfulPoints++;
      consecutiveFailures = 0;
      previewItem ??= item;
      if (value === null) continue;
      const observedAt = item.properties.end_datetime ?? item.properties.datetime ?? item.properties.start_datetime ?? null;
      const reading: SatelliteReading = {
        ...emptyReading(product), value: Math.round(value * 1000) / 1000,
        status: readingStatus(observedAt, product.maxAgeDays), observedAt,
        fetchedAt: new Date().toISOString(), sceneId: item.id, tileUrl: stacTileUrl(product, item),
        scenesChecked,
        sceneBounds: item.bbox?.length === 4 ? item.bbox as [number, number, number, number] : undefined,
        sourceUrl: `https://planetarycomputer.microsoft.com/api/stac/v1/collections/${product.collection}/items/${encodeURIComponent(item.id)}`,
        detail: product.id === 'sentinel2_ndvi' ? 'NDVI del píxel validado con SCL. El mapa muestra la escena en color natural.' : product.description.es
      };
      if (!collectSeries || product.id !== 'sentinel2_ndvi') return reading;
      latestReading ??= reading;
      if (observedAt) samples.push({ value: reading.value!, observedAt, sourceUrl: reading.sourceUrl });
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
      consecutiveFailures++;
      if (consecutiveFailures >= 2 && error instanceof SatelliteServiceError && (['network', 'timeout'].includes(error.code) || /HTTP (429|5\d\d)/.test(error.message))) break;
    }
  }
  if (latestReading) return { ...latestReading, samples, scenesChecked };
  if (!successfulPoints && lastError) throw lastError;
  return {
    ...emptyReading(product, 'no_data'), fetchedAt: new Date().toISOString(),
    scenesChecked, missingReason: lastError ? 'partial_failure' : items.length ? 'quality' : 'no_scenes',
    ...(previewItem ? {
      observedAt: previewItem.properties.end_datetime ?? previewItem.properties.datetime ?? previewItem.properties.start_datetime ?? null,
      sceneId: previewItem.id, tileUrl: stacTileUrl(product, previewItem),
      sceneBounds: previewItem.bbox?.length === 4 ? previewItem.bbox as [number, number, number, number] : undefined
    } : {}),
    detail: lastError ? 'Algunas consultas fallaron; no se pudo confirmar un píxel válido en las escenas revisadas.' : items.length ? `Ningún píxel superó el control de calidad en ${scenesChecked} escenas revisadas en este punto (búsqueda de hasta 90 días).` : 'El catálogo no devolvió escenas compatibles en este punto durante los últimos 90 días.'
  };
}

export async function loadSatelliteProduct(product: SatelliteProduct, point: LatLng, slot = 1, signal?: AbortSignal, collectSeries = false): Promise<SatelliteReading> {
  try {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) throw new SatelliteServiceError('format', 'Coordenadas inválidas.');
    const reading = product.kind === 'wms' ? await loadWms(product, point, slot, signal) : await loadStac(product, point, signal, collectSeries);
    return { ...reading, location: { ...point } };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ...emptyReading(product, 'error'), fetchedAt: new Date().toISOString(),
      errorCode: error instanceof SatelliteServiceError ? error.code : 'format',
      detail: error instanceof Error ? error.message : 'No se pudo interpretar el producto.' };
  }
}
