/** Adapted from argfield-para-mariano: preserve dates, nulls and reference ET0. */
export interface ForecastDay { date: string; tmax: number | null; tmin: number | null; rain: number | null; et0: number | null }
export interface FieldForecast { days: ForecastDay[]; currentTime: string | null }
export const OPEN_METEO_DAILY = 'temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration';
const DAY = 86_400_000;
export function dateStamp(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const stamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0,10) === value ? stamp : null;
}
const number = (value: unknown, nonnegative = false): number | null => typeof value === 'number' && Number.isFinite(value) && (!nonnegative || value >= 0) ? value : null;
export function parseFieldForecast(payload: unknown): FieldForecast | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as { current?: { time?: unknown }; daily?: Record<string, unknown> };
  const daily = data.daily;
  if (!daily || !Array.isArray(daily.time) || !daily.time.length) return null;
  const dates = daily.time;
  // Reject invalid/duplicate/out-of-order dates rather than shifting parallel arrays.
  if (dates.some((date, i) => dateStamp(date) === null || (i > 0 && dateStamp(date)! <= dateStamp(dates[i-1])!))) return null;
  const read = (key: string, i: number, positive = false) => number(Array.isArray(daily[key]) ? daily[key][i] : null, positive);
  return { days: dates.slice(0,7).map((date, i) => ({date: date as string, tmax: read('temperature_2m_max',i), tmin: read('temperature_2m_min',i), rain: read('precipitation_sum',i,true), et0: read('et0_fao_evapotranspiration',i,true)})), currentTime: typeof data.current?.time === 'string' ? data.current.time : null };
}
/** Exactly N consecutive days with values: missing values never become zero. */
export function forecastTotal(forecast: FieldForecast | null, key: 'rain' | 'et0', count = 7): number | null {
  const days = forecast?.days.slice(0,count);
  if (!days || days.length !== count || days.some((d,i) => d[key] === null || (i > 0 && dateStamp(d.date)! - dateStamp(days[i-1].date)! !== DAY))) return null;
  return days.reduce((sum,d) => sum + d[key]!,0);
}
/** Date comparisons use UTC calendar days with a one-day allowance for the point timezone. */
export function currentForecast(forecast: FieldForecast | null, now = new Date()): FieldForecast | null {
  if (!forecast?.days.length) return null;
  const today = Date.parse(now.toISOString().slice(0,10) + 'T00:00:00Z');
  const localDay = forecast.currentTime?.slice(0,10);
  const anchor = dateStamp(localDay);
  if (anchor !== null && Math.abs(anchor - today) > DAY) return null;
  const start = anchor ?? today;
  const days = forecast.days.filter(d => dateStamp(d.date)! >= start && dateStamp(d.date)! < start + 7*DAY);
  return days.length ? {...forecast, days} : null;
}
