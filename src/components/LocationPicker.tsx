import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Layers, 
  Droplets, 
  Compass, 
  Wheat, 
  Sparkles,
  ChevronDown,
  Info,
  Check,
  Target
} from 'lucide-react';
import { FarmLocation, FarmProfile, MainCrop, SoilType, IrrigationType, FarmerPriority } from '../types';
import { PRESET_FARMS, REGION_DETAILS } from '../data/regions';
import { CROPS_DATABASE, SOIL_DATABASE, PRIORITY_DATABASE } from '../data/crops';
import { determineBasin, determineRegion } from '../services/geo';

interface LocationPickerProps {
  farmProfile: FarmProfile;
  onChangeProfile: (profile: FarmProfile) => void;
  lang: 'es' | 'en';
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  farmProfile,
  onChangeProfile,
  lang
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customLat, setCustomLat] = useState(farmProfile.location.lat.toString());
  const [customLng, setCustomLng] = useState(farmProfile.location.lng.toString());

  // Quick preset select
  const handleSelectPreset = (preset: FarmLocation) => {
    onChangeProfile({
      ...farmProfile,
      location: preset
    });
  };

  // Custom coordinates submit
  const handleApplyCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      const region = determineRegion(lat, lng);
      const basin = determineBasin(lat, lng);
      const newLoc: FarmLocation = {
        name: `Lote Personalizado (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        province: region === 'norte' ? 'Norte Argentino' : region === 'sur' ? 'Patagonia' : 'Región Pampeana',
        region,
        lat,
        lng,
        basinId: basin.id,
        basinName: basin.name,
        mainRiver: basin.mainRiver,
        aquifer: basin.aquifer
      };
      onChangeProfile({
        ...farmProfile,
        location: newLoc
      });
    }
  };

  // Search filter through preset names / Argentine agricultural hubs
  const allArgentineHubs: FarmLocation[] = [
    ...PRESET_FARMS,
    {
      name: 'Chacabuco - Pampa Húmeda',
      province: 'Buenos Aires',
      region: 'centro',
      lat: -34.6417,
      lng: -60.4722,
      basinId: 'salado_bonaerense',
      basinName: 'Cuenca del Salado',
      mainRiver: 'Río Salado',
      aquifer: 'Acuífero Puelche'
    },
    {
      name: 'Venado Tuerto - Sur de Santa Fe',
      province: 'Santa Fe',
      region: 'centro',
      lat: -33.7456,
      lng: -61.9688,
      basinId: 'salado_bonaerense',
      basinName: 'Cuenca Lagunas Encadenadas',
      mainRiver: 'Arroyo Pavón / Carcarañá',
      aquifer: 'Acuífero Pampeano'
    },
    {
      name: 'Marcos Juárez - Núcleo Sojero',
      province: 'Córdoba',
      region: 'centro',
      lat: -32.6969,
      lng: -62.1067,
      basinId: 'parana',
      basinName: 'Cuenca del Carcarañá / Paraná',
      mainRiver: 'Río Carcarañá',
      aquifer: 'Acuífero Pampeano'
    },
    {
      name: 'Bandera - Sudeste Santiagueño',
      province: 'Santiago del Estero',
      region: 'noa',
      lat: -28.8872,
      lng: -62.2644,
      basinId: 'bermejo',
      basinName: 'Cuenca Río Dulce / Salado del Norte',
      mainRiver: 'Río Salado del Norte',
      aquifer: 'Acuífero Cretácico Chaqueño'
    },
    {
      name: 'Coronel Suárez - Sudoeste Bonaerense',
      province: 'Buenos Aires',
      region: 'centro',
      lat: -37.4547,
      lng: -61.9334,
      basinId: 'salado_bonaerense',
      basinName: 'Cuenca Serrana Ventana / Sauce Grande',
      mainRiver: 'Río Sauce Grande',
      aquifer: 'Freática Ventana'
    }
  ];

  const filteredHubs = searchQuery.trim() === ''
    ? []
    : allArgentineHubs.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.province.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const currentRegionMeta = REGION_DETAILS[farmProfile.location.region];
  const currentCropMeta = CROPS_DATABASE[farmProfile.currentCrop];
  const currentSoilMeta = SOIL_DATABASE[farmProfile.soilType];
  const currentPriorityMeta = PRIORITY_DATABASE[farmProfile.priority];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
      {/* Top Row: Selected Farm Badge & Location Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {farmProfile.location.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {farmProfile.location.province}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                {farmProfile.location.region}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                <strong>{lang === 'es' ? 'Cuenca Hidrográfica:' : 'Hydrological Basin:'}</strong> {farmProfile.location.basinName}
              </span>
              <span className="text-slate-600">•</span>
              <span>
                <strong>{lang === 'es' ? 'Acuífero:' : 'Aquifer:'}</strong> {farmProfile.location.aquifer || 'Pampeano'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-[11px] text-slate-400">
                {farmProfile.location.lat.toFixed(4)}°, {farmProfile.location.lng.toFixed(4)}°
              </span>
            </p>
          </div>
        </div>

        {/* Action buttons: Edit field profile, quick search */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="configure-farm-btn"
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Wheat className="w-4 h-4 text-amber-400" />
            <span>{lang === 'es' ? 'Perfil del Campo & Suelo' : 'Soil & Field Profile'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showConfigModal ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Preset Location Chips */}
      <div className="pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            {lang === 'es' ? 'Regiones Agrícolas Clave (Presets):' : 'Key Agricultural Regions:'}
          </span>
          <span className="text-[11px] text-slate-500">
            {lang === 'es' ? 'Haz clic en una zona para teletransportar los sensores' : 'Click a region to shift sensor grid'}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PRESET_FARMS.map((preset) => {
            const isSelected = preset.lat === farmProfile.location.lat && preset.lng === farmProfile.location.lng;
            return (
              <button
                key={preset.name}
                id={`preset-${preset.region}-${preset.province.toLowerCase()}`}
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{preset.province}</span>
                <span className="text-slate-400 text-[10px]">({preset.name.split(' - ')[1] || preset.name})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Custom Coordinates Form */}
      <div className="mt-2 pt-2 grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
        {/* City / Hub Search Input */}
        <div className="md:col-span-7 relative">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-location-input"
              type="text"
              placeholder={lang === 'es' ? 'Buscar localidad agrícola (ej. Venado Tuerto, Marcos Juárez, Chacabuco)...' : 'Search agricultural town or basin...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {filteredHubs.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              {filteredHubs.map((hub) => (
                <button
                  key={hub.name}
                  onClick={() => {
                    handleSelectPreset(hub);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 last:border-0 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-white">{hub.name}</div>
                    <div className="text-[11px] text-slate-400">{hub.basinName} • {hub.province}</div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-blue-400 px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/40">
                    {hub.region}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lat / Lng quick inputs */}
        <form onSubmit={handleApplyCoordinates} className="md:col-span-5 flex items-center gap-1.5">
          <input
            id="lat-input"
            type="number"
            step="0.0001"
            value={customLat}
            onChange={(e) => setCustomLat(e.target.value)}
            placeholder="Lat"
            className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
          />
          <input
            id="lng-input"
            type="number"
            step="0.0001"
            value={customLng}
            onChange={(e) => setCustomLng(e.target.value)}
            placeholder="Lng"
            className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            id="apply-coords-btn"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium border border-slate-700 shrink-0 transition-colors"
          >
            {lang === 'es' ? 'Fijar' : 'Set'}
          </button>
        </form>
      </div>

      {/* Expandable Farm & Soil Profile Drawer */}
      {showConfigModal && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/60 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Wheat className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">
                {lang === 'es' ? 'Parámetros Agrícolas del Lote & Prioridad del Productor' : 'Field Agronomic Parameters & Priorities'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {lang === 'es' ? 'Personaliza los factores para la simulación de rotaciones' : 'Customizes crop rotation simulation'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Current Main Crop */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {lang === 'es' ? 'Cultivo Principal Actual' : 'Current Cash Crop'}
              </label>
              <select
                id="crop-select"
                value={farmProfile.currentCrop}
                onChange={(e) => onChangeProfile({
                  ...farmProfile,
                  currentCrop: e.target.value as MainCrop
                })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {Object.keys(CROPS_DATABASE).map((cropKey) => {
                  const crop = CROPS_DATABASE[cropKey as MainCrop];
                  return (
                    <option key={cropKey} value={cropKey}>
                      {lang === 'es' ? crop.nameEs : crop.name}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {currentCropMeta.waterNeedMm} mm agua • Raíz: {currentCropMeta.rootDepthM}m
              </p>
            </div>

            {/* Soil Type */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {lang === 'es' ? 'Tipo de Suelo' : 'Soil Classification'}
              </label>
              <select
                id="soil-select"
                value={farmProfile.soilType}
                onChange={(e) => onChangeProfile({
                  ...farmProfile,
                  soilType: e.target.value as SoilType
                })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {Object.keys(SOIL_DATABASE).map((soilKey) => {
                  const soil = SOIL_DATABASE[soilKey as SoilType];
                  return (
                    <option key={soilKey} value={soilKey}>
                      {lang === 'es' ? soil.nameEs : soil.name}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {currentSoilMeta.waterRetention}
              </p>
            </div>

            {/* Water Management */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {lang === 'es' ? 'Régimen Hídrico' : 'Water Infrastructure'}
              </label>
              <select
                id="irrigation-select"
                value={farmProfile.irrigation}
                onChange={(e) => onChangeProfile({
                  ...farmProfile,
                  irrigation: e.target.value as IrrigationType
                })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="dryland">
                  {lang === 'es' ? '100% a Secano (Lluvias)' : '100% Dryland / Rainfed'}
                </option>
                <option value="supplemental_pivot">
                  {lang === 'es' ? 'Riego Pivot Suplementario' : 'Supplemental Pivot Irrigation'}
                </option>
                <option value="surface_canal">
                  {lang === 'es' ? 'Canal / Gravedad' : 'Surface / Gravity Canal'}
                </option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {farmProfile.irrigation === 'dryland' 
                  ? (lang === 'es' ? 'Máxima dependencia de rastrojo' : 'High dependence on crop residue')
                  : (lang === 'es' ? 'Aporte de napa / acuífero' : 'Groundwater / aquifer recharge')}
              </p>
            </div>

            {/* Farmer Priority */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {lang === 'es' ? 'Prioridad Estratégica' : 'Farmer Strategic Goal'}
              </label>
              <select
                id="priority-select"
                value={farmProfile.priority}
                onChange={(e) => onChangeProfile({
                  ...farmProfile,
                  priority: e.target.value as FarmerPriority
                })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {Object.keys(PRIORITY_DATABASE).map((priKey) => {
                  const pri = PRIORITY_DATABASE[priKey as FarmerPriority];
                  return (
                    <option key={priKey} value={priKey}>
                      {lang === 'es' ? pri.labelEs : pri.label}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-emerald-400 mt-1 truncate flex items-center gap-1">
                <Target className="w-3 h-3 inline shrink-0" />
                <span>{currentPriorityMeta.targetMetric}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
