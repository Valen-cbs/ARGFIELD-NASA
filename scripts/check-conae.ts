/** Optional live diagnostic. Only public city-centre test points; never reads a saved farm. */
import { getSatelliteProduct } from '../src/data/satelliteProducts';
import { loadSatelliteProduct } from '../src/services/satelliteApi';

const nativeFetch = globalThis.fetch;
const targets: Record<string, string> = {
  '/proxy/conae1': 'https://geoservicios.conae.gov.ar',
  '/proxy/conae2': 'https://geoservicios2.conae.gov.ar',
  '/proxy/conae3': 'https://geoservicios3.conae.gov.ar'
};
globalThis.fetch = (input, options) => {
  const path = String(input);
  const prefix = Object.keys(targets).find(p => path.startsWith(`${p}/`));
  if (!prefix) throw new Error('Proveedor inesperado en el diagnóstico CONAE.');
  return nativeFetch(targets[prefix] + path.slice(prefix.length), options);
};

const points = [
  { name: 'Pergamino · centro público', lat: -33.896, lng: -60.573 },
  { name: 'Junín · centro público', lat: -34.585, lng: -60.958 }
];
const ids = ['saocom_humedad', 'saocom_percentil', 'smap', 'smos', 'lluvia_imerg', 'lluvia_imerg_mensual', 'fusarium'];
try {
  for (const point of points) {
    const readings = await Promise.all(ids.map(id => loadSatelliteProduct(getSatelliteProduct(id)!, point)));
    console.log(point.name);
    console.table(readings.map(r => ({ producto: r.productId, estado: r.status, valor: r.value, unidad: r.unit, fecha: r.observedAt, error: r.errorCode ?? '' })));
    if (readings.some(r => r.status === 'error')) process.exitCode = 1;
  }
} finally {
  globalThis.fetch = nativeFetch;
}
