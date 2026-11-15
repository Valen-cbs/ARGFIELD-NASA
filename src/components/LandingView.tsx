import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FarmLocation } from '../types';
import { determineBasin, determineRegion, isWithinArgentina } from '../services/geo';
import { FlagIcon } from './FlagIcon';
import { GoogleIcon } from './GoogleIcon';

interface LandingViewProps {
  onConfirmLocation: (location: FarmLocation) => void;
  currentLocation: FarmLocation;
  lang: 'es' | 'en';
}

interface LocationSuggestion {
  displayName: string;
  shortName: string;
  province: string;
  lat: number;
  lng: number;
}

// Built-in list of prominent Argentine agricultural and urban hubs for instant zero-latency suggestions
const LOCAL_SUGGESTIONS: LocationSuggestion[] = [
  { shortName: 'Buenos Aires', displayName: 'Ciudad Autónoma de Buenos Aires', province: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  { shortName: 'Pergamino', displayName: 'Pergamino, Núcleo Agrícola', province: 'Buenos Aires', lat: -33.8940, lng: -60.5730 },
  { shortName: 'Junín', displayName: 'Junín, Zona Núcleo', province: 'Buenos Aires', lat: -34.5830, lng: -60.9500 },
  { shortName: 'Tandil', displayName: 'Tandil, Sudeste Bonaerense', province: 'Buenos Aires', lat: -37.3210, lng: -59.1330 },
  { shortName: 'Balcarce', displayName: 'Balcarce, Cuenca Mar y Sierras', province: 'Buenos Aires', lat: -37.8470, lng: -58.2550 },
  { shortName: 'Trenque Lauquen', displayName: 'Trenque Lauquen, Oeste Arenoso', province: 'Buenos Aires', lat: -35.9750, lng: -62.7340 },
  { shortName: 'Bahía Blanca', displayName: 'Bahía Blanca, Sudoeste Bonaerense', province: 'Buenos Aires', lat: -38.7183, lng: -62.2660 },
  { shortName: 'Necochea', displayName: 'Necochea, Costa Agrícola', province: 'Buenos Aires', lat: -38.5545, lng: -58.7396 },
  { shortName: 'Tres Arroyos', displayName: 'Tres Arroyos, Zona Triguera', province: 'Buenos Aires', lat: -38.3750, lng: -60.2790 },
  { shortName: 'Chivilcoy', displayName: 'Chivilcoy, Pampa Húmeda', province: 'Buenos Aires', lat: -34.8980, lng: -60.0170 },
  { shortName: '9 de Julio', displayName: '9 de Julio, Pampa Interior', province: 'Buenos Aires', lat: -35.4440, lng: -60.8830 },
  { shortName: 'Pehuajó', displayName: 'Pehuajó, Pampa Deprimida', province: 'Buenos Aires', lat: -35.8110, lng: -61.8960 },
  { shortName: 'Lincoln', displayName: 'Lincoln, Cuenca del Salado', province: 'Buenos Aires', lat: -34.8660, lng: -61.5300 },
  { shortName: 'Rosario', displayName: 'Rosario, Polo Agroexportador', province: 'Santa Fe', lat: -32.9468, lng: -60.6393 },
  { shortName: 'Venado Tuerto', displayName: 'Venado Tuerto, Núcleo Sur', province: 'Santa Fe', lat: -33.7460, lng: -61.9680 },
  { shortName: 'Rafaela', displayName: 'Rafaela, Cuenca Lechera', province: 'Santa Fe', lat: -31.2500, lng: -61.4860 },
  { shortName: 'Santa Fe', displayName: 'Santa Fe de la Vera Cruz', province: 'Santa Fe', lat: -31.6333, lng: -60.7000 },
  { shortName: 'Reconquista', displayName: 'Reconquista, Norte Santafesino', province: 'Santa Fe', lat: -29.1500, lng: -59.6500 },
  { shortName: 'Córdoba', displayName: 'Córdoba Capital, Centro', province: 'Córdoba', lat: -31.4201, lng: -64.1888 },
  { shortName: 'Río Cuarto', displayName: 'Río Cuarto, Zona Maicera', province: 'Córdoba', lat: -33.1300, lng: -64.3490 },
  { shortName: 'Marcos Juárez', displayName: 'Marcos Juárez, Núcleo Cordobés', province: 'Córdoba', lat: -32.6960, lng: -62.1060 },
  { shortName: 'Villa María', displayName: 'Villa María, Cuenca Central', province: 'Córdoba', lat: -32.4080, lng: -63.2400 },
  { shortName: 'San Francisco', displayName: 'San Francisco, Este Cordobés', province: 'Córdoba', lat: -31.4330, lng: -62.0830 },
  { shortName: 'Paraná', displayName: 'Paraná, Margen del Río Paraná', province: 'Entre Ríos', lat: -31.7319, lng: -60.5238 },
  { shortName: 'Gualeguaychú', displayName: 'Gualeguaychú, Cuenca Río Uruguay', province: 'Entre Ríos', lat: -33.0100, lng: -58.5170 },
  { shortName: 'Concordia', displayName: 'Concordia, Costa del Uruguay', province: 'Entre Ríos', lat: -31.3930, lng: -58.0200 },
  { shortName: 'Victoria', displayName: 'Victoria, Delta Entrerriano', province: 'Entre Ríos', lat: -32.6180, lng: -60.1570 },
  { shortName: 'Resistencia', displayName: 'Resistencia, Cuenca Paraná', province: 'Chaco', lat: -27.4514, lng: -58.9867 },
  { shortName: 'Presidencia Roque Sáenz Peña', displayName: 'Sáenz Peña, Zona Algodonera', province: 'Chaco', lat: -26.7850, lng: -60.4380 },
  { shortName: 'Charata', displayName: 'Charata, Sudoeste Chaqueño', province: 'Chaco', lat: -27.2140, lng: -61.1880 },
  { shortName: 'Posadas', displayName: 'Posadas, Alto Paraná', province: 'Misiones', lat: -27.3620, lng: -55.9000 },
  { shortName: 'Salta', displayName: 'Salta Capital, Valle de Lerma', province: 'Salta', lat: -24.7859, lng: -65.4117 },
  { shortName: 'San Miguel de Tucumán', displayName: 'Tucumán, Cuenca Salí-Dulce', province: 'Tucumán', lat: -26.8241, lng: -65.2226 },
  { shortName: 'Santiago del Estero', displayName: 'Santiago del Estero Capital', province: 'Santiago del Estero', lat: -27.7951, lng: -64.2615 },
  { shortName: 'Santa Rosa', displayName: 'Santa Rosa, Pampa Semiárida', province: 'La Pampa', lat: -36.6167, lng: -64.2833 },
  { shortName: 'General Pico', displayName: 'General Pico, Norte Pampeano', province: 'La Pampa', lat: -35.6560, lng: -63.7560 },
  { shortName: 'Mendoza', displayName: 'Mendoza Capital, Cuyo Oasis', province: 'Mendoza', lat: -32.8895, lng: -68.8458 },
  { shortName: 'San Juan', displayName: 'San Juan Capital, Valle de Tulum', province: 'San Juan', lat: -31.5375, lng: -68.5364 },
  { shortName: 'Neuquén', displayName: 'Neuquén, Alto Valle', province: 'Neuquén', lat: -38.9516, lng: -68.0591 }
];

export const LandingView: React.FC<LandingViewProps> = ({
  onConfirmLocation,
  currentLocation,
  lang
}) => {
  const [farmName, setFarmName] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [detectedProvince, setDetectedProvince] = useState('');
  const [showCoordsToggle, setShowCoordsToggle] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Animation trigger on coordinate inputs
  const [coordAnimated, setCoordAnimated] = useState(false);

  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Trigger pulse/highlight animation on coordinate fields
  const flashCoordinates = () => {
    setCoordAnimated(false);
    // double RAF to ensure animation restarts smoothly
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCoordAnimated(true);
        setTimeout(() => {
          setCoordAnimated(false);
        }, 1400);
      });
    });
  };

  // Autocomplete live suggestion handler
  const handleAddressInputChange = (value: string) => {
    setAddressQuery(value);
    setErrorMessage(null);

    const clean = value.trim().toLowerCase();
    if (clean.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // 1. Instant local filter
    const localMatches = LOCAL_SUGGESTIONS.filter(
      (item) =>
        item.shortName.toLowerCase().includes(clean) ||
        item.displayName.toLowerCase().includes(clean) ||
        item.province.toLowerCase().includes(clean)
    ).slice(0, 5);

    setSuggestions(localMatches);
    setShowDropdown(localMatches.length > 0);

    // 2. Debounced query to OpenStreetMap Nominatim for additional real addresses / towns
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            value
          )}&countrycodes=ar&limit=5&addressdetails=1`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const apiSuggestions: LocationSuggestion[] = data.map((item: any) => {
              const addr = item.address || {};
              const state = addr.state || addr.province || addr.county || 'Argentina';
              const name = addr.city || addr.town || addr.village || addr.suburb || item.display_name.split(',')[0];
              return {
                shortName: name,
                displayName: item.display_name.split(',').slice(0, 3).join(','),
                province: state,
                lat: Number(parseFloat(item.lat).toFixed(4)),
                lng: Number(parseFloat(item.lon).toFixed(4))
              };
            });

            // Merge local and API suggestions deduplicating by approximate coordinates
            const combined = [...localMatches];
            for (const apiItem of apiSuggestions) {
              const exists = combined.some(
                (c) => Math.abs(c.lat - apiItem.lat) < 0.05 && Math.abs(c.lng - apiItem.lng) < 0.05
              );
              if (!exists) {
                combined.push(apiItem);
              }
            }

            setSuggestions(combined.slice(0, 6));
            setShowDropdown(combined.length > 0);
          }
        }
      } catch {
        // Silently fall back to local suggestions if offline or aborted
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);
  };

  // User selects a suggestion
  const handleSelectSuggestion = (item: LocationSuggestion) => {
    setAddressQuery(item.shortName);
    setCustomLat(item.lat.toString());
    setCustomLng(item.lng.toString());
    setDetectedProvince(item.province);
    setShowDropdown(false);
    setErrorMessage(null);
    flashCoordinates();
  };

  // Direct search button or enter key
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
      return;
    }
    const clean = addressQuery.trim().toLowerCase();
    if (!clean) return;

    // Check local suggestions first
    const match = LOCAL_SUGGESTIONS.find(
      (item) =>
        item.shortName.toLowerCase().includes(clean) ||
        item.displayName.toLowerCase().includes(clean) ||
        item.province.toLowerCase().includes(clean)
    );
    if (match) {
      handleSelectSuggestion(match);
      return;
    }

    // Direct OSM search if not found locally
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          clean
        )}&countrycodes=ar&limit=1&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          const addr = item.address || {};
          const state = addr.state || addr.province || addr.county || 'Argentina';
          const name = addr.city || addr.town || addr.village || addr.suburb || item.display_name.split(',')[0];
          handleSelectSuggestion({
            shortName: name,
            displayName: item.display_name.split(',').slice(0, 3).join(','),
            province: state,
            lat: Number(parseFloat(item.lat).toFixed(4)),
            lng: Number(parseFloat(item.lon).toFixed(4))
          });
        } else {
          setErrorMessage(
            lang === 'es' ? 'No se encontraron resultados en Argentina para esa búsqueda.' : 'No results found in Argentina.'
          );
        }
      }
    } catch {
      setErrorMessage(
        lang === 'es' ? 'Error al buscar localidad.' : 'Error searching locality.'
      );
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Detect GPS
  const handleDetectGPS = () => {
    setIsLocating(true);
    setErrorMessage(null);

    if (!navigator.geolocation) {
      setErrorMessage(
        lang === 'es' ? 'Geolocalización no soportada por el navegador.' : 'Geolocation unsupported.'
      );
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        const region = determineRegion(lat, lng);
        const province =
          region === 'norte' ? 'Norte Argentino' : region === 'sur' ? 'Patagonia' : 'Región Pampeana';

        setAddressQuery(lang === 'es' ? 'Ubicación GPS detectada' : 'Detected GPS location');
        setCustomLat(lat.toString());
        setCustomLng(lng.toString());
        setDetectedProvince(province);
        setIsLocating(false);
        flashCoordinates();
      },
      () => {
        setIsLocating(false);
        setErrorMessage(
          lang === 'es' ? 'No se pudo obtener la posición GPS actual (permiso denegado o timeout).' : 'GPS detection failed.'
        );
      },
      { timeout: 8000 }
    );
  };

  // Live coordinates parsing and validation
  const parsedLat = parseFloat(customLat.trim());
  const parsedLng = parseFloat(customLng.trim());
  const hasPlace = customLat.trim() !== '' && customLng.trim() !== '' && !isNaN(parsedLat) && !isNaN(parsedLng);
  const isInArgentina = hasPlace && isWithinArgentina(parsedLat, parsedLng);
  const isInvalidTerritory = hasPlace && !isInArgentina;
  const isLocationValid = hasPlace && isInArgentina;

  // Submit and Enter System
  const handleStart = () => {
    if (!isLocationValid) return;

    const validLat = parsedLat;
    const validLng = parsedLng;

    const finalName = farmName.trim() || (lang === 'es' ? 'Mi establecimiento' : 'My Farm');
    const region = determineRegion(validLat, validLng);
    const basin = determineBasin(validLat, validLng);

    onConfirmLocation({
      name: finalName,
      province:
        detectedProvince ||
        (region === 'norte' ? 'Norte Argentino' : region === 'sur' ? 'Patagonia' : 'Región Pampeana'),
      region,
      lat: validLat,
      lng: validLng,
      basinId: basin.id,
      basinName: basin.name,
      mainRiver: basin.mainRiver,
      aquifer: basin.aquifer
    });
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] dark:bg-[#121212] text-slate-900 dark:text-zinc-100 flex flex-col justify-between font-sans transition-colors">
      {/* Official Header Banner */}
      <header className="bg-[#0f3260] dark:bg-[#161618] text-white px-6 py-3 border-b-2 border-[#092040] dark:border-[#2e2e33] shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black tracking-tight text-base">FIELD SHIFT</span>
            <span className="text-xs text-slate-300 dark:text-zinc-400 border-l border-slate-500 pl-3">
              NASA Space Apps Challenge
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <FlagIcon country="AR" size="xs" />
            <span className="font-mono text-slate-200 dark:text-zinc-300">AR-GRID</span>
          </div>
        </div>
      </header>

      {/* Main Single Block / Box */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 w-full my-auto">
        <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] p-6 sm:p-8 space-y-6 rounded-none shadow-xs transition-colors">
          {/* Header section inside the single block */}
          <div className="border-b border-slate-200 dark:border-[#2e2e33] pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <GoogleIcon name="map" className="text-[#0f3260] dark:text-zinc-200" size={22} />
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                {lang === 'es' ? 'Localización del Lote' : 'Farm Location Setup'}
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              {lang === 'es'
                ? 'El sistema utiliza observaciones satelitales de humedad (NASA SMAP / CONAE SAOCOM) y precipitaciones para calcular estrategias de rotación adaptadas a tu cuenca.'
                : 'The system uses satellite moisture and precipitation data to calculate crop rotation strategies adapted to your local basin.'}
            </p>
          </div>

          {/* Form Fields inside the block */}
          <div className="space-y-5">
            {/* Field: Farm Name (Optional) */}
            <div>
              <label
                htmlFor="farm-name-input"
                className="text-xs font-bold text-slate-800 dark:text-zinc-200 block uppercase tracking-wider mb-1.5"
              >
                {lang === 'es' ? 'Nombre del campo' : 'Farm Name'}
                <span className="text-slate-500 dark:text-zinc-400 font-normal lowercase ml-1.5">
                  ({lang === 'es' ? 'opcional' : 'optional'})
                </span>
              </label>
              <input
                id="farm-name-input"
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder={lang === 'es' ? 'Mi establecimiento' : 'My Farm'}
                className="w-full bg-slate-50 dark:bg-[#232326] border border-slate-300 dark:border-[#333336] px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#0f3260] dark:focus:border-zinc-400 focus:bg-white dark:focus:bg-[#232326] transition-colors"
              />
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                {lang === 'es'
                  ? 'Si no ingresás un nombre, se registrará como "Mi establecimiento".'
                  : 'If left empty, it will default to "My Farm".'}
              </p>
            </div>

            {/* Address / Locality Search with Live Suggestions */}
            <div className="pt-2 border-t border-slate-100 dark:border-[#2e2e33] space-y-1.5 relative" ref={dropdownRef}>
              <label
                htmlFor="landing-address-input"
                className="text-xs font-bold text-slate-800 dark:text-zinc-200 block uppercase tracking-wider"
              >
                {lang === 'es' ? 'Dirección o Localidad' : 'Address or Locality'}
              </label>
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 relative">
                <div className="relative flex-1">
                  <input
                    id="landing-address-input"
                    type="text"
                    value={addressQuery}
                    onChange={(e) => handleAddressInputChange(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowDropdown(true);
                    }}
                    placeholder={
                      lang === 'es'
                        ? 'Escribí una ciudad, pueblo o paraje (ej: Junín, Pergamino, Rosario...)'
                        : 'Type a town, city or address...'
                    }
                    autoComplete="off"
                    className="w-full bg-slate-50 dark:bg-[#232326] border border-slate-300 dark:border-[#333336] px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#0f3260] dark:focus:border-zinc-400 focus:bg-white dark:focus:bg-[#232326] transition-colors"
                  />
                  {isLoadingSuggestions && (
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                      ...
                    </span>
                  )}
                </div>

                {/* GPS detection button - ONLY icon */}
                <button
                  id="landing-gps-btn"
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isLocating}
                  title={lang === 'es' ? 'Detectar por GPS' : 'Detect with GPS'}
                  aria-label={lang === 'es' ? 'Detectar por GPS' : 'Detect with GPS'}
                  className="h-9 w-9 bg-slate-100 dark:bg-[#232326] hover:bg-[#0f3260] hover:text-white dark:hover:bg-[#3f3f46] text-[#0f3260] dark:text-zinc-200 border border-slate-300 dark:border-[#333336] flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <GoogleIcon name={isLocating ? 'sync' : 'my_location'} size={18} className={isLocating ? 'animate-spin' : ''} />
                </button>

                {/* Manual coordinates toggle button - same style as GPS button, immediately to the left of search */}
                <button
                  id="landing-toggle-coords-btn"
                  type="button"
                  onClick={() => setShowCoordsToggle(!showCoordsToggle)}
                  title={lang === 'es' ? 'Ingreso manual de coordenadas' : 'Manual coordinate entry'}
                  aria-label={lang === 'es' ? 'Ingreso manual de coordenadas' : 'Manual coordinate entry'}
                  className={`h-9 w-9 flex items-center justify-center transition-colors shrink-0 cursor-pointer border ${
                    showCoordsToggle
                      ? 'bg-[#0f3260] text-white border-[#0f3260] dark:bg-[#3f3f46] dark:border-[#52525b]'
                      : 'bg-slate-100 dark:bg-[#232326] hover:bg-[#0f3260] hover:text-white dark:hover:bg-[#3f3f46] text-[#0f3260] dark:text-zinc-200 border-slate-300 dark:border-[#333336]'
                  }`}
                >
                  <GoogleIcon name="pin_drop" size={18} />
                </button>

                {/* Search button - ONLY icon (lupa) */}
                <button
                  id="landing-search-address-btn"
                  type="submit"
                  disabled={!addressQuery.trim()}
                  title={lang === 'es' ? 'Buscar localidad' : 'Search locality'}
                  aria-label={lang === 'es' ? 'Buscar localidad' : 'Search locality'}
                  className="h-9 w-9 bg-[#0f3260] dark:bg-[#27272a] hover:bg-[#17437e] dark:hover:bg-[#3f3f46] text-white border border-[#0f3260] dark:border-[#3f3f46] flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-40 disabled:hover:bg-[#0f3260]"
                >
                  <GoogleIcon name="search" size={18} />
                </button>
              </form>

              {/* Suggestions Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] shadow-md divide-y divide-slate-100 dark:divide-[#2e2e33] max-h-56 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <button
                      key={`${item.shortName}-${item.lat}-${idx}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-[#27272a] flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GoogleIcon
                          name="location_on"
                          size={16}
                          className="text-[#0f3260] dark:text-zinc-300 group-hover:text-blue-700 dark:group-hover:text-white shrink-0"
                        />
                        <div className="min-w-0 truncate">
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-[#0f3260] dark:group-hover:text-white">
                            {item.shortName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 ml-1.5 truncate">
                            {item.displayName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-[#27272a] px-1.5 py-0.5 shrink-0 border border-slate-200 dark:border-[#333336]">
                        {item.lat}, {item.lng}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Coordinates Collapsible Panel with mini animation */}
            <AnimatePresence>
              {showCoordsToggle && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="p-3.5 bg-slate-50/90 dark:bg-[#1f1f22] border border-slate-200 dark:border-[#2e2e33] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#0f3260] dark:text-zinc-200 uppercase tracking-wider">
                        {lang === 'es' ? 'Ingreso manual de coordenadas' : 'Manual coordinate entry'}
                      </span>
                      {coordAnimated && (
                        <span className="text-[11px] font-semibold text-[#0f3260] dark:text-zinc-200 flex items-center gap-1 animate-pulse">
                          <GoogleIcon name="check" size={14} />
                          {lang === 'es' ? 'Actualizadas' : 'Updated'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="custom-lat-input"
                          className="text-[11px] text-slate-700 dark:text-zinc-300 block mb-1 font-medium"
                        >
                          {lang === 'es' ? 'Latitud' : 'Latitude'}
                        </label>
                        <input
                          id="custom-lat-input"
                          type="text"
                          value={customLat}
                          placeholder="-34.6037"
                          onChange={(e) => {
                            setCustomLat(e.target.value);
                            setErrorMessage(null);
                          }}
                          className={`w-full px-3 py-2 text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none transition-all duration-500 bg-white dark:bg-[#232326] border border-slate-300 dark:border-[#333336] focus:border-[#0f3260] dark:focus:border-zinc-400 ${
                            coordAnimated
                              ? 'border-2 border-[#0f3260] dark:border-zinc-300 bg-blue-50/80 dark:bg-zinc-800 ring-2 ring-[#0f3260]/30 dark:ring-zinc-400/30 shadow-xs'
                              : ''
                          }`}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="custom-lng-input"
                          className="text-[11px] text-slate-700 dark:text-zinc-300 block mb-1 font-medium"
                        >
                          {lang === 'es' ? 'Longitud' : 'Longitude'}
                        </label>
                        <input
                          id="custom-lng-input"
                          type="text"
                          value={customLng}
                          placeholder="-58.3816"
                          onChange={(e) => {
                            setCustomLng(e.target.value);
                            setErrorMessage(null);
                          }}
                          className={`w-full px-3 py-2 text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none transition-all duration-500 bg-white dark:bg-[#232326] border border-slate-300 dark:border-[#333336] focus:border-[#0f3260] dark:focus:border-zinc-400 ${
                            coordAnimated
                              ? 'border-2 border-[#0f3260] dark:border-zinc-300 bg-blue-50/80 dark:bg-zinc-800 ring-2 ring-[#0f3260]/30 dark:ring-zinc-400/30 shadow-xs'
                              : ''
                          }`}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      {lang === 'es'
                        ? 'Ingresá coordenadas en grados decimales (ej: Latitud -34.6037, Longitud -58.3816).'
                        : 'Enter coordinates in decimal degrees (e.g. Lat -34.6037, Long -58.3816).'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Territorial & Coordinate Validation Feedback */}
            {isInvalidTerritory && (
              <div className="p-3 border text-xs flex items-start gap-2.5 bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 shadow-xs">
                <GoogleIcon name="error" size={18} className="text-red-700 dark:text-red-300 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">
                    {lang === 'es' ? 'Ubicación fuera de Argentina' : 'Location outside Argentina'}
                  </span>
                  <span className="text-[11px] leading-relaxed block">
                    {lang === 'es'
                      ? 'Las coordenadas ingresadas no corresponden al territorio argentino (Continental, Islas Malvinas o Antártida). El sistema requiere un lote en Argentina para sincronizar cuencas hídricas y sensores de la NASA.'
                      : 'The entered coordinates are not within Argentine territory (Continental, Malvinas/Falklands, or Antarctica). The system requires a farm in Argentina to synchronize hydrological basins and NASA sensors.'}
                  </span>
                </div>
              </div>
            )}

            {!hasPlace && (
              <div className="p-3 border text-xs flex items-start gap-2.5 bg-slate-50 dark:bg-[#1e1e22] border-slate-200 dark:border-[#2e2e33] text-slate-700 dark:text-zinc-300">
                <GoogleIcon name="info" size={18} className="text-[#0f3260] dark:text-zinc-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-slate-800 dark:text-zinc-200">
                    {lang === 'es' ? 'Ubicación requerida' : 'Location required'}
                  </span>
                  <span className="text-[11px] leading-relaxed block text-slate-600 dark:text-zinc-400">
                    {lang === 'es'
                      ? 'Para habilitar el ingreso al sistema, buscá una localidad o ciudad argentina, activá la detección por GPS o ingresá las coordenadas geodésicas de tu establecimiento.'
                      : 'To access the system, search for an Argentine locality, detect with GPS, or enter your farm geodetic coordinates.'}
                  </span>
                </div>
              </div>
            )}

            {isLocationValid && (
              <div className="p-2.5 border text-xs flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                <GoogleIcon name="check_circle" size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span className="font-medium">
                  {lang === 'es'
                    ? 'Ubicación validada dentro del territorio argentino'
                    : 'Location validated within Argentine territory'}
                </span>
              </div>
            )}

            {/* Error Message if any other error */}
            {errorMessage && (
              <div className="p-2.5 border text-xs flex items-center gap-2 bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200">
                <GoogleIcon name="error" size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Confirmation CTA Footer inside the block */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#2e2e33] flex justify-end">
            <button
              id="landing-confirm-enter-btn"
              type="button"
              onClick={handleStart}
              disabled={!isLocationValid}
              className={`px-6 py-2.5 text-xs font-bold border flex items-center gap-2 transition-all ${
                isLocationValid
                  ? 'bg-[#0f3260] dark:bg-[#27272a] hover:bg-[#17437e] dark:hover:bg-[#3f3f46] text-white border-[#0f3260] dark:border-[#3f3f46] cursor-pointer shadow-xs'
                  : 'bg-slate-200 dark:bg-[#202023] text-slate-400 dark:text-zinc-600 border-slate-300 dark:border-[#2e2e33] cursor-not-allowed opacity-50'
              }`}
            >
              <span>{lang === 'es' ? 'Ingresar al Sistema' : 'Enter System'}</span>
              <GoogleIcon 
                name="arrow_forward" 
                className={isLocationValid ? 'text-white' : 'text-slate-400 dark:text-zinc-600'} 
                size={16} 
              />
            </button>
          </div>
        </div>
      </main>

      {/* Official Footer */}
      <footer className="border-t border-slate-300 dark:border-[#2e2e33] bg-white dark:bg-[#161618] py-3 px-6 text-center text-xs text-slate-500 dark:text-zinc-400 font-mono">
        NASA Space Apps • Argfield
      </footer>
    </div>
  );
};
