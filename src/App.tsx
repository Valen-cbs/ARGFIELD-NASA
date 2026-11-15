import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, AppTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MapComponent } from './components/Map';
import { AlertsView } from './components/AlertsView';
import { RotationStrategies } from './components/RotationStrategies';
import { FarmProfileView } from './components/FarmProfileView';
import { AgenciesView } from './components/AgenciesView';
import { AlertDetailModal } from './components/AlertDetailModal';
import { EditFarmModal } from './components/EditFarmModal';
import { FarmRegistryModal, RegisteredFarm } from './components/FarmRegistryView';
import { AboutModal } from './components/AboutModal';
import { ExportReportModal } from './components/ExportReportModal';
import { LandingView } from './components/LandingView';
import { WeatherView } from './components/WeatherView';
import { DemoBanner } from './components/DemoBadge';
import { PRESET_FARMS } from './data/regions';
import { Alert, FarmLocation, FarmProfile, LatLng } from './types';
import { useSatelliteData } from './services/dataLoader';
import { deriveSatelliteAlerts } from './services/satelliteAlerts';
import { generateRotationStrategies } from './services/rotationOptimizer';
import { useRotationEngine } from './services/rotationEngineAdapter';
import { determineBasin, determineRegion, isWithinArgentina } from './services/geo';
import { useOpenMeteoDashboard } from './services/weatherAlerts';

const STORAGE_PROFILE_KEY = 'field_shift_farm_profile';
const STORAGE_OFFLINE_KEY = 'field_shift_is_offline';
const STORAGE_TAB_KEY = 'field_shift_active_tab';
const STORAGE_LANDING_SEEN = 'field_shift_landing_seen';
const STORAGE_THEME_KEY = 'field_shift_theme';
const STORAGE_FARMS_KEY = 'argfield_registered_farms';
const STORAGE_ACTIVE_FARM_KEY = 'argfield_active_farm';

function readRegisteredFarms(): RegisteredFarm[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_FARMS_KEY) ?? '[]');
    if (Array.isArray(saved)) {
      const valid = saved.filter(item => typeof item?.id === 'string' && item?.profile?.location && typeof item.profile.fieldSizeHectares === 'number');
      if (valid.length) return valid;
    }
    const legacy = JSON.parse(localStorage.getItem(STORAGE_PROFILE_KEY) ?? 'null') as FarmProfile | null;
    if (legacy?.location?.name && !['Mi establecimiento', 'My Farm'].includes(legacy.location.name) && Number(legacy.fieldSizeHectares) > 0) {
      return [{ id: 'legacy-farm', profile: legacy }];
    }
  } catch { /* malformed saved data starts with an empty registry */ }
  return [];
}

