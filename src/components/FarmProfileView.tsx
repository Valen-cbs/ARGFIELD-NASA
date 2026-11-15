import { DemoBadge } from './DemoBadge';
import React, { useState, useMemo } from 'react';
import { FarmProfile, MainCrop, SoilType, FarmerPriority, Alert } from '../types';
import { CROPS_DATABASE, SOIL_DATABASE } from '../data/crops';
import { EditFarmModal } from './EditFarmModal';
import { 
  Droplets, 
  Sprout, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Pencil, 
  ArrowRight, 
  CloudRain, 
  Activity, 
  Compass,
  Check,
  CloudSun,
  Wind,
  Waves
} from 'lucide-react';

interface FarmProfileViewProps {
  farmProfile: FarmProfile;
  alerts?: Alert[];
  onChangeProfile: (profile: FarmProfile) => void;
  onOpenExport?: () => void;
  onNavigateToOptimizer?: () => void;
  onNavigateToAlerts?: () => void;
  onNavigateToWeather?: () => void;
  onOpenEditLocation?: () => void;
  lang: 'es' | 'en';
}

export const FarmProfileView: React.FC<FarmProfileViewProps> = ({
  farmProfile,
  alerts,
  onChangeProfile,
  onNavigateToOptimizer,
  onNavigateToAlerts,
  onNavigateToWeather,
  onOpenEditLocation,
  lang
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const notifyChange = () => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const soilKeys = Object.keys(SOIL_DATABASE) as SoilType[];
  const cropKeys = Object.keys(CROPS_DATABASE) as MainCrop[];

  // Dynamic satellite calculations based on Argentine region
  const isSur = farmProfile.location.region === 'sur';
  const isNorte = farmProfile.location.region === 'norte';

  // Satellite indicators (NASA + CONAE SAOCOM)
  const smapRootMoisture = isSur ? 19 : isNorte ? 31 : 24; // % agua útil (óptimo 42%)
  const smapSurfaceMoisture = isSur ? 14 : isNorte ? 26 : 21; // % vol.
  const gpmRainfall30d = isSur ? 18 : isNorte ? 48 : 34; // mm
  const ecostressStress = isSur ? 0.42 : isNorte ? 0.81 : 0.74; // ESI index

  const currentSoil = SOIL_DATABASE[farmProfile.soilType];
  const currentCrop = CROPS_DATABASE[farmProfile.currentCrop];

  // Water suitability status
  const suitability = useMemo<{
    label: string;
    type: 'critical' | 'moderate' | 'optimal';
    text: string;
  }>(() => {
    if (smapRootMoisture < 20) {
      return {
        label: lang === 'es' ? 'DÉFICIT HÍDRICO' : 'WATER DEFICIT',
        type: 'critical',
        text: lang === 'es' 
          ? 'Reservas hídricas en perfil bajas. Conviene sembrar cultivos de baja demanda o cobertura para recargar antes de la siembra estival.' 
          : 'Low profile water reserves. Cover crops or low water-demand species are advised to restore root zone moisture.'
      };
    }
    if (smapRootMoisture < 30) {
      return {
        label: lang === 'es' ? 'AGUA MODERADA' : 'MODERATE WATER',
        type: 'moderate',
        text: lang === 'es' 
          ? 'Humedad útil aceptable pero vulnerable a días secos consecutivos. Priorizar retención de rastrojo y rotaciones con gramíneas.' 
          : 'Acceptable moisture but vulnerable to dry spells. Retain surface residue and include grasses in the rotation.'
      };
    }
    return {
      label: lang === 'es' ? 'PERFIL ÓPTIMO' : 'OPTIMAL PROFILE',
      type: 'optimal',
      text: lang === 'es' 
        ? 'Excelente recarga en el primer metro de suelo. Permite planificar rotaciones de alto rendimiento con ventana segura.' 
        : 'Solid water recharge across top 100 cm. Ideal conditions for balanced, high-yield rotation sequences.'
    };
  }, [smapRootMoisture, lang]);

  // Weather snapshot for quick operational summary
  const weatherSnapshot = useMemo(() => {
    const province = farmProfile.location.province.toLowerCase();
    if (province.includes('chaco') || province.includes('formosa') || province.includes('santiago')) {
      return {
        temp: 31,
        tempMax: 35,
        tempMin: 21,
        windSpeed: 18,
        windDir: 'NNE',
        rain7d: 12,
        sprayStatus: 'moderate' as const,
        sprayLabel: lang === 'es' ? 'Precaución (T° > 30°C)' : 'Caution (T > 30°C)'
      };
    }
    if (province.includes('buenos aires') || province.includes('pampa')) {
      return {
        temp: 21,
        tempMax: 24,
        tempMin: 12,
        windSpeed: 22,
        windDir: 'S',
        rain7d: 15,
        sprayStatus: 'moderate' as const,
        sprayLabel: lang === 'es' ? 'Riesgo deriva (Viento)' : 'Drift risk (Wind)'
      };
    }
    if (province.includes('mendoza') || province.includes('san juan')) {
      return {
        temp: 26,
        tempMax: 29,
        tempMin: 14,
        windSpeed: 10,
        windDir: 'E',
        rain7d: 2,
        sprayStatus: 'optimal' as const,
        sprayLabel: lang === 'es' ? 'Pulverización óptima' : 'Optimal spraying'
      };
    }
    // Núcleo pampeano (Córdoba, Santa Fe, Entre Ríos)
    return {
      temp: 24,
      tempMax: 27,
      tempMin: 15,
      windSpeed: 14,
      windDir: 'SE',
      rain7d: 28,
      sprayStatus: 'optimal' as const,
      sprayLabel: lang === 'es' ? 'Pulverización óptima' : 'Optimal spraying'
    };
  }, [farmProfile.location.province, lang]);

  // Active basin alerts highlights
  const topAlert = alerts && alerts.length > 0 
    ? alerts.find(a => a.severity === 'critical') || alerts[0]
    : null;
  const criticalCount = alerts ? alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length : 0;

  // Strategy recommendation tailored to farmer priority
  const strategy = useMemo(() => {
    switch (farmProfile.priority) {
      case 'conserve_moisture':
        return {
          title: lang === 'es' ? 'Vicia villosa → Maíz Tardío → Trigo' : 'Hairy Vetch → Late Maize → Wheat',
          benefitWater: '+28%',
          benefitSoil: '+45 kg N/ha',
          desc: lang === 'es' 
            ? 'La cobertura de vicia frena la evaporación directa, acumula agua en el perfil y aporta nitrógeno biológico al maíz.' 
            : 'Vetch cover halts surface evaporation, preserves root moisture, and supplies biological nitrogen.'
        };
      case 'build_soil_organic':
        return {
          title: lang === 'es' ? 'Centeno de Cobertura → Soja de 1ra → Trigo / Soja 2da' : 'Cereal Rye Cover → 1st Soybean → Wheat/Soybean',
          benefitWater: '+22%',
          benefitSoil: '+3.2 t/ha Biomasa',
          desc: lang === 'es' 
            ? 'Aporte constante de raíces fasciculadas que incrementan carbono activo y descompactan el perfil de suelo.' 
            : 'Dense fibrous root system building active carbon and loosening topsoil structure.'
        };
      case 'drought_resilience':
        return {
          title: lang === 'es' ? 'Sorgo Granífero → Vicia → Girasol' : 'Grain Sorghum → Vetch → Sunflower',
          benefitWater: '+35%',
          benefitSoil: '+40 kg N/ha',
          desc: lang === 'es' 
            ? 'Especies con enraizamiento profundo (>2 metros) y alta rusticidad ante golpes de calor y sequías prolongadas.' 
            : 'Deep-rooted resilient species capable of tapping subsoil moisture during heat shocks.'
        };
      case 'erosion_control':
        return {
          title: lang === 'es' ? 'Avena y Vicia Asociadas → Maíz con Rastrojo Permanente' : 'Oats & Vetch Mix → Maize under No-Till',
          benefitWater: '+25%',
          benefitSoil: '100% Cobertura',
          desc: lang === 'es' 
            ? 'Suelo protegido los 365 días del año para frenar el viento en suelos arenosos y escorrentías en pendientes.' 
            : 'Continuous soil cover year-round stopping wind erosion on lighter soils and runoff on slopes.'
        };
      case 'maximize_margin':
      default:
        return {
          title: lang === 'es' ? 'Cebada Cervecera → Soja de 2da → Maíz Temprano' : 'Malting Barley → 2nd Soybean → Early Maize',
          benefitWater: '+18%',
          benefitSoil: 'Doble Renta/Año',
          desc: lang === 'es' 
            ? 'Intensificación sustentable con cosecha anticipada de cebada que deja margen hídrico para la soja estival.' 
            : 'Sustainable intensification leveraging early barley harvest to capture summer rain.'
        };
    }
  }, [farmProfile.priority, lang]);

  const prioritiesList: Array<{ id: FarmerPriority; label: string; icon: React.ReactNode }> = [
    { 
      id: 'conserve_moisture', 
      label: lang === 'es' ? 'Cuidar Agua' : 'Conserve Water',
      icon: <Droplets className="w-4 h-4" />
    },
    { 
      id: 'build_soil_organic', 
      label: lang === 'es' ? 'Salud del Suelo' : 'Soil Health',
      icon: <Sprout className="w-4 h-4" />
    },
    { 
      id: 'drought_resilience', 
      label: lang === 'es' ? 'Resistir Sequía' : 'Drought Resilience',
      icon: <ShieldCheck className="w-4 h-4" />
    },
    { 
      id: 'maximize_margin', 
      label: lang === 'es' ? 'Margen Económico' : 'Economic Margin',
      icon: <TrendingUp className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-4 pb-12 font-sans select-none">
      {/* 1. Header: Farm Name, Location & Edit */}
      <div className="bg-white dark:bg-[#1c1c1e] p-4 sm:p-5 border border-slate-300 dark:border-[#2e2e33] flex items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-[#0f3260] text-white dark:bg-[#252528] dark:text-zinc-200">
              <Compass className="w-3.5 h-3.5" />
              {lang === 'es' ? 'Lote y Diagnóstico' : 'Field & Diagnostics'}
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              {farmProfile.location.province}
            </span>
            {justSaved && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="w-3 h-3" />
                {lang === 'es' ? 'Actualizado' : 'Updated'}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            {farmProfile.location.name}
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 flex flex-wrap items-center gap-x-2">
            <span>{farmProfile.location.basinName}</span>
            <span>•</span>
            <span className="font-mono">{farmProfile.location.lat.toFixed(4)}°S, {farmProfile.location.lng.toFixed(4)}°W</span>
            <span>•</span>
            <span>{farmProfile.fieldSizeHectares} ha</span>
          </p>
        </div>

        <button
          id="home-edit-location-btn"
          type="button"
          onClick={() => onOpenEditLocation ? onOpenEditLocation() : setShowEditModal(true)}
          className="p-2.5 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#2a2a2e] border border-slate-300 dark:border-[#38383e] transition-colors flex items-center justify-center cursor-pointer shrink-0"
          title={lang === 'es' ? 'Cambiar ubicación del lote' : 'Change field location'}
          aria-label={lang === 'es' ? 'Editar lote' : 'Edit field'}
        >
          <Pencil className="w-4 h-4 text-[#0f3260] dark:text-sky-400" />
        </button>
      </div>

      {/* 2. Main Diagnostic Row: Hero Soil Water (5 cols) + Rearranged Dense Summary (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Hero Card: Soil Moisture & Sowing Suitability */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1c1c1e] p-5 border border-slate-300 dark:border-[#2e2e33] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {lang === 'es' ? 'Agua Útil en Suelo (0-100 cm)' : 'Available Soil Water (0-100 cm)'}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                SMAP + SAOCOM
                <DemoBadge lang={lang} />
              </span>
            </div>

            <div className="flex items-baseline gap-4 mt-3">
              <div className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {smapRootMoisture}%
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {lang === 'es' ? 'Capacidad de Campo óptima:' : 'Optimal Field Capacity:'}
                </span>
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-zinc-200">
                  42% útil
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {lang === 'es' ? 'Superficial (0-5 cm):' : 'Topsoil (0-5 cm):'} <span className="font-mono font-semibold text-slate-700 dark:text-zinc-300">{smapSurfaceMoisture}%</span>
                </span>
              </div>
            </div>

            {/* Visual Gauge Bar */}
            <div className="mt-4 w-full bg-slate-100 dark:bg-[#252528] h-2.5 border border-slate-200 dark:border-[#333336] overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  suitability.type === 'critical' ? 'bg-red-500' : suitability.type === 'moderate' ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, (smapRootMoisture / 45) * 100)}%` }}
              />
            </div>
          </div>

          {/* Suitability Status Badge & Text */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#2e2e33]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                {lang === 'es' ? 'Aptitud de Siembra:' : 'Sowing Suitability:'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold ${
                suitability.type === 'critical' 
                  ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                  : suitability.type === 'moderate'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}>
                {suitability.type === 'optimal' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {suitability.label}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed bg-slate-50 dark:bg-[#232326] p-2.5 border border-slate-200 dark:border-[#2e2e33]">
              {suitability.text}
            </p>
          </div>
        </div>

        {/* Right Column: Rearranged Gapless Dashboard (NASA Telemetry + Weather + Alerts + Field Setup) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-3">
          {/* Row 1: 3 NASA Space Telemetry Cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* 1. NASA SMAP Topsoil */}
            <div className="bg-white dark:bg-[#1c1c1e] p-3 border border-slate-300 dark:border-[#2e2e33] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
                <span className="truncate">{lang === 'es' ? 'Humedad' : 'Moisture'}</span>
                <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              </div>
              <div className="mt-1.5 text-xl font-black font-mono text-slate-900 dark:text-white">
                {smapSurfaceMoisture}%
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 truncate">
                NASA SMAP 0-5cm
              </div>
            </div>

            {/* 2. NASA ECOSTRESS Canopy Stress */}
            <div className="bg-white dark:bg-[#1c1c1e] p-3 border border-slate-300 dark:border-[#2e2e33] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
                <span className="truncate">{lang === 'es' ? 'Estrés ESI' : 'Canopy Stress'}</span>
                <Activity className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </div>
              <div className="mt-1.5 text-xl font-black font-mono text-slate-900 dark:text-white">
                {ecostressStress}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 truncate">
                NASA ECOSTRESS
              </div>
            </div>

            {/* 3. NASA GPM Rainfall 30d */}
            <div className="bg-white dark:bg-[#1c1c1e] p-3 border border-slate-300 dark:border-[#2e2e33] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
                <span className="truncate">{lang === 'es' ? 'Lluvia 30d' : '30d Rain'}</span>
                <CloudRain className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              </div>
              <div className="mt-1.5 text-xl font-black font-mono text-slate-900 dark:text-white">
                {gpmRainfall30d} <span className="text-xs font-normal text-slate-500">mm</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 truncate">
                NASA GPM IMERG
              </div>
            </div>
          </div>

          {/* Row 2: 2 Operational Summary Cards (Weather & Basin Alerts) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Summary Card 1: Clima & Pulverización (SMN) */}
            <div className="bg-white dark:bg-[#1c1c1e] p-3.5 border border-slate-300 dark:border-[#2e2e33] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                    {lang === 'es' ? 'Clima & Pulverización' : 'Weather & Spraying'}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                    SMN
                    <DemoBadge lang={lang} />
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                      {weatherSnapshot.temp}°C
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                      {weatherSnapshot.tempMin}°/{weatherSnapshot.tempMax}°
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-semibold">{weatherSnapshot.windSpeed} km/h</span>
                    <span className="text-[10px] text-slate-500">{weatherSnapshot.windDir}</span>
                  </div>
                </div>

                <div className="mt-2 text-xs flex items-center justify-between text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-[#232326] p-2 border border-slate-200 dark:border-[#2e2e33]">
                  <span>{lang === 'es' ? 'Lluvia 7d:' : '7d Rain:'} <strong className="font-mono text-slate-800 dark:text-zinc-200">{weatherSnapshot.rain7d} mm</strong></span>
                  <span className={`text-[11px] font-bold ${
                    weatherSnapshot.sprayStatus === 'optimal' 
                      ? 'text-emerald-700 dark:text-emerald-400' 
                      : 'text-amber-700 dark:text-amber-400'
                  }`}>
                    {weatherSnapshot.sprayLabel}
                  </span>
                </div>
              </div>

              {onNavigateToWeather && (
                <button
                  type="button"
                  id="home-summary-weather-btn"
                  onClick={onNavigateToWeather}
                  className="mt-2 text-xs font-bold text-[#0f3260] dark:text-sky-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-[#2a2a2e] cursor-pointer transition-colors"
                >
                  <span>{lang === 'es' ? 'Ver pronóstico y radar' : 'View full weather'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Summary Card 2: Alertas Activas en la Cuenca */}
            <div className="bg-white dark:bg-[#1c1c1e] p-3.5 border border-slate-300 dark:border-[#2e2e33] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    {lang === 'es' ? 'Señales Hidroclimáticas' : 'Basin Signals'}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 ${
                    criticalCount > 0
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-[#252528] dark:text-zinc-300'
                  }`}>
                    {alerts ? alerts.length : 0} {lang === 'es' ? 'activas' : 'active'}
                  </span>
                </div>

                <div className="mt-2">
                  {topAlert ? (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                        {topAlert.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Waves className="w-3 h-3 text-sky-500 shrink-0" />
                        <span className="truncate">{topAlert.observationLocationName} ({topAlert.distanceKm} km)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-zinc-400 py-1">
                      {lang === 'es' ? 'Parámetros hidrológicos en rango normal' : 'Hydrological parameters within normal range'}
                    </div>
                  )}
                </div>

                <div className="mt-2 text-xs bg-slate-50 dark:bg-[#232326] p-2 border border-slate-200 dark:border-[#2e2e33] text-slate-600 dark:text-zinc-400 truncate">
                  <strong className="text-slate-800 dark:text-zinc-200">
                    {lang === 'es' ? 'Cuenca:' : 'Basin:'}
                  </strong> {farmProfile.location.basinName}
                </div>
              </div>

              {onNavigateToAlerts && (
                <button
                  type="button"
                  id="home-summary-alerts-btn"
                  onClick={onNavigateToAlerts}
                  className="mt-2 text-xs font-bold text-[#0f3260] dark:text-sky-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-[#2a2a2e] cursor-pointer transition-colors"
                >
                  <span>{lang === 'es' ? 'Ver detalle de alertas' : 'View early warnings'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* 3. Combined Block (Image 1 Request): Farmer Priority + Resulting Recommended Strategy in One Subdivided Container */}
      <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] shadow-xs divide-y divide-slate-200 dark:divide-[#2e2e33]">
        {/* Subdivision A: Prioridad del Productor */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {lang === 'es' ? 'Prioridad del Productor' : 'Farmer Priorities'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                {lang === 'es' ? 'Selecciona tu objetivo de campaña para orientar la rotación del lote' : 'Select your seasonal target to tailor crop sequence options'}
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 shrink-0">
              {lang === 'es' ? 'Pilar NASA Field Shift' : 'NASA Field Shift Pillar'}
            </span>
          </div>

          {/* Clean Priority Switcher Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
            {prioritiesList.map((item) => {
              const isSelected = farmProfile.priority === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`priority-btn-${item.id}`}
                  onClick={() => {
                    onChangeProfile({ ...farmProfile, priority: item.id });
                    notifyChange();
                  }}
                  className={`p-3 text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                    isSelected 
                      ? 'bg-[#0f3260] text-white border-[#0f3260] dark:bg-[#27272a] dark:border-sky-500 shadow-xs' 
                      : 'bg-slate-50 dark:bg-[#232326] text-slate-800 dark:text-zinc-300 border-slate-200 dark:border-[#2e2e33] hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                  }`}
                >
                  <div className={`p-1.5 ${isSelected ? 'bg-white/20 text-white' : 'bg-white dark:bg-[#1c1c1e] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#38383e]'}`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {item.label}
                    </div>
                    <div className={`text-[10px] ${isSelected ? 'text-blue-100 dark:text-zinc-300' : 'text-slate-500 dark:text-zinc-400'}`}>
                      {isSelected ? (lang === 'es' ? 'Activo' : 'Active') : (lang === 'es' ? 'Seleccionar' : 'Select')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subdivision B: Estrategia Recomendada (Directly linked to selected priority) */}
        <div className="p-4 sm:p-5 bg-slate-50/60 dark:bg-[#202023]/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#0f3260] text-white dark:bg-[#252528] dark:text-sky-300">
                  {lang === 'es' ? 'Estrategia Recomendada' : 'Recommended Strategy'}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                  Field Shift
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {strategy.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                {strategy.desc}
              </p>

              <div className="flex items-center gap-3 pt-1">
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Agua preservada:' : 'Water saved:'}</span>
                  <span className="font-mono font-bold text-[#0f3260] dark:text-sky-400">{strategy.benefitWater}</span>
                </div>
                <span className="text-slate-300 dark:text-zinc-600">•</span>
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Aporte al suelo:' : 'Soil gain:'}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{strategy.benefitSoil}</span>
                </div>
              </div>
            </div>

            {onNavigateToOptimizer && (
              <button
                type="button"
                id="home-view-optimizer-btn"
                onClick={onNavigateToOptimizer}
                className="px-4 py-2.5 bg-[#0f3260] text-white dark:bg-sky-500 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider hover:bg-[#0a2344] dark:hover:bg-sky-400 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>{lang === 'es' ? 'Ver Planes en Optimizador' : 'Explore in Optimizer'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Location Modal */}
      <EditFarmModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        currentLocation={farmProfile.location}
        onSaveLocation={(updatedLocation) => {
          onChangeProfile({ ...farmProfile, location: updatedLocation });
          notifyChange();
        }}
        lang={lang}
      />
    </div>
  );
};
