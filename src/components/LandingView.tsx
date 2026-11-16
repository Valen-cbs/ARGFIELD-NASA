import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FarmLocation, FarmProfile } from '../types';
import { determineBasin, determineRegion, isWithinArgentina } from '../services/geo';
import { MAGYP_CROPS, canAddMagypCrop, removeConflictingMagypCrops } from '../data/magypCrops';
import { FlagIcon } from './FlagIcon';
import { GoogleIcon } from './GoogleIcon';

interface LandingViewProps {
  onConfirmLocation: (location: FarmLocation, agriculturalData: Pick<FarmProfile, 'producerName' | 'fieldSizeHectares' | 'currentCrop' | 'cropAllocations' | 'previousCrop' | 'previousCrops' | 'irrigationAvailable'>) => void;
  currentLocation: FarmLocation;
  currentProfile?: FarmProfile;
  lang: 'es' | 'en';
  presentation?: 'page' | 'modal';
  submitLabel?: string;
}

interface LocationSuggestion {
  displayName: string;
  shortName: string;
  province: string;
  lat: number;
  lng: number;
}

const cropToMain = (crop: string): FarmProfile['currentCrop'] => {
  if (/soja/i.test(crop)) return 'soybean';
  if (/ma.z/i.test(crop)) return 'maize';
  if (/trigo/i.test(crop)) return 'wheat';
  if (/girasol/i.test(crop)) return 'sunflower';
  if (/sorgo/i.test(crop)) return 'sorghum';
  if (/cebada/i.test(crop)) return 'barley';
  return 'pasture';
};

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
  currentProfile,
  lang,
  presentation = 'page',
  submitLabel
}) => {
  const isModal = presentation === 'modal';
  const [farmName, setFarmName] = useState(currentProfile?.location.name ?? '');
  const [producerName, setProducerName] = useState(currentProfile?.producerName ?? '');
  const [farmArea, setFarmArea] = useState(currentProfile ? String(currentProfile.fieldSizeHectares) : '');
  const [areaUnit, setAreaUnit] = useState<'ha' | 'm2'>('ha');
  const [selectedCrops, setSelectedCrops] = useState<string[]>(currentProfile?.cropAllocations?.map(item => item.crop) ?? []);
  const [cropAllocations, setCropAllocations] = useState<Record<string, string>>(Object.fromEntries((currentProfile?.cropAllocations ?? []).map(item => [item.crop, String(item.hectares)])));
  const [previousCrops, setPreviousCrops] = useState<string[]>(currentProfile?.previousCrops ?? (currentProfile?.previousCrop ? [currentProfile.previousCrop] : []));
  const [currentCropQuery, setCurrentCropQuery] = useState('');
  const [previousCropQuery, setPreviousCropQuery] = useState('');
  const [irrigationAvailable, setIrrigationAvailable] = useState(currentProfile?.irrigationAvailable ?? false);
  const [registrationError, setRegistrationError] = useState('');
  const [addressQuery, setAddressQuery] = useState(currentProfile?.location.name ?? '');
  const [customLat, setCustomLat] = useState(currentProfile ? String(currentProfile.location.lat) : '');
  const [customLng, setCustomLng] = useState(currentProfile ? String(currentProfile.location.lng) : '');
  const [detectedProvince, setDetectedProvince] = useState(currentProfile?.location.province ?? '');
  const [showCoordsToggle, setShowCoordsToggle] = useState(false);
  const [step, setStep] = useState(0);

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
  const visibleCurrentCrops = useMemo(() => MAGYP_CROPS.filter(crop => crop.toLocaleLowerCase('es').includes(currentCropQuery.toLocaleLowerCase('es'))), [currentCropQuery]);
  const visiblePreviousCrops = useMemo(() => MAGYP_CROPS.filter(crop => crop.toLocaleLowerCase('es').includes(previousCropQuery.toLocaleLowerCase('es'))), [previousCropQuery]);
  const totalHectares = Number(farmArea) * (areaUnit === 'm2' ? 0.0001 : 1);
  const allocatedHectares = selectedCrops.reduce((sum, crop) => sum + Number(cropAllocations[crop] || 0) * (areaUnit === 'm2' ? 0.0001 : 1), 0);

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
    setCustomLat('');
    setCustomLng('');
    setDetectedProvince('');
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
        // Keep local suggestions if the network lookup fails or is aborted.
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);
  };

  // User selects a suggestion
  const handleSelectSuggestion = (item: LocationSuggestion) => {
    if (!isWithinArgentina(item.lat, item.lng)) {
      setSuggestions([]);
      setShowDropdown(false);
      setErrorMessage(lang === 'es' ? 'Solo se permiten ubicaciones dentro del territorio argentino.' : 'Only locations within Argentine territory are allowed.');
      return;
    }
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
        if (!isWithinArgentina(lat, lng)) {
          setIsLocating(false);
          setErrorMessage(lang === 'es' ? 'La ubicación detectada está fuera de Argentina. Seleccioná una localidad argentina o ingresá coordenadas válidas.' : 'The detected location is outside Argentina. Select an Argentine locality or enter valid coordinates.');
          return;
        }

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

  const toggleCurrentCrop = (crop: string) => {
    if (selectedCrops.includes(crop)) {
      setSelectedCrops(selectedCrops.filter(item => item !== crop));
      setCropAllocations(({ [crop]: _removed, ...rest }) => rest);
    } else if (canAddMagypCrop(selectedCrops, crop)) {
      const next = removeConflictingMagypCrops(selectedCrops, crop);
      setSelectedCrops(next);
      setCropAllocations(current => Object.fromEntries(Object.entries(current).filter(([item]) => next.includes(item))));
    }
  };

  const togglePreviousCrop = (crop: string) => {
    if (previousCrops.includes(crop)) setPreviousCrops(previousCrops.filter(item => item !== crop));
    else if (canAddMagypCrop(previousCrops, crop)) setPreviousCrops(removeConflictingMagypCrops(previousCrops, crop));
  };

  const changeAreaUnit = (nextUnit: 'ha' | 'm2') => {
    if (nextUnit === areaUnit) return;
    const factor = nextUnit === 'm2' ? 10000 : 0.0001;
    setFarmArea(value => value ? String(Number(value) * factor) : value);
    setCropAllocations(current => Object.fromEntries(Object.entries(current).map(([crop, value]) => [crop, value ? String(Number(value) * factor) : value])));
    setAreaUnit(nextUnit);
  };

  const handleContinue = () => {
    setRegistrationError('');
    if (step === 0 && !isLocationValid) {
      setRegistrationError(lang === 'es' ? 'Buscá una localidad o ingresá coordenadas válidas dentro de Argentina.' : 'Search for a locality or enter valid coordinates within Argentina.');
      return;
    }
    if (step === 1 && (!Number.isFinite(totalHectares) || totalHectares <= 0)) {
      setRegistrationError(lang === 'es' ? 'Ingresá una superficie total mayor que cero.' : 'Enter a total area greater than zero.');
      return;
    }
    setStep(current => Math.min(current + 1, 2));
  };

  // Submit and Enter System
  const handleStart = () => {
    setRegistrationError('');
    if (!isLocationValid) return;
    if (!Number.isFinite(totalHectares) || totalHectares <= 0) return setRegistrationError(lang === 'es' ? 'Ingresá una superficie total mayor que cero.' : 'Enter a total area greater than zero.');
    if (!selectedCrops.length) return setRegistrationError(lang === 'es' ? 'Seleccioná al menos un cultivo actual.' : 'Select at least one current crop.');
    if (selectedCrops.some(crop => !Number.isFinite(Number(cropAllocations[crop])) || Number(cropAllocations[crop]) <= 0)) return setRegistrationError(lang === 'es' ? 'Completá la superficie de cada cultivo actual.' : 'Enter the area for each current crop.');
    if (allocatedHectares > totalHectares + 1e-8) return setRegistrationError(lang === 'es' ? 'La superficie asignada supera la superficie total.' : 'Allocated crop area exceeds total farm area.');

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
    }, {
      producerName: producerName.trim() || undefined,
      fieldSizeHectares: totalHectares,
      currentCrop: cropToMain(selectedCrops[0]),
      cropAllocations: selectedCrops.map(crop => ({ crop, hectares: Number(cropAllocations[crop]) * (areaUnit === 'm2' ? 0.0001 : 1) })),
      previousCrop: previousCrops[0] || undefined,
      previousCrops: previousCrops.length ? previousCrops : undefined,
      irrigationAvailable
    });
  };

  return (
    <div className={`${isModal ? 'bg-[#f4f6f8] dark:bg-[#121212]' : 'landing-page min-h-screen bg-[#f4f6f8] dark:bg-[#121212]'} text-slate-900 dark:text-zinc-100 flex flex-col justify-between font-sans transition-colors`}>
      {/* Official Header Banner */}
      {!isModal && (
        <header className="bg-[#0f3260] dark:bg-[#161618] text-white px-6 py-4 border-b border-[#092040] dark:border-[#2e2e33] shadow-xs">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-black tracking-tight text-lg">ARGFIELD</span>
              <span className="text-slate-400 dark:text-zinc-500"> NASA Space Apps</span>
            </div>
          </div>
        </header>
      )}

      <main className={`${isModal ? 'max-w-4xl mx-auto px-4 py-5 sm:px-6 w-full' : 'max-w-4xl mx-auto px-4 py-7 sm:px-6 lg:px-8 w-full my-auto'}`}>
        <nav aria-label={lang === 'es' ? 'Progreso de configuración' : 'Setup progress'} className="mb-7">
          <ol className="flex items-center">
            {[
              lang === 'es' ? 'Ubicación' : 'Location',
              lang === 'es' ? 'Establecimiento' : 'Farm',
              lang === 'es' ? 'Cultivos' : 'Crops'
            ].map((label, index) => (
              <li key={label} className={`flex min-w-0 items-center ${index < 2 ? 'flex-1' : ''}`}>
                <button
                  type="button"
                  onClick={() => index < step && setStep(index)}
                  disabled={index >= step}
                  aria-current={step === index ? 'step' : undefined}
                  aria-label={`${index + 1}. ${label}`}
                  className={`flex min-h-11 shrink-0 items-center gap-2 text-left text-xs font-semibold sm:text-sm ${index <= step ? 'text-[#0f3260] dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500'} ${index < step ? 'cursor-pointer hover:text-[#17437e] dark:hover:text-white' : 'cursor-default'}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center border text-xs ${index < step ? 'border-[#0f3260] bg-[#0f3260] text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900' : index === step ? 'border-[#0f3260] bg-white text-[#0f3260] dark:border-zinc-200 dark:bg-[#1c1c1e] dark:text-zinc-100' : 'border-slate-300 bg-white text-slate-400 dark:border-zinc-700 dark:bg-[#1c1c1e] dark:text-zinc-500'}`}>
                    {index < step ? <GoogleIcon name="check" size={15} /> : index + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {index < 2 && <span aria-hidden="true" className={`mx-3 h-px min-w-3 flex-1 ${index < step ? 'bg-[#0f3260] dark:bg-zinc-300' : 'bg-slate-200 dark:bg-zinc-700'}`} />}
              </li>
            ))}
          </ol>
        </nav>

        <section className={`landing-card min-w-0 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2e2e33] p-5 sm:p-8 space-y-6 transition-colors ${step === 0 ? '' : 'hidden'}`}>
          {/* Header section inside the single block */}
          <div className="border-b border-slate-200 dark:border-[#2e2e33] pb-5 space-y-2.5">
            <div className="flex items-center gap-2">
              <GoogleIcon name="map" className="text-[#0f3260] dark:text-zinc-200" size={22} />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                {step === 0
                  ? (lang === 'es' ? '¿Dónde está tu campo?' : 'Where is your farm?')
                  : step === 1
                    ? (lang === 'es' ? 'Contanos sobre el establecimiento' : 'Tell us about your farm')
                    : (lang === 'es' ? '¿Qué estás cultivando?' : 'What are you growing?')}
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed max-w-4xl">
              {step === 0
                ? (lang === 'es' ? 'Ubicamos el lote para adaptar las recomendaciones al clima y a las cuencas de la zona.' : 'We use your farm location to adapt recommendations to local climate and water basins.')
                : step === 1
                  ? (lang === 'es' ? 'Con estos datos calculamos superficies y ajustamos las recomendaciones. El nombre del productor es opcional.' : 'We use these details to calculate areas and tailor recommendations. Producer name is optional.')
                  : (lang === 'es' ? 'Elegí los cultivos actuales y asignales superficie. Los cultivos anteriores son opcionales.' : 'Choose current crops and assign their area. Previous crops are optional.')}
            </p>
          </div>

          {/* Form Fields inside the block */}
          <div className={`space-y-6 ${step === 0 ? '' : 'hidden'}`}>
            {/* Field: Farm Name (Optional) */}
            <div>
              <label
                htmlFor="farm-name-input"
                className="text-xs font-bold text-slate-800 dark:text-zinc-200 block uppercase tracking-wider mb-2"
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
                className="w-full bg-slate-50 dark:bg-[#232326] border border-slate-300 dark:border-[#333336] px-4 py-3 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#0f3260] dark:focus:border-zinc-400 focus:bg-white dark:focus:bg-[#232326] transition-colors"
              />
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                {lang === 'es'
                  ? 'Si no ingresás un nombre, se registrará como "Mi establecimiento".'
                  : 'If left empty, it will default to "My Farm".'}
              </p>
            </div>

            {/* Address / Locality Search with Live Suggestions */}
            <div className="relative border-t border-slate-100 pt-4 dark:border-[#2e2e33]" ref={dropdownRef}>
              <label
                htmlFor="landing-address-input"
                className="block text-sm font-semibold text-slate-800 dark:text-zinc-200"
              >
                {lang === 'es' ? 'Dirección o Localidad' : 'Address or Locality'}
              </label>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                {lang === 'es' ? 'Solo se aceptan ubicaciones dentro de Argentina.' : 'Only locations within Argentina are accepted.'}
              </p>
              <form onSubmit={handleSearchSubmit} className="relative mt-3 flex items-center gap-2">
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
                    className="h-12 w-full border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-[#0f3260] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f3260]/15 dark:border-[#333336] dark:bg-[#232326] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:bg-[#232326]"
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
                  className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center border border-slate-300 bg-white text-[#0f3260] transition-colors hover:border-[#0f3260] hover:bg-[#0f3260] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#0f3260]/25 disabled:cursor-wait disabled:opacity-50 dark:border-[#333336] dark:bg-[#232326] dark:text-zinc-200 dark:hover:bg-[#3f3f46]"
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
                  className={`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center border transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f3260]/25 ${
                    showCoordsToggle
                      ? 'bg-[#0f3260] text-white border-[#0f3260] dark:bg-[#3f3f46] dark:border-[#52525b]'
                      : 'border-slate-300 bg-white text-[#0f3260] hover:border-[#0f3260] hover:bg-[#0f3260] hover:text-white dark:border-[#333336] dark:bg-[#232326] dark:text-zinc-200 dark:hover:bg-[#3f3f46]'
                  }`}
                >
                  <GoogleIcon name="pin_drop" size={18} />
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
                  <div className="p-4 sm:p-5 bg-slate-50/90 dark:bg-[#1f1f22] border border-slate-200 dark:border-[#2e2e33] space-y-3">
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
              <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-zinc-400">
                <GoogleIcon name="info" size={16} className="text-[#0f3260] dark:text-zinc-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block text-slate-700 dark:text-zinc-300">
                    {lang === 'es' ? 'Ubicación requerida' : 'Location required'}
                  </span>
                  <span className="text-xs leading-relaxed block">
                    {lang === 'es'
                      ? 'Buscá una localidad argentina, usá el GPS o ingresá las coordenadas del lote.'
                      : 'Search for an Argentine locality, use GPS, or enter the farm coordinates.'}
                  </span>
                </div>
              </div>
            )}

            {isLocationValid && (
              <div className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <GoogleIcon name="check" size={16} className="shrink-0 text-emerald-700 dark:text-emerald-300" />
                <span className="font-semibold">
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
        </section>
        <AnimatePresence>
          {step > 0 && (
            <motion.section
              key="farm-details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="landing-card min-w-0 bg-white dark:bg-[#1c1c1e] border border-slate-200 shadow-sm dark:border-[#2e2e33] p-5 sm:p-8 space-y-6 transition-colors"
            >
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                  {step === 1
                    ? (lang === 'es' ? 'Contanos sobre el establecimiento' : 'Tell us about your farm')
                    : (lang === 'es' ? '¿Qué estás cultivando?' : 'What are you growing?')}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                  {step === 1
                    ? (lang === 'es' ? 'Completá la superficie y las características del lote.' : 'Enter the farm area and its characteristics.')
                    : (lang === 'es' ? 'Seleccioná los cultivos actuales y asigná superficie a cada uno.' : 'Select current crops and assign area to each one.')}
                </p>
              </div>
              {step === 1 && (
                <div className="space-y-7">
                  <div className="grid gap-5 sm:items-end sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_160px]">
                    <label className="block text-sm font-semibold text-slate-800 dark:text-zinc-200">
                      {lang === 'es' ? 'Superficie total' : 'Total area'}
                      <span className="mt-1.5 flex h-12 border border-slate-300 bg-slate-50 focus-within:border-[#0f3260] dark:border-[#333336] dark:bg-[#232326]">
                        <input type="number" min="0.01" step="any" value={farmArea} onChange={e => setFarmArea(e.target.value)} aria-label={lang === 'es' ? 'Superficie total' : 'Total area'} className="min-w-0 flex-1 bg-transparent px-3.5 text-base font-normal text-slate-900 outline-none dark:text-zinc-100" />
                        <span className="flex items-center px-3 text-xs text-slate-500 dark:text-zinc-400">{areaUnit === 'ha' ? 'ha' : 'm²'}</span>
                      </span>
                    </label>
                    <label className="block text-sm font-semibold text-slate-800 dark:text-zinc-200">
                      {lang === 'es' ? 'Unidad' : 'Unit'}
                      <select value={areaUnit} onChange={e => changeAreaUnit(e.target.value as 'ha' | 'm2')} className="mt-1.5 h-12 w-full border border-slate-300 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none focus:border-[#0f3260] focus:ring-2 focus:ring-[#0f3260]/15 dark:border-[#333336] dark:bg-[#232326] dark:text-zinc-100 dark:focus:border-zinc-300">
                        <option value="ha">{lang === 'es' ? 'Hectáreas' : 'Hectares'}</option>
                        <option value="m2">m²</option>
                      </select>
                    </label>
                    <div className="flex items-end">
                      <label className="flex h-12 w-full cursor-pointer items-center gap-3 border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-700 transition-colors hover:border-[#0f3260] dark:border-[#333336] dark:bg-[#232326] dark:text-zinc-300">
                        <input type="checkbox" checked={irrigationAvailable} onChange={e => setIrrigationAvailable(e.target.checked)} className="h-4 w-4 accent-[#0f3260]" />
                        <span>{lang === 'es' ? 'Tiene riego' : 'Irrigated'}</span>
                      </label>
                    </div>
                  </div>
                  <label className="block max-w-xl text-xs font-medium text-slate-700 dark:text-zinc-300">
                    {lang === 'es' ? 'Nombre del productor (opcional)' : 'Producer name (optional)'}
                    <input value={producerName} onChange={e => setProducerName(e.target.value)} className="mt-1.5 h-11 w-full border border-slate-300 bg-white px-3.5 text-sm font-normal text-slate-900 outline-none focus:border-[#0f3260] dark:border-[#333336] dark:bg-[#232326] dark:text-zinc-100" />
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
                  <div className="contents">
                    <section aria-labelledby="current-crops-title" className="space-y-3">
                      <div>
                        <label htmlFor="current-crop-search" id="current-crops-title" className="block text-sm font-semibold text-slate-800 dark:text-zinc-200">
                          {lang === 'es' ? 'Cultivos actuales' : 'Current crops'}
                        </label>
                        <input id="current-crop-search" value={currentCropQuery} onChange={e => setCurrentCropQuery(e.target.value)} placeholder={lang === 'es' ? 'Buscar un cultivo…' : 'Search crops…'} className="mt-2 h-11 w-full border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-[#0f3260] dark:border-[#333336] dark:bg-[#232326] dark:text-zinc-100" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {visibleCurrentCrops.map(crop => {
                          const selected = selectedCrops.includes(crop);
                          const blocked = !selected && !canAddMagypCrop(selectedCrops, crop);
                          return (
                            <button key={crop} type="button" aria-pressed={selected} disabled={blocked} title={blocked ? (lang === 'es' ? 'Elegí una variante o el cultivo total, no ambos.' : 'Choose either a variant or its total, not both.') : undefined} onClick={() => toggleCurrentCrop(crop)} className={`min-h-9 border px-3 py-1.5 text-xs leading-5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f3260]/25 ${selected ? 'border-[#0f3260] bg-[#0f3260] text-white dark:border-zinc-300 dark:bg-zinc-200 dark:text-zinc-900' : blocked ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-zinc-800 dark:bg-[#202023] dark:text-zinc-600' : 'border-slate-300 bg-white text-slate-700 hover:border-[#0f3260] hover:text-[#0f3260] dark:border-[#3f3f46] dark:bg-[#232326] dark:text-zinc-300 dark:hover:border-zinc-300'}`}>
                              {crop}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Los cultivos “total” agrupan sus variantes; seleccioná uno u otro.' : '“Total” crops include their variants; select either the total or its variants.'}</p>
                    </section>

                    <section aria-labelledby="selected-crops-title" className="border-t border-slate-200 pt-5 dark:border-[#333336] lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
                      <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h3 id="selected-crops-title" className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{lang === 'es' ? 'Cultivos seleccionados' : 'Selected crops'}</h3>
                        <span className="text-xs text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Superficie por cultivo' : 'Area per crop'} ({areaUnit === 'ha' ? 'ha' : 'm²'})</span>
                      </div>
                      {selectedCrops.length ? (
                        <ul className="divide-y divide-slate-200 dark:divide-[#333336]">
                          {selectedCrops.map(crop => (
                            <li key={crop} className="flex flex-wrap items-center gap-3 py-3">
                              <span className="min-w-0 flex-1 text-sm font-medium text-slate-800 dark:text-zinc-200">{crop}</span>
                              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                                <span>{lang === 'es' ? 'Superficie' : 'Area'}</span>
                                <input aria-label={`${lang === 'es' ? 'Superficie' : 'Area'} ${crop}`} type="number" min="0.01" step="any" value={cropAllocations[crop] ?? ''} onChange={e => setCropAllocations({ ...cropAllocations, [crop]: e.target.value })} className="h-10 w-28 border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-[#0f3260] dark:border-[#333336] dark:bg-[#232326] dark:text-zinc-100" />
                              </label>
                              <button type="button" onClick={() => toggleCurrentCrop(crop)} aria-label={`${lang === 'es' ? 'Quitar' : 'Remove'} ${crop}`} className="px-2 py-2 text-xs text-slate-500 hover:text-rose-700 dark:text-zinc-400 dark:hover:text-rose-300">
                                {lang === 'es' ? 'Quitar' : 'Remove'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="py-4 text-sm text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Todavía no seleccionaste cultivos.' : 'No crops selected yet.'}</p>
                      )}
                      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-[#333336]">
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Asignado' : 'Allocated'}</span>
                          <span className={`font-semibold ${allocatedHectares > totalHectares ? 'text-rose-600 dark:text-rose-300' : 'text-slate-800 dark:text-zinc-200'}`}>{allocatedHectares.toFixed(2)} ha</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-3 text-xs">
                          <span className="text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Disponible' : 'Remaining'}</span>
                          <span className={`font-semibold ${allocatedHectares > totalHectares ? 'text-rose-600 dark:text-rose-300' : 'text-slate-800 dark:text-zinc-200'}`}>{Math.max(totalHectares - allocatedHectares, 0).toFixed(2)} ha</span>
                        </div>
                        {allocatedHectares > totalHectares && <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">{lang === 'es' ? 'La superficie asignada supera el total.' : 'Allocated area exceeds the total.'}</p>}
                      </div>
                    </section>

                    <section aria-labelledby="previous-crops-title" className="border-t border-slate-200 pt-6 dark:border-[#2e2e33]">
                      <label htmlFor="previous-crop-search" id="previous-crops-title" className="block text-sm font-semibold text-slate-800 dark:text-zinc-200">
                        {lang === 'es' ? 'Cultivos anteriores (opcional)' : 'Previous crops (optional)'}
                      </label>
                      <input id="previous-crop-search" value={previousCropQuery} onChange={e => setPreviousCropQuery(e.target.value)} placeholder={lang === 'es' ? 'Buscar un cultivo…' : 'Search crops…'} className="mt-2 h-11 w-full border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-[#0f3260] dark:border-[#333336] dark:bg-[#232326] dark:text-zinc-100" />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {visiblePreviousCrops.map(crop => {
                          const selected = previousCrops.includes(crop);
                          const blocked = !selected && !canAddMagypCrop(previousCrops, crop);
                          return (
                            <button key={crop} type="button" aria-pressed={selected} disabled={blocked} title={blocked ? (lang === 'es' ? 'Elegí una variante o el cultivo total, no ambos.' : 'Choose either a variant or its total, not both.') : undefined} onClick={() => togglePreviousCrop(crop)} className={`min-h-9 border px-3 py-1.5 text-xs leading-5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f3260]/25 ${selected ? 'border-[#0f3260] bg-[#0f3260] text-white dark:border-zinc-300 dark:bg-zinc-200 dark:text-zinc-900' : blocked ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-zinc-800 dark:bg-[#202023] dark:text-zinc-600' : 'border-slate-300 bg-white text-slate-700 hover:border-[#0f3260] hover:text-[#0f3260] dark:border-[#3f3f46] dark:bg-[#232326] dark:text-zinc-300 dark:hover:border-zinc-300'}`}>
                              {crop}
                            </button>
                          );
                        })}
                      </div>
                      {previousCrops.length > 0 && <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Seleccionados: ' : 'Selected: '}{previousCrops.join(', ')}</p>}
                    </section>
                  </div>

                  <aside className="border-t border-slate-200 pt-6 dark:border-[#333336] lg:border-l lg:pl-6">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{lang === 'es' ? 'Cultivos anteriores seleccionados' : 'Selected previous crops'}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Podés quitar los cultivos que no correspondan al historial del lote.' : 'Remove crops that do not belong to the field history.'}</p>
                    {previousCrops.length ? (
                      <ul className="mt-4 divide-y divide-slate-200 dark:divide-[#333336]">
                        {previousCrops.map(crop => (
                          <li key={crop} className="flex items-center justify-between gap-3 py-3">
                            <span className="text-sm font-medium text-slate-800 dark:text-zinc-200">{crop}</span>
                            <button type="button" onClick={() => togglePreviousCrop(crop)} aria-label={`${lang === 'es' ? 'Quitar' : 'Remove'} ${crop}`} className="px-2 py-2 text-xs text-slate-500 hover:text-rose-700 dark:text-zinc-400 dark:hover:text-rose-300">{lang === 'es' ? 'Quitar' : 'Remove'}</button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-5 text-sm text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Todavía no seleccionaste cultivos anteriores.' : 'No previous crops selected yet.'}</p>
                    )}
                  </aside>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {registrationError && <div role="alert" aria-live="polite" className="mt-4 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{registrationError}</div>}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-[#2e2e33]">
          {step > 0 ? (
            <button type="button" onClick={() => { setRegistrationError(''); setStep(current => current - 1); }} className="flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-slate-600 hover:text-[#0f3260] dark:text-zinc-300 dark:hover:text-white">
              <GoogleIcon name="arrow_back" size={16} />
              {lang === 'es' ? 'Anterior' : 'Back'}
            </button>
          ) : <span />}
          {step < 2 ? (
            <button id="landing-continue-btn" type="button" onClick={handleContinue} className="flex min-h-11 items-center gap-2 bg-[#0f3260] px-6 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#17437e] dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white">
              {lang === 'es' ? 'Continuar' : 'Continue'}
              <GoogleIcon name="arrow_forward" size={16} />
            </button>
          ) : (
            <button
              id="landing-confirm-enter-btn"
              type="button"
              onClick={handleStart}
              className="flex min-h-11 items-center gap-2 bg-[#0f3260] px-6 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#17437e] dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
            >
              <span>{submitLabel ?? (lang === 'es' ? 'Ingresar al sistema' : 'Enter system')}</span>
              <GoogleIcon name="arrow_forward" size={16} />
            </button>
          )}
        </div>
      </main>

      {/* Official Footer */}
      {!isModal && (
        <footer className="border-t border-slate-200 dark:border-[#2e2e33] bg-white/80 dark:bg-[#161618] py-4 px-6 text-center text-xs text-slate-500 dark:text-zinc-400 font-mono">
          NASA Space Apps • Argfield
        </footer>
      )}
    </div>
  );
};
