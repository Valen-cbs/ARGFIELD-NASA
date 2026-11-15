import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  ExternalLink,
  Gauge,
  MapPin,
  RefreshCw,
  Sun,
  Thermometer,
  Wind
} from 'lucide-react';
import { FarmLocation, FarmProfile } from '../types';

interface WeatherViewProps {
  farmProfile: FarmProfile;
  onChangeFarmLocation?: (preset: FarmLocation) => void;
  onOpenEditLocation?: () => void;
  isOffline: boolean;
  lang: 'es' | 'en';
}

type WeatherIcon = 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'storm';

interface CurrentWeather {
  time: string;
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  windGusts: number | null;
  pressure: number | null;
}

interface HourlyForecast {
  time: string;
  temperature: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
  dewPoint: number | null;
  pressure: number | null;
  uvIndex: number | null;
  solarRadiation: number | null;
}

interface DailyForecast {
  date: string;
  weatherCode: number | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  windSpeed: number | null;
  uvIndex: number | null;
  evapotranspiration: number | null;
}

interface WeatherForecast {
  timezone: string;
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readNumber = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const readNumberArray = (record: Record<string, unknown>, key: string): Array<number | null> =>
  Array.isArray(record[key])
    ? (record[key] as unknown[]).map(value =>
        typeof value === 'number' && Number.isFinite(value) ? value : null
      )
    : [];

const readStringArray = (record: Record<string, unknown>, key: string): string[] =>
  Array.isArray(record[key])
    ? (record[key] as unknown[]).filter((value): value is string => typeof value === 'string')
    : [];

const valueAt = (values: Array<number | null>, index: number): number | null =>
  values[index] ?? null;

const parseWeatherForecast = (payload: unknown): WeatherForecast => {
  if (!isRecord(payload) || !isRecord(payload.current) || !isRecord(payload.hourly) || !isRecord(payload.daily)) {
    throw new Error('La respuesta de Open-Meteo no tiene el formato esperado.');
  }

  const current = payload.current;
  const hourly = payload.hourly;
  const daily = payload.daily;
  const currentTime = current.time;
  const hourlyTimes = readStringArray(hourly, 'time');
  const dailyDates = readStringArray(daily, 'time');

  if (typeof currentTime !== 'string' || hourlyTimes.length === 0 || dailyDates.length === 0) {
    throw new Error('Open-Meteo no devolvió fechas de pronóstico válidas.');
  }

  const hourlyValues = {
    temperature: readNumberArray(hourly, 'temperature_2m'),
    precipitationProbability: readNumberArray(hourly, 'precipitation_probability'),
    precipitation: readNumberArray(hourly, 'precipitation'),
    weatherCode: readNumberArray(hourly, 'weather_code'),
    windSpeed: readNumberArray(hourly, 'wind_speed_10m'),
    dewPoint: readNumberArray(hourly, 'dew_point_2m'),
    pressure: readNumberArray(hourly, 'pressure_msl'),
    uvIndex: readNumberArray(hourly, 'uv_index'),
    solarRadiation: readNumberArray(hourly, 'shortwave_radiation')
  };
  const dailyValues = {
    weatherCode: readNumberArray(daily, 'weather_code'),
    temperatureMin: readNumberArray(daily, 'temperature_2m_min'),
    temperatureMax: readNumberArray(daily, 'temperature_2m_max'),
    precipitation: readNumberArray(daily, 'precipitation_sum'),
    precipitationProbability: readNumberArray(daily, 'precipitation_probability_max'),
    windSpeed: readNumberArray(daily, 'wind_speed_10m_max'),
    uvIndex: readNumberArray(daily, 'uv_index_max'),
    evapotranspiration: readNumberArray(daily, 'et0_fao_evapotranspiration')
  };

  return {
    timezone: typeof payload.timezone === 'string' ? payload.timezone : '',
    current: {
      time: currentTime,
      temperature: readNumber(current, 'temperature_2m'),
      apparentTemperature: readNumber(current, 'apparent_temperature'),
      humidity: readNumber(current, 'relative_humidity_2m'),
      precipitation: readNumber(current, 'precipitation'),
      weatherCode: readNumber(current, 'weather_code'),
      windSpeed: readNumber(current, 'wind_speed_10m'),
      windDirection: readNumber(current, 'wind_direction_10m'),
      windGusts: readNumber(current, 'wind_gusts_10m'),
      pressure: readNumber(current, 'pressure_msl')
    },
    hourly: hourlyTimes.map((time, index) => ({
      time,
      temperature: valueAt(hourlyValues.temperature, index),
      precipitationProbability: valueAt(hourlyValues.precipitationProbability, index),
      precipitation: valueAt(hourlyValues.precipitation, index),
      weatherCode: valueAt(hourlyValues.weatherCode, index),
      windSpeed: valueAt(hourlyValues.windSpeed, index),
      dewPoint: valueAt(hourlyValues.dewPoint, index),
      pressure: valueAt(hourlyValues.pressure, index),
      uvIndex: valueAt(hourlyValues.uvIndex, index),
      solarRadiation: valueAt(hourlyValues.solarRadiation, index)
    })),
    daily: dailyDates.map((date, index) => ({
      date,
      weatherCode: valueAt(dailyValues.weatherCode, index),
      temperatureMin: valueAt(dailyValues.temperatureMin, index),
      temperatureMax: valueAt(dailyValues.temperatureMax, index),
      precipitation: valueAt(dailyValues.precipitation, index),
      precipitationProbability: valueAt(dailyValues.precipitationProbability, index),
      windSpeed: valueAt(dailyValues.windSpeed, index),
      uvIndex: valueAt(dailyValues.uvIndex, index),
      evapotranspiration: valueAt(dailyValues.evapotranspiration, index)
    }))
  };
};

const conditionForCode = (code: number | null, lang: 'es' | 'en'): string => {
  if (code === null) return lang === 'es' ? 'Condición no disponible' : 'Condition unavailable';
  if (code === 0) return lang === 'es' ? 'Despejado' : 'Clear';
  if (code === 1) return lang === 'es' ? 'Mayormente despejado' : 'Mainly clear';
  if (code === 2) return lang === 'es' ? 'Parcialmente nublado' : 'Partly cloudy';
  if (code === 3) return lang === 'es' ? 'Nublado' : 'Overcast';
  if (code === 45 || code === 48) return lang === 'es' ? 'Niebla' : 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return lang === 'es' ? 'Llovizna' : 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return lang === 'es' ? 'Lluvia' : 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return lang === 'es' ? 'Nieve' : 'Snow';
  if ([95, 96, 99].includes(code)) return lang === 'es' ? 'Tormenta' : 'Thunderstorm';
  return lang === 'es' ? 'Condición no disponible' : 'Condition unavailable';
};

const iconForCode = (code: number | null): WeatherIcon => {
  if (code === 0) return 'sun';
  if (code === 1 || code === 2) return 'cloud-sun';
  if (code === 3 || code === 45 || code === 48) return 'cloud';
  if (code !== null && [95, 96, 99].includes(code)) return 'storm';
  if (code !== null && code >= 51) return 'rain';
  return 'cloud';
};

const formatNumber = (value: number | null, lang: 'es' | 'en', digits = 0): string =>
  value === null ? '—' : value.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { maximumFractionDigits: digits });

