import { AgencySource } from '../types';
import type { CountryCode } from '../components/FlagIcon';

export type MissionOperationalState = 'active' | 'transition' | 'unknown' | 'not_applicable';
export type MissionIntegration = 'dashboard_map_alerts' | 'dashboard_map' | 'map_only' | 'catalog_only';

export interface SatelliteMission {
  id: string;
  name: string;
  filterAgencies: AgencySource[];
  agency: string;
  countries: CountryCode[];
  countryLabel: { es: string; en: string };
  sensor: string;
  resolution: string;
  orbit: string;
  operationalState: MissionOperationalState;
  operationalNote: { es: string; en: string };
  integration: MissionIntegration;
  integrationNote: { es: string; en: string };
  productIds: string[];
  sourceUrl: string;
}

/** Mission facts and app connection state are deliberately stored separately. */
export const SATELLITE_MISSIONS: SatelliteMission[] = [
  {
    id: 'smap', name: 'SMAP', filterAgencies: ['NASA'], agency: 'NASA', countries: ['US'], countryLabel: { es: 'Estados Unidos', en: 'United States' },
    sensor: 'L-band radiometer (radar ceased in 2015)', resolution: '9 km enhanced product; native radiometer footprint ~36 km', orbit: '685 km; sun-synchronous, 6 am/pm; 2–3 day revisit',
    operationalState: 'active', operationalNote: { es: 'Misión activa; la capa publicada por CONAE puede tener fecha antigua o NoData.', en: 'Mission active; the CONAE-hosted layer can still be stale or return NoData.' },
    integration: 'dashboard_map', integrationNote: { es: 'Lectura real vía servicio CONAE en dashboard y mapa; la fecha del proveedor determina vigencia.', en: 'Real reading via CONAE service in dashboard and map; freshness follows provider date.' },
    productIds: ['smap'], sourceUrl: 'https://nsidc.org/data/smap'
  },
  {
    id: 'gpm', name: 'GPM IMERG', filterAgencies: ['NASA'], agency: 'NASA / JAXA', countries: ['US', 'JP'], countryLabel: { es: 'Estados Unidos · Japón', en: 'United States · Japan' },
    sensor: 'GMI microwave radiometer + DPR dual-frequency precipitation radar; IMERG merges a satellite constellation', resolution: 'IMERG: 0.1° (~10 km), 30 min native cadence; app displays CONAE daily/monthly products', orbit: 'GPM Core: non-sun-synchronous, 435 km, 65° inclination',
    operationalState: 'active', operationalNote: { es: 'Misión de observación y productos IMERG activos.', en: 'Mission observations and IMERG products are active.' },
    integration: 'dashboard_map', integrationNote: { es: 'Lluvia diaria/mensual y percentil API vía CONAE; diagnóstico API y variabilidad de series diarias suficientes, sin sumar lluvia a POWER.', en: 'Daily/monthly GPM rainfall and API percentile via CONAE; real readings in dashboard and map.' },
    productIds: ['lluvia_imerg', 'lluvia_imerg_mensual', 'estatus_hidrico'], sourceUrl: 'https://gpm.nasa.gov/data/imerg'
  },
  {
    id: 'modis', name: 'MODIS', filterAgencies: ['NASA'], agency: 'NASA', countries: ['US'], countryLabel: { es: 'Estados Unidos', en: 'United States' },
    sensor: 'MODIS multispectral radiometer', resolution: '250 m–1 km by band; app product MOD11A2/MYD11A2 is 1 km, 8-day composite', orbit: 'Near-polar sun-synchronous; Terra ~693 km and Aqua ~705 km, both drifting from original local crossing times',
    operationalState: 'transition', operationalNote: { es: 'Terra continuaba en ciencia en reportes NASA de 2026; Aqua está en fase de retiro/transición. Fechas orbitales cambiantes.', en: 'NASA 2026 reports showed Terra in science mode; Aqua is in end-of-mission transition. Orbit times are drifting.' },
    integration: 'dashboard_map', integrationNote: { es: 'Temperatura superficial MODIS real vía Planetary Computer en dashboard y mapa; puede ser antigua según el punto.', en: 'Real MODIS land-surface temperature via Planetary Computer in dashboard and map; it can be stale at a given point.' },
    productIds: ['modis_lst'], sourceUrl: 'https://modis.gsfc.nasa.gov/about/specifications.php'
  },
  {
    id: 'viirs', name: 'VIIRS', filterAgencies: ['NASA', 'NOAA'], agency: 'NASA / NOAA', countries: ['US'], countryLabel: { es: 'Estados Unidos', en: 'United States' },
    sensor: 'VIIRS visible/infrared radiometer; distinct from MODIS on Terra/Aqua', resolution: '375 m imagery bands; 750 m moderate/day-night bands', orbit: '~824 km; sun-synchronous polar, ~14 orbits/day',
    operationalState: 'transition', operationalNote: { es: 'Suomi-NPP dejó de distribuir productos científicos NASA el 02/11/2026; NOAA-20 y NOAA-21 son la continuidad.', en: 'NASA science-data delivery for Suomi-NPP ended 2026-11-02; NOAA-20 and NOAA-21 provide continuity.' },
    integration: 'map_only', integrationNote: { es: 'Capas regionales VIIRS/GOES de CONAE en el mapa; no hay lectura puntual VIIRS en dashboard ni alerta automática.', en: 'CONAE VIIRS/GOES regional layers on the map; no point reading in dashboard and no automatic VIIRS alert.' },
    productIds: ['focos_viirs', 'inundacion'], sourceUrl: 'https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/viirs/'
  },
  {
    id: 'ecostress', name: 'ECOSTRESS', filterAgencies: ['NASA'], agency: 'NASA / JPL (en la ISS)', countries: ['US'], countryLabel: { es: 'Estados Unidos · ISS internacional', en: 'United States · International ISS' },
    sensor: 'PHyTIR thermal infrared radiometer', resolution: '38 m along-track × 69 m cross-track at nadir', orbit: 'Mounted on ISS; ~400 km, inclined/precessing, non-sun-synchronous',
    operationalState: 'active', operationalNote: { es: 'La misión mantiene publicación de escenas; operación futura sujeta a revisión NASA.', en: 'The mission continues to publish scenes; future operations remain subject to NASA review.' },
    integration: 'catalog_only', integrationNote: { es: 'Sin colección ni procesamiento ECOSTRESS conectado a ArgField.', en: 'No ECOSTRESS collection or processing is connected to ArgField.' },
    productIds: [], sourceUrl: 'https://ecostress.jpl.nasa.gov/mission'
  },
  {
    id: 'saocom', name: 'SAOCOM 1A / 1B', filterAgencies: ['CONAE'], agency: 'CONAE', countries: ['AR'], countryLabel: { es: 'Argentina', en: 'Argentina' },
    sensor: 'Polarimetric SAR, banda L (1.275 GHz)', resolution: 'Instrumento: ~10–100 m según modo; producto de humedad ArgField: zonas homogéneas, perfil 0–50 cm', orbit: '~620 km; cuasi-polar, heliosincrónica; repetición 16 días por satélite / 8 días constelación',
    operationalState: 'active', operationalNote: { es: 'Catálogo y plan público de adquisiciones SAOCOM; dato del producto depende de cobertura y fecha publicada.', en: 'Public SAOCOM catalogue and acquisition plan; product readings depend on coverage and published date.' },
    integration: 'dashboard_map_alerts', integrationNote: { es: 'Humedad y percentil vía CONAE: humedad válida inicializa la capa 0–50 cm de la primera campaña compatible; el percentil aporta la regla de sequedad.', en: 'Real moisture and percentile via CONAE; the percentile can trigger the existing dryness rule.' },
    productIds: ['saocom_humedad', 'saocom_percentil'], sourceUrl: 'https://catalogos.conae.gov.ar/catalogo/catalogoSaocom.html'
  },
  {
    id: 'sentinel1', name: 'Sentinel-1', filterAgencies: ['ESA'], agency: 'ESA / Copernicus', countries: ['EU'], countryLabel: { es: 'Unión Europea', en: 'European Union' },
    sensor: 'C-band SAR (5.405 GHz)', resolution: 'IW mode ~5 × 20 m; ArgField RTC product grid 10 m', orbit: '693 km; polar, sun-synchronous',
    operationalState: 'active', operationalNote: { es: 'Constelación operativa Sentinel-1C/1D; Sentinel-1A finalizó operaciones en junio de 2026.', en: 'Sentinel-1C/1D constellation operational; Sentinel-1A operations ended June 2026.' },
    integration: 'dashboard_map', integrationNote: { es: 'Retrodispersión RTC real en mapa y dashboard; no se interpreta como humedad ni genera alerta por sí sola.', en: 'Real RTC backscatter in map and dashboard; it is not interpreted as moisture and does not trigger an alert alone.' },
    productIds: ['sentinel1_radar'], sourceUrl: 'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1'
  },
  {
    id: 'sentinel2', name: 'Sentinel-2', filterAgencies: ['ESA'], agency: 'ESA / Copernicus', countries: ['EU'], countryLabel: { es: 'Unión Europea', en: 'European Union' },
    sensor: 'MSI multispectral imager, 13 bands', resolution: '10 / 20 / 60 m; ArgField NDVI uses 10 m B04/B08, cloud control uses SCL', orbit: '786 km; polar, sun-synchronous; 5-day equatorial revisit (constellation)',
    operationalState: 'active', operationalNote: { es: 'Constelación Sentinel-2A/B/C operativa.', en: 'Sentinel-2A/B/C constellation operational.' },
    integration: 'dashboard_map', integrationNote: { es: 'NDVI con corrección y control de nubes; cambio de vigor con al menos 4 fechas en 30 días. Cobertura y suelo descubierto no estimados sin calibración.', en: 'Real NDVI with radiometric correction and cloud checks in dashboard and map; no trend alert without a comparable time series.' },
    productIds: ['sentinel2_ndvi'], sourceUrl: 'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2/Facts_and_figures'
  },
  {
    id: 'amazonia1', name: 'Amazonia-1', filterAgencies: ['AEB'], agency: 'AEB / INPE', countries: ['BR'], countryLabel: { es: 'Brasil', en: 'Brazil' },
    sensor: 'AWFI optical imager (VIS + NIR)', resolution: '64 m; swath ~850 km; revisit designed at 5 days', orbit: '~752 km; polar, sun-synchronous',
    operationalState: 'active', operationalNote: { es: 'Catálogo INPE contiene adquisiciones hasta 2026.', en: 'INPE catalogue contains acquisitions through 2026.' },
    integration: 'catalog_only', integrationNote: { es: 'INPE/STAC AMZ1-WFI-L2-DN-1 público, 64 m; no hay extracción radiométrica y control de calidad agrícola conectados para el lote.', en: 'Public INPE/STAC catalogue exists; not connected to the app.' },
    productIds: [], sourceUrl: 'https://www.inpe.br/amazonia1/en/about_satellite/'
  },
  {
    id: 'guaranisat1', name: 'GuaraniSat-1', filterAgencies: ['AEP'], agency: 'AEP · cooperación Kyutech / BIRDS-4', countries: ['PY', 'JP'], countryLabel: { es: 'Paraguay · Japón', en: 'Paraguay · Japan' },
    sensor: 'CubeSat 1U technology demonstrator: CAM camera, image-classification unit, APRS/data store-and-forward', resolution: 'No se encontró GSD agrícola validado; cámara de demostración, no producto agrícola', orbit: 'LEO; desplegado desde ISS. La ficha pública AEP no informa altitud orbital.',
    operationalState: 'unknown', operationalNote: { es: 'La ficha AEP confirma lanzamiento y payload, pero no publica estado operativo actual; no se declara activo.', en: 'AEP confirms launch and payload but does not publish current operational status; not marked active.' },
    integration: 'catalog_only', integrationNote: { es: 'No es un producto de observación agrícola conectado.', en: 'Not an agricultural observation product connected to the app.' },
    productIds: [], sourceUrl: 'https://aep.gov.py/guaranisat-1-2/'
  },
  {
    id: 'hydrology', name: 'Estaciones hidrológicas', filterAgencies: ['AEP'], agency: 'AEP / proveedores de estaciones por verificar', countries: ['PY'], countryLabel: { es: 'Paraguay', en: 'Paraguay' },
    sensor: 'No aplica: sensores in situ (nivel/caudal/precipitación); red y proveedor sin verificar', resolution: 'Estación puntual; resolución depende del sensor', orbit: 'No aplica · red terrestre',
    operationalState: 'not_applicable', operationalNote: { es: 'No es una misión satelital.', en: 'Not a satellite mission.' },
    integration: 'catalog_only', integrationNote: { es: 'No hay feed de estaciones validado conectado.', en: 'No verified station feed is connected.' },
    productIds: [], sourceUrl: 'https://aep.gov.py/'
  },
  {
    id: 'earthcare', name: 'EarthCARE', filterAgencies: ['UKSA'], agency: 'ESA / JAXA (UKSA: socio industrial, no agencia operadora)', countries: ['EU', 'JP', 'GB'], countryLabel: { es: 'Europa · Japón · aporte del Reino Unido', en: 'Europe · Japan · UK contribution' },
    sensor: 'ATLID lidar, CPR 94-GHz radar, MSI imager, BBR radiometer', resolution: 'Perfiles verticales ~100 m–1 km; MSI ~500 m; producto/variable dependiente del instrumento', orbit: '393 km; polar, heliosincrónica de amanecer/atardecer; ciclo 25 días',
    operationalState: 'active', operationalNote: { es: 'ESA reporta instrumentos comisionados y flujo de datos disponible.', en: 'ESA reports commissioned instruments and available data stream.' },
    integration: 'catalog_only', integrationNote: { es: 'Sin producto EarthCARE ni modelo atmosférico conectado a ArgField.', en: 'No EarthCARE product or atmospheric model is connected to ArgField.' },
    productIds: [], sourceUrl: 'https://www.esa.int/Applications/Observing_the_Earth/FutureEO/EarthCARE/Facts_and_figures'
  },
  {
    id: 'radarsat_rcm', name: 'RADARSAT', filterAgencies: ['CSA'], agency: 'CSA', countries: ['CA'], countryLabel: { es: 'Canadá', en: 'Canada' },
    sensor: 'C-band SAR + AIS', resolution: '1 × 3 m spotlight to 100 m wide-swath, mode-dependent', orbit: '586–615 km; dawn-dusk sun-synchronous; 3 satellites',
    operationalState: 'active', operationalNote: { es: 'CSA indica estado activo y monitoreo operacional de la constelación.', en: 'CSA lists the mission as active and monitors constellation health.' },
    integration: 'catalog_only', integrationNote: { es: 'Algunos productos son gratuitos con cuenta EODMS y licencia; procesamiento SAR agrícola no conectado.', en: 'Requires access/licensing and SAR processing; not connected.' },
    productIds: [], sourceUrl: 'https://www.asc-csa.gc.ca/eng/satellites/radarsat/what-is-rcm.asp'
  },
  {
    id: 'cosmo_skymed', name: 'COSMO-SkyMed', filterAgencies: ['ASI'], agency: 'ASI / Ministerio de Defensa de Italia', countries: ['IT'], countryLabel: { es: 'Italia', en: 'Italy' },
    sensor: 'X-band SAR, first and second generation', resolution: 'Spotlight down to ~0.3 × 0.5 m on CSG modes; products vary', orbit: '619.6 km mean altitude; sun-synchronous, 97.87° inclination; 16-day ground-track repeat',
    operationalState: 'active', operationalNote: { es: 'ASI informa constelación operativa de primera y segunda generación.', en: 'ASI reports first- and second-generation constellation operational.' },
    integration: 'catalog_only', integrationNote: { es: 'Acceso ASI/e-GEOS sujeto a autorización; no conectado.', en: 'ASI/e-GEOS access is authorization-based; not connected.' },
    productIds: [], sourceUrl: 'https://www.asi.it/en/earth-science/cosmo-skymed/'
  },
  {
    id: 'paz', name: 'PAZ', filterAgencies: ['AEE'], agency: 'Hisdesat (operador) · España / AEE', countries: ['ES'], countryLabel: { es: 'España', en: 'Spain' },
    sensor: 'X-band SAR (9.65 GHz) + AIS', resolution: 'Resolución dependiente de modo; hasta 25 cm en productos especializados', orbit: '514 km; polar heliosíncrona; repetición 11 días',
    operationalState: 'active', operationalNote: { es: 'Hisdesat publica la misión y sus servicios como operativos.', en: 'Hisdesat lists the mission and services as operational.' },
    integration: 'catalog_only', integrationNote: { es: 'Proveedor/licencia de productos radar no conectado.', en: 'Radar product provider/licensing is not connected.' },
    productIds: [], sourceUrl: 'https://www.hisdesat.es/en/satelites_observacion/'
  }
];

export const missionIntegrationLabel = (integration: MissionIntegration, lang: 'es' | 'en') => ({
  dashboard_map_alerts: lang === 'es' ? 'Dashboard · mapa · regla de alerta' : 'Dashboard · map · alert rule',
  dashboard_map: lang === 'es' ? 'Dashboard · mapa' : 'Dashboard · map',
  map_only: lang === 'es' ? 'Solo capa del mapa' : 'Map layer only',
  catalog_only: lang === 'es' ? 'Solo catálogo · sin conexión' : 'Catalogue only · not connected'
}[integration]);

export const missionOperationalLabel = (state: MissionOperationalState, lang: 'es' | 'en') => ({
  active: lang === 'es' ? 'Operativa según fuente oficial' : 'Operational per official source',
  transition: lang === 'es' ? 'Transición / estado cambiante' : 'Transition / changing status',
  unknown: lang === 'es' ? 'Estado actual no confirmado' : 'Current status not confirmed',
  not_applicable: lang === 'es' ? 'No aplica' : 'Not applicable'
}[state]);
