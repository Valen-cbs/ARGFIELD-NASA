/** Same routes in Vite development/preview, Vercel and Netlify. */
const PROVIDERS: Record<string, string> = {
  'geoservicios.conae.gov.ar': '/proxy/conae1',
  'geoservicios2.conae.gov.ar': '/proxy/conae2',
  'geoservicios3.conae.gov.ar': '/proxy/conae3',
  'planetarycomputer.microsoft.com': '/proxy/planetary',
  'power.larc.nasa.gov': '/proxy/power'
};

export function viaProxy(url: string): string {
  const parsed = new URL(url);
  const prefix = PROVIDERS[parsed.hostname];
  if (!prefix || parsed.protocol !== 'https:') throw new Error('Proveedor no permitido');
  return `${prefix}${parsed.pathname}${parsed.search}`;
}
