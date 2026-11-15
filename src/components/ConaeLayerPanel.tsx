import React, { useEffect, useState } from 'react';
import { Layers, X, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Crosshair } from 'lucide-react';
import {
  CONAE_LAYERS,
  CONAE_GEOSERVICIOS_URL,
  ConaeLayerId,
  buildFeatureInfoUrl,
  buildLegendUrl,
  getConaeLayer
} from '../data/conaeLayers';

export type ConaeLayerStatus = 'idle' | 'loading' | 'ok' | 'error';

interface ConaeLayerPanelProps {
  lang: 'es' | 'en';
  layerId: ConaeLayerId | null;
  onSelectLayer: (id: ConaeLayerId | null) => void;
  day: number;
  onSelectDay: (day: number) => void;
  opacity: number;
  onChangeOpacity: (value: number) => void;
  status: ConaeLayerStatus;
  lastLoadedAt: Date | null;
  farmLat: number;
  farmLng: number;
  onClose: () => void;
}

type ValueCheck =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'value'; entries: Array<[string, string]> }
  | { state: 'empty' }
  | { state: 'blocked' }
  | { state: 'error'; detail: string };

const DAYS = [1, 2, 3, 4, 5, 6, 7];

function formatValue(v: unknown): string {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  if (v === null || v === undefined) return '—';
  return String(v);
}

