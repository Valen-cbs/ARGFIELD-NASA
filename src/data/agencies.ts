import { AgencySource } from '../types';

export type OperationalStatus = 'operational' | 'nominal' | 'calibrating' | 'maintenance';

export interface MissionTelemetry {
  name: string;
  sensor: string;
  type: string;
  resolution: string;
  description: string;
  status: OperationalStatus;
  orbitType: string;
  altitudeKm: number;
  revisitDays: string;
  latencyMinutes: number;
  lastPassAgo: string;
  healthScore: number; // 0-100%
  dataAccess: string;
}

export interface AgencyMetadata {
  id: AgencySource;
  fullName: string;
  country: string;
  flag: string;
  color: string;
  headquarters: string;
  missions: MissionTelemetry[];
}

export const SPACE_AGENCIES: Record<AgencySource, AgencyMetadata> = {
  NASA: {
    id: 'NASA',
    fullName: 'National Aeronautics and Space Administration',
    country: 'United States',
    flag: '🇺🇸',
    color: '#003366',
    headquarters: 'Washington, D.C., USA',
    missions: [
      {
        name: 'SMAP (Soil Moisture Active Passive)',
        sensor: 'L-Band Radiometer (1.4 GHz)',
        type: 'Topsoil Moisture (0-5 cm)',
        resolution: '9 km / 36 km',
        description: 'Mapeo global de humedad en los primeros 5 cm del suelo. Clave para calcular la ventana óptima de siembra y recarga superficial.',
        status: 'operational',
        orbitType: 'Heliosincrónica 685 km',
        altitudeKm: 685,
        revisitDays: '2 - 3 días',
        latencyMinutes: 180,
        lastPassAgo: 'Hace 42 min',
        healthScore: 98,
        dataAccess: 'NASA Earthdata Open Access'
      },
      {
        name: 'GPM IMERG Constellation',
        sensor: 'Dual-frequency Radar / Passive Microwave',
        type: 'Precipitaciones Globales',
        resolution: '10 km (cada 30 min)',
        description: 'Constelación de precipitación satelital que reporta acumulación de lluvia milimétrica y rachas de sequía en tiempo real.',
        status: 'operational',
        orbitType: 'Constelación de Órbita Baja',
        altitudeKm: 407,
        revisitDays: 'Tiempo casi-real (30 min)',
        latencyMinutes: 45,
        lastPassAgo: 'Hace 18 min',
        healthScore: 99,
        dataAccess: 'GPM Core Observatory / NASA PPS'
      },
      {
        name: 'Terra & Aqua (MODIS / VIIRS)',
        sensor: 'Thermal Infrared Spectroradiometer',
        type: 'Temperatura de Superficie (LST)',
        resolution: '1 km',
        description: 'Termometría satelital diaria. Identifica anomalías de calor extremo y estrés térmico en el dosel vegetal.',
        status: 'nominal',
        orbitType: 'Heliosincrónica 705 km',
        altitudeKm: 705,
        revisitDays: '1 - 2 días',
        latencyMinutes: 120,
        lastPassAgo: 'Hace 1.5 horas',
        healthScore: 95,
        dataAccess: 'NASA LP DAAC'
      },
      {
        name: 'ECOSTRESS (en la ISS)',
        sensor: 'Thermal Radiometer',
        type: 'Evapotranspiración & Estrés Hídrico',
        resolution: '70 m',
        description: 'Medición de la transpiración del cultivo para detectar el estrés hídrico previo al marchitamiento visible.',
        status: 'operational',
        orbitType: 'Órbita ISS (51.6° inclinación)',
        altitudeKm: 420,
        revisitDays: 'Variable (1 - 5 días)',
        latencyMinutes: 240,
        lastPassAgo: 'Hace 3.1 horas',
        healthScore: 97,
        dataAccess: 'NASA AppEEARS'
      }
    ]
  },
  CONAE: {
    id: 'CONAE',
    fullName: 'Comisión Nacional de Actividades Espaciales',
    country: 'Argentina',
    flag: '🇦🇷',
    color: '#0072CE',
    headquarters: 'Buenos Aires & Centro Espacial Teófilo Tabanera (Córdoba)',
    missions: [
      {
        name: 'SAOCOM 1A & 1B',
        sensor: 'Radar de Apertura Sintética Polarimétrico Banda L (1.275 GHz)',
        type: 'Humedad de Raíz en Profundidad (0-50 cm)',
        resolution: '10 m - 50 m',
        description: 'Capacidad de atravesar nubes y el rastrojo vegetal para estimar el contenido de agua en la zona radicular profunda de cultivos extensivos.',
        status: 'operational',
        orbitType: 'Heliosincrónica 620 km',
        altitudeKm: 620,
        revisitDays: '8 días (constelación)',
        latencyMinutes: 210,
        lastPassAgo: 'Hace 2.4 horas',
        healthScore: 100,
        dataAccess: 'Catálogo de Imágenes CONAE'
      }
    ]
  },
  AEB: {
    id: 'AEB',
    fullName: 'Agência Espacial Brasileira / INPE',
    country: 'Brazil',
    flag: '🇧🇷',
    color: '#009739',
    headquarters: 'Brasília & São José dos Campos, Brasil',
    missions: [
      {
        name: 'CBERS-4A & Amazonia-1',
        sensor: 'WFI & MUX Cámaras Ópticas',
        type: 'Escurrimiento & Cuencas Altas',
        resolution: '16 m - 64 m',
        description: 'Seguimiento del Pantanal y la cuenca alta del Río Paraná. Alerta sobre alteraciones en el régimen de crecidas que llegarán 200 km aguas abajo.',
        status: 'operational',
        orbitType: 'Heliosincrónica 752 km',
        altitudeKm: 752,
        revisitDays: '4 días',
        latencyMinutes: 300,
        lastPassAgo: 'Hace 4 horas',
        healthScore: 96,
        dataAccess: 'INPE DGI Open Catalog'
      }
    ]
  },
  AEP: {
    id: 'AEP',
    fullName: 'Agencia Espacial del Paraguay',
    country: 'Paraguay',
    flag: '🇵🇾',
    color: '#D52B1E',
    headquarters: 'Asunción, Paraguay',
    missions: [
      {
        name: 'Red de Telemetría GuaraníSat & Estaciones Hidrológicas',
        sensor: 'Sensores de Nivel Hidrológico & Retransmisión Satelital',
        type: 'Aforos de Ríos de Cuenca',
        resolution: 'Puntual continua (horaria)',
        description: 'Estaciones de aforo telemétricas sobre los ríos Pilcomayo, Paraguay y Alto Paraná, con enlace satelital para anticipar sequías de cuenca.',
        status: 'operational',
        orbitType: 'Red Terrestre-Satelital',
        altitudeKm: 400,
        revisitDays: 'Tiempo continuo',
        latencyMinutes: 30,
        lastPassAgo: 'Hace 12 min',
        healthScore: 94,
        dataAccess: 'AEP Red Hidrológica'
      }
    ]
  },
  ESA: {
    id: 'ESA',
    fullName: 'European Space Agency (Copernicus)',
    country: 'Europe',
    flag: '🇪🇺',
    color: '#003247',
    headquarters: 'París, Francia',
    missions: [
      {
        name: 'Sentinel-1A / 1C',
        sensor: 'SAR Banda C (5.405 GHz)',
        type: 'Rugosidad y Escurrimiento',
        resolution: '10 m - 20 m',
        description: 'Monitoreo de rugosidad de superficie, inundaciones laminares y compactación en terrenos descubiertos.',
        status: 'operational',
        orbitType: 'Heliosincrónica 693 km',
        altitudeKm: 693,
        revisitDays: '6 - 12 días',
        latencyMinutes: 180,
        lastPassAgo: 'Hace 5.2 horas',
        healthScore: 97,
        dataAccess: 'Copernicus Data Space Ecosystem'
      },
      {
        name: 'Sentinel-2A & 2B',
        sensor: 'Multispectral Instrument (MSI, 13 bandas)',
        type: 'Vigor Vegetativo (NDVI / NDRE)',
        resolution: '10 m',
        description: 'Bandas en el borde rojo (red-edge) que detectan clorofila foliar y estrés nutricional antes de caídas de rendimiento.',
        status: 'operational',
        orbitType: 'Heliosincrónica 786 km',
        altitudeKm: 786,
        revisitDays: '5 días',
        latencyMinutes: 150,
        lastPassAgo: 'Hace 1.8 horas',
        healthScore: 99,
        dataAccess: 'Copernicus Data Space Ecosystem'
      }
    ]
  },
  UKSA: {
    id: 'UKSA',
    fullName: 'UK Space Agency',
    country: 'United Kingdom',
    flag: '🇬🇧',
    color: '#012169',
    headquarters: 'Swindon, Reino Unido',
    missions: [
      {
        name: 'EarthCARE / Dinámica Atmosférica Atlántico Sur',
        sensor: 'Atmospheric Lidar (ATLID) & Radar CPR',
        type: 'Frentes Fríos & Ríos Atmosféricos',
        resolution: 'Rejilla sinóptica 10 km',
        description: 'Vigilancia de masas de aire polar oceánicas que desencadenan heladas tardías o temporales de viento en la región agrícola.',
        status: 'nominal',
        orbitType: 'Heliosincrónica 393 km',
        altitudeKm: 393,
        revisitDays: '25 días',
        latencyMinutes: 240,
        lastPassAgo: 'Hace 6 horas',
        healthScore: 93,
        dataAccess: 'UK CEDA Archive'
      }
    ]
  },
  CSA: {
    id: 'CSA',
    fullName: 'Canadian Space Agency / Agence Spatiale Canadienne',
    country: 'Canada',
    flag: '🇨🇦',
    color: '#D8232A',
    headquarters: 'Saint-Hubert, Quebec, Canadá',
    missions: [
      {
        name: 'RADARSAT Constellation Mission (RCM)',
        sensor: 'Compact Polarimetry SAR Banda C',
        type: 'Monitoreo de Humedad de Suelo y Hielo',
        resolution: '3 m - 100 m',
        description: 'Constelación de 3 satélites radar para estimar contenido volumétrico de agua y anegamientos en suelos agrícolas.',
        status: 'operational',
        orbitType: 'Heliosincrónica 593 km',
        altitudeKm: 593,
        revisitDays: 'Diario',
        latencyMinutes: 190,
        lastPassAgo: 'Hace 3.5 horas',
        healthScore: 98,
        dataAccess: 'Earth Observation Data Management System (EODMS)'
      }
    ]
  },
  ASI: {
    id: 'ASI',
    fullName: 'Agenzia Spaziale Italiana',
    country: 'Italy',
    flag: '🇮🇹',
    color: '#009246',
    headquarters: 'Roma, Italia',
    missions: [
      {
        name: 'COSMO-SkyMed 1st & 2nd Generation',
        sensor: 'SAR Banda X (9.6 GHz)',
        type: 'Textura Fina de Suelo y Estructura',
        resolution: '1 m - 3 m',
        description: 'Alta resolución radar que discrimina entre rastrojo fino y suelo desnudo compactado.',
        status: 'operational',
        orbitType: 'Heliosincrónica 619 km',
        altitudeKm: 619,
        revisitDays: 'Sub-diario',
        latencyMinutes: 120,
        lastPassAgo: 'Hace 2 horas',
        healthScore: 96,
        dataAccess: 'ASI e-GEOS Portal'
      }
    ]
  },
  AEE: {
    id: 'AEE',
    fullName: 'Agencia Espacial Española',
    country: 'Spain',
    flag: '🇪🇸',
    color: '#AD1519',
    headquarters: 'Sevilla, España',
    missions: [
      {
        name: 'PAZ (Programa Nacional de Observación de la Tierra)',
        sensor: 'SAR Banda X',
        type: 'Erosión y Anegamiento',
        resolution: '2 m',
        description: 'Monitoreo conjunto con constelación radar para evaluación de riesgos geomorfológicos y erosión hídrica en cuencas.',
        status: 'operational',
        orbitType: 'Heliosincrónica 514 km',
        altitudeKm: 514,
        revisitDays: '11 días',
        latencyMinutes: 200,
        lastPassAgo: 'Hace 4.8 horas',
        healthScore: 95,
        dataAccess: 'Hisdesat Open Data Portal'
      }
    ]
  }
};
