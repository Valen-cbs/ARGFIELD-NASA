import { CROP_AGRONOMY, CropId } from '../engine/agronomy';
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
  if (/ma.z/i.test(crop)) return 'maize';
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
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<'ha' | 'm2'>('ha');
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [previousCrops, setPreviousCrops] = useState<string[]>([]);
  const [irrigated, setIrrigated] = useState(false);
  const [rotation, setRotation] = useState<string[]>(['', '', '']);
  const [irrigationMm, setIrrigationMm] = useState('');
  const [soilType, setSoilType] = useState<FarmProfile['soilType']>(template.soilType);
  const [cropQuery, setCropQuery] = useState('');
  const [previousCropQuery, setPreviousCropQuery] = useState('');
  const [error, setError] = useState('');
  const selectedFarm = farms.find(farm => farm.id === editingId);
  const totalHa = Number(area) * (areaUnit === 'm2' ? 0.0001 : 1);
  const visibleCrops = useMemo(() => MAGYP_CROPS.filter(crop => crop.toLocaleLowerCase('es').includes(cropQuery.toLocaleLowerCase('es'))), [cropQuery]);
  const visiblePreviousCrops = useMemo(() => MAGYP_CROPS.filter(crop => crop.toLocaleLowerCase('es').includes(previousCropQuery.toLocaleLowerCase('es'))), [previousCropQuery]);

  useEffect(() => {
    if (!open) return;
    const p = selectedFarm?.profile;
    const location = p?.location;
    setRotation([0, 1, 2].map(i => p?.currentRotation?.[i] ? p.currentRotation[i].primary + (p.currentRotation[i].secondary ? '+soja2' : '') : ''));
    setIrrigationMm(p?.maxMonthlyIrrigationMm === undefined ? '' : String(p.maxMonthlyIrrigationMm));
    setSoilType(p?.soilType ?? template.soilType);
    setProducer(p?.producerName ?? ''); setName(p?.location.name ?? '');
    setArea(p ? String(p.fieldSizeHectares) : ''); setAreaUnit('ha');
    setPlace(location ? { name: location.name, province: location.province, lat: location.lat, lng: location.lng } : null);
    setQuery(location ? `${location.name} · ${location.province}` : '');
    setManualLat(location ? location.lat.toString() : ''); setManualLng(location ? location.lng.toString() : '');
    const saved = p?.cropAllocations ?? [];
    setSelectedCrops(saved.map(item => item.crop));
    setAllocations(Object.fromEntries(saved.map(item => [item.crop, String(item.hectares)])));
    setPreviousCrops(p?.previousCrops ?? (p?.previousCrop ? [p.previousCrop] : [])); setIrrigated(p?.irrigationAvailable ?? false); setError('');
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
  const reset = () => { setRotation(['', '', '']); setIrrigationMm(''); setSoilType(template.soilType); setEditingId(undefined); setQuery(''); setPlace(null); setManualLat(''); setManualLng(''); setName(''); setProducer(''); setArea(''); setSelectedCrops([]); setAllocations({}); setPreviousCrops([]); setPreviousCropQuery(''); setIrrigated(false); setError(''); };
  const validateManualCoordinates = () => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!manualLat.trim() || !manualLng.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || !isWithinArgentina(lat, lng)) {
      setError(es ? 'Las coordenadas no son válidas o están fuera del territorio argentino.' : 'Coordinates are invalid or outside Argentina.');
      setPlace(null);
      return;
    }
    const selectedPlace = { name: es ? 'Coordenadas ingresadas' : 'Entered coordinates', province: 'Argentina', lat, lng };
    setPlace(selectedPlace);
    setQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setPlaces([]);
    setError('');
  };
  const toggleCrop = (crop: string) => {
    if (selectedCrops.includes(crop)) {
      setSelectedCrops(selectedCrops.filter(item => item !== crop));
      setAllocations(({ [crop]: _removed, ...rest }) => rest);
    } else if (canAddMagypCrop(selectedCrops, crop)) {
      const next = removeConflictingMagypCrops(selectedCrops, crop);
      setSelectedCrops(next);
      setAllocations(current => Object.fromEntries(Object.entries(current).filter(([item]) => next.includes(item))));
    }
  };
  const togglePreviousCrop = (crop: string) => {
    if (previousCrops.includes(crop)) setPreviousCrops(previousCrops.filter(item => item !== crop));
    else if (canAddMagypCrop(previousCrops, crop)) setPreviousCrops(removeConflictingMagypCrops(previousCrops, crop));
  };
  const changeAreaUnit = (nextUnit: 'ha' | 'm2') => {
    if (nextUnit === areaUnit) return;
    const factor = nextUnit === 'm2' ? 10000 : 0.0001;
    setArea(value => value ? String(Number(value) * factor) : value);
    setAllocations(current => Object.fromEntries(Object.entries(current).map(([crop, value]) => [crop, value ? String(Number(value) * factor) : value])));
    setAreaUnit(nextUnit);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const assigned = selectedCrops.map(crop => ({ crop, hectares: Number(allocations[crop] || 0) * (areaUnit === 'm2' ? 0.0001 : 1) }));
    const farmName = name.trim() || (es ? "Mi establecimiento" : "My Farm");
    if (!place || !isWithinArgentina(place.lat, place.lng)) return setError(es ? 'Buscá una localidad en OpenStreetMap o validá coordenadas dentro de Argentina.' : 'Search OpenStreetMap or validate coordinates within Argentina.');
    if (!Number.isFinite(totalHa) || totalHa <= 0) return setError(es ? 'La superficie total debe ser mayor que cero.' : 'Total area must be greater than zero.');
    if (!assigned.length) return setError(es ? 'Seleccioná al menos un cultivo actual.' : 'Select at least one current crop.');
    if (assigned.some(item => !Number.isFinite(item.hectares) || item.hectares <= 0)) return setError(es ? 'Completá la superficie asignada de cada cultivo.' : 'Enter each crop area.');
    if (assigned.reduce((sum, item) => sum + item.hectares, 0) > totalHa + 1e-8) return setError(es ? 'La superficie asignada supera la superficie total de la estancia.' : 'Allocated crop area exceeds farm area.');
    if (rotation.some(Boolean) && (!rotation[0] || !rotation[1])) return setError('Completá las primeras dos campañas o dejá toda la rotación sin declarar.');
    if (irrigationMm !== '' && (!Number.isFinite(Number(irrigationMm)) || Number(irrigationMm) < 0)) return setError('El volumen de riego debe ser finito y no negativo.');
    const currentRotation = rotation.filter(Boolean).map(value => ({ primary: value.split('+')[0] as CropId, ...(value.includes('+') ? { secondary: 'soja2' as const } : {}) }));
    const region = determineRegion(place.lat, place.lng); const basin = determineBasin(place.lat, place.lng);
    onSave({ ...template, ...selectedFarm?.profile, soilType, currentRotation: currentRotation.length ? currentRotation : undefined, maxMonthlyIrrigationMm: irrigationMm === '' ? undefined : Number(irrigationMm), producerName: producer.trim() || undefined, location: { ...template.location, name: farmName, province: place.province, region, lat: place.lat, lng: place.lng, basinId: basin.id, basinName: basin.name, mainRiver: basin.mainRiver, aquifer: basin.aquifer }, fieldSizeHectares: totalHa, cropAllocations: assigned, currentCrop: cropToMain(selectedCrops[0] ?? ''), previousCrop: previousCrops[0] || undefined, previousCrops: previousCrops.length ? previousCrops : undefined, irrigationAvailable: irrigated, irrigation: irrigated ? template.irrigation : 'dryland' }, editingId);
    reset();
  };

  const inputClass = 'mt-1.5 w-full border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-[#0f3260] focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
  return <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" onClick={onClose}>
    <div className="max-h-[94vh] max-w-4xl flex w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-[#171719]" onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-7 dark:border-zinc-700"><div><h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950 dark:text-white"><span className="text-[#0f3260] dark:text-sky-300">◧</span>{es ? 'Mis estancias' : 'My farms'}</h2><p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-zinc-400">{es ? 'Gestioná tus estancias registradas.' : 'Manage your registered farms.'}</p></div><button type="button" onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'} className="ml-4 text-xl text-slate-500">×</button></div>
      <div className="grid min-h-0 overflow-y-auto md:grid-cols-[190px_1fr]">
        <aside className="space-y-2 border-b border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-[#171719] md:border-b-0 md:border-r"><div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#17385f] dark:text-zinc-300">{es ? 'Estancias registradas' : 'Registered farms'}</div>
          {farms.map(farm => <div key={farm.id} className="flex items-center gap-1"><button type="button" onClick={() => onSelect(farm)} className={`min-w-0 flex-1 truncate border px-2 py-2 text-left text-xs ${farm.id === activeFarmId ? 'border-[#0f3260] bg-blue-50 font-bold text-[#0f3260] dark:bg-blue-950/40 dark:text-sky-300' : 'border-slate-200 dark:border-zinc-700'}`}>{farm.profile.location.name}</button><button type="button" title={es ? 'Editar' : 'Edit'} onClick={() => setEditingId(farm.id)} className="border border-slate-200 px-2 py-2 text-xs dark:border-zinc-700">✎</button><button type="button" title={es ? 'Eliminar' : 'Delete'} onClick={() => onDelete(farm)} className="border border-slate-200 px-2 py-2 text-xs text-rose-600 dark:border-zinc-700">×</button></div>)}
          <button type="button" onClick={reset} className="w-full border border-[#0f3260] px-3 py-2.5 text-xs font-bold text-[#0f3260] dark:text-sky-300">+ {es ? 'Nueva estancia' : 'New farm'}</button><a className="block pt-2 text-[10px] text-slate-500 underline" href="https://datosestimaciones.magyp.gob.ar/reportes.php?reporte=Estimaciones" target="_blank" rel="noreferrer">MAGyP · {es ? 'catálogo oficial' : 'official catalogue'}</a>
        </aside>
        <form onSubmit={submit} className="space-y-4 p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-[11px] font-bold uppercase tracking-wider text-[#17385f] dark:text-zinc-200">{es ? 'Productor (opcional)' : 'Producer (optional)'}<input value={producer} onChange={e => setProducer(e.target.value)} className={inputClass} /></label><label className="block text-[11px] font-bold uppercase tracking-wider text-[#17385f] dark:text-zinc-200">{es ? 'Nombre de la estancia (opcional)' : 'Farm name (optional)'}<input placeholder={es ? 'Mi establecimiento' : 'My Farm'} value={name} onChange={e => setName(e.target.value)} className={inputClass} /></label></div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#17385f] dark:text-zinc-200">{es ? 'Ubicación · OpenStreetMap' : 'Location · OpenStreetMap'}<input value={query} onChange={e => { setQuery(e.target.value); setPlace(null); }} placeholder={es ? 'Buscar localidad, paraje o dirección' : 'Search town or address'} className={inputClass} /></label>
          {places.length > 0 && <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-zinc-700">{places.map((item, index) => <button type="button" key={`${item.lat}-${item.lng}-${index}`} onClick={() => { setPlace(item); setQuery(`${item.name} · ${item.province}`); setManualLat(item.lat.toString()); setManualLng(item.lng.toString()); setPlaces([]); setError(''); if (!name) setName(item.name); }} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800">{item.name} · {item.province}</button>)}</div>}
          {place && <div className="font-mono text-[10px] text-slate-500">{place.lat.toFixed(5)}, {place.lng.toFixed(5)}</div>}
          <details className="border border-slate-200 p-3 dark:border-zinc-700">
            <summary className="cursor-pointer text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300">{es ? 'Ingreso manual de coordenadas' : 'Manual coordinate entry'}</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="text-[11px] text-slate-600 dark:text-zinc-400">{es ? 'Latitud' : 'Latitude'}<input type="number" step="any" value={manualLat} onChange={event => { setManualLat(event.target.value); setPlace(null); }} placeholder="-34.6037" className="mt-1 w-full border border-slate-300 px-2 py-1.5 font-mono dark:border-zinc-700 dark:bg-zinc-900" /></label>
              <label className="text-[11px] text-slate-600 dark:text-zinc-400">{es ? 'Longitud' : 'Longitude'}<input type="number" step="any" value={manualLng} onChange={event => { setManualLng(event.target.value); setPlace(null); }} placeholder="-58.3816" className="mt-1 w-full border border-slate-300 px-2 py-1.5 font-mono dark:border-zinc-700 dark:bg-zinc-900" /></label>
              <button type="button" onClick={validateManualCoordinates} className="border border-[#0f3260] px-3 py-1.5 text-xs font-bold text-[#0f3260] dark:border-sky-400 dark:text-sky-300">{es ? 'Validar' : 'Validate'}</button>
            </div>
            {place && <p role="status" className="mt-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{es ? 'Coordenadas validadas dentro del territorio argentino.' : 'Coordinates validated within Argentina.'}</p>}
          </details>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><label className="text-xs">{es ? 'Superficie total' : 'Total area'}<input type="number" min="0.01" step="any" required value={area} onChange={e => setArea(e.target.value)} className={inputClass} /></label><label className="text-xs">{es ? 'Unidad' : 'Unit'}<select value={areaUnit} onChange={e => changeAreaUnit(e.target.value as 'ha' | 'm2')} className={inputClass}><option value="ha">hectáreas</option><option value="m2">m²</option></select></label></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="space-y-2"><label className="block text-[11px] font-bold uppercase tracking-wider text-[#17385f] dark:text-zinc-200">{es ? 'Cultivos anteriores (opcional)' : 'Previous crops (optional)'}<input value={previousCropQuery} onChange={e => setPreviousCropQuery(e.target.value)} placeholder={es ? 'Filtrar cultivos anteriores' : 'Filter previous crops'} className={inputClass} /></label><div className="max-h-44 overflow-y-auto border border-slate-200 p-2 dark:border-zinc-700"><div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">{visiblePreviousCrops.map(crop => <label key={crop} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={previousCrops.includes(crop)} onChange={() => togglePreviousCrop(crop)} /><span>{crop}</span></label>)}</div></div><p className="text-[10px] text-slate-500">{es ? 'Opcional. Podés seleccionar más de uno.' : 'Optional. Select more than one if needed.'}</p></section>
            <section className="space-y-2"><label className="block text-[11px] font-bold uppercase tracking-wider text-[#17385f] dark:text-zinc-200">{es ? 'Cultivos actuales' : 'Current crops'}<input value={cropQuery} onChange={e => setCropQuery(e.target.value)} placeholder={es ? 'Filtrar cultivos actuales' : 'Filter current crops'} className={inputClass} /></label><div className="max-h-44 overflow-y-auto border border-slate-200 p-2 dark:border-zinc-700"><div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">{visibleCrops.map(crop => <div key={crop} className="flex min-w-0 items-center gap-2 text-xs"><label className="flex min-w-0 flex-1 items-center gap-2"><input type="checkbox" checked={selectedCrops.includes(crop)} onChange={() => toggleCrop(crop)} /><span className="min-w-0 truncate">{crop}</span></label>{selectedCrops.includes(crop) && <input aria-label={`${es ? 'Superficie' : 'Area'} ${crop}`} type="number" min="0.01" step="any" value={allocations[crop] ?? ''} onChange={e => setAllocations({ ...allocations, [crop]: e.target.value })} className="w-20 border border-slate-300 px-1.5 py-1 text-[10px] dark:border-zinc-700 dark:bg-zinc-900" />}</div>)}</div></div><p className="text-[10px] text-slate-500">{es ? 'Los cultivos “total” agrupan sus variantes.' : '“Total” crops include their variants.'}</p></section>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3"><span className={`text-xs ${selectedCrops.reduce((sum, crop) => sum + Number(allocations[crop] || 0) * (areaUnit === 'm2' ? 0.0001 : 1), 0) > totalHa ? 'text-rose-600' : 'text-slate-500'}`}>{es ? 'Asignado' : 'Allocated'}: {selectedCrops.reduce((sum, crop) => sum + Number(allocations[crop] || 0) * (areaUnit === 'm2' ? 0.0001 : 1), 0).toFixed(2)} / {Number.isFinite(totalHa) ? totalHa.toFixed(2) : '0'} ha</span></div>
          <section className="space-y-2 border-t border-slate-200 pt-3 text-xs">
            <strong>{es ? 'Rotación actual o habitual (opcional, en orden de campañas)' : 'Current or usual rotation (optional, campaign order)'}</strong>
            <p>{es ? 'Declaración de una secuencia a comparar en este lote; no se infiere de las hectáreas de cultivos actuales. Se evalúa con el mismo calendario nominal que las alternativas.' : 'Declared sequence for this field; not inferred from current crop areas. Evaluated on the same nominal calendar as alternatives.'}</p>
            <div className="grid gap-2 sm:grid-cols-3">{rotation.map((value, i) => <label key={i}>{es ? 'Campaña' : 'Campaign'} {i + 1}<select aria-label={'Rotación campaña ' + (i + 1)} value={value} onChange={e => setRotation(rotation.map((r, j) => i === j ? e.target.value : r))} className={inputClass}><option value="">{es ? 'Sin declarar' : 'Not declared'}</option>{(['soja1', 'maiz', 'trigo', 'girasol', 'sorgo'] as CropId[]).map(c => <option key={c} value={c}>{CROP_AGRONOMY[c].nameEs}</option>)}<option value="trigo+soja2">Trigo + soja de segunda</option></select></label>)}</div>
            <label className="block">{es ? 'Tipo de suelo' : 'Soil type'}<select aria-label="Tipo de suelo" value={soilType} onChange={e => setSoilType(e.target.value as FarmProfile['soilType'])} className={inputClass}><option value="mollisol_deep">Molisol profundo</option><option value="sandy_loam">Franco arenoso</option><option value="clay_vertisol">Vertisol arcilloso</option><option value="aridisol_calcareous">Aridisol calcáreo</option></select></label>
            <label className="block"><input type="checkbox" checked={irrigated} onChange={e => setIrrigated(e.target.checked)} /> {es ? 'Riego disponible' : 'Irrigation available'}</label>
            {irrigated && <label className="block">{es ? 'Tope de riego declarado (mm/mes, opcional)' : 'Declared irrigation limit (mm/month, optional)'}<input aria-label="Tope de riego mm/mes" type="number" min="0" step="any" value={irrigationMm} onChange={e => setIrrigationMm(e.target.value)} className={inputClass} /></label>}
          </section>
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-zinc-700"><button type="button" onClick={onClose} className="border border-slate-300 px-3 py-2 text-xs dark:border-zinc-700">{es ? 'Cerrar' : 'Close'}</button><button type="submit" className="bg-[#0f3260] px-4 py-2 text-xs font-bold text-white">{es ? 'Guardar estancia' : 'Save farm'}</button></div>
        </form>
      </div>
    </div>
  </div>;
};
