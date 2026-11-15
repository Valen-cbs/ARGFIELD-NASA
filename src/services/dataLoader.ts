import { regionalSourcePolicy } from '../data/regionalSources';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DASHBOARD_PRODUCT_IDS, SATELLITE_PRODUCTS } from '../data/satelliteProducts';
import { LatLng } from '../types';
import { SatelliteReading } from '../types/satellite';
import { clearSatelliteMetadataCache, emptyReading, loadSatelliteProduct, readingStatus } from './satelliteApi';

const PRODUCTS = SATELLITE_PRODUCTS.filter(p => DASHBOARD_PRODUCT_IDS.includes(p.id));
const cache = new Map<string, SatelliteReading[]>();
const cacheKey = (point: LatLng) => `${point.lat},${point.lng}`;

export async function loadSensorObservations(point: LatLng, signal?: AbortSignal, onReading?: (reading: SatelliteReading) => void): Promise<SatelliteReading[]> {
  const policy = regionalSourcePolicy(point);
  const priority = (source: string) => /NASA|CONAE/.test(source) ? 0 : policy.preferred.some(a => source.includes(a)) ? 1 : 2;
  const ordered = [...PRODUCTS].sort((a, b) => priority(a.source) - priority(b.source));
  return Promise.all(ordered.map(async product => {
    let reading = await loadSatelliteProduct(product, point, 1, signal, true);
    if (product.id === 'lluvia_imerg' && reading.status === 'available') {
      const previous = await Promise.all([2, 3, 4, 5, 6, 7].map(slot => loadSatelliteProduct(product, point, slot, signal)));
      // Older valid daily measurements belong to the historical seven-day series,
      // even when outside the three-day window for describing current rainfall.
      reading = { ...reading, samples: [reading, ...previous].filter(r => ['available', 'stale'].includes(r.status) && r.value !== null && r.observedAt).map(r => ({ value: r.value!, observedAt: r.observedAt!, sourceUrl: r.sourceUrl })) };
    }
    if (!signal?.aborted) onReading?.(reading);
    return reading;
  }));
}

function cachedReadings(key: string): SatelliteReading[] {
  const saved = cache.get(key);
  return PRODUCTS.map(product => {
    const reading = saved?.find(r => r.productId === product.id);
    if (!reading) return emptyReading(product, 'offline');
    return { ...reading, cached: true,
      status: ['available', 'stale', 'undated'].includes(reading.status) ? readingStatus(reading.observedAt, product.maxAgeDays) : reading.status };
  });
}

export function useSatelliteData(point: LatLng, offline: boolean) {
  const key = cacheKey(point);
  const [refreshId, setRefreshId] = useState(0);
  const requestKey = `${key}/${offline}/${refreshId}`;
  const [state, setState] = useState<{ key: string; readings: SatelliteReading[] }>({ key: '', readings: [] });
  const latestKey = useRef(requestKey);
  latestKey.current = requestKey;
  const refresh = useCallback(() => { clearSatelliteMetadataCache(); setRefreshId(id => id + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (offline) {
      setState({ key: requestKey, readings: cachedReadings(key) });
      return () => controller.abort();
    }
    setState({ key: requestKey, readings: PRODUCTS.map(p => emptyReading(p)) });
    loadSensorObservations({ lat: point.lat, lng: point.lng }, controller.signal, reading => {
      if (controller.signal.aborted || latestKey.current !== requestKey) return;
      // Preserve completed readings if the user goes offline while other providers are pending.
      if (!cache.has(key) && cache.size >= 20) cache.delete(cache.keys().next().value!);
      cache.set(key, [...(cache.get(key) ?? []).filter(r => r.productId !== reading.productId), reading]);
      setState(prev => prev.key === requestKey ? { key: requestKey, readings: prev.readings.map(r => r.productId === reading.productId ? reading : r) } : prev);
    }).then(readings => {
      if (!controller.signal.aborted) {
        cache.set(key, readings);
      }
    }).catch(() => { /* Cancelled on a location/mode change; individual provider failures are readings. */ });
    return () => controller.abort();
  }, [requestKey]);

  const readings = state.key === requestKey ? state.readings : PRODUCTS.map(p => emptyReading(p, offline ? 'offline' : 'loading'));
  return { readings, refresh, loading: readings.some(r => r.status === 'loading') };
}