export const ConaeLayerPanel: React.FC<ConaeLayerPanelProps> = ({
  lang,
  layerId,
  onSelectLayer,
  day,
  onSelectDay,
  opacity,
  onChangeOpacity,
  status,
  lastLoadedAt,
  farmLat,
  farmLng,
  onClose
}) => {
  const es = lang === 'es';
  const layer = getConaeLayer(layerId);
  const [legendFailed, setLegendFailed] = useState(false);
  const [valueCheck, setValueCheck] = useState<ValueCheck>({ state: 'idle' });

  useEffect(() => {
    setLegendFailed(false);
    setValueCheck({ state: 'idle' });
  }, [layerId, day]);

  const handleCheckValue = async () => {
    if (!layer) return;
    setValueCheck({ state: 'loading' });
    const url = buildFeatureInfoUrl(layer, day, farmLat, farmLng);
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      // Falla de red o CORS: el navegador no deja leer la respuesta.
      setValueCheck({ state: 'blocked' });
      return;
    }
    try {
      const text = await res.text();
      const json = JSON.parse(text);
      const features = Array.isArray(json?.features) ? json.features : [];
      if (features.length === 0) {
        setValueCheck({ state: 'empty' });
        return;
      }
      const props = features[0]?.properties ?? {};
      const entries = Object.entries(props)
        .slice(0, 4)
        .map(([k, v]) => [k, formatValue(v)] as [string, string]);
      setValueCheck(entries.length ? { state: 'value', entries } : { state: 'empty' });
    } catch {
      setValueCheck({
        state: 'error',
        detail: es ? `CONAE respondió con código ${res.status} pero no en formato legible.` : `CONAE answered with status ${res.status} but not in a readable format.`
      });
    }
  };

  const groups: Array<{ key: 'agua' | 'riesgo'; label: string }> = [
    { key: 'agua', label: es ? 'Agua' : 'Water' },
    { key: 'riesgo', label: es ? 'Riesgos' : 'Hazards' }
  ];

  return (
    <div
      className="absolute top-2 left-2 z-[1000] w-[300px] max-w-[calc(100%-16px)] max-h-[60%] sm:max-h-[calc(100%-16px)] overflow-y-auto bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#38383e] shadow-lg text-slate-800 dark:text-zinc-100"
      role="region"
      aria-label={es ? 'Capas reales de CONAE' : 'Real CONAE layers'}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-[#2e2e33] bg-slate-50 dark:bg-[#161618]">
        <div className="flex items-center gap-2 text-[13px] font-bold text-[#0f3260] dark:text-sky-300">
          <Layers size={15} />
          {es ? 'Datos reales de CONAE' : 'Real CONAE data'}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-[#2c2c30] cursor-pointer"
          aria-label={es ? 'Cerrar panel de capas' : 'Close layers panel'}
        >
          <X size={15} />
        </button>
      </div>

      <div className="p-3 space-y-3 text-xs">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1.5">{g.label}</div>
            <div className="flex flex-col gap-1">
              {CONAE_LAYERS.filter((l) => l.group === g.key).map((l) => {
                const active = l.id === layerId;
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectLayer(active ? null : l.id)}
                    className={`text-left px-2.5 py-2 border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#0f3260] border-[#0f3260] text-white dark:bg-sky-700 dark:border-sky-700'
                        : 'bg-white dark:bg-[#232326] border-slate-200 dark:border-[#38383e] hover:bg-slate-50 dark:hover:bg-[#2c2c30]'
                    }`}
                  >
                    <div className="font-semibold text-[12px] flex items-center justify-between gap-2">
                      <span>{l.name[lang]}</span>
                      {l.coverage && (
                        <span className={`text-[9.5px] font-medium ${active ? 'text-sky-100' : 'text-amber-700 dark:text-amber-400'}`}>
                          {l.coverage[lang]}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {layer && (
          <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-[#2e2e33]">
            <p className="pt-2 text-[11.5px] leading-relaxed text-slate-600 dark:text-zinc-300">{layer.description[lang]}</p>

            {layer.days && (
              <div>
                <div className="text-[11px] font-semibold mb-1">{es ? 'Día de la serie (CONAE publica 7)' : 'Series day (CONAE publishes 7)'}</div>
                <div className="grid grid-cols-7 gap-1" role="group" aria-label={es ? 'Elegir día' : 'Choose day'}>
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={d === day}
                      onClick={() => onSelectDay(d)}
                      className={`h-7 text-[11px] font-semibold border cursor-pointer ${
                        d === day
                          ? 'bg-[#0f3260] border-[#0f3260] text-white dark:bg-sky-700 dark:border-sky-700'
                          : 'bg-white dark:bg-[#232326] border-slate-200 dark:border-[#38383e] hover:bg-slate-50 dark:hover:bg-[#2c2c30]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
                  {es ? 'Por defecto 1 (suele ser el más reciente; confirmar con CONAE).' : 'Defaults to 1 (usually the latest; confirm with CONAE).'}
                </div>
              </div>
            )}

            <label className="block">
              <span className="text-[11px] font-semibold">{es ? 'Transparencia' : 'Opacity'}: {Math.round(opacity * 100)}%</span>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => onChangeOpacity(Number(e.target.value))}
                className="w-full mt-1 accent-[#0f3260]"
              />
            </label>

            <div className="flex items-start gap-1.5 text-[11px]" aria-live="polite">
              {status === 'loading' && (
                <>
                  <Loader2 size={13} className="animate-spin shrink-0 mt-0.5 text-slate-500" />
                  <span>{es ? 'Cargando capa desde CONAE…' : 'Loading layer from CONAE…'}</span>
                </>
              )}
              {status === 'ok' && (
                <>
                  <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span>
                    {es ? 'Capa cargada' : 'Layer loaded'}
                    {lastLoadedAt ? ` · ${lastLoadedAt.toLocaleTimeString(es ? 'es-AR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    <span className="block text-[10px] text-slate-500 dark:text-zinc-400">
                      {es
                        ? 'Si no ves color, la capa no tiene datos en esta zona o ese día.'
                        : 'If you see no color, the layer has no data here or for that day.'}
                    </span>
                  </span>
                </>
              )}
              {status === 'error' && (
                <>
                  <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    {es
                      ? 'CONAE no devolvió esta capa. Probá otro día o más tarde.'
                      : 'CONAE did not return this layer. Try another day or later.'}
                  </span>
                </>
              )}
            </div>

            {!legendFailed && (
              <div>
                <div className="text-[11px] font-semibold mb-1">{es ? 'Referencias' : 'Legend'}</div>
                <img
                  src={buildLegendUrl(layer, day)}
                  alt={es ? `Referencias de ${layer.name.es}` : `Legend for ${layer.name.en}`}
                  className="max-w-full bg-white p-1 border border-slate-200"
                  onError={() => setLegendFailed(true)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleCheckValue}
                disabled={valueCheck.state === 'loading'}
                className="w-full flex items-center justify-center gap-1.5 h-8 border border-[#0f3260] dark:border-sky-600 text-[#0f3260] dark:text-sky-300 font-semibold text-[11.5px] hover:bg-slate-50 dark:hover:bg-[#2c2c30] cursor-pointer disabled:opacity-60"
              >
                {valueCheck.state === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />}
                {es ? 'Probar valor en mi lote' : 'Test value at my farm'}
              </button>
              {valueCheck.state === 'value' && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-2 text-[11px]">
                  <div className="font-semibold mb-1">{es ? 'Valor de CONAE en tu lote:' : 'CONAE value at your farm:'}</div>
                  {valueCheck.entries.map(([k, v]) => (
                    <div key={k} className="font-mono">
                      {k}: <strong>{v}</strong>
                    </div>
                  ))}
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
                    {es ? 'Interpretalo con las referencias de la capa.' : 'Read it against the layer legend.'}
                  </div>
                </div>
              )}
              {valueCheck.state === 'empty' && (
                <div className="bg-slate-50 dark:bg-[#232326] border border-slate-200 dark:border-[#38383e] p-2 text-[11px]">
                  {es
                    ? 'CONAE respondió, pero no hay dato en el punto de tu lote para ese día.'
                    : 'CONAE answered, but there is no data at your farm for that day.'}
                </div>
              )}
              {valueCheck.state === 'blocked' && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-2 text-[11px] leading-relaxed">
                  {es
                    ? 'El navegador no pudo leer el valor: el servidor de CONAE no permite consultas directas desde otra página. Para mostrar el número hace falta un pequeño servidor intermedio. La capa del mapa sí se ve.'
                    : 'The browser could not read the value: the CONAE server does not allow direct requests from other sites. Showing the number needs a small proxy server. The map layer itself still displays.'}
                </div>
              )}
              {valueCheck.state === 'error' && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-2 text-[11px]">{valueCheck.detail}</div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-200 dark:border-[#2e2e33]">
              <span className="pt-1.5">{layer.source}</span>
              <a
                href={CONAE_GEOSERVICIOS_URL}
                target="_blank"
                rel="noreferrer"
                className="pt-1.5 flex items-center gap-1 text-[#0f3260] dark:text-sky-300 hover:underline"
              >
                GEOServicios <ExternalLink size={11} />
              </a>
            </div>
          </div>
        )}

        {!layer && (
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 border-t border-slate-200 dark:border-[#2e2e33] pt-2">
            {es ? 'Elegí una capa para verla sobre el mapa.' : 'Pick a layer to show it on the map.'}
          </p>
        )}
      </div>
    </div>
  );
};