export default function App() {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_THEME_KEY) === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  // Landing state: shown first time or if requested via route/button
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    if (window.location.hash === '#landing' || window.location.pathname.includes('/landing')) {
      return true;
    }
    return readRegisteredFarms().length === 0;
  });
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const saved = localStorage.getItem(STORAGE_TAB_KEY) as AppTab;
    if (saved && ['home', 'clima', 'alertas', 'mapa', 'fuentes', 'optimizador'].includes(saved)) {
      return saved;
    }
    return 'home';
  });

  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_OFFLINE_KEY) === 'true';
  });

  const [farms, setFarms] = useState<RegisteredFarm[]>(readRegisteredFarms);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(() => {
    const savedId = localStorage.getItem(STORAGE_ACTIVE_FARM_KEY);
    const records = readRegisteredFarms();
    return records.some(farm => farm.id === savedId) ? savedId : records[0]?.id ?? null;
  });

  // Farm Profile based on the selected registered farm, with legacy profile migration.
  const [farmProfile, setFarmProfileState] = useState<FarmProfile>(() => {
    try {
      const savedFarms = JSON.parse(localStorage.getItem(STORAGE_FARMS_KEY) ?? '[]');
      const activeId = localStorage.getItem(STORAGE_ACTIVE_FARM_KEY);
      const active = Array.isArray(savedFarms) ? savedFarms.find((farm: RegisteredFarm) => farm.id === activeId) : null;
      if (active?.profile) return active.profile;
    } catch { /* fall through to the saved single-farm profile */ }
    const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached farm profile', e);
      }
    }
    return {
      location: {
        ...PRESET_FARMS[0],
        name: 'Mi establecimiento'
      },
      fieldSizeHectares: 850,
      currentCrop: 'soybean',
      soilType: 'mollisol_deep',
      irrigation: 'dryland',
      priority: 'conserve_moisture'
    };
  });

  const setFarmProfile = (value: FarmProfile | ((previous: FarmProfile) => FarmProfile)) => {
    const updated = typeof value === 'function' ? value(farmProfile) : value;
    setFarmProfileState(updated);
    if (activeFarmId) setFarms(previous => previous.map(farm => farm.id === activeFarmId ? { ...farm, profile: updated } : farm));
  };

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showFarmModal, setShowFarmModal] = useState<boolean>(false);
  const [showRegistryModal, setShowRegistryModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [showDemoBanner, setShowDemoBanner] = useState<boolean>(true);

  // Sync hash routing for landing
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#landing') {
        setShowLanding(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    if (activeFarmId) localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(farmProfile));
  }, [farmProfile, activeFarmId]);

  useEffect(() => { localStorage.setItem(STORAGE_FARMS_KEY, JSON.stringify(farms)); }, [farms]);
  useEffect(() => { if (activeFarmId) localStorage.setItem(STORAGE_ACTIVE_FARM_KEY, activeFarmId); else localStorage.removeItem(STORAGE_ACTIVE_FARM_KEY); }, [activeFarmId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_OFFLINE_KEY, String(isOffline));
  }, [isOffline]);

  useEffect(() => {
    localStorage.setItem(STORAGE_TAB_KEY, activeTab);
  }, [activeTab]);

  const satelliteData = useSatelliteData(farmProfile.location, isOffline || showLanding || !activeFarmId);

  const handleSaveFarm = (profile: FarmProfile, id?: string) => {
    const farmId = id ?? `farm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = { id: farmId, profile };
    setFarms(previous => id ? previous.map(farm => farm.id === id ? record : farm) : [...previous, record]);
    setActiveFarmId(farmId);
    setFarmProfileState(profile);
    setShowRegistryModal(false);
    setShowLanding(false);
    localStorage.setItem(STORAGE_LANDING_SEEN, 'true');
  };
  const handleSelectFarm = (farm: RegisteredFarm) => { setActiveFarmId(farm.id); setFarmProfileState(farm.profile); };
  const handleDeleteFarm = (farm: RegisteredFarm) => {
    const remaining = farms.filter(item => item.id !== farm.id);
    setFarms(remaining);
    if (farm.id === activeFarmId) {
      const next = remaining[0];
      setActiveFarmId(next?.id ?? null);
      if (next) setFarmProfileState(next.profile);
      else setShowLanding(true);
    }
  };

  // Only dated, current provider readings can generate follow-up alerts.
  const weatherData = useOpenMeteoDashboard(farmProfile, Boolean(activeFarmId) && !isOffline && !showLanding);
  const weatherAlerts = weatherData.alerts;
  const alerts: Alert[] = useMemo(() => {
    return [...deriveSatelliteAlerts(satelliteData.readings, farmProfile), ...weatherAlerts].sort((a, b) => b.score - a.score);
  }, [farmProfile, satelliteData.readings, weatherAlerts]);

  const criticalCount = useMemo(() => {
    return alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  }, [alerts]);

  // Motor cuantitativo de rotaciones: datos NASA POWER + MAGyP + lecturas satelitales
  // ya validadas; si no puede ejecutarse, cae al generador cualitativo previo.
  const rotationEngine = useRotationEngine(farmProfile, satelliteData.readings, Boolean(activeFarmId) && !showLanding);
  const fallbackPlans = useMemo(() => {
    return generateRotationStrategies(farmProfile, alerts);
  }, [farmProfile, alerts]);
  const rotationPlans = rotationEngine.engine ? rotationEngine.plans : fallbackPlans;

  // Handle map click location change
  const handleMapClick = (coords: LatLng) => {
    if (!isWithinArgentina(coords.lat, coords.lng)) return;
    const region = determineRegion(coords.lat, coords.lng);
    const basin = determineBasin(coords.lat, coords.lng);
    setFarmProfile({
      ...farmProfile,
      location: {
        name: farmProfile.location.name || 'Mi establecimiento',
        province: region === 'norte' ? 'Norte Argentino' : region === 'sur' ? 'Patagonia' : 'Región Pampeana',
        region,
        lat: coords.lat,
        lng: coords.lng,
        basinId: basin.id,
        basinName: basin.name,
        mainRiver: basin.mainRiver,
        aquifer: basin.aquifer
      }
    });
  };

  const handleSelectPreset = (preset: FarmLocation) => {
    if (!isWithinArgentina(preset.lat, preset.lng)) return;
    setFarmProfile({
      ...farmProfile,
      location: preset
    });
  };

  // When location is confirmed on Landing page
  const handleConfirmLandingLocation = (location: FarmLocation, agriculturalData: Pick<FarmProfile, 'producerName' | 'fieldSizeHectares' | 'currentCrop' | 'cropAllocations' | 'previousCrop' | 'previousCrops' | 'irrigationAvailable'>) => {
    const updatedProfile: FarmProfile = {
      ...farmProfile,
      ...agriculturalData,
      location,
      irrigation: agriculturalData.irrigationAvailable ? farmProfile.irrigation : 'dryland'
    };
    if (!activeFarmId) handleSaveFarm(updatedProfile);
    else {
      setFarmProfile(updatedProfile);
      setShowLanding(false);
    }
    localStorage.setItem(STORAGE_LANDING_SEEN, 'true');
    if (window.location.hash === '#landing') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleOpenLanding = () => {
    setShowLanding(true);
    window.location.hash = 'landing';
  };

  // If user is on landing page
  if (showLanding) {
    return (
      <>
        <LandingView
          currentLocation={farmProfile.location}
          currentProfile={activeFarmId ? farmProfile : undefined}
          onConfirmLocation={handleConfirmLandingLocation}
          onManageFarms={farms.length ? () => setShowRegistryModal(true) : undefined}
          lang={lang}
        />
        <FarmRegistryModal open={showRegistryModal} lang={lang} farms={farms} activeFarmId={activeFarmId} template={farmProfile} onClose={() => setShowRegistryModal(false)} onSelect={farm => { handleSelectFarm(farm); setShowLanding(false); }} onSave={handleSaveFarm} onDelete={handleDeleteFarm} />
      </>
    );
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDarkMode ? 'dark bg-[#121212] text-zinc-100' : 'bg-[#f4f6f8] text-slate-800'} font-sans antialiased selection:bg-zinc-700 selection:text-white`}>
      {/* Official Government Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        criticalAlertsCount={criticalCount}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline(!isOffline)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenLanding={handleOpenLanding}
        onOpenAbout={() => setShowAboutModal(true)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'es' ? 'en' : 'es')}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden bg-[#f4f6f8] dark:bg-[#121212] transition-colors">
        {/* Government Top Header */}
        <TopBar
          activeTab={activeTab}
          lang={lang}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          {showDemoBanner && activeTab !== 'mapa' && activeTab !== 'fuentes' && activeTab !== 'clima' && (
            <DemoBanner
              lang={lang}
              onGoToMap={() => setActiveTab('mapa')}
              onDismiss={() => setShowDemoBanner(false)}
            />
          )}

          {/* Tab 1: Inicio */}
          {activeTab === 'home' && (
            <FarmProfileView
              farmProfile={farmProfile}
              alerts={alerts}
              readings={satelliteData.readings}
              onRefreshData={satelliteData.refresh}
              isOffline={isOffline}
              onChangeProfile={setFarmProfile}
              farms={farms}
              activeFarmId={activeFarmId}
              onManageFarms={() => setShowRegistryModal(true)}
              onSelectFarm={handleSelectFarm}
              weatherSummary={weatherData.summary}
              forecast={weatherData.forecast}
              rotationEngine={rotationEngine}
              onOpenExport={() => setShowExportModal(true)}
              onNavigateToOptimizer={() => setActiveTab('optimizador')}
              onNavigateToAlerts={() => setActiveTab('alertas')}
              onNavigateToWeather={() => setActiveTab('clima')}
              onOpenEditLocation={() => setShowFarmModal(true)}
              lang={lang}
            />
          )}

          {/* Tab Clima (directamente abajo de Inicio) */}
          {activeTab === 'clima' && activeFarmId && (
            <WeatherView
              farmProfile={farmProfile}
              onChangeFarmLocation={handleSelectPreset}
              onOpenEditLocation={() => setShowFarmModal(true)}
              isOffline={isOffline || !activeFarmId}
              lang={lang}
            />
          )}

          {/* Tab 2: Alertas */}
          {activeTab === 'alertas' && activeFarmId && (
            <AlertsView
              alerts={alerts}
              readings={satelliteData.readings}
              loadingData={satelliteData.loading}
              onSelectAlert={setSelectedAlert}
              lang={lang}
            />
          )}

          {/* Tab 3: Mapa */}
          {activeTab === 'mapa' && activeFarmId && (
            <div className="h-full flex flex-col space-y-3">
              <div className="flex-1 min-h-[460px] sm:min-h-[520px]">
                <MapComponent
                  farmLocation={farmProfile.location}
                  alerts={alerts}
                  readings={satelliteData.readings}
                  isOffline={isOffline}
                  onSelectAlert={setSelectedAlert}
                  onSelectFarm={() => setShowFarmModal(true)}
                  onMapClickSetLocation={handleMapClick}
                  onSelectPreset={handleSelectPreset}
                  onOpenExport={() => setShowExportModal(true)}
                  isDarkMode={isDarkMode}
                  lang={lang}
                />
              </div>
            </div>
          )}

          {/* Tab 4: Fuentes */}
          {activeTab === 'fuentes' && (
            <AgenciesView lang={lang} />
          )}

          {/* Tab 5: Optimizador */}
          {activeTab === 'optimizador' && activeFarmId && (
            <RotationStrategies
              plans={rotationPlans}
              farmProfile={farmProfile}
              lang={lang}
              quantitative={rotationEngine.status === 'ready' && rotationEngine.plans.length > 0}
              engineResult={rotationEngine.engine}
              engineError={rotationEngine.error}
              engineWarnings={rotationEngine.engine?.warnings ?? []}
              onNavigateToHome={() => setActiveTab('home')}
              onOpenExport={() => setShowExportModal(true)}
            />
          )}
        </main>
      </div>

      {/* Alert Detail Modal */}
      <AlertDetailModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onGoToRotations={() => {
          setSelectedAlert(null);
          setActiveTab('optimizador');
        }}
        lang={lang}
      />

      {/* Farm Profile / Location Modal (opened from map or anywhere) */}
      <EditFarmModal
        isOpen={showFarmModal}
        onClose={() => setShowFarmModal(false)}
        currentLocation={farmProfile.location}
        onSaveLocation={(newLocation) => {
          setFarmProfile((prev) => ({
            ...prev,
            location: newLocation
          }));
        }}
        lang={lang}
      />

      <FarmRegistryModal open={showRegistryModal} lang={lang} farms={farms} activeFarmId={activeFarmId} template={farmProfile} onClose={() => setShowRegistryModal(false)} onSelect={handleSelectFarm} onSave={handleSaveFarm} onDelete={handleDeleteFarm} />

      {/* About Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        lang={lang}
      />

      {/* Export Report Modal */}
      {showExportModal && (
        <ExportReportModal
          farmProfile={farmProfile}
          alerts={alerts}
          readings={satelliteData.readings}
          plans={rotationPlans}
          engineState={rotationEngine}
          onClose={() => setShowExportModal(false)}
          lang={lang}
        />
      )}
    </div>
  );
}
