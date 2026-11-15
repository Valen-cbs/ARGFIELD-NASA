import {
  AgencySource,
  AlertType,
  FarmLocation,
  FarmProfile,
  RawSensorObservation
} from '../types';
import { haversineDistance } from './geo';

/**
 * Generates realistic multi-agency Earth observation data tied to the specific farm location,
 * its hydrological basin, upstream catchments, and regional climate drivers.
 */
export function generateSensorObservations(farm: FarmLocation): RawSensorObservation[] {
  const now = new Date();
  const dateStr = now.toISOString();

  const observations: RawSensorObservation[] = [];

  // 1. CONAE SAOCOM 1B - Root Zone Soil Moisture (Direct / Near field 0-50cm)
  const saocomLat = farm.lat + 0.08;
  const saocomLng = farm.lng - 0.05;
  observations.push({
    id: `conae_saocom_${farm.region}_01`,
    type: 'soil_moisture_deficit',
    source: 'CONAE',
    mission: 'SAOCOM 1B',
    instrument: 'SAR Banda L Polarimétrico (1.275 GHz)',
    location: { lat: saocomLat, lng: saocomLng },
    locationName: `${farm.name} (Celda SAR 30m)`,
    distanceKm: haversineDistance({ lat: saocomLat, lng: saocomLng }, farm),
    value: farm.region === 'sur' ? 19 : farm.region === 'norte' ? 31 : 24,
    unit: '% cap. útil',
    baselineNormal: 42,
    trend: 'worsening',
    criticalThreshold: 25,
    warningThreshold: 35,
    basinId: farm.basinId,
    timestamp: dateStr,
    resolution: '30 metros',
    confidence: 'high'
  });

  // 2. NASA SMAP - Topsoil Moisture (Surface 0-5cm)
  const smapLat = farm.lat - 0.25;
  const smapLng = farm.lng + 0.15;
  observations.push({
    id: `nasa_smap_${farm.region}_02`,
    type: 'soil_moisture_deficit',
    source: 'NASA',
    mission: 'SMAP',
    instrument: 'L-Band Radiometer (1.41 GHz)',
    location: { lat: smapLat, lng: smapLng },
    locationName: `Zonal ${farm.province} (Grilla SMAP)`,
    distanceKm: haversineDistance({ lat: smapLat, lng: smapLng }, farm),
    value: farm.region === 'sur' ? 14 : farm.region === 'norte' ? 26 : 21,
    unit: '% vol.',
    baselineNormal: 38,
    trend: 'worsening',
    criticalThreshold: 20,
    warningThreshold: 30,
    basinId: farm.basinId,
    timestamp: dateStr,
    resolution: '9 km mejorada',
    confidence: 'high'
  });

  // 3. NASA GPM IMERG - 30-day precipitation deficit
  const gpmLat = farm.lat + 0.65;
  const gpmLng = farm.lng - 0.45;
  observations.push({
    id: `nasa_gpm_${farm.region}_03`,
    type: 'rainfall_deficit',
    source: 'NASA',
    mission: 'GPM IMERG',
    instrument: 'Dual-frequency Precipitation Radar & Microwave',
    location: { lat: gpmLat, lng: gpmLng },
    locationName: `Subcuenca ${farm.basinName}`,
    distanceKm: haversineDistance({ lat: gpmLat, lng: gpmLng }, farm),
    value: farm.region === 'sur' ? 18 : 34,
    unit: 'mm / 30d',
    baselineNormal: farm.region === 'sur' ? 45 : 85,
    trend: 'worsening',
    criticalThreshold: 35,
    warningThreshold: 55,
    basinId: farm.basinId,
    timestamp: dateStr,
    resolution: '10 km semi-horario',
    confidence: 'high'
  });

  // 4. NASA MODIS / VIIRS - Land Surface Temperature Anomaly
  const modisLat = farm.lat - 0.4;
  const modisLng = farm.lng - 0.3;
  observations.push({
    id: `nasa_modis_${farm.region}_04`,
    type: 'temperature_anomaly',
    source: 'NASA',
    mission: 'Terra/Aqua MODIS',
    instrument: 'Thermal Infrared Spectroradiometer',
    location: { lat: modisLat, lng: modisLng },
    locationName: `Área Rural ${farm.province}`,
    distanceKm: haversineDistance({ lat: modisLat, lng: modisLng }, farm),
    value: 3.4,
    unit: '°C anom.',
    baselineNormal: 0.0,
    trend: 'worsening',
    criticalThreshold: 3.0,
    warningThreshold: 2.0,
    timestamp: dateStr,
    resolution: '1 km diario',
    confidence: 'high'
  });

  // 5. ESA Sentinel-2 - Vegetation Vigor (NDVI drop)
  const esaLat = farm.lat + 0.12;
  const esaLng = farm.lng + 0.08;
  observations.push({
    id: `esa_sentinel2_${farm.region}_05`,
    type: 'vegetation_vigor_drop',
    source: 'ESA',
    mission: 'Sentinel-2B',
    instrument: 'MSI (Multispectral Instrument) NIR/Red',
    location: { lat: esaLat, lng: esaLng },
    locationName: `Lotes vecinos a ${farm.name}`,
    distanceKm: haversineDistance({ lat: esaLat, lng: esaLng }, farm),
    value: 0.46,
    unit: 'NDVI',
    baselineNormal: 0.68,
    trend: 'worsening',
    criticalThreshold: 0.5,
    warningThreshold: 0.6,
    timestamp: dateStr,
    resolution: '10 metros',
    confidence: 'high'
  });

  // 6. Regional Upstream Observations based on specific geography
  if (farm.region === 'norte' || farm.basinId === 'parana') {
    // AEP Paraguay River telemetry upstream
    observations.push({
      id: 'aep_telemetry_parana_06',
      type: 'upstream_water_level',
      source: 'AEP',
      mission: 'Red Telemétrica GuaraníSat / Dinac',
      instrument: 'Sensor Acústico Doppler de Flujo Fluvial',
      location: { lat: -25.2865, lng: -57.647 }, // Asunción / Alto Paraná
      locationName: 'Río Paraguay / Alto Paraná (Asunción)',
      distanceKm: haversineDistance({ lat: -25.2865, lng: -57.647 }, farm),
      value: -1.25,
      unit: 'm vs estiaje',
      baselineNormal: 0.0,
      trend: 'worsening',
      criticalThreshold: -1.0,
      warningThreshold: -0.5,
      basinId: 'parana',
      isUpstream: true,
      timestamp: dateStr,
      resolution: 'Telemetría horaria',
      confidence: 'high'
    });

    // AEB Brazil CBERS-4A - Upstream Forest Runoff change
    observations.push({
      id: 'aeb_cbers_pantanal_07',
      type: 'deforestation_runoff',
      source: 'AEB',
      mission: 'CBERS-4A & Amazonia-1',
      instrument: 'Cámara WFI de Amplio Campo',
      location: { lat: -21.45, lng: -56.85 }, // Mato Grosso do Sul / Pantanal
      locationName: 'Cabeceras Cuenca del Plata (Mato Grosso do Sul)',
      distanceKm: haversineDistance({ lat: -21.45, lng: -56.85 }, farm),
      value: 1420,
      unit: 'ha desmonte/mes',
      baselineNormal: 350,
      trend: 'worsening',
      criticalThreshold: 1000,
      warningThreshold: 600,
      basinId: 'parana',
      isUpstream: true,
      timestamp: dateStr,
      resolution: '64 metros',
      confidence: 'medium'
    });
  } else if (farm.region === 'sur') {
    // UKSA South Atlantic Atmospheric model - Frost & Wind
    observations.push({
      id: 'uksa_atmospheric_sur_08',
      type: 'frost_risk',
      source: 'UKSA',
      mission: 'Modelo Dinámico Atlántico Sur (UKSA/ECMWF)',
      instrument: 'Radiometría Atmosférica & Presión Barométrica',
      location: { lat: -48.2, lng: -63.5 }, // Golfo San Jorge / Mar Argentino
      locationName: 'Frente Polar Subantártico (Mar Argentino)',
      distanceKm: haversineDistance({ lat: -48.2, lng: -63.5 }, farm),
      value: -3.8,
      unit: '°C mín. predicha',
      baselineNormal: 4.5,
      trend: 'worsening',
      criticalThreshold: -2.0,
      warningThreshold: 0.0,
      timestamp: dateStr,
      resolution: 'Grilla sinóptica 15 km',
      confidence: 'high'
    });

    // CSA RADARSAT - Freeze depth and soil hardness
    observations.push({
      id: 'csa_radarsat_patagonia_09',
      type: 'atmospheric_river',
      source: 'CSA',
      mission: 'RADARSAT Constellation',
      instrument: 'Polarimetric SAR C-Band',
      location: { lat: -44.5, lng: -67.2 },
      locationName: 'Meseta Central Chubutense',
      distanceKm: haversineDistance({ lat: -44.5, lng: -67.2 }, farm),
      value: 88,
      unit: 'km/h ráfagas',
      baselineNormal: 35,
      trend: 'worsening',
      criticalThreshold: 75,
      warningThreshold: 55,
      timestamp: dateStr,
      resolution: '30 metros',
      confidence: 'high'
    });
  } else {
    // Central Region: Groundwater depletion proxy + ESA Sentinel-1 SAR coherence
    observations.push({
      id: 'conae_groundwater_centro_10',
      type: 'groundwater_depletion',
      source: 'CONAE',
      mission: 'SAOCOM 1A + Mallas Piezométricas',
      instrument: 'Interferometría InSAR & SAR L-Band',
      location: { lat: farm.lat - 0.85, lng: farm.lng - 0.75 },
      locationName: `Recarga Acuífero ${farm.aquifer || 'Pampeano'}`,
      distanceKm: haversineDistance(
        { lat: farm.lat - 0.85, lng: farm.lng - 0.75 },
        farm
      ),
      value: -0.85,
      unit: 'm descenso napa',
      baselineNormal: -0.2,
      trend: 'worsening',
      criticalThreshold: -0.7,
      warningThreshold: -0.4,
      basinId: farm.basinId,
      timestamp: dateStr,
      resolution: '50 metros',
      confidence: 'high'
    });

    // NASA ECOSTRESS - Evapotranspiration stress index
    observations.push({
      id: 'nasa_ecostress_centro_11',
      type: 'temperature_anomaly',
      source: 'NASA',
      mission: 'ECOSTRESS (ISS)',
      instrument: 'Thermal Radiometer Multiespectral',
      location: { lat: farm.lat + 0.35, lng: farm.lng - 0.2 },
      locationName: `Corredor Productivo ${farm.province}`,
      distanceKm: haversineDistance(
        { lat: farm.lat + 0.35, lng: farm.lng - 0.2 },
        farm
      ),
      value: 0.74,
      unit: 'ESI (Índice Estrés)',
      baselineNormal: 0.35,
      trend: 'worsening',
      criticalThreshold: 0.7,
      warningThreshold: 0.5,
      timestamp: dateStr,
      resolution: '70 metros',
      confidence: 'high'
    });
  }

  return observations;
}
