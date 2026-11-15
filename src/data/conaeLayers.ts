/**
 * Capas reales publicadas por CONAE como servicios WMS (OGC).
 * Fuente de nombres y endpoints: https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html
 *
 * Las capas con `days: true` se publican como serie de 7 días (sufijos _1 a _7).
 * CONAE no aclara en la página qué sufijo es el día más reciente; por convención
 * de otros servicios suyos se usa _1 por defecto. Verificar con la leyenda.
 */

export type ConaeLayerId =
  | 'estatus_hidrico'
  | 'saocom_humedad'
  | 'saocom_percentil'
  | 'smap'
  | 'lluvia_imerg'
  | 'inundacion'
  | 'focos_viirs'
  | 'focos_goes';

export interface ConaeLayer {
  id: ConaeLayerId;
  group: 'agua' | 'riesgo';
  name: { es: string; en: string };
  description: { es: string; en: string };
  /** Endpoint WMS del workspace de GeoServer */
  url: string;
  /** Nombre de la capa; si `days` es true, se le agrega el número de día (1 a 7) */
  layer: string;
  days: boolean;
  source: string;
  coverage?: { es: string; en: string };
}

export const CONAE_GEOSERVICIOS_URL =
  'https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html';

export const CONAE_LAYERS: ConaeLayer[] = [
  {
    id: 'estatus_hidrico',
    group: 'agua',
    name: { es: 'Estatus hídrico', en: 'Water status' },
    description: {
      es: 'Percentil del índice de precipitación antecedente: qué tan húmedo está el suelo comparado con 25 años de lluvia.',
      en: 'Antecedent precipitation index percentile: how wet the soil is compared with 25 years of rainfall.'
    },
    url: 'https://geoservicios2.conae.gov.ar/geoserver/EstatusHidrico/wms',
    layer: 'EstatusHidrico:MHS_GPMIMERG_PCNTLAPI_',
    days: true,
    source: 'CONAE · NASA GPM IMERG'
  },
  {
    id: 'saocom_humedad',
    group: 'agua',
    name: { es: 'Humedad SAOCOM 0–50 cm', en: 'SAOCOM soil moisture 0–50 cm' },
    description: {
      es: 'Agua en el perfil del suelo hasta 50 cm, del radar argentino SAOCOM.',
      en: 'Soil profile moisture down to 50 cm from the Argentine SAOCOM radar.'
    },
    url: 'https://geoservicios3.conae.gov.ar/geoserver/HumedadDeSuelos/wms',
    layer: 'HumedadDeSuelos:DSS_MSM_',
    days: true,
    source: 'CONAE · SAOCOM 1',
    coverage: { es: 'Solo Región Pampeana', en: 'Pampas region only' }
  },
  {
    id: 'saocom_percentil',
    group: 'agua',
    name: { es: 'Humedad vs. lo normal', en: 'Moisture vs. normal' },
    description: {
      es: 'Rango percentil de la humedad SAOCOM: seco, normal o húmedo para la fecha.',
      en: 'SAOCOM moisture percentile range: dry, normal or wet for the date.'
    },
    url: 'https://geoservicios3.conae.gov.ar/geoserver/HumedadDeSuelos/wms',
    layer: 'HumedadDeSuelos:DSS_PSM_',
    days: true,
    source: 'CONAE · SAOCOM 1',
    coverage: { es: 'Solo Región Pampeana', en: 'Pampas region only' }
  },
  {
    id: 'smap',
    group: 'agua',
    name: { es: 'Humedad superficial SMAP', en: 'SMAP surface moisture' },
    description: {
      es: 'Humedad de los primeros 5 cm del suelo, última pasada matutina del satélite SMAP.',
      en: 'Top 5 cm soil moisture, latest morning pass of the SMAP satellite.'
    },
    url: 'https://geoservicios2.conae.gov.ar/geoserver/HumedadDeSuelos/wms',
    layer: 'HumedadDeSuelos:SMAP_Pasada_Descendente',
    days: false,
    source: 'NASA SMAP vía CONAE'
  },
  {
    id: 'lluvia_imerg',
    group: 'agua',
    name: { es: 'Lluvia diaria', en: 'Daily rainfall' },
    description: {
      es: 'Lluvia acumulada en el día estimada por satélite.',
      en: 'Daily accumulated rainfall estimated from satellites.'
    },
    url: 'https://geoservicios2.conae.gov.ar/geoserver/PrecipitacionAcumulada/wms',
    layer: 'PrecipitacionAcumulada:MOM_GPMIMERG_PA1D_',
    days: true,
    source: 'NASA GPM IMERG vía CONAE'
  },
  {
    id: 'inundacion',
    group: 'riesgo',
    name: { es: 'Áreas inundadas', en: 'Flooded areas' },
    description: {
      es: 'Fracción de cada píxel cubierta por agua, producto diario.',
      en: 'Fraction of each pixel covered by water, daily product.'
    },
    url: 'https://geoservicios2.conae.gov.ar/geoserver/Inundaciones/wms',
    layer: 'Inundaciones:NOAA20-SNPP-GOES19_VIIRS-VIIRS-ABI_FLD_',
    days: true,
    source: 'NOAA-20/SNPP VIIRS + GOES-19 vía CONAE'
  },
  {
    id: 'focos_viirs',
    group: 'riesgo',
    name: { es: 'Focos de calor (VIIRS)', en: 'Fire hotspots (VIIRS)' },
    description: {
      es: 'Focos de calor activos detectados en las últimas 24 horas.',
      en: 'Active fire hotspots detected in the last 24 hours.'
    },
    url: 'https://geoservicios.conae.gov.ar/geoserver/GeoServiciosCONAE/wms',
    layer: 'GeoServiciosCONAE:FocosDeCalorVIIRS',
    days: false,
    source: 'NASA/NOAA VIIRS vía CONAE'
  },
  {
    id: 'focos_goes',
    group: 'riesgo',
    name: { es: 'Focos de calor (GOES)', en: 'Fire hotspots (GOES)' },
    description: {
      es: 'Focos de calor del satélite geoestacionario GOES, últimas 24 horas.',
      en: 'Fire hotspots from the GOES geostationary satellite, last 24 hours.'
    },
    url: 'https://geoservicios.conae.gov.ar/geoserver/FocosDeCalor/wms',
    layer: 'FocosDeCalor:FocosGOES_24hs',
    days: false,
    source: 'NOAA GOES vía CONAE'
  }
];

