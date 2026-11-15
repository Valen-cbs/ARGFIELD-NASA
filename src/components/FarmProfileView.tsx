import { DemoBadge } from './DemoBadge';
import { SatelliteReadings } from './SatelliteReadings';
import { SatelliteReading } from '../types/satellite';
import React, { useState, useMemo } from 'react';
import { FarmProfile, MainCrop, SoilType, FarmerPriority, Alert } from '../types';
import { CROPS_DATABASE, SOIL_DATABASE } from '../data/crops';
import { EditFarmModal } from './EditFarmModal';
import { RegisteredFarm } from './FarmRegistryModal';
import { WeatherBrief } from '../services/weatherAlerts';
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
  readings: SatelliteReading[];
  onRefreshData: () => void;
  isOffline: boolean;
  onChangeProfile: (profile: FarmProfile) => void;
  onOpenExport?: () => void;
  onNavigateToOptimizer?: () => void;
  onNavigateToAlerts?: () => void;
  onNavigateToWeather?: () => void;
  onOpenEditLocation?: () => void;
  lang: 'es' | 'en';
  farms: RegisteredFarm[];
  activeFarmId: string | null;
  onManageFarms: () => void;
  onSelectFarm: (farm: RegisteredFarm) => void;
  weatherSummary: WeatherBrief | null;
}

