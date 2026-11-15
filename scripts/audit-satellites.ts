/** Live regional audit using public city centres only; never reads a farm profile. */
import { writeFile } from 'node:fs/promises';
import { DASHBOARD_PRODUCT_IDS, SATELLITE_PRODUCTS } from '../src/data/satelliteProducts';
import { loadSatelliteProduct } from '../src/services/satelliteApi';
import { renderAudit } from './render-audit';

const nativeFetch = globalThis.fetch;
const targets: Record<string, string> = {
  '/proxy/conae1': 'https://geoservicios.conae.gov.ar', '/proxy/conae2': 'https://geoservicios2.conae.gov.ar',
  '/proxy/conae3': 'https://geoservicios3.conae.gov.ar', '/proxy/planetary': 'https://planetarycomputer.microsoft.com'
};
globalThis.fetch = (input, options) => {
  const path = String(input), prefix = Object.keys(targets).find(p => path.startsWith(`${p}/`));
  if (!prefix) throw new Error('Unexpected audit provider');
  return nativeFetch(targets[prefix] + path.slice(prefix.length), options);
};
const cities = [
  { name: 'Pergamino', lat: -33.896, lng: -60.573 },
  { name: 'Rosario', lat: -32.9468, lng: -60.6393 },
  { name: 'Córdoba', lat: -31.4201, lng: -64.1888 },
  { name: 'Resistencia', lat: -27.4514, lng: -58.9867 },
  { name: 'Salta', lat: -24.7821, lng: -65.4232 },
  { name: 'Mendoza', lat: -32.8895, lng: -68.8458 },
  { name: 'Neuquén', lat: -38.9516, lng: -68.0591 },
  { name: 'Trelew', lat: -43.249, lng: -65.3051 },
  { name: 'Río Gallegos', lat: -51.623, lng: -69.2168 }
];
const products = SATELLITE_PRODUCTS.filter(p => DASHBOARD_PRODUCT_IDS.includes(p.id));
const results = [];
try {
  for (const city of cities) {
    const readings = await Promise.all(products.map(p => loadSatelliteProduct(p, city)));
    results.push({ city, readings });
    console.log(city.name, readings.map(r => `${r.productId}=${r.status}:${r.value ?? 'null'}${r.errorCode ? `(${r.errorCode})` : ''}`).join(' | '));
  }
  await writeFile('docs/AUDITORIA_SATELITAL.json', JSON.stringify({ auditedAt: new Date().toISOString(), note: 'Public city-centre points; not farm averages. Values must not be hardcoded into the application.', results }, null, 2) + '\n');
  await renderAudit();
} finally { globalThis.fetch = nativeFetch; }