const formatWindDirection = (degrees: number | null): string => {
  if (degrees === null) return '—';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  return directions[Math.round(degrees / 22.5) % directions.length];
};

const formatDate = (date: string, lang: 'es' | 'en', options: Intl.DateTimeFormatOptions): string => {
  const parsedDate = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US', options);
};

const formatTime = (time: string): string => time.slice(11, 16) || '—';

const WEATHER_CACHE_TTL = 60 * 60 * 1000;
const weatherCache = new Map<string, { forecast: WeatherForecast; fetchedAt: number }>();

export const WeatherView: React.FC<WeatherViewProps> = ({
  farmProfile,
  onOpenEditLocation,
  isOffline,
  lang
}) => {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const { lat, lng } = farmProfile.location;
  const es = lang === 'es';

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = weatherCache.get(cacheKey);
    if (cached) setForecast(cached.forecast);

    if (isOffline) {
      setLoading(false);
      if (cached) {
        setError(null);
        return () => controller.abort();
      }
      setError(es
        ? 'El modo sin conexión está activo. Desactivalo para consultar Open-Meteo.'
        : 'Offline mode is active. Turn it off to fetch Open-Meteo data.');
      return () => controller.abort();
    }

    const shouldRefresh = refreshKey > 0 || !cached || Date.now() - cached.fetchedAt >= WEATHER_CACHE_TTL;
    if (!shouldRefresh) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(!cached);
    const loadForecast = async () => {
      try {
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.search = new URLSearchParams({
          latitude: String(lat),
          longitude: String(lng),
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl',
          hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,dew_point_2m,pressure_msl,uv_index,shortwave_radiation',
          daily: 'weather_code,temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,et0_fao_evapotranspiration',
          forecast_days: '7',
          timezone: 'auto',
          temperature_unit: 'celsius',
          wind_speed_unit: 'kmh',
          precipitation_unit: 'mm'
        }).toString();

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Open-Meteo respondió con HTTP ${response.status}.`);
        }

        const data = parseWeatherForecast(await response.json());
        weatherCache.set(cacheKey, { forecast: data, fetchedAt: Date.now() });
        setForecast(data);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        const details = loadError instanceof Error ? loadError.message : String(loadError);
        setError(es
          ? `No se pudieron cargar los datos meteorológicos para este punto. ${details}`
          : `Weather data could not be loaded for this location. ${details}`);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadForecast();
    return () => controller.abort();
  }, [lat, lng, isOffline, refreshKey, es]);

  useEffect(() => {
    if (isOffline) return;
    const timer = window.setInterval(() => setRefreshKey(value => value + 1), WEATHER_CACHE_TTL);
    return () => window.clearInterval(timer);
  }, [lat, lng, isOffline]);

  const currentHourIndex = useMemo(() => {
    if (!forecast) return -1;
    const exactIndex = forecast.hourly.findIndex(hour => hour.time === forecast.current.time);
    if (exactIndex >= 0) return exactIndex;
    return forecast.hourly.findIndex(hour => hour.time >= forecast.current.time);
  }, [forecast]);

  const currentHour = currentHourIndex >= 0 ? forecast?.hourly[currentHourIndex] : undefined;
  const currentDate = forecast?.current.time.slice(0, 10);
  const today = forecast?.daily.find(day => day.date === currentDate) ?? forecast?.daily[0];
  const dailyForecast = forecast?.daily[selectedDayIndex];
  const hourlyForecast = forecast && currentHourIndex >= 0
    ? forecast.hourly.slice(currentHourIndex, currentHourIndex + 24)
    : [];

  const renderWeatherIcon = (iconName: WeatherIcon, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'sun':
        return <Sun className={`${className} text-amber-500`} strokeWidth={2.2} />;
      case 'cloud-sun':
        return <CloudSun className={`${className} text-amber-500`} strokeWidth={2.2} />;
      case 'cloud':
        return <Cloud className={`${className} text-slate-400`} strokeWidth={2.2} />;
      case 'rain':
        return <CloudRain className={`${className} text-blue-500`} strokeWidth={2.2} />;
      case 'storm':
        return <CloudLightning className={`${className} text-purple-600`} strokeWidth={2.2} />;
    }
  };

  return (
    <div className="space-y-4 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#0f3260] dark:text-zinc-100">
            <CloudSun size={20} />
            <h1 className="text-xl font-bold">{es ? 'Clima del establecimiento' : 'Field weather'}</h1>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-zinc-400">
            <span>{farmProfile.location.name}</span>
            <span>·</span>
            <span>{farmProfile.location.province}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 font-mono"><MapPin size={12} />{lat.toFixed(4)}, {lng.toFixed(4)}</span>
            {onOpenEditLocation && (
              <button type="button" onClick={onOpenEditLocation} className="font-bold text-[#0f3260] underline dark:text-sky-300">
                {es ? 'Cambiar ubicación' : 'Change location'}
              </button>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey(value => value + 1)}
          disabled={loading || isOffline}
          className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#0f3260] disabled:opacity-50 dark:border-zinc-700 dark:bg-[#1c1c1e] dark:text-zinc-100"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {es ? 'Actualizar' : 'Refresh'}
        </button>
      </header>

      {loading && (
        <div role="status" className="flex items-center gap-2 border border-slate-300 bg-white p-5 text-sm text-slate-700 dark:border-zinc-700 dark:bg-[#1c1c1e] dark:text-zinc-200">
          <RefreshCw size={16} className="animate-spin" />
          {es ? 'Consultando el pronóstico para las coordenadas del establecimiento…' : 'Loading the forecast for the field coordinates…'}
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="flex items-start gap-3 border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{es ? 'Clima no disponible' : 'Weather unavailable'}</p>
            <p className="mt-1">{error}</p>
            {!isOffline && (
              <button type="button" onClick={() => setRefreshKey(value => value + 1)} className="mt-2 font-bold underline">
                {es ? 'Reintentar' : 'Try again'}
              </button>
            )}
          </div>
        </div>
      )}

      {forecast && !loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section className="flex flex-col justify-between border border-slate-300 bg-white p-5 shadow-xs dark:border-[#2e2e33] dark:bg-[#1c1c1e] lg:col-span-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    {es ? 'Condición actual' : 'Current conditions'}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                    <Clock size={12} />
                    {formatDate(forecast.current.time.slice(0, 10), lang, { day: 'numeric', month: 'short' })} · {formatTime(forecast.current.time)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  {renderWeatherIcon(iconForCode(forecast.current.weatherCode), 'h-10 w-10')}
                  <div className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    {formatNumber(forecast.current.temperature, lang)}°<span className="text-2xl font-normal text-slate-400">C</span>
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-zinc-200">
                  {conditionForCode(forecast.current.weatherCode, lang)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  {es ? 'Sensación térmica' : 'Feels like'}: <strong className="font-mono text-slate-700 dark:text-zinc-200">{formatNumber(forecast.current.apparentTemperature, lang)}°C</strong>
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {es ? 'Hoy' : 'Today'}: {es ? 'mín.' : 'min'} {formatNumber(today?.temperatureMin ?? null, lang)}° · {es ? 'máx.' : 'max'} {formatNumber(today?.temperatureMax ?? null, lang)}°C
                </p>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600 dark:border-[#2e2e33] dark:text-zinc-400">
                <div className="font-bold text-slate-700 dark:text-zinc-300">{es ? 'Pronóstico para el punto seleccionado' : 'Forecast for selected point'}</div>
                <p className="mt-1">
                  {lat.toFixed(4)}, {lng.toFixed(4)}{forecast.timezone ? ` · ${forecast.timezone}` : ''}
                </p>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7">
              <MetricCard title={es ? 'Humedad' : 'Humidity'} icon={<Droplets className="h-4 w-4 text-blue-500" />}>
                <MetricValue value={formatNumber(forecast.current.humidity, lang)} unit="%" />
                <MetricCaption>{es ? 'Punto de rocío' : 'Dew point'}: {formatNumber(currentHour?.dewPoint ?? null, lang, 1)}°C</MetricCaption>
              </MetricCard>

              <MetricCard title={es ? 'Viento' : 'Wind'} icon={<Wind className="h-4 w-4 text-teal-600 dark:text-teal-400" />}>
                <MetricValue value={formatNumber(forecast.current.windSpeed, lang)} unit="km/h" />
                <MetricCaption>
                  {formatWindDirection(forecast.current.windDirection)} · {es ? 'ráfagas' : 'gusts'} {formatNumber(forecast.current.windGusts, lang)} km/h
                </MetricCaption>
              </MetricCard>

              <MetricCard title={es ? 'Precipitación hoy' : 'Precipitation today'} icon={<CloudRain className="h-4 w-4 text-indigo-500" />}>
                <MetricValue value={formatNumber(today?.precipitation ?? null, lang, 1)} unit="mm" />
                <MetricCaption>{es ? 'Probabilidad máx.' : 'Max. probability'}: {formatNumber(today?.precipitationProbability ?? null, lang)}%</MetricCaption>
              </MetricCard>

              <MetricCard title={es ? 'Evapotranspiración ET₀' : 'Evapotranspiration ET₀'} icon={<Thermometer className="h-4 w-4 text-amber-600" />}>
                <MetricValue value={formatNumber(today?.evapotranspiration ?? null, lang, 1)} unit="mm/día" />
                <MetricCaption>{es ? 'Estimación FAO' : 'FAO estimate'}</MetricCaption>
              </MetricCard>

              <MetricCard title={es ? 'Presión atmosférica' : 'Atmospheric pressure'} icon={<Gauge className="h-4 w-4 text-slate-600 dark:text-zinc-400" />}>
                <MetricValue value={formatNumber(forecast.current.pressure, lang, 1)} unit="hPa" />
                <MetricCaption>{es ? 'Presión a nivel medio del mar' : 'Mean sea level pressure'}</MetricCaption>
              </MetricCard>

              <MetricCard title={es ? 'Radiación y UV' : 'Radiation and UV'} icon={<Sun className="h-4 w-4 text-amber-500" />}>
                <MetricValue value={formatNumber(currentHour?.uvIndex ?? null, lang, 1)} unit="UV" />
                <MetricCaption>{es ? 'Radiación solar' : 'Solar radiation'}: {formatNumber(currentHour?.solarRadiation ?? null, lang)} W/m²</MetricCaption>
              </MetricCard>
            </div>
          </div>

          <section className="border border-slate-300 bg-white p-4 shadow-xs dark:border-[#2e2e33] dark:bg-[#1c1c1e] sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0f3260] dark:text-zinc-300" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {es ? 'Pronóstico horario · próximas 24 horas' : 'Hourly forecast · next 24 hours'}
              </h2>
            </div>
            {hourlyForecast.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-zinc-400">{es ? 'Pronóstico horario no disponible.' : 'Hourly forecast unavailable.'}</p>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
                {hourlyForecast.map(hour => (
                  <div key={hour.time} className="flex min-w-[100px] shrink-0 flex-col items-center border border-slate-200 bg-slate-50 p-3 text-center dark:border-[#333336] dark:bg-[#252528]">
                    <span className="font-mono text-xs font-bold text-slate-600 dark:text-zinc-400">{formatTime(hour.time)}</span>
                    <div className="my-2">{renderWeatherIcon(iconForCode(hour.weatherCode), 'h-6 w-6')}</div>
                    <div className="font-mono text-base font-black text-slate-900 dark:text-white">{formatNumber(hour.temperature, lang)}°C</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                      <Droplets className="h-3 w-3" />{formatNumber(hour.precipitationProbability, lang)}%
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-slate-500 dark:text-zinc-400">{formatNumber(hour.windSpeed, lang)} km/h</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border border-slate-300 bg-white p-4 shadow-xs dark:border-[#2e2e33] dark:bg-[#1c1c1e] sm:p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-[#2e2e33]">
              <Calendar className="h-4 w-4 text-[#0f3260] dark:text-zinc-300" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {es ? 'Pronóstico de 7 días' : '7-day forecast'}
              </h2>
            </div>
            <div className="space-y-2">
              {forecast.daily.map((day, index) => {
                const isSelected = selectedDayIndex === index;
                const dayLabel = day.date === currentDate
                  ? (es ? 'Hoy' : 'Today')
                  : formatDate(day.date, lang, { weekday: 'short' });
                return (
                  <button
                    key={day.date}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDayIndex(index)}
                    className={`w-full border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-[#0f3260] bg-blue-50/60 dark:border-blue-500/80 dark:bg-[#262830]'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 dark:border-[#2f2f33] dark:bg-[#222225] dark:hover:bg-[#28282c]'
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-14 shrink-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{dayLabel}</div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">{formatDate(day.date, lang, { day: 'numeric', month: 'short' })}</div>
                        </div>
                        <div className="shrink-0">{renderWeatherIcon(iconForCode(day.weatherCode), 'h-6 w-6')}</div>
                        <div className="truncate text-xs font-semibold text-slate-800 dark:text-zinc-200">{conditionForCode(day.weatherCode, lang)}</div>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-t border-slate-200/60 pt-2 text-xs text-slate-600 dark:border-[#2f2f33] dark:text-zinc-400 sm:justify-end sm:border-0 sm:pt-0">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-blue-500" />{formatNumber(day.precipitationProbability, lang)}%</span>
                          <span className="inline-flex items-center gap-1"><Wind className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />{formatNumber(day.windSpeed, lang)} km/h</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 font-mono">
                          <span>{formatNumber(day.temperatureMin, lang)}°</span>
                          <span className="text-slate-400">–</span>
                          <strong className="text-slate-900 dark:text-white">{formatNumber(day.temperatureMax, lang)}°C</strong>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-200 pt-2.5 text-xs text-slate-600 dark:border-[#38383e] dark:text-zinc-300">
                        <span>{es ? 'Precipitación' : 'Precipitation'}: <strong>{formatNumber(day.precipitation, lang, 1)} mm</strong></span>
                        <span>UV máx.: <strong>{formatNumber(day.uvIndex, lang, 1)}</strong></span>
                        <span>ET₀: <strong>{formatNumber(day.evapotranspiration, lang, 1)} mm/día</strong></span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
            <span>{es ? 'Pronóstico consultado según las coordenadas del establecimiento.' : 'Forecast queried for the field coordinates.'}</span>
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
              <CheckCircle2 size={12} />Open-Meteo <ExternalLink size={11} />
            </a>
          </footer>
        </>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, icon, children }) => (
  <section className="flex flex-col justify-between border border-slate-300 bg-white p-3.5 shadow-xs dark:border-[#2e2e33] dark:bg-[#1c1c1e]">
    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
      <span>{title}</span>
      {icon}
    </div>
    <div className="my-2">{children}</div>
  </section>
);

const MetricValue: React.FC<{ value: string; unit: string }> = ({ value, unit }) => (
  <div className="flex items-baseline gap-1 font-mono text-2xl font-bold text-slate-900 dark:text-white">
    {value}<span className="text-xs font-normal text-slate-500">{unit}</span>
  </div>
);

const MetricCaption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] text-slate-500 dark:text-zinc-400">{children}</div>
);