export const FarmProfileView: React.FC<FarmProfileViewProps> = ({
  farmProfile,
  alerts,
  readings,
  onRefreshData,
  isOffline,
  onChangeProfile,
  onOpenExport,
  onNavigateToOptimizer,
  onNavigateToAlerts,
  onNavigateToWeather,
  onOpenEditLocation,
  lang,
  farms,
  activeFarmId,
  onManageFarms,
  onSelectFarm,
  weatherSummary
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const notifyChange = () => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const soilKeys = Object.keys(SOIL_DATABASE) as SoilType[];
  const cropKeys = Object.keys(CROPS_DATABASE) as MainCrop[];

  const currentSoil = SOIL_DATABASE[farmProfile.soilType];
  const currentCrop = CROPS_DATABASE[farmProfile.currentCrop];

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
          benefitWater: lang === 'es' ? 'No estimado' : 'Not estimated',
          benefitSoil: lang === 'es' ? 'Sin medición local' : 'No local measurement',
          desc: lang === 'es' 
            ? 'La cobertura de vicia frena la evaporación directa, acumula agua en el perfil y aporta nitrógeno biológico al maíz.' 
            : 'Vetch cover halts surface evaporation, preserves root moisture, and supplies biological nitrogen.'
        };
      case 'build_soil_organic':
        return {
          title: lang === 'es' ? 'Centeno de Cobertura → Soja de 1ra → Trigo / Soja 2da' : 'Cereal Rye Cover → 1st Soybean → Wheat/Soybean',
          benefitWater: lang === 'es' ? 'No estimado' : 'Not estimated',
          benefitSoil: lang === 'es' ? 'Sin medición local' : 'No local measurement',
          desc: lang === 'es' 
            ? 'Aporte constante de raíces fasciculadas que incrementan carbono activo y descompactan el perfil de suelo.' 
            : 'Dense fibrous root system building active carbon and loosening topsoil structure.'
        };
      case 'drought_resilience':
        return {
          title: lang === 'es' ? 'Sorgo Granífero → Vicia → Girasol' : 'Grain Sorghum → Vetch → Sunflower',
          benefitWater: lang === 'es' ? 'No estimado' : 'Not estimated',
          benefitSoil: lang === 'es' ? 'Sin medición local' : 'No local measurement',
          desc: lang === 'es' 
            ? 'Especies con enraizamiento profundo (>2 metros) y alta rusticidad ante golpes de calor y sequías prolongadas.' 
            : 'Deep-rooted resilient species capable of tapping subsoil moisture during heat shocks.'
        };
      case 'erosion_control':
        return {
          title: lang === 'es' ? 'Avena y Vicia Asociadas → Maíz con Rastrojo Permanente' : 'Oats & Vetch Mix → Maize under No-Till',
          benefitWater: lang === 'es' ? 'No estimado' : 'Not estimated',
          benefitSoil: lang === 'es' ? 'Sin medición local' : 'No local measurement',
          desc: lang === 'es' 
            ? 'Suelo protegido los 365 días del año para frenar el viento en suelos arenosos y escorrentías en pendientes.' 
            : 'Continuous soil cover year-round stopping wind erosion on lighter soils and runoff on slopes.'
        };
      case 'maximize_margin':
      default:
        return {
          title: lang === 'es' ? 'Cebada Cervecera → Soja de 2da → Maíz Temprano' : 'Malting Barley → 2nd Soybean → Early Maize',
          benefitWater: lang === 'es' ? 'No estimado' : 'Not estimated',
          benefitSoil: lang === 'es' ? 'Sin medición local' : 'No local measurement',
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

  if (farms.length === 0) return <div className="mx-auto max-w-2xl border border-slate-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-[#1c1c1e] sm:p-10">
    <Compass className="mx-auto h-10 w-10 text-[#0f3260] dark:text-sky-300" />
    <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{lang === 'es' ? 'Empezá por registrar tu estancia' : 'Start by registering your farm'}</h1>
    <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600 dark:text-zinc-400">{lang === 'es' ? 'Guardá su ubicación, superficie y cultivos. ArgField usará esos datos para consultar el clima y las fuentes ambientales disponibles para el punto.' : 'Save its location, area and crops. ArgField will use them to query weather and environmental sources available for the point.'}</p>
    <button type="button" onClick={onManageFarms} className="mt-5 bg-[#0f3260] px-5 py-3 text-sm font-bold text-white">{lang === 'es' ? 'Registrar estancia' : 'Register farm'}</button>
  </div>;

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

        <div className="flex items-center gap-2">
        {onOpenExport && <button id="home-export-report-btn" type="button" onClick={onOpenExport} className="px-2 py-2 text-xs font-bold text-[#0f3260] dark:text-sky-300 border border-slate-300 dark:border-zinc-700 cursor-pointer">{lang === 'es' ? 'Exportar informe' : 'Export report'}</button>}
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
      </div>

      {farms.length > 1 && <label className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-[#1c1c1e]">{lang === 'es' ? 'Estancia activa' : 'Active farm'}<select value={activeFarmId ?? ''} onChange={event => { const farm = farms.find(item => item.id === event.target.value); if (farm) onSelectFarm(farm); }} className="border border-slate-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.profile.location.name}</option>)}</select><button type="button" onClick={onManageFarms} className="ml-auto font-bold text-[#0f3260] dark:text-sky-300">{lang === 'es' ? 'Gestionar' : 'Manage'}</button></label>}
      {farms.length === 1 && <button type="button" onClick={onManageFarms} className="border border-slate-300 bg-white px-3 py-2 text-left text-xs font-bold text-[#0f3260] dark:border-zinc-700 dark:bg-[#1c1c1e] dark:text-sky-300">{lang === 'es' ? 'Gestionar estancias' : 'Manage farms'}</button>}
      {farmProfile.cropAllocations && farmProfile.cropAllocations.length > 0 && <section className="border border-slate-300 bg-white p-4 dark:border-zinc-700 dark:bg-[#1c1c1e]"><h2 className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-zinc-300">{lang === 'es' ? 'Cultivos registrados' : 'Registered crops'}</h2><div className="mt-2 flex flex-wrap gap-2">{farmProfile.cropAllocations.map(item => <span key={item.crop} className="border border-slate-200 px-2.5 py-1 text-xs dark:border-zinc-700">{item.crop} · {item.hectares.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US')} ha</span>)}</div></section>}

      <SatelliteReadings readings={readings} lang={lang} onRefresh={onRefreshData} offline={isOffline} onLocateField={() => onOpenEditLocation ? onOpenEditLocation() : setShowEditModal(true)} />

      <section className="grid gap-px border border-slate-300 bg-slate-200 dark:border-zinc-700 dark:bg-zinc-700 sm:grid-cols-3">
        <div className="bg-white p-4 dark:bg-[#1c1c1e]"><div className="text-[11px] font-bold uppercase text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Clima actual · Open-Meteo' : 'Current weather · Open-Meteo'}</div>{weatherSummary ? <><div className="mt-1 text-2xl font-bold">{weatherSummary.temperature.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { maximumFractionDigits: 1 })} °C</div><div className="text-xs text-slate-600 dark:text-zinc-400">{lang === 'es' ? 'Humedad' : 'Humidity'}: {weatherSummary.humidity ?? '—'}%</div></> : <div className="mt-2 text-xs text-slate-500">{lang === 'es' ? 'Pronóstico no disponible para este punto.' : 'Forecast unavailable for this point.'}</div>}</div>
        <div className="bg-white p-4 dark:bg-[#1c1c1e]"><div className="text-[11px] font-bold uppercase text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Temperatura de hoy' : 'Today’s temperature'}</div><div className="mt-1 text-lg font-bold">{weatherSummary?.todayMin ?? '—'}° / {weatherSummary?.todayMax ?? '—'}°C</div><div className="text-xs text-slate-600 dark:text-zinc-400">{lang === 'es' ? 'Mínima / máxima pronosticada' : 'Forecast minimum / maximum'}</div></div>
        <div className="bg-white p-4 dark:bg-[#1c1c1e]"><div className="text-[11px] font-bold uppercase text-slate-500 dark:text-zinc-400">{lang === 'es' ? 'Lluvia · próximos 3 días' : 'Rain · next 3 days'}</div><div className="mt-1 text-lg font-bold">{weatherSummary?.nextThreeDayRain?.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { maximumFractionDigits: 1 }) ?? '—'} mm</div><div className="text-xs text-slate-600 dark:text-zinc-400">{weatherSummary?.updatedAt ? `${lang === 'es' ? 'Actualizado' : 'Updated'} ${new Date(weatherSummary.updatedAt).toLocaleString(lang === 'es' ? 'es-AR' : 'en-US')}` : lang === 'es' ? 'Fecha no disponible' : 'Date unavailable'}</div></div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33]">
        <div className="text-xs text-slate-700 dark:text-zinc-300">
          <strong>{criticalCount} {lang === 'es' ? 'avisos de prioridad alta' : 'high priority notices'}</strong>
          <p className="mt-1">{topAlert?.title ?? (lang === 'es' ? 'Sin avisos generados. Revisá la cobertura y la fecha de cada fuente.' : 'No notices generated. Check coverage and dates for each source.')}</p>
        </div>
        <button type="button" onClick={onNavigateToAlerts} className="text-xs font-bold text-[#0f3260] dark:text-sky-300 cursor-pointer">{lang === 'es' ? 'Ver avisos' : 'View notices'}</button>
        <button type="button" onClick={onNavigateToWeather} className="flex items-center gap-2 text-xs font-bold text-[#0f3260] dark:text-sky-300 cursor-pointer">{lang === 'es' ? 'Ver clima' : 'View weather'}</button>
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
{lang === 'es' ? 'Orientación de manejo' : 'Management guidance'}
                </span>
                <DemoBadge lang={lang} />
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
