export type OfflineFarmSummaryInput = {
  name: string;
  province: string;
  weather: { temperature: number } | null;
  forecast: Array<{ rain: number | null }>;
  readings: Array<{ status: string }>;
  optimizerStatus: string;
};

/** A factual summary that keeps the dashboard useful when the optional AI service is unavailable. */
export function offlineFarmSummary(input: OfflineFarmSummaryInput, lang: 'es' | 'en'): string {
  const available = input.readings.filter(reading => reading.status === 'available').length;
  const total = input.readings.length;
  const rainValues = input.forecast.map(day => day.rain).filter((rain): rain is number => typeof rain === 'number');
  const rain = rainValues.length === input.forecast.length && rainValues.length
    ? rainValues.reduce((sum, value) => sum + value, 0)
    : null;

  if (lang === 'en') {
    const weather = input.weather ? ` Current temperature: ${input.weather.temperature.toFixed(1)} °C.` : ' No current weather reading is available.';
    const forecast = rain === null ? ' The seven-day rainfall forecast is incomplete.' : ` Forecast rainfall for the available period totals ${rain.toFixed(1)} mm.`;
    return `${input.name}, ${input.province}: ${available} of ${total} satellite products have an available reading.${weather}${forecast} Rotation engine status: ${input.optimizerStatus}.`;
  }

  const weather = input.weather ? ` La temperatura actual registrada es ${input.weather.temperature.toFixed(1)} °C.` : ' No hay una lectura meteorológica actual válida.';
  const forecast = rain === null ? ' El pronóstico de lluvia disponible está incompleto.' : ` La lluvia pronosticada para el período disponible suma ${rain.toFixed(1)} mm.`;
  return `${input.name}, ${input.province}: hay ${available} de ${total} productos satelitales con lectura disponible.${weather}${forecast} Estado del motor de rotaciones: ${input.optimizerStatus}.`;
}
