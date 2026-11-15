import React, { useState } from 'react';
import { SatelliteReading } from '../types/satellite';
import { PENDING_MISSIONS, SATELLITE_PRODUCTS } from '../data/satelliteProducts';
import { SatelliteReadings } from './SatelliteReadings';

interface AgenciesViewProps {
  lang: 'es' | 'en';
  readings: SatelliteReading[];
  onRefresh: () => void;
  isOffline: boolean;
}

export const AgenciesView: React.FC<AgenciesViewProps> = ({ lang, readings, onRefresh, isOffline }) => {
  const [agency, setAgency] = useState('ALL');
  const es = lang === 'es';
  const products = SATELLITE_PRODUCTS.filter(p => agency === 'ALL' || p.agency === agency);
  return <div className="space-y-5 max-w-5xl mx-auto">
    <div className="p-4 bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] space-y-2">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{es ? 'Fuentes y conexiones satelitales' : 'Satellite sources and connections'}</h1>
      <p className="text-xs text-slate-600 dark:text-zinc-400">{es ? 'El estado corresponde al producto consultado en tu lote. El catálogo de misiones no es telemetría del satélite.' : 'Status describes the product queried at your farm. The mission catalogue is not satellite telemetry.'}</p>
      <div className="flex flex-wrap gap-2 pt-2">
        {['ALL', 'CONAE', 'NASA', 'ESA'].map(a => <button key={a} type="button" aria-pressed={a === agency} onClick={() => setAgency(a)} className={`px-3 py-1.5 border text-xs font-bold cursor-pointer ${a === agency ? 'bg-[#0f3260] text-white border-[#0f3260]' : 'border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'}`}>{a === 'ALL' ? es ? 'Todas' : 'All' : a}</button>)}
      </div>
    </div>
    <SatelliteReadings readings={readings.filter(r => products.some(p => p.id === r.productId))} lang={lang} onRefresh={onRefresh} offline={isOffline} />
    <div className="p-4 bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] space-y-3">
      <h2 className="font-bold text-sm text-slate-900 dark:text-white">{es ? 'Productos disponibles en el mapa' : 'Products available on the map'}</h2>
      <p className="text-xs text-slate-500 dark:text-zinc-400">{es ? 'Seleccioná una capa en el mapa para consultar su fecha y cobertura. Las capas de incendios e inundaciones no generan avisos de proximidad automáticamente.' : 'Select a map layer to check its date and coverage. Fire and flood layers do not automatically generate proximity alerts.'}</p>
      <ul className="grid sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-zinc-300">{products.map(p => <li key={p.id}><strong>{p.name[lang]}</strong><span className="block text-[10px] text-slate-500 dark:text-zinc-400">{p.source}</span></li>)}</ul>
    </div>
    <div className="p-4 bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] space-y-3">
      <h2 className="font-bold text-sm text-slate-900 dark:text-white">{es ? 'Misiones pendientes de conexión' : 'Missions pending connection'}</h2>
      {PENDING_MISSIONS.map(m => <div key={m.name} className="text-xs border-t border-slate-200 dark:border-zinc-700 pt-2"><strong className="text-slate-800 dark:text-zinc-200">{m.agency} · {m.name}</strong><p className="text-slate-600 dark:text-zinc-400 mt-1">{m.reason[lang]}</p></div>)}
    </div>
  </div>;
};
