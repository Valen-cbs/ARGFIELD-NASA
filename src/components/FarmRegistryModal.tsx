import React, { useEffect, useMemo, useState } from 'react';
import { FarmProfile } from '../types';
import { MAGYP_CROPS, canAddMagypCrop, removeConflictingMagypCrops } from '../data/magypCrops';
import { determineBasin, determineRegion, isWithinArgentina } from '../services/geo';

export interface RegisteredFarm { id: string; profile: FarmProfile }

interface Props {
  open: boolean;
  lang: 'es' | 'en';
  farms: RegisteredFarm[];
  activeFarmId: string | null;
  template: FarmProfile;
  onClose: () => void;
  onSelect: (farm: RegisteredFarm) => void;
  onSave: (profile: FarmProfile, id?: string) => void;
  onDelete: (farm: RegisteredFarm) => void;
}

type Place = { name: string; province: string; lat: number; lng: number };
const cropToMain = (crop: string): FarmProfile['currentCrop'] => {
  if (/soja/i.test(crop)) return 'soybean';
  if (/maíz/i.test(crop)) return 'maize';
  if (/trigo/i.test(crop)) return 'wheat';
  if (/girasol/i.test(crop)) return 'sunflower';
  if (/sorgo/i.test(crop)) return 'sorghum';
  if (/cebada/i.test(crop)) return 'barley';
  return 'pasture';
};

