import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FarmLocation } from '../types';
import { determineBasin, determineRegion, isWithinArgentina } from '../services/geo';
import { GoogleIcon } from './GoogleIcon';

interface LocationSuggestion {
  displayName: string;
  shortName: string;
  province: string;
  lat: number;
  lng: number;
}

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

interface EditFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: FarmLocation;
  onSaveLocation: (updatedLocation: FarmLocation) => void;
  lang: 'es' | 'en';
}

export const EditFarmModal: React.FC<EditFarmModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSaveLocation,
  lang
}) => {
  const [farmName, setFarmName] = useState(currentLocation.name);
  const [addressQuery, setAddressQuery] = useState('');
  const [customLat, setCustomLat] = useState(currentLocation.lat.toString());
  const [customLng, setCustomLng] = useState(currentLocation.lng.toString());
  const [detectedProvince, setDetectedProvince] = useState(currentLocation.province);
  const [showCoordsToggle, setShowCoordsToggle] = useState(false);

  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [coordAnimated, setCoordAnimated] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFarmName(currentLocation.name);
      setCustomLat(currentLocation.lat.toString());
      setCustomLng(currentLocation.lng.toString());
      setDetectedProvince(currentLocation.province);
      setAddressQuery('');
      setErrorMessage(null);
      setShowDropdown(false);
    }
  }, [isOpen, currentLocation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const flashCoordinates = () => {
    setCoordAnimated(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCoordAnimated(true);
        setTimeout(() => setCoordAnimated(false), 1400);
      });
    });
  };

  const handleAddressInputChange = (value: string) => {
    setAddressQuery(value);
    setErrorMessage(null);

    const clean = value.trim().toLowerCase();
    if (clean.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const localMatches = LOCAL_SUGGESTIONS.filter(
      (item) =>
        item.shortName.toLowerCase().includes(clean) ||
        item.displayName.toLowerCase().includes(clean) ||
        item.province.toLowerCase().includes(clean)
    ).slice(0, 5);

    setSuggestions(localMatches);
    setShowDropdown(localMatches.length > 0);

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
        // Silent fallback
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = (item: LocationSuggestion) => {
    setAddressQuery(item.shortName);
    setCustomLat(item.lat.toString());
    setCustomLng(item.lng.toString());
    setDetectedProvince(item.province);
    setShowDropdown(false);
    setErrorMessage(null);
    flashCoordinates();
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
      return;
    }
    const clean = addressQuery.trim().toLowerCase();
    if (!clean) return;

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

  // Live coordinates parsing and territory validation
  const parsedLat = parseFloat(customLat.trim());
  const parsedLng = parseFloat(customLng.trim());
  const hasPlace = customLat.trim() !== '' && customLng.trim() !== '' && !isNaN(parsedLat) && !isNaN(parsedLng);
  const isInArgentina = hasPlace && isWithinArgentina(parsedLat, parsedLng);
  const isInvalidTerritory = hasPlace && !isInArgentina;
  const isLocationValid = hasPlace && isInArgentina;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLocationValid) return;

    const validLat = parsedLat;
    const validLng = parsedLng;

    const finalName = farmName.trim() || (lang === 'es' ? 'Mi establecimiento' : 'My Farm');
    const region = determineRegion(validLat, validLng);
    const basin = determineBasin(validLat, validLng);

    onSaveLocation({
      ...currentLocation,
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

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0f3260] dark:bg-[#070e1b] text-white px-4 py-3 flex items-center justify-between border-b border-[#092040] dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <GoogleIcon name="edit" className="text-white" size={16} />
            <h3 className="font-bold text-xs uppercase tracking-wider">
              {lang === 'es' ? 'Editar Establecimiento' : 'Edit Farm Information'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <GoogleIcon name="close" size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Farm Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
              {lang === 'es' ? 'Nombre del establecimiento' : 'Farm Name'}
            </label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder={lang === 'es' ? 'Mi establecimiento' : 'My Farm'}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0f3260] dark:focus:border-sky-500"
            />
          </div>

          {/* Address / Town with live suggestions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
              {lang === 'es' ? 'Dirección o Localidad' : 'Address or Locality'}
            </label>
            <div className="flex items-center gap-1.5 relative">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => handleAddressInputChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  placeholder={lang === 'es' ? 'Escribí una ciudad o pueblo (ej: Junín, Pergamino...)' : 'Type town or address...'}
                  autoComplete="off"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0f3260] dark:focus:border-sky-500"
                />
                {isLoadingSuggestions && (
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-mono">
                    ...
                  </span>
                )}
              </div>

              {/* GPS button - ONLY icon */}
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isLocating}
                title={lang === 'es' ? 'Detectar por GPS' : 'Detect with GPS'}
                aria-label={lang === 'es' ? 'Detectar por GPS' : 'Detect with GPS'}
                className="h-8.5 w-8.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#0f3260] hover:text-white dark:hover:bg-slate-700 text-[#0f3260] dark:text-sky-400 border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                <GoogleIcon name={isLocating ? 'sync' : 'my_location'} size={16} className={isLocating ? 'animate-spin' : ''} />
              </button>

              {/* Coordinates button - same style as GPS button, immediately left of search */}
              <button
                type="button"
                onClick={() => setShowCoordsToggle(!showCoordsToggle)}
                title={lang === 'es' ? 'Ingreso manual de coordenadas' : 'Manual coordinate entry'}
                aria-label={lang === 'es' ? 'Ingreso manual de coordenadas' : 'Manual coordinate entry'}
                className={`h-8.5 w-8.5 flex items-center justify-center transition-colors shrink-0 cursor-pointer border ${
                  showCoordsToggle
                    ? 'bg-[#0f3260] text-white border-[#0f3260] dark:bg-slate-700 dark:border-slate-500'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-[#0f3260] hover:text-white dark:hover:bg-slate-700 text-[#0f3260] dark:text-sky-400 border-slate-300 dark:border-slate-600'
                }`}
              >
                <GoogleIcon name="pin_drop" size={16} />
              </button>

              {/* Search button - ONLY icon */}
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                disabled={!addressQuery.trim()}
                title={lang === 'es' ? 'Buscar localidad' : 'Search locality'}
                aria-label={lang === 'es' ? 'Buscar localidad' : 'Search locality'}
                className="h-8.5 w-8.5 bg-[#0f3260] hover:bg-[#17437e] text-white border border-[#0f3260] flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-40"
              >
                <GoogleIcon name="search" size={16} />
              </button>
            </div>

            {/* Dropdown Suggestions */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <button
                    key={`${item.shortName}-${item.lat}-${idx}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3 py-2 hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                  >
                    <div className="truncate min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#0f3260] dark:group-hover:text-sky-400">
                        {item.shortName}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5 truncate">
                        {item.displayName}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 shrink-0 border border-slate-200 dark:border-slate-700">
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
                <div className="p-3 bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#0f3260] dark:text-sky-400 uppercase tracking-wider">
                      {lang === 'es' ? 'Ingreso manual de coordenadas' : 'Manual coordinate entry'}
                    </span>
                    {coordAnimated && (
                      <span className="text-[11px] font-semibold text-[#0f3260] dark:text-sky-400 flex items-center gap-1 animate-pulse">
                        <GoogleIcon name="check" size={13} />
                        {lang === 'es' ? 'Actualizadas' : 'Updated'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">
                        {lang === 'es' ? 'Latitud' : 'Latitude'}
                      </span>
                      <input
                        type="text"
                        value={customLat}
                        placeholder="-34.6037"
                        onChange={(e) => {
                          setCustomLat(e.target.value);
                          setErrorMessage(null);
                        }}
                        className={`w-full px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none transition-all duration-500 ${
                          coordAnimated
                            ? 'border-2 border-[#0f3260] dark:border-sky-400 bg-blue-50/90 dark:bg-blue-950/60 ring-2 ring-[#0f3260]/30 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-[#0f3260] dark:focus:border-sky-500'
                        }`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">
                        {lang === 'es' ? 'Longitud' : 'Longitude'}
                      </span>
                      <input
                        type="text"
                        value={customLng}
                        placeholder="-58.3816"
                        onChange={(e) => {
                          setCustomLng(e.target.value);
                          setErrorMessage(null);
                        }}
                        className={`w-full px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none transition-all duration-500 ${
                          coordAnimated
                            ? 'border-2 border-[#0f3260] dark:border-sky-400 bg-blue-50/90 dark:bg-blue-950/60 ring-2 ring-[#0f3260]/30 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-[#0f3260] dark:focus:border-sky-500'
                        }`}
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {lang === 'es'
                      ? 'Ingresá coordenadas en grados decimales (ej: Latitud -34.6037, Longitud -58.3816).'
                      : 'Enter coordinates in decimal degrees (e.g. Lat -34.6037, Long -58.3816).'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Territorial and Coordinate Validation Feedback */}
          {isInvalidTerritory && (
            <div className="p-2.5 border text-xs flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200">
              <GoogleIcon name="error" size={16} className="text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  {lang === 'es' ? 'Ubicación fuera de Argentina' : 'Location outside Argentina'}
                </span>
                <span className="text-[11px] leading-relaxed block">
                  {lang === 'es'
                    ? 'Las coordenadas ingresadas no corresponden al territorio argentino (Continental, Islas Malvinas o Antártida).'
                    : 'Coordinates must be within Argentine territory (Continental, Malvinas/Falklands, or Antarctica).'}
                </span>
              </div>
            </div>
          )}

          {!hasPlace && (
            <div className="p-2.5 border text-xs flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              <GoogleIcon name="warning" size={16} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  {lang === 'es' ? 'Ubicación requerida' : 'Location required'}
                </span>
                <span className="text-[11px] leading-relaxed block">
                  {lang === 'es'
                    ? 'Debes ingresar coordenadas geodésicas válidas (latitud y longitud).'
                    : 'You must enter valid geographic coordinates (latitude and longitude).'}
                </span>
              </div>
            </div>
          )}

          {isLocationValid && (
            <div className="p-2 border text-xs flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
              <GoogleIcon name="check_circle" size={14} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span className="font-medium text-[11px]">
                {lang === 'es' ? 'Coordenadas validadas en territorio argentino' : 'Coordinates validated within Argentine territory'}
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-2 border text-xs flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300">
              <GoogleIcon name="error" size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
            <button
              type="submit"
              disabled={!isLocationValid}
              className={`px-5 py-2 text-xs font-bold border transition-all ${
                isLocationValid
                  ? 'bg-[#0f3260] hover:bg-[#17437e] text-white border-[#0f3260] cursor-pointer shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-50'
              }`}
            >
              {lang === 'es' ? 'Guardar Cambios' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
