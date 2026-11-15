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
import { AboutModal } from './components/AboutModal';
import { ExportReportModal } from './components/ExportReportModal';
import { LandingView } from './components/LandingView';
import { WeatherView } from './components/WeatherView';
import { DemoBanner } from './components/DemoBadge';
import { PRESET_FARMS } from './data/regions';
import { Alert, FarmLocation, FarmProfile, LatLng } from './types';
import { generateSensorObservations } from './services/dataLoader';
import { scoreObservation } from './services/scoring';
import { generateRotationStrategies } from './services/rotationOptimizer';
import { determineBasin, determineRegion, isWithinArgentina } from './services/geo';

const STORAGE_PROFILE_KEY = 'field_shift_farm_profile';
const STORAGE_OFFLINE_KEY = 'field_shift_is_offline';
const STORAGE_TAB_KEY = 'field_shift_active_tab';
const STORAGE_LANDING_SEEN = 'field_shift_landing_seen';
const STORAGE_THEME_KEY = 'field_shift_theme';

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
    return !localStorage.getItem(STORAGE_LANDING_SEEN);
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

  // Farm Profile based on chosen location
  const [farmProfile, setFarmProfile] = useState<FarmProfile>(() => {
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

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showFarmModal, setShowFarmModal] = useState<boolean>(false);
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
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(farmProfile));
  }, [farmProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_OFFLINE_KEY, String(isOffline));
  }, [isOffline]);

  useEffect(() => {
    localStorage.setItem(STORAGE_TAB_KEY, activeTab);
  }, [activeTab]);

  // Generate and score alerts dynamically based on chosen farm location
  const alerts: Alert[] = useMemo(() => {
    const rawObservations = generateSensorObservations(farmProfile.location);
    const scored = rawObservations.map((obs) => scoreObservation(obs, farmProfile));
    return scored.sort((a, b) => b.score - a.score);
  }, [farmProfile]);

  const criticalCount = useMemo(() => {
    return alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  }, [alerts]);

  // Generate tailored crop rotation strategies based on NASA alerts & farmer profile
  const rotationPlans = useMemo(() => {
    return generateRotationStrategies(farmProfile, alerts);
  }, [farmProfile, alerts]);

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
  const handleConfirmLandingLocation = (location: FarmLocation) => {
    setFarmProfile((prev) => ({
      ...prev,
      location
    }));
    setShowLanding(false);
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
      <LandingView
        currentLocation={farmProfile.location}
        onConfirmLocation={handleConfirmLandingLocation}
        lang={lang}
      />
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
          {showDemoBanner && activeTab !== 'mapa' && activeTab !== 'fuentes' && (
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
              onChangeProfile={setFarmProfile}
              onOpenExport={() => setShowExportModal(true)}
              onNavigateToOptimizer={() => setActiveTab('optimizador')}
              onNavigateToAlerts={() => setActiveTab('alertas')}
              onNavigateToWeather={() => setActiveTab('clima')}
              onOpenEditLocation={() => setShowFarmModal(true)}
              lang={lang}
            />
          )}

          {/* Tab Clima (directamente abajo de Inicio) */}
          {activeTab === 'clima' && (
            <WeatherView
              farmProfile={farmProfile}
              onChangeFarmLocation={handleSelectPreset}
              onOpenEditLocation={() => setShowFarmModal(true)}
              lang={lang}
            />
          )}

          {/* Tab 2: Alertas */}
          {activeTab === 'alertas' && (
            <AlertsView
              alerts={alerts}
              onSelectAlert={setSelectedAlert}
              lang={lang}
            />
          )}

          {/* Tab 3: Mapa */}
          {activeTab === 'mapa' && (
            <div className="h-full flex flex-col space-y-3">
              <div className="flex-1 min-h-[460px] sm:min-h-[520px]">
                <MapComponent
                  farmLocation={farmProfile.location}
                  alerts={alerts}
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
          {activeTab === 'optimizador' && (
            <RotationStrategies
              plans={rotationPlans}
              farmProfile={farmProfile}
              lang={lang}
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
          plans={rotationPlans}
          onClose={() => setShowExportModal(false)}
          lang={lang}
        />
      )}
    </div>
  );
}