export const FarmRegistryModal: React.FC<Props> = ({ open, lang, farms, activeFarmId, template, onClose, onSelect, onSave, onDelete }) => {
  const es = lang === 'es';
  const [editingId, setEditingId] = useState<string | undefined>();
  const [producer, setProducer] = useState('');
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<'ha' | 'm2'>('ha');
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [previousCrop, setPreviousCrop] = useState('');
  const [irrigated, setIrrigated] = useState(false);
  const [cropQuery, setCropQuery] = useState('');
  const [error, setError] = useState('');
  const selectedFarm = farms.find(farm => farm.id === editingId);
  const totalHa = Number(area) * (areaUnit === 'm2' ? 0.0001 : 1);
  const visibleCrops = useMemo(() => MAGYP_CROPS.filter(crop => crop.toLocaleLowerCase('es').includes(cropQuery.toLocaleLowerCase('es'))), [cropQuery]);

  useEffect(() => {
    if (!open) return;
    const p = selectedFarm?.profile;
    setProducer(p?.producerName ?? ''); setName(p?.location.name ?? '');
    setArea(p ? String(p.fieldSizeHectares) : ''); setAreaUnit('ha');
    setPlace(p ? { name: p.location.name, province: p.location.province, lat: p.location.lat, lng: p.location.lng } : null);
    setQuery(p ? `${p.location.lat.toFixed(4)}, ${p.location.lng.toFixed(4)}` : '');
    const saved = p?.cropAllocations ?? [];
    setSelectedCrops(saved.map(item => item.crop));
    setAllocations(Object.fromEntries(saved.map(item => [item.crop, String(item.hectares)])));
    setPreviousCrop(p?.previousCrop ?? ''); setIrrigated(p?.irrigationAvailable ?? false); setError('');
  }, [open, editingId]);

  useEffect(() => {
    if (query.trim().length < 3 || place && (query === `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}` || query === `${place.name} · ${place.province}`)) { setPlaces([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.search = new URLSearchParams({ format: 'jsonv2', q: query, countrycodes: 'ar', addressdetails: '1', limit: '6' }).toString();
        const response = await fetch(url, { signal: controller.signal, headers: { 'Accept-Language': 'es' } });
        if (!response.ok) return;
        const results = await response.json();
        setPlaces(Array.isArray(results) ? results.map((item: any) => ({
          name: String(item.name || item.display_name?.split(',')[0] || 'Ubicación'),
          province: String(item.address?.state || item.address?.province || 'Argentina'),
          lat: Number(item.lat), lng: Number(item.lon)
        })).filter((item: Place) => Number.isFinite(item.lat) && Number.isFinite(item.lng) && isWithinArgentina(item.lat, item.lng)) : []);
      } catch { /* OpenStreetMap search is optional until a result is selected. */ }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, place]);

  if (!open) return null;
  const reset = () => { setEditingId(undefined); setQuery(''); setPlace(null); setName(''); setProducer(''); setArea(''); setSelectedCrops([]); setAllocations({}); setPreviousCrop(''); setIrrigated(false); setError(''); };
  const toggleCrop = (crop: string) => {
    if (selectedCrops.includes(crop)) {
      setSelectedCrops(selectedCrops.filter(item => item !== crop));
      setAllocations(({ [crop]: _removed, ...rest }) => rest);
    } else if (canAddMagypCrop(selectedCrops, crop)) {
      setSelectedCrops(removeConflictingMagypCrops(selectedCrops, crop));
    }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const assigned = selectedCrops.map(crop => ({ crop, hectares: Number(allocations[crop] || 0) * (areaUnit === 'm2' ? 0.0001 : 1) }));
    if (!name.trim()) return setError(es ? 'Ingresá el nombre de la estancia.' : 'Enter the farm name.');
    if (!place || !isWithinArgentina(place.lat, place.lng)) return setError(es ? 'Buscá y seleccioná una ubicación argentina de OpenStreetMap.' : 'Search and select an Argentine location from OpenStreetMap.');
    if (!Number.isFinite(totalHa) || totalHa <= 0) return setError(es ? 'La superficie total debe ser mayor que cero.' : 'Total area must be greater than zero.');
    if (!assigned.length) return setError(es ? 'Seleccioná al menos un cultivo actual.' : 'Select at least one current crop.');
    if (assigned.some(item => !Number.isFinite(item.hectares) || item.hectares <= 0)) return setError(es ? 'Completá la superficie asignada de cada cultivo.' : 'Enter each crop area.');
    if (assigned.reduce((sum, item) => sum + item.hectares, 0) > totalHa + 1e-8) return setError(es ? 'La superficie asignada supera la superficie total de la estancia.' : 'Allocated crop area exceeds farm area.');
    const region = determineRegion(place.lat, place.lng); const basin = determineBasin(place.lat, place.lng);
    onSave({ ...template, producerName: producer.trim() || undefined, location: { ...template.location, name: name.trim(), province: place.province, region, lat: place.lat, lng: place.lng, basinId: basin.id, basinName: basin.name, mainRiver: basin.mainRiver, aquifer: basin.aquifer }, fieldSizeHectares: totalHa, cropAllocations: assigned, currentCrop: cropToMain(selectedCrops[0] ?? ''), previousCrop: previousCrop || undefined, irrigationAvailable: irrigated, irrigation: irrigated ? template.irrigation : 'dryland' }, editingId);
    reset();
  };

  return <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" onClick={onClose}>
    <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden border border-slate-300 bg-white shadow-2xl dark:border-zinc-700 dark:bg-[#171719]" onClick={e => e.stopPropagation()}>
      <header className="flex items-center justify-between bg-[#0f3260] px-4 py-3 text-white"><h2 className="font-bold">{es ? 'Mis estancias' : 'My farms'}</h2><button type="button" onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'}>×</button></header>
      <div className="grid min-h-0 overflow-y-auto md:grid-cols-[220px_1fr]">
        <aside className="space-y-2 border-b border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50 md:border-b-0 md:border-r">
          <div className="text-[11px] font-bold uppercase text-slate-500">{es ? 'Registradas' : 'Registered'}</div>
          {farms.map(farm => <div key={farm.id} className="flex items-center gap-1"><button type="button" onClick={() => onSelect(farm)} className={`min-w-0 flex-1 truncate border px-2 py-2 text-left text-xs ${farm.id === activeFarmId ? 'border-[#0f3260] bg-blue-50 font-bold dark:bg-blue-950/40' : 'border-slate-200 dark:border-zinc-700'}`}>{farm.profile.location.name}</button><button type="button" title={es ? 'Editar' : 'Edit'} onClick={() => setEditingId(farm.id)} className="border border-slate-200 px-2 py-2 text-xs dark:border-zinc-700">✎</button><button type="button" title={es ? 'Eliminar' : 'Delete'} onClick={() => onDelete(farm)} className="border border-slate-200 px-2 py-2 text-xs text-rose-600 dark:border-zinc-700">×</button></div>)}
          <button type="button" onClick={reset} className="w-full border border-[#0f3260] px-3 py-2 text-xs font-bold text-[#0f3260] dark:text-sky-300">+ {es ? 'Nueva estancia' : 'New farm'}</button>
          <a className="block pt-2 text-[10px] text-slate-500 underline" href="https://datosestimaciones.magyp.gob.ar/reportes.php?reporte=Estimaciones" target="_blank" rel="noreferrer">MAGyP · {es ? 'catálogo oficial' : 'official catalogue'}</a>
        </aside>
        <form onSubmit={submit} className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">{es ? 'Productor (opcional)' : 'Producer (optional)'}<input value={producer} onChange={e => setProducer(e.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" /></label><label className="text-xs">{es ? 'Nombre de la estancia' : 'Farm name'}<input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" /></label></div>
          <label className="block text-xs">{es ? 'Ubicación · OpenStreetMap' : 'Location · OpenStreetMap'}<input value={query} onChange={e => { setQuery(e.target.value); setPlace(null); }} placeholder={es ? 'Buscar localidad, paraje o dirección' : 'Search town or address'} className="mt-1 w-full border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" /></label>
          {places.length > 0 && <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-zinc-700">{places.map((item, index) => <button type="button" key={`${item.lat}-${item.lng}-${index}`} onClick={() => { setPlace(item); setQuery(`${item.name} · ${item.province}`); setPlaces([]); if (!name) setName(item.name); }} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800">{item.name} · {item.province}</button>)}</div>}
          {place && <div className="font-mono text-[10px] text-slate-500">{place.lat.toFixed(5)}, {place.lng.toFixed(5)}</div>}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><label className="text-xs">{es ? 'Superficie total' : 'Total area'}<input type="number" min="0.01" step="any" required value={area} onChange={e => setArea(e.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" /></label><label className="text-xs">{es ? 'Unidad' : 'Unit'}<select value={areaUnit} onChange={e => setAreaUnit(e.target.value as 'ha' | 'm2')} className="mt-1 block border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"><option value="ha">hectáreas</option><option value="m2">m²</option></select></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">{es ? 'Buscar cultivos MAGyP' : 'Search MAGyP crops'}<input value={cropQuery} onChange={e => setCropQuery(e.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" /></label><label className="text-xs">{es ? 'Cultivo anterior (opcional)' : 'Previous crop (optional)'}<select value={previousCrop} onChange={e => setPreviousCrop(e.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"><option value="">—</option>{MAGYP_CROPS.map(crop => <option key={crop}>{crop}</option>)}</select></label></div>
          <p className="-mb-2 text-[10px] text-slate-500">{es ? 'Los cultivos “total” son agregados: al elegirlos se quitan las variantes correspondientes y viceversa.' : '“Total” crops are aggregates: selecting one removes its variants, and vice versa.'}</p>
          <div className="max-h-44 overflow-y-auto border border-slate-200 p-2 dark:border-zinc-700"><div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">{visibleCrops.map(crop => <label key={crop} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedCrops.includes(crop)} onChange={() => toggleCrop(crop)} /> <span className="min-w-0 flex-1">{crop}</span>{selectedCrops.includes(crop) && <input aria-label={`${es ? 'Superficie' : 'Area'} ${crop}`} type="number" min="0.01" step="any" value={allocations[crop] ?? ''} onChange={e => setAllocations({ ...allocations, [crop]: e.target.value })} className="w-20 border border-slate-300 px-1.5 py-1 dark:border-zinc-700 dark:bg-zinc-900" />}</label>)}</div></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={irrigated} onChange={e => setIrrigated(e.target.checked)} />{es ? 'Cuenta con riego' : 'Has irrigation'}</label><span className={`text-xs ${selectedCrops.reduce((sum, crop) => sum + Number(allocations[crop] || 0) * (areaUnit === 'm2' ? 0.0001 : 1), 0) > totalHa ? 'text-rose-600' : 'text-slate-500'}`}>{es ? 'Asignado' : 'Allocated'}: {selectedCrops.reduce((sum, crop) => sum + Number(allocations[crop] || 0) * (areaUnit === 'm2' ? 0.0001 : 1), 0).toFixed(2)} / {Number.isFinite(totalHa) ? totalHa.toFixed(2) : '0'} ha</span></div>
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-zinc-700"><button type="button" onClick={onClose} className="border border-slate-300 px-3 py-2 text-xs dark:border-zinc-700">{es ? 'Cerrar' : 'Close'}</button><button type="submit" className="bg-[#0f3260] px-4 py-2 text-xs font-bold text-white">{es ? 'Guardar estancia' : 'Save farm'}</button></div>
        </form>
      </div>
    </div>
  </div>;
};
