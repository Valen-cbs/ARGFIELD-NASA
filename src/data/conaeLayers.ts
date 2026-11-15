/**
 * Capas reales publicadas por CONAE como servicios WMS (OGC).
 * Fuente de nombres y endpoints: https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html
 *
 * Las capas con `days: true` son series; seriesLength define su longitud.
 * La fecha se obtiene de GetCapabilities; el sufijo no se convierte en una fecha.
 */

export type ConaeLayerId =
  | 'estatus_hidrico'
  | 'saocom_humedad'
  | 'saocom_percentil'
  | 'smap'
  | 'smos'
  | 'lluvia_imerg'
  | 'lluvia_imerg_mensual'
  | 'inundacion'
  | 'focos_viirs'
  | 'focos_goes'
  | 'fusarium'
  | 'rinde_maiz'
  | 'rinde_soja';

export interface ConaeLayer {
  id: ConaeLayerId;
  group: 'agua' | 'riesgo' | 'cultivo';
  name: { es: string; en: string };
  description: { es: string; en: string };
  /** Endpoint WMS del workspace de GeoServer */
  url: string;
  /** Nombre de la capa; si `days` es true, se agrega la posición de la serie. */
  layer: string;
  days: boolean;
  source: string;
  coverage?: { es: string; en: string };
  seriesLength?: number;
  maxAgeDays?: number;
  measure?: { unit: string; min: number; max: number; scale?: number; noData?: number[]; fields?: string[] };
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
    source: 'CONAE · NASA GPM IMERG',
    measure: { unit: 'percentil API', min: 0, max: 100, noData: [255], fields: ['PCNTLAPI'] }
  },
  {
    id: 'saocom_humedad',
    group: 'agua',
    name: { es: 'Humedad SAOCOM 0–50 cm', en: 'SAOCOM soil moisture 0–50 cm' },
    description: {
      es: 'Humedad volumétrica media hasta 50 cm estimada por zonas homogéneas con datos SAOCOM y modelado de CONAE. No es agua útil.',
      en: 'Mean volumetric moisture down to 50 cm estimated for homogeneous zones from SAOCOM data and CONAE modelling. This is not plant-available water.'
    },
    url: 'https://geoservicios3.conae.gov.ar/geoserver/HumedadDeSuelos/wms',
    layer: 'HumedadDeSuelos:DSS_MSM_',
    days: true,
    source: 'CONAE · SAOCOM 1',
    measure: { unit: '% vol.', min: 0, max: 100, noData: [0, 255], fields: ['HUMEDAD_DE_SUELO'] },
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
    measure: { unit: 'percentil', min: 1, max: 100, noData: [0, 255], fields: ['PERCENTIL_HUMEDAD_DE_SUELO'] },
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
    source: 'NASA SMAP vía CONAE',
    measure: { unit: '% vol.', min: 0, max: 100, scale: 100, fields: ['HUMEDAD_DE_SUELO'] }
  },
  {
    id: 'smos', group: 'agua',
    name: { es: 'Humedad superficial SMOS', en: 'SMOS surface moisture' },
    description: { es: 'Humedad superficial de ESA SMOS. La fecha corresponde al producto publicado por CONAE.', en: 'ESA SMOS surface moisture. Date comes from the product published by CONAE.' },
    url: 'https://geoservicios2.conae.gov.ar/geoserver/HumedadDeSuelos/wms',
    layer: 'HumedadDeSuelos:SMOS_Pasada_Descendente', days: false,
    source: 'ESA SMOS vía CONAE',
    measure: { unit: '% vol.', min: 0, max: 100, scale: 100, fields: ['HUMEDAD_DE_SUELO'] }
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
    source: 'NASA GPM IMERG vía CONAE',
    maxAgeDays: 3,
    measure: { unit: 'mm/día', min: 0, max: 3000, fields: ['PA1D'] }
  },
  {
    id: 'lluvia_imerg_mensual', group: 'agua',
    name: { es: 'Lluvia mensual GPM', en: 'GPM monthly rainfall' },
    description: { es: 'Acumulado del mes publicado por CONAE; no representa los últimos 30 días móviles.', en: 'Published calendar-month total; this is not a rolling 30-day total.' },
    url: 'https://geoservicios2.conae.gov.ar/geoserver/PrecipitacionAcumulada/wms',
    layer: 'PrecipitacionAcumulada:MOM_GPMIMERG_PA1M_', days: true, seriesLength: 13,
    source: 'NASA GPM IMERG vía CONAE', maxAgeDays: 70,
    measure: { unit: 'mm/mes', min: 0, max: 10000, fields: ['PA1M'] }
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
    source: 'NOAA-20/SNPP VIIRS + GOES-19 vía CONAE',
    measure: { unit: 'código (ver leyenda)', min: 1, max: 200, noData: [0, 255], fields: ['FLD'] }
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
  },
  {
    id: 'fusarium', group: 'cultivo',
    name: { es: 'Fusariosis en trigo', en: 'Wheat fusarium incidence' },
    description: { es: 'Incidencia estimada por el modelo de CONAE. Requiere revisar el estado fenológico del trigo con un agrónomo.', en: 'CONAE modelled incidence. Review wheat growth stage with an agronomist.' },
    url: 'https://geoservicios3.conae.gov.ar/geoserver/Cultivos/wms',
    layer: 'Cultivos:MHS_FIM_PCP_', days: true, source: 'Modelo CONAE · Fusariosis',
    measure: { unit: '% incidencia', min: 0, max: 100, noData: [255], fields: ['INCIDENCIA_FUSARIOSIS_TRIGO'] }
  },
  {
    id: 'rinde_maiz', group: 'cultivo',
    name: { es: 'Anomalía de rinde de maíz', en: 'Maize yield anomaly' },
    description: { es: 'Escenario de rinde respecto de la mediana 1990–2019. No es un rinde medido del lote.', en: 'Yield scenario relative to the 1990–2019 median. It is not a measured farm yield.' },
    url: 'https://geoservicios3.conae.gov.ar/geoserver/Cultivos/wms',
    layer: 'Cultivos:MHS_DSS_NMZ_', days: true, seriesLength: 8, maxAgeDays: 21, source: 'Modelo CONAE · Maíz'
  },
  {
    id: 'rinde_soja', group: 'cultivo',
    name: { es: 'Anomalía de rinde de soja', en: 'Soybean yield anomaly' },
    description: { es: 'Escenario de soja de primera respecto de la mediana 1990–2019. Consultá la fecha de campaña.', en: 'First-crop soybean scenario relative to the 1990–2019 median. Check the season date.' },
    url: 'https://geoservicios3.conae.gov.ar/geoserver/Cultivos/wms',
    layer: 'Cultivos:MHS_DSS_NSB_', days: true, seriesLength: 8, maxAgeDays: 21, source: 'Modelo CONAE · Soja'
  }
];

export function getConaeLayer(id: ConaeLayerId | null): ConaeLayer | undefined {
  return CONAE_LAYERS.find((l) => l.id === id);
}

export function resolveLayerName(layer: ConaeLayer, day: number): string {
  const slot = Math.max(1, Math.min(layer.seriesLength ?? 7, Math.trunc(day) || 1));
  return layer.days ? `${layer.layer}${slot}` : layer.layer;
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
    FORMAT: 'image/png',
    FEATURE_COUNT: '1'
  });
  return `${layer.url}?${params.toString()}`;
}