export function getConaeLayer(id: ConaeLayerId | null): ConaeLayer | undefined {
  return CONAE_LAYERS.find((l) => l.id === id);
}

export function resolveLayerName(layer: ConaeLayer, day: number): string {
  return layer.days ? `${layer.layer}${day}` : layer.layer;
}

export function buildLegendUrl(layer: ConaeLayer, day: number): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetLegendGraphic',
    VERSION: '1.0.0',
    FORMAT: 'image/png',
    LAYER: resolveLayerName(layer, day)
  });
  return `${layer.url}?${params.toString()}`;
}

/**
 * Arma una consulta GetFeatureInfo (WMS 1.1.1, EPSG:4326) sobre un punto.
 * Se pide una ventana chica de 101x101 píxeles centrada en el punto.
 */
export function buildFeatureInfoUrl(layer: ConaeLayer, day: number, lat: number, lng: number): string {
  const d = 0.01;
  const name = resolveLayerName(layer, day);
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetFeatureInfo',
    LAYERS: name,
    QUERY_LAYERS: name,
    STYLES: '',
    SRS: 'EPSG:4326',
    BBOX: `${lng - d},${lat - d},${lng + d},${lat + d}`,
    WIDTH: '101',
    HEIGHT: '101',
    X: '50',
    Y: '50',
    INFO_FORMAT: 'application/json',
    FEATURE_COUNT: '1'
  });
  return `${layer.url}?${params.toString()}`;
}
