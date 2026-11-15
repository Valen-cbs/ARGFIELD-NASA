import { getSatelliteProduct } from '../data/satelliteProducts';
import { Alert, FarmProfile } from '../types';
import { SatelliteReading } from '../types/satellite';
import { readingStatus } from './satelliteApi';

/** Follow-up rules, not a crop diagnosis. Never infer a trend from one pixel. */
export function deriveSatelliteAlerts(readings: SatelliteReading[], farm: FarmProfile, now = new Date()): Alert[] {
  return readings.flatMap((reading): Alert[] => {
    const product = getSatelliteProduct(reading.productId);
    if (!product || reading.status !== 'available' || reading.cached || reading.value === null || !reading.observedAt || readingStatus(reading.observedAt, product.maxAgeDays, now) !== 'available') return [];
    const dry = reading.productId === 'saocom_percentil' && reading.value <= 20;
    const fusarium = reading.productId === 'fusarium' && farm.currentCrop === 'wheat' && reading.value >= 20;
    if (!dry && !fusarium) return [];
    const score = dry ? (reading.value <= 2 ? 85 : 65) : reading.value >= 40 ? 70 : 50;
    const reason = dry ? `Percentil de humedad ${reading.value}, dentro del rango seco publicado por CONAE.` : `Incidencia modelada de fusariosis: ${reading.value}%. El perfil del lote indica trigo.`;
    return [{
      id: `satellite_${reading.productId}_${reading.observedAt}`, type: dry ? 'soil_moisture_deficit' : 'crop_disease_risk',
      source: product.agency, mission: product.name.es, instrument: product.resolution,
      severity: score >= 80 ? 'critical' : score >= 60 ? 'high' : 'medium', score,
      title: dry ? 'Humedad del perfil por debajo de lo normal' : 'Revisar riesgo de fusariosis en trigo',
      relevanceReason: reason, factors: [reason, 'Dato vigente en el punto elegido. No representa todas las hectáreas del lote.'],
      actionable: true, timeframe: 'this_week',
      suggestedAction: dry ? 'Revisá la humedad del suelo y el estado de la cobertura con tu agrónomo antes de decidir fechas de siembra o secado.' : 'Recorré el lote y verificá si el trigo está en floración con tu agrónomo.',
      scientificContext: product.description.es, localImpact: reason,
      currentValue: reading.value, unit: reading.unit, baseline: null, trend: 'unknown', distanceKm: 0,
      observationLocation: { lat: farm.location.lat, lng: farm.location.lng }, observationLocationName: farm.location.name,
      detectedAt: reading.observedAt, dataQuality: 'medium', satellitePassInfo: `${reading.source} · ${product.resolution}`,
      hydrologicalRelation: 'direct_field', sourceUrl: reading.sourceUrl
    }];
  }).sort((a, b) => b.score - a.score);
}
