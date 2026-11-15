import { useEffect, useState } from 'react';
import { Alert, FarmProfile } from '../types';
import { currentForecast, dateStamp, FieldForecast, forecastTotal, OPEN_METEO_DAILY, parseFieldForecast } from './fieldForecast';

const TTL_MS = 60 * 60 * 1000;
type WeatherPayload = { current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number; time?: string }; daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_sum?: number[] } };
export interface WeatherBrief { temperature: number; humidity: number | null; weatherCode: number | null; todayMax: number | null; todayMin: number | null; nextThreeDayRain: number | null; updatedAt: string }
const cache = new Map<string, { until: number; payload: WeatherPayload }>();

/** Documented deterministic rules: >=35°C for 3 consecutive forecast days; >=50 mm/day or >=100 mm over 7 forecast days. */
export function forecastHazardAlerts(data: unknown, farm: FarmProfile, now = new Date()): Alert[] {
  const forecast = currentForecast(parseFieldForecast(data), now);
  if (!forecast) return [];
  const dates = forecast.days.map(day => day.date);
  const temperatures = forecast.days.flatMap(day => day.tmax === null ? [] : [day.tmax]);
  const rain = forecast.days.flatMap(day => day.rain === null ? [] : [day.rain]);
  const alerts: Alert[] = [];
  let longestHeat = 0, heatRun = 0;
  forecast.days.forEach((day, i) => {
    const contiguous = !i || dateStamp(day.date)! - dateStamp(forecast.days[i-1].date)! === 86_400_000;
    heatRun = day.tmax !== null && day.tmax >= 35 ? (contiguous ? heatRun : 0) + 1 : 0;
    longestHeat = Math.max(longestHeat, heatRun);
  });
  const totalRain = forecastTotal(forecast, 'rain');
  const peakRain = rain.length ? Math.max(...rain) : 0;
  const crop = farm.cropAllocations?.map(item => item.crop).join(', ') || farm.currentCrop;
  const location = { lat: farm.location.lat, lng: farm.location.lng };
  const makeAlert = (type: Alert['type'], title: string, value: number, unit: string, severity: Alert['severity'], reason: string, impact: string, action: string): Alert => ({
    id: `openmeteo_${type}_${dates[0]}`, type, source: 'Open-Meteo', mission: 'Pronóstico meteorológico Open-Meteo', instrument: 'Pronóstico diario',
    severity, score: 0, title, relevanceReason: reason, factors: [reason, `Cultivos registrados: ${crop || 'sin informar'}.`, 'Es un pronóstico regional para el punto, no una medición dentro de cada lote.'],
    actionable: true, timeframe: 'this_week', suggestedAction: action, scientificContext: 'Regla determinista aplicada a variables diarias del pronóstico Open-Meteo; no representa un diagnóstico agronómico.', localImpact: `${reason} ${impact}`,
    currentValue: value, unit, baseline: null, sourceUrl: 'https://open-meteo.com/en/docs', trend: 'unknown', distanceKm: 0, observationLocation: location,
    observationLocationName: farm.location.name, detectedAt: now.toISOString(), dataQuality: 'medium', satellitePassInfo: `Open-Meteo · ${dates[0]} a ${dates.at(-1)}`,
    hydrologicalRelation: 'regional_weather'
  });
  if (longestHeat >= 3) alerts.push(makeAlert('temperature_anomaly', 'Pronóstico de varios días de calor intenso', Math.max(...temperatures), '°C', 'medium', `Se pronostican ${longestHeat} días consecutivos con máximas de 35 °C o más en el punto seleccionado.`, `El calor puede aumentar la demanda de agua y afectar etapas sensibles; la respuesta depende del cultivo y su fenología, que ArgField no conoce.`, 'Revisá el estado del cultivo y la disponibilidad de agua; evitá labores sensibles durante las horas de mayor calor y consultá el pronóstico antes de decidir riego.'));
  if (peakRain >= 50 || (totalRain !== null && totalRain >= 100)) alerts.push(makeAlert('excess_precipitation', 'Pronóstico de precipitaciones abundantes', peakRain >= 50 ? peakRain : totalRain!, 'mm', 'medium', peakRain >= 50 ? `Se pronostican ${peakRain.toFixed(1)} mm en un día.` : `El pronóstico suma ${totalRain!.toFixed(1)} mm en siete días.`, 'Puede demorar labores y generar anegamiento o escurrimiento según suelo, relieve y drenaje del lote.', 'Verificá drenajes y accesos del lote, y postergá el tránsito de maquinaria si el suelo está saturado.'));
  return alerts;
}

export function useOpenMeteoDashboard(farm: FarmProfile, enabled: boolean): { alerts: Alert[]; summary: WeatherBrief | null; forecast: FieldForecast | null } {
  const key = `${farm.location.lat.toFixed(4)},${farm.location.lng.toFixed(4)}`;
  const [weatherState, setWeatherState] = useState<{ key: string; payload: WeatherPayload | null }>(() => ({ key, payload: cache.get(key)?.payload ?? null }));
  const payload = enabled && weatherState.key === key ? weatherState.payload : null;
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    if (!enabled) { setWeatherState({ key, payload: null }); return; }
    let cancelled = false;
    const cached = cache.get(key);
    if (cached && cached.until > Date.now()) { setWeatherState({ key, payload: cached.payload }); return; }
    const controller = new AbortController();
    const load = async () => {
      try {
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.search = new URLSearchParams({ latitude: String(farm.location.lat), longitude: String(farm.location.lng), current: 'temperature_2m,relative_humidity_2m,weather_code', daily: OPEN_METEO_DAILY, forecast_days: '7', timezone: 'auto', temperature_unit: 'celsius', precipitation_unit: 'mm' }).toString();
        const response = await fetch(url, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(18_000)]) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as WeatherPayload;
        cache.set(key, { until: Date.now() + TTL_MS, payload: data });
        if (!cancelled) setWeatherState({ key, payload: data });
      } catch { if (!cancelled) setWeatherState({ key, payload: null }); }
    };
    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [key, enabled, refreshTick]);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setRefreshTick(value => value + 1), TTL_MS);
    return () => window.clearInterval(timer);
  }, [key, enabled]);
  const forecast = currentForecast(parseFieldForecast(payload));
  const current = forecast ? payload?.current : undefined;
  const daily = payload?.daily;
  const summary = typeof current?.temperature_2m === 'number' ? {
    temperature: current.temperature_2m,
    humidity: typeof current.relative_humidity_2m === 'number' ? current.relative_humidity_2m : null,
    weatherCode: typeof current.weather_code === 'number' ? current.weather_code : null,
    todayMax: typeof daily?.temperature_2m_max?.[0] === 'number' ? daily.temperature_2m_max[0] : null,
    todayMin: typeof daily?.temperature_2m_min?.[0] === 'number' ? daily.temperature_2m_min[0] : null,
    nextThreeDayRain: forecastTotal(forecast, 'rain', 3),
    updatedAt: current.time ?? ''
  } : null;
  return { alerts: payload ? forecastHazardAlerts(payload, farm) : [], summary, forecast };
}
