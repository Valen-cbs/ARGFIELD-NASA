import { CONAE_LAYERS, ConaeLayer } from './conaeLayers';
import { AgencySource } from '../types';

interface ProductBase {
  id: string;
  name: { es: string; en: string };
  description: { es: string; en: string };
  source: string;
  agency: AgencySource;
  group: 'agua' | 'riesgo' | 'cultivo';
  maxAgeDays: number;
  resolution: string;
}

export type SatelliteProduct = ProductBase & (
  | { kind: 'wms'; wms: ConaeLayer }
  | { kind: 'stac'; collection: string; assets: string[]; unit: string }
);

export const SATELLITE_PRODUCTS: SatelliteProduct[] = [
  ...CONAE_LAYERS.map((wms): SatelliteProduct => ({
    id: wms.id, name: wms.name, description: wms.description, source: wms.source,
    agency: wms.id === 'smos' ? 'ESA' : /NASA|NOAA/.test(wms.source) ? 'NASA' : 'CONAE',
    group: wms.group, kind: 'wms', wms, maxAgeDays: wms.maxAgeDays ?? 7,
    resolution: wms.id.startsWith('saocom') ? 'Zonas homogéneas · perfil 0–50 cm' : wms.id === 'smap' ? 'Grilla SMAP · 0–5 cm' : 'Producto regional CONAE'
  })),
  {
    id: 'sentinel2_ndvi', kind: 'stac', group: 'cultivo', agency: 'ESA',
    name: { es: 'Vigor vegetal · Sentinel-2', en: 'Vegetation vigor · Sentinel-2' },
    description: { es: 'NDVI de un píxel sin nubes, calculado con rojo e infrarrojo cercano. Una lectura aislada no demuestra una caída ni un porcentaje de cobertura.', en: 'NDVI of a cloud-free pixel using red and near infrared. One reading does not establish a decline or a coverage percentage.' },
    source: 'ESA Copernicus · Planetary Computer', collection: 'sentinel-2-l2a',
    assets: ['B04', 'B08', 'SCL'], unit: 'NDVI', maxAgeDays: 20, resolution: '10 m · control de nubes a 20 m'
  },
  {
    id: 'sentinel1_radar', kind: 'stac', group: 'cultivo', agency: 'ESA',
    name: { es: 'Radar · Sentinel-1', en: 'Radar · Sentinel-1' },
    description: { es: 'Retrodispersión gamma nought VV con corrección de terreno. No es humedad, compactación ni un aviso de inundación por sí sola.', en: 'Terrain-corrected VV gamma nought backscatter. This alone is not moisture, compaction or a flood warning.' },
    source: 'ESA Copernicus · Planetary Computer', collection: 'sentinel-1-rtc',
    assets: ['vv'], unit: 'dB γ⁰ VV', maxAgeDays: 20, resolution: '10 m · SAR banda C'
  },
  {
    id: 'modis_lst', kind: 'stac', group: 'riesgo', agency: 'NASA',
    name: { es: 'Temperatura superficial · MODIS', en: 'Surface temperature · MODIS' },
    description: { es: 'MOD11A2/MYD11A2: temperatura superficial diurna compuesta de 8 días con control de calidad. No es temperatura del aire ni anomalía respecto de lo normal.', en: 'MOD11A2/MYD11A2: quality-controlled 8-day daytime land surface temperature. It is not air temperature or an anomaly against normal.' },
    source: 'NASA Terra/Aqua MODIS · Planetary Computer', collection: 'modis-11A2-061',
    assets: ['LST_Day_1km', 'QC_Day'], unit: '°C superficie', maxAgeDays: 24, resolution: '1 km · compuesto de 8 días'
  }
];

export const getSatelliteProduct = (id: string | null) => SATELLITE_PRODUCTS.find(p => p.id === id);
export const DASHBOARD_PRODUCT_IDS = ['saocom_humedad', 'saocom_percentil', 'smap', 'smos', 'lluvia_imerg', 'lluvia_imerg_mensual', 'sentinel2_ndvi', 'sentinel1_radar', 'modis_lst', 'fusarium'];

export const PENDING_MISSIONS = [
  { agency: 'NASA', name: 'ECOSTRESS / GRACE-FO', reason: { es: 'Falta integrar el producto y su procesamiento; no se calcula ESI ni nivel de napas.', en: 'Product processing is pending; no ESI or groundwater level is calculated.' } },
  { agency: 'CSA', name: 'RADARSAT', reason: { es: 'Requiere acceso EODMS y procesamiento SAR.', en: 'Requires EODMS access and SAR processing.' } },
  { agency: 'ASI', name: 'COSMO-SkyMed', reason: { es: 'Requiere acceso autorizado a productos ASI/e-GEOS.', en: 'Requires authorized ASI/e-GEOS product access.' } },
  { agency: 'AEE', name: 'PAZ', reason: { es: 'Requiere un proveedor y licencia de productos radar.', en: 'Requires a radar product provider and licence.' } },
  { agency: 'AEB', name: 'CBERS / Amazonia-1', reason: { es: 'Catálogo y procesamiento de escenas aún no integrados.', en: 'Scene catalogue and processing are not integrated yet.' } },
  { agency: 'AEP', name: 'Telemetría hidrológica', reason: { es: 'No hay un servicio de estaciones verificado conectado.', en: 'No verified station service is connected.' } },
  { agency: 'UKSA', name: 'EarthCARE / modelos atmosféricos', reason: { es: 'No hay un producto de pronóstico conectado a esta app.', en: 'No forecast product is connected to this app.' } }
];
