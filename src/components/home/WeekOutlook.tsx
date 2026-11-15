import { FieldForecast, forecastTotal } from '../../services/fieldForecast';

/** Weather context only: neither a soil measurement nor an irrigation prescription. */
export function WeekOutlook({ forecast, lang, isOffline }: { forecast: FieldForecast | null; lang: 'es' | 'en'; isOffline: boolean }) {
  const es = lang === 'es';
  const days = forecast?.days ?? [];
  const rain = forecastTotal(forecast, 'rain'), et0 = forecastTotal(forecast, 'et0');
  const lows = days.flatMap(d => d.tmin === null ? [] : [d.tmin]);
  const highs = days.flatMap(d => d.tmax === null ? [] : [d.tmax]);
  const fmt = (value: number | null, unit: string) => value === null ? (es ? 'Sin datos completos' : 'Incomplete data') : `${value.toLocaleString(es ? 'es-AR' : 'en-US', {maximumFractionDigits:1})} ${unit}`;
  const cards = [
    [es ? 'Lluvia · 7 días' : 'Rain · 7 days', fmt(rain, 'mm')],
    [es ? 'ET₀ de referencia · 7 días' : 'Reference ET₀ · 7 days', fmt(et0, 'mm')],
    [es ? 'Mínima disponible' : 'Available minimum', fmt(lows.length ? Math.min(...lows) : null, '°C')],
    [es ? 'Máxima disponible' : 'Available maximum', fmt(highs.length ? Math.max(...highs) : null, '°C')]
  ];
  return <section aria-label={es ? 'Resumen semanal' : 'Weekly outlook'} className="border border-slate-300 bg-white p-4 dark:border-zinc-700 dark:bg-[#1c1c1e] space-y-3">
    <h2 className="text-sm font-bold">{es ? 'Esta semana en el campo' : 'This week at the farm'}</h2>
    <p className="text-xs text-slate-600 dark:text-zinc-400">{isOffline ? (es ? 'Sin conexión: no se consulta el pronóstico.' : 'Offline: forecast requests are disabled.') : days.length ? `Open-Meteo · ${days[0].date} — ${days.at(-1)!.date} · ${days.length} ${es ? 'días disponibles' : 'available days'}` : (es ? 'Pronóstico no disponible para este punto.' : 'Forecast unavailable for this point.')}</p>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{cards.map(([label,value]) => <div key={label} className="border border-slate-200 dark:border-zinc-700 p-2"><div className="text-[11px] text-slate-500 dark:text-zinc-400">{label}</div><strong className="text-sm">{value}</strong></div>)}</div>
    <p className="text-[11px] text-slate-500 dark:text-zinc-400">{es ? 'ET₀ representa la demanda atmosférica de una superficie de referencia. No mide el consumo real de tus cultivos, la humedad del suelo ni cuánto regar. Confirmá las condiciones en el lote.' : 'ET₀ is atmospheric demand for a reference surface. It does not measure actual crop water use, soil moisture or irrigation requirements. Check field conditions.'}</p>
  </section>;
}
