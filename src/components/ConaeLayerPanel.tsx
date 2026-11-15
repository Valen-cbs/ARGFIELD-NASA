import React, { useState } from 'react';
import { Layers, X, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { buildLegendUrl } from '../data/conaeLayers';
import { SATELLITE_PRODUCTS, getSatelliteProduct } from '../data/satelliteProducts';
import { SatelliteReading } from '../types/satellite';
import { ReadingDetails } from './SatelliteReadings';
import { viaProxy } from '../services/proxy';

/** Image transport status is independent of the point reading below it. */
export type ConaeLayerStatus = 'idle' | 'loading' | 'loaded' | 'partial' | 'error';

interface ConaeLayerPanelProps {
  lang: 'es' | 'en'; layerId: string | null;
  onSelectLayer: (id: string | null) => void;
  day: number; onSelectDay: (day: number) => void;
  opacity: number; onChangeOpacity: (value: number) => void;
  status: ConaeLayerStatus; lastLoadedAt: Date | null;
  reading: SatelliteReading | null; onRefresh: () => void;
  onClose: () => void;
}

export const ConaeLayerPanel: React.FC<ConaeLayerPanelProps> = ({ lang, layerId, onSelectLayer, day, onSelectDay, opacity, onChangeOpacity, status, lastLoadedAt, reading, onRefresh, onClose }) => {
  const es = lang === 'es';
  const product = getSatelliteProduct(layerId);
  const [failedLegend, setFailedLegend] = useState('');
  const legendUrl = product?.kind === 'wms' ? viaProxy(buildLegendUrl(product.wms, day)) : null;
  return <div className="absolute top-2 left-2 z-[1000] w-[300px] max-w-[calc(100%-16px)] max-h-[60%] sm:max-h-[calc(100%-16px)] overflow-y-auto bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#38383e] shadow-lg text-slate-800 dark:text-zinc-100" role="region" aria-label={es ? 'Capas satelitales' : 'Satellite layers'} onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-[#2e2e33] bg-slate-50 dark:bg-[#161618]">
      <div className="flex items-center gap-2 text-[13px] font-bold text-[#0f3260] dark:text-sky-300"><Layers size={15} />{es ? 'Capas satelitales' : 'Satellite layers'}</div>
      <button type="button" onClick={onClose} aria-label={es ? 'Cerrar panel de capas' : 'Close layers panel'} className="p-1 cursor-pointer"><X size={17} /></button>
    </div>
    <div className="p-3 space-y-3 text-xs">
      {(['agua', 'cultivo', 'riesgo'] as const).map(group => <div key={group}>
        <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 mb-1.5">{{ agua: es ? 'Agua' : 'Water', cultivo: es ? 'Cultivos y vegetación' : 'Crops and vegetation', riesgo: es ? 'Riesgos y temperatura' : 'Hazards and temperature' }[group]}</div>
        <div className="flex flex-col gap-1">{SATELLITE_PRODUCTS.filter(p => p.group === group).map(p => <button key={p.id} type="button" aria-pressed={p.id === layerId} onClick={() => onSelectLayer(p.id === layerId ? null : p.id)} className={`text-left px-2.5 py-2 border cursor-pointer ${p.id === layerId ? 'bg-[#0f3260] border-[#0f3260] text-white dark:bg-sky-700' : 'border-slate-200 dark:border-[#38383e] hover:bg-slate-50 dark:hover:bg-[#2c2c30]'}`}>
          <span className="font-semibold">{p.name[lang]}</span>
          {p.kind === 'wms' && p.wms.coverage && <span className="block text-[10px]">{p.wms.coverage[lang]}</span>}
        </button>)}</div>
      </div>)}
      {product && <div className="space-y-3 border-t border-slate-200 dark:border-zinc-700 pt-3">
        <p className="text-[11px] text-slate-600 dark:text-zinc-300">{product.description[lang]}</p>
        {product.kind === 'wms' && product.wms.days && <div>
          <div className="font-semibold mb-1">{es ? 'Producto de la serie' : 'Series product'}</div>
          <div className="grid grid-cols-7 gap-1">{Array.from({ length: product.wms.seriesLength ?? 7 }, (_, i) => i + 1).map(slot => <button key={slot} type="button" aria-pressed={slot === day} onClick={() => onSelectDay(slot)} className={`h-7 border cursor-pointer ${slot === day ? 'bg-[#0f3260] text-white border-[#0f3260]' : 'border-slate-300 dark:border-zinc-700'}`}>{slot}</button>)}</div>
          <p className="text-[10px] text-slate-500 mt-1">{es ? 'La fecha del producto figura en la lectura. El número identifica una posición de la serie.' : 'The reading shows the product date. The number identifies a series position.'}</p>
        </div>}
        <label className="block">{es ? 'Opacidad' : 'Opacity'}: {Math.round(opacity * 100)}%<input type="range" min={0.2} max={1} step={0.05} value={opacity} onChange={e => onChangeOpacity(Number(e.target.value))} className="w-full mt-1" /></label>
        <div className="flex gap-1.5 items-start text-[11px]" aria-live="polite">
          {status === 'loading' ? <Loader2 size={13} className="animate-spin shrink-0" /> : status === 'error' || status === 'partial' ? <AlertTriangle size={13} className="shrink-0 text-amber-600" /> : <CheckCircle2 size={13} className="shrink-0 text-slate-500" />}
          <div>
            {status === 'loading' ? (es ? 'Cargando imágenes…' : 'Loading images…') : status === 'loaded' ? (es ? 'Imágenes recibidas; cobertura sin confirmar por la imagen.' : 'Images received; the image does not confirm farm coverage.') : status === 'partial' ? (es ? 'Algunas imágenes fallaron.' : 'Some images failed.') : status === 'error' ? (es ? 'No se recibieron imágenes válidas.' : 'No valid images received.') : (es ? 'Esperando la capa.' : 'Waiting for the layer.')}
            {lastLoadedAt && <span className="block text-[10px]">{es ? 'Carga del mapa:' : 'Map loaded:'} {lastLoadedAt.toLocaleTimeString()}</span>}
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-zinc-700 pt-3 space-y-2">
          <h3 className="font-bold">{es ? 'Dato en el punto del lote' : 'Data at the farm point'}</h3>
          {reading && <ReadingDetails reading={reading} lang={lang} />}
          {reading?.value === null && !!reading.entries?.length && <div className="text-[10px] font-mono break-words">{reading.entries.map(([k, v]) => <div key={k}>{k}: {v}</div>)}</div>}
          {product.id === 'sentinel2_ndvi' && <p className="text-[10px] text-slate-500">{es ? 'Mapa: escena en color natural. NDVI y control de nubes corresponden al punto consultado.' : 'Map: natural-color scene. NDVI and cloud screening apply to the queried point.'}</p>}
          {product.kind === 'stac' && product.id !== 'sentinel2_ndvi' && <p className="text-[10px] text-slate-500">{es ? 'La capa es de contexto. El control de calidad corresponde a la lectura del punto.' : 'The layer provides context. Quality screening applies to the point reading.'}</p>}
          <button type="button" onClick={onRefresh} disabled={reading?.status === 'loading'} className="flex items-center gap-1 text-[#0f3260] dark:text-sky-300 disabled:opacity-50 cursor-pointer"><RefreshCw size={12} />{es ? ' lectura' : 'Refresh reading'}</button>
        </div>
        {legendUrl && failedLegend !== legendUrl && <div><h3 className="font-semibold mb-1">{es ? 'Referencias del proveedor' : 'Provider legend'}</h3><img src={legendUrl} alt={es ? 'Leyenda de la capa' : 'Layer legend'} className="max-w-full bg-white border border-slate-200 p-1" onError={() => setFailedLegend(legendUrl)} /></div>}
      </div>}
    </div>
  </div>;
};
