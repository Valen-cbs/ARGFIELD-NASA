import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Satellite, Layers } from 'lucide-react';
import { Alert, FarmLocation, LatLng } from '../types';
import { WIKIMEDIA_FLAGS, AGENCY_TO_COUNTRY } from './FlagIcon';
import { GoogleIcon } from './GoogleIcon';
import { ConaeLayerPanel, ConaeLayerStatus } from './ConaeLayerPanel';
import { CONAE_LAYERS, ConaeLayerId, getConaeLayer, resolveLayerName } from '../data/conaeLayers';
import { isWithinArgentina, determineRegion, determineBasin, haversineDistance, determineLocationName } from '../services/geo';

type LayerMode = 'standard' | 'terrain' | 'satellite';

const LAYER_STORAGE_KEY = 'argfield_map_layer_mode';
const CONAE_LAYER_STORAGE_KEY = 'argfield_conae_layer';
const DEFAULT_CONAE_LAYER: ConaeLayerId = 'estatus_hidrico';
const CONAE_ERROR_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

interface MapProps {
  farmLocation: FarmLocation;
  alerts: Alert[];
  onSelectAlert: (alert: Alert) => void;
  onSelectFarm?: (farm: FarmLocation) => void;
  onMapClickSetLocation?: (coords: LatLng) => void;
  onSelectPreset?: (preset: FarmLocation) => void;
  onOpenExport?: () => void;
  isDarkMode: boolean;
  lang: 'es' | 'en';
}

/**
 * Creates the coordinate inspection popup with location name, coordinates with copy button,
 * distance to farm, and basin context without emojis or edit actions.
 */
function createInspectionPopupElement({
  lat,
  lng,
  locationName,
  inArg,
  distKm,
  basin,
  regionName,
  lang,
  isDark
}: {
  lat: number;
  lng: number;
  locationName: string;
  inArg: boolean;
  distKm: number;
  basin: { name: string; mainRiver: string; aquifer: string };
  regionName: string;
  lang: 'es' | 'en';
  isDark: boolean;
}): HTMLDivElement {
  const container = document.createElement('div');
  container.className = `p-3 text-xs leading-relaxed ${isDark ? 'bg-[#18181b] text-zinc-100' : 'bg-white text-slate-800'}`;
  container.style.minWidth = '270px';
  container.style.maxWidth = '320px';
  container.style.fontFamily = 'inherit';

  container.innerHTML = `
    <!-- Header: Country, Province / State (Replaces generic coordinate inspection title) -->
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid ${isDark ? '#2e2e33' : '#e2e8f0'}; padding-bottom: 6px; margin-bottom: 8px;">
      <div style="font-weight: 700; color: ${isDark ? '#f4f4f5' : '#0f3260'}; font-size: 12px; display: flex; align-items: center; gap: 6px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>${locationName}</span>
      </div>
    </div>

    <!-- Coords row with Copy button (Icon only, on the right) -->
    <div style="display: flex; align-items: center; justify-content: space-between; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; margin-bottom: 8px; background: ${isDark ? '#232326' : '#f8fafc'}; padding: 5px 8px; border: 1px solid ${isDark ? '#2e2e33' : '#e2e8f0'};">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div><span style="color: ${isDark ? '#a1a1aa' : '#64748b'};">Lat:</span> <strong>${lat}°</strong></div>
        <div><span style="color: ${isDark ? '#a1a1aa' : '#64748b'};">Lng:</span> <strong>${lng}°</strong></div>
      </div>
      <button
        id="btn-copy-coords"
        type="button"
        title="${lang === 'es' ? 'Copiar coordenadas' : 'Copy coordinates'}"
        aria-label="${lang === 'es' ? 'Copiar coordenadas' : 'Copy coordinates'}"
        style="padding: 3px 5px; border: 1px solid ${isDark ? '#3f3f46' : '#cbd5e1'}; background: ${isDark ? '#18181b' : '#ffffff'}; color: ${isDark ? '#d4d4d8' : '#334155'}; cursor: pointer; display: flex; align-items: center; justify-content: center;"
      >
        <span id="btn-copy-icon" style="display: flex; align-items: center;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </span>
      </button>
    </div>

    <!-- Distance to Farm -->
    <div style="margin-bottom: ${inArg ? '8px' : '0px'};">
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
        <span style="color: ${isDark ? '#a1a1aa' : '#475569'}; display: flex; align-items: center; gap: 4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12h20"/><path d="M6 12v-3"/><path d="M10 12v-2"/><path d="M14 12v-3"/><path d="M18 12v-2"/>
          </svg>
          ${lang === 'es' ? 'Distancia a tu lote:' : 'Distance to farm:'}
        </span>
        <strong style="font-family: ui-monospace, monospace; color: ${isDark ? '#f4f4f5' : '#0f172a'};">${distKm.toLocaleString()} km</strong>
      </div>
      ${
        inArg && distKm <= 50
          ? `<div style="margin-top: 4px;"><span style="background-color: ${isDark ? '#064e3b' : '#dcfce7'}; color: ${isDark ? '#6ee7b7' : '#15803d'}; border: 1px solid ${isDark ? '#059669' : '#86efac'}; padding: 1px 6px; font-weight: 600; font-size: 10px;">${lang === 'es' ? 'Impacto directo (< 50 km)' : 'Direct impact (< 50 km)'}</span></div>`
          : ''
      }
    </div>

    <!-- Basin and Region info (Strictly inside Argentina, without any emojis) -->
    ${
      inArg
        ? `
        <div style="border-top: 1px solid ${isDark ? '#2e2e33' : '#e2e8f0'}; padding-top: 6px; font-size: 11px;">
          <div style="display: flex; align-items: flex-start; gap: 5px; margin-bottom: 3px;">
            <span style="color: #0284c7; margin-top: 1px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
              </svg>
            </span>
            <span><strong>${lang === 'es' ? 'Cuenca:' : 'Basin:'}</strong> ${basin.name}</span>
          </div>
          <div style="color: ${isDark ? '#a1a1aa' : '#64748b'}; font-size: 10px; margin-left: 17px; margin-bottom: 4px;">
            ${lang === 'es' ? 'Río:' : 'River:'} ${basin.mainRiver} • ${lang === 'es' ? 'Acuífero:' : 'Aquifer:'} ${basin.aquifer}
          </div>
          <div style="display: flex; align-items: center; gap: 5px; margin-left: 1px;">
            <span style="color: #10b981;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
              </svg>
            </span>
            <span style="color: ${isDark ? '#e4e4e7' : '#334155'}; font-size: 10.5px;">${regionName}</span>
          </div>
        </div>
        `
        : ''
    }
  `;

  // Attach event listener to the copy icon button
  const btnCopy = container.querySelector('#btn-copy-coords');
  const iconSpan = container.querySelector('#btn-copy-icon');
  if (btnCopy) {
    btnCopy.addEventListener('click', (ev) => {
      ev.stopPropagation();
      navigator.clipboard.writeText(`${lat}, ${lng}`).then(() => {
        if (iconSpan) {
          iconSpan.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          setTimeout(() => {
            if (iconSpan) {
              iconSpan.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
            }
          }, 1800);
        }
      });
    });
  }

  return container;
}

export const MapComponent: React.FC<MapProps> = ({
  farmLocation,
  alerts,
  onSelectAlert,
  onSelectFarm,
  onMapClickSetLocation,
  onSelectPreset,
  onOpenExport,
  isDarkMode,
  lang
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [layerMode, setLayerMode] = useState<LayerMode>(() => {
    try {
      const saved = localStorage.getItem(LAYER_STORAGE_KEY);
      if (saved === 'standard' || saved === 'terrain' || saved === 'satellite') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'satellite';
  });

  const handleSetLayerMode = (mode: LayerMode) => {
    setLayerMode(mode);
    try {
      localStorage.setItem(LAYER_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  };

  // Capas reales de CONAE (WMS) superpuestas al mapa base
  const conaeTileLayerRef = useRef<L.TileLayer.WMS | null>(null);
  // Abierto en escritorio; cerrado en celular para no tapar el mapa
  const [showConaePanel, setShowConaePanel] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 640
  );
  const [conaeLayerId, setConaeLayerId] = useState<ConaeLayerId | null>(() => {
    try {
      const saved = localStorage.getItem(CONAE_LAYER_STORAGE_KEY);
      if (saved === 'none') return null;
      if (saved && CONAE_LAYERS.some((l) => l.id === saved)) return saved as ConaeLayerId;
    } catch {
      // ignore
    }
    return DEFAULT_CONAE_LAYER;
  });
  const [conaeDay, setConaeDay] = useState(1);
  const [conaeOpacity, setConaeOpacity] = useState(0.7);
  const [conaeStatus, setConaeStatus] = useState<ConaeLayerStatus>('idle');
  const [conaeLoadedAt, setConaeLoadedAt] = useState<Date | null>(null);

  const handleSelectConaeLayer = (id: ConaeLayerId | null) => {
    setConaeLayerId(id);
    try {
      localStorage.setItem(CONAE_LAYER_STORAGE_KEY, id ?? 'none');
    } catch {
      // ignore
    }
  };

  // Keep references to latest callbacks to avoid stale closures in Leaflet events
  const onSelectFarmRef = useRef(onSelectFarm);
  onSelectFarmRef.current = onSelectFarm;
  const onSelectAlertRef = useRef(onSelectAlert);
  onSelectAlertRef.current = onSelectAlert;
  const onMapClickSetLocationRef = useRef(onMapClickSetLocation);
  onMapClickSetLocationRef.current = onMapClickSetLocation;
  const farmLocationRef = useRef(farmLocation);
  farmLocationRef.current = farmLocation;
  const isDarkModeRef = useRef(isDarkMode);
  isDarkModeRef.current = isDarkMode;
  const langRef = useRef(lang);
  langRef.current = lang;

  // Function to open the rich inspection popup at any point
  const handleInspectCoordinates = (latlng: L.LatLng) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = Number(latlng.lat.toFixed(4));
    const lng = Number(latlng.lng.toFixed(4));
    const inArg = isWithinArgentina(lat, lng);
    const distKm = haversineDistance(
      { lat, lng },
      { lat: farmLocationRef.current.lat, lng: farmLocationRef.current.lng }
    );
    const basin = determineBasin(lat, lng);
    const region = determineRegion(lat, lng);
    const locationName = determineLocationName(lat, lng, langRef.current);

    const regionNames: Record<string, { es: string; en: string }> = {
      norte: { es: 'Norte Argentino (Chaco / NEA)', en: 'Northern Argentina (Chaco / NEA)' },
      sur: { es: 'Patagonia', en: 'Patagonia' },
      noa: { es: 'Noroeste Argentino (NOA)', en: 'Northwest Argentina (NOA)' },
      cuyo: { es: 'Cuyo', en: 'Cuyo' },
      centro: { es: 'Región Pampeana Central', en: 'Central Pampas' }
    };
    const regionName = langRef.current === 'es' ? regionNames[region]?.es : regionNames[region]?.en;

    const popupContent = createInspectionPopupElement({
      lat,
      lng,
      locationName,
      inArg,
      distKm,
      basin,
      regionName: regionName || region,
      lang: langRef.current,
      isDark: isDarkModeRef.current
    });

    L.popup({
      offset: [0, -10],
      className: 'official-coord-popup',
      maxWidth: 340
    })
      .setLatLng(latlng)
      .setContent(popupContent)
      .openOn(map);
  };

  // Initialize Map with free panning, exploration, and custom unified controls
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [farmLocation.lat, farmLocation.lng],
      zoom: 7,
      minZoom: 3,
      maxZoom: 19,
      zoomControl: false
    });

    // Single click on empty map: opens rich coordinate inspection
    map.on('click', (e: L.LeafletMouseEvent) => {
      handleInspectCoordinates(e.latlng);
    });

    // Right-click (contextmenu) on map: also displays coordinate inspection
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      handleInspectCoordinates(e.latlng);
    });

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;
    setMapLoaded(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Invalidate map size on window/container resize to prevent gray gaps on mobile
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapContainerRef.current) return;

    map.invalidateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      clearTimeout(timer);
    };
  }, [mapLoaded]);

  // Update Base Layer Tile (Open Source & Free for Commercial Use with Attribution)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let newTileLayer: L.TileLayer;

    if (layerMode === 'terrain') {
      // OpenTopoMap: OpenStreetMap data + SRTM elevation - Free & Open Source
      newTileLayer = L.tileLayer(
        'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        {
          attribution:
            'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a>',
          maxNativeZoom: 17,
          maxZoom: 19,
          subdomains: 'abc'
        }
      );
    } else if (layerMode === 'satellite') {
      // Esri World Imagery: High-resolution satellite imagery - Free for public use with attribution
      newTileLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution:
            '&copy; Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN',
          maxZoom: 19
        }
      );
    } else {
      // OpenStreetMap Standard: 100% Open Data under ODbL, free for commercial use
      newTileLayer = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19
        }
      );
    }

    newTileLayer.addTo(map);
    newTileLayer.bringToBack();
    tileLayerRef.current = newTileLayer;
  }, [layerMode, mapLoaded]);

  // Capa WMS real de CONAE sobre el mapa base
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (conaeTileLayerRef.current) {
      map.removeLayer(conaeTileLayerRef.current);
      conaeTileLayerRef.current = null;
    }

    const layer = getConaeLayer(conaeLayerId);
    if (!layer) {
      setConaeStatus('idle');
      return;
    }

    const wms = L.tileLayer.wms(layer.url, {
      layers: resolveLayerName(layer, conaeDay),
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      opacity: conaeOpacity,
      zIndex: 5,
      // Tile transparente si CONAE no responde, para no mostrar íconos de imagen rota
      errorTileUrl: CONAE_ERROR_TILE,
      attribution: `Capa: &copy; <a href="https://www.argentina.gob.ar/ciencia/conae" target="_blank" rel="noreferrer">CONAE</a> (${layer.source})`
    });

    let tilesOk = 0;
    let tilesFailed = 0;
    setConaeStatus('loading');
    wms.on('loading', () => {
      tilesOk = 0;
      tilesFailed = 0;
      setConaeStatus('loading');
    });
    wms.on('tileload', (e: L.TileEvent) => {
      // Leaflet también dispara tileload cuando carga el tile de reemplazo por error
      if (e.tile.getAttribute('src') !== CONAE_ERROR_TILE) {
        tilesOk += 1;
      }
    });
    wms.on('tileerror', () => {
      tilesFailed += 1;
    });
    wms.on('load', () => {
      if (tilesOk === 0 && tilesFailed > 0) {
        setConaeStatus('error');
      } else {
        setConaeStatus('ok');
        setConaeLoadedAt(new Date());
      }
    });

    wms.addTo(map);
    conaeTileLayerRef.current = wms;

    return () => {
      wms.off();
    };
    // La opacidad se actualiza aparte para no recargar los tiles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conaeLayerId, conaeDay, mapLoaded]);

  useEffect(() => {
    conaeTileLayerRef.current?.setOpacity(conaeOpacity);
  }, [conaeOpacity]);

  // Update markers, 50km & 200km concentric circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Farm Marker (Home Icon with high contrast and badge)
    const farmIconHtml = `
      <div style="background-color: #0f3260; width: 30px; height: 30px; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 2px 6px rgba(0,0,0,0.45); cursor: pointer;" title="${farmLocation.name}">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
    `;

    const farmIcon = L.divIcon({
      html: farmIconHtml,
      className: 'custom-farm-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const farmMarker = L.marker([farmLocation.lat, farmLocation.lng], {
      icon: farmIcon,
      zIndexOffset: 1000
    }).addTo(layerGroup);

    farmMarker.bindTooltip(
      `
      <div style="font-family: inherit; font-size: 11px; padding: 4px 6px;">
        <strong style="color: #0f3260;">${farmLocation.name || (lang === 'es' ? 'Mi Establecimiento' : 'My Farm')}</strong>
        <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${farmLocation.province || ''} • ${farmLocation.basinName || ''}</div>
      </div>
      `,
      { direction: 'top', offset: [0, -15], opacity: 0.98, interactive: false }
    );

    // 2. 50 km Circle (Direct Impact) - non-blocking so clicks pass through to markers
    L.circle([farmLocation.lat, farmLocation.lng], {
      radius: 50000,
      color: '#15803d',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#15803d',
      fillOpacity: isDarkMode ? 0.12 : 0.05,
      interactive: false
    }).addTo(layerGroup);

    // 3. 200 km Circle (Hydrological Basin) - non-blocking so clicks pass through to markers
    L.circle([farmLocation.lat, farmLocation.lng], {
      radius: 200000,
      color: isDarkMode ? '#38bdf8' : '#0f3260',
      weight: 1.5,
      dashArray: '6, 6',
      fillColor: isDarkMode ? '#38bdf8' : '#0f3260',
      fillOpacity: isDarkMode ? 0.06 : 0.04,
      interactive: false
    }).addTo(layerGroup);

    // 4. Alert Markers (Sharp Square Badges with Flag)
    alerts.forEach((alert) => {
      const isCritical = alert.severity === 'critical';
      const isHigh = alert.severity === 'high';
      const badgeColor = isCritical ? '#b91c1c' : isHigh ? '#d97706' : '#0f3260';
      const countryCode = AGENCY_TO_COUNTRY[alert.source] || 'US';
      const flagUrl = WIKIMEDIA_FLAGS[countryCode]?.url || WIKIMEDIA_FLAGS.US.url;

      const alertIconHtml = `
        <div style="cursor: pointer; position: relative;">
          <div style="background-color: ${badgeColor}; width: 24px; height: 24px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
            ${alert.score}
          </div>
          <div style="position: absolute; top: -5px; right: -5px; width: 14px; height: 10px; border: 1px solid white; overflow: hidden;">
            <img src="${flagUrl}" style="width: 100%; height: 100%; object-fit: cover;" referrerpolicy="no-referrer" />
          </div>
        </div>
      `;

      const alertIcon = L.divIcon({
        html: alertIconHtml,
        className: 'custom-alert-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker(
        [alert.observationLocation.lat, alert.observationLocation.lng],
        { icon: alertIcon }
      ).addTo(layerGroup);

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        onSelectAlert(alert);
      });

      const tooltipBg = isDarkMode ? '#18181b' : '#ffffff';
      const tooltipText = isDarkMode ? '#f4f4f5' : '#111827';
      const tooltipSubtext = isDarkMode ? '#a1a1aa' : '#4b5563';
      const tooltipBorder = isDarkMode ? '#3f3f46' : '#d1d5db';

      marker.bindTooltip(
        `
        <div style="background-color: ${tooltipBg}; color: ${tooltipText}; border: 1px solid ${tooltipBorder}; padding: 6px;" class="text-xs">
          <div style="font-weight: bold; color: ${badgeColor};">${alert.score}/100 • ${alert.source} ${alert.mission}</div>
          <div style="color: ${tooltipText}; font-weight: 500;">${alert.title}</div>
          <div style="color: ${tooltipSubtext}; font-size: 10px;">${alert.distanceKm} km • ${alert.observationLocationName}</div>
          <div style="color: #0284c7; font-size: 9px; margin-top: 2px;">${lang === 'es' ? 'Click para ver detalle oficial' : 'Click to view official detail'}</div>
        </div>
        `,
        { direction: 'top', offset: [0, -12], opacity: 0.98, interactive: false }
      );

      // Hydrological connection lines for upstream points
      if (alert.hydrologicalRelation === 'upstream') {
        L.polyline(
          [
            [alert.observationLocation.lat, alert.observationLocation.lng],
            [farmLocation.lat, farmLocation.lng]
          ],
          {
            color: isDarkMode ? '#38bdf8' : '#0f3260',
            weight: 1.5,
            dashArray: '3, 5',
            opacity: isDarkMode ? 0.6 : 0.5,
            interactive: false
          }
        ).addTo(layerGroup);
      }
    });

    map.panTo([farmLocation.lat, farmLocation.lng], { animate: true });
  }, [farmLocation, alerts, lang, onSelectFarm, onSelectAlert, isDarkMode]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([farmLocation.lat, farmLocation.lng], 7, {
        animate: true
      });
    }
  };

  return (
    <div className="isolate z-0 relative w-full h-full min-h-[460px] sm:min-h-[520px] md:min-h-[620px] bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e33] flex flex-col rounded-none transition-colors">
      {/* Sharp Clean Top Header Bar */}
      <div className="bg-slate-100 dark:bg-[#161618] border-b border-slate-300 dark:border-[#2e2e33] px-3 py-2 z-10 select-none transition-colors">
        {/* Mobile Header Layout: 2 Clean Rows */}
        <div className="sm:hidden flex flex-col gap-2">
          {/* Row 1: Controls (Left) + Clickable Alert Pill (Right) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {/* Layer switcher group */}
              <div className="flex items-center bg-white dark:bg-[#232326] border border-slate-300 dark:border-[#38383e] shadow-2xs overflow-hidden">
                <button
                  id="map-mode-standard-btn-mob"
                  type="button"
                  onClick={() => handleSetLayerMode('standard')}
                  className={`w-7 h-7 flex items-center justify-center transition-colors cursor-pointer ${
                    layerMode === 'standard'
                      ? 'bg-[#0f3260] text-white dark:bg-[#3f3f46]'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                  }`}
                  title={lang === 'es' ? 'Cartografía estándar' : 'Standard Base Map'}
                  aria-label="Standard Base Map"
                >
                  <GoogleIcon name="map" size={14} />
                </button>
                <button
                  id="map-mode-terrain-btn-mob"
                  type="button"
                  onClick={() => handleSetLayerMode('terrain')}
                  className={`w-7 h-7 flex items-center justify-center border-l border-slate-200 dark:border-[#38383e] transition-colors cursor-pointer ${
                    layerMode === 'terrain'
                      ? 'bg-[#0f3260] text-white dark:bg-[#3f3f46]'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                  }`}
                  title={lang === 'es' ? 'Relieve Topográfico' : 'Topographic Terrain'}
                  aria-label="Topographic Terrain"
                >
                  <GoogleIcon name="terrain" size={14} />
                </button>
                <button
                  id="map-mode-satellite-btn-mob"
                  type="button"
                  onClick={() => handleSetLayerMode('satellite')}
                  className={`w-7 h-7 flex items-center justify-center border-l border-slate-200 dark:border-[#38383e] transition-colors cursor-pointer ${
                    layerMode === 'satellite'
                      ? 'bg-[#0f3260] text-white dark:bg-[#3f3f46]'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                  }`}
                  title={lang === 'es' ? 'Imágenes Satelitales' : 'Satellite Imagery'}
                  aria-label="Satellite Imagery"
                >
                  <Satellite size={14} strokeWidth={2.2} />
                </button>
              </div>

              {/* Centrar en lote */}
              <button
                id="map-recenter-btn-mob"
                type="button"
                onClick={handleRecenter}
                className="w-7 h-7 bg-white dark:bg-[#232326] hover:bg-slate-100 dark:hover:bg-[#2c2c30] text-[#0f3260] dark:text-sky-400 border border-slate-300 dark:border-[#38383e] flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                title={lang === 'es' ? 'Centrar en el establecimiento' : 'Center on farm'}
                aria-label="Center on farm"
              >
                <GoogleIcon name="my_location" size={14} />
              </button>

              {/* Zoom In & Out */}
              <div className="flex items-center bg-white dark:bg-[#232326] border border-slate-300 dark:border-[#38383e] shadow-2xs overflow-hidden">
                <button
                  id="map-zoom-in-btn-mob"
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomIn()}
                  className="w-7 h-7 flex items-center justify-center text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#2c2c30] font-bold text-xs transition-colors cursor-pointer select-none"
                  title="Zoom +"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  id="map-zoom-out-btn-mob"
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomOut()}
                  className="w-7 h-7 flex items-center justify-center border-l border-slate-200 dark:border-[#38383e] text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#2c2c30] font-bold text-xs transition-colors cursor-pointer select-none"
                  title="Zoom -"
                  aria-label="Zoom out"
                >
                  −
                </button>
              </div>

              {/* Capas reales CONAE */}
              <button
                id="map-conae-layers-btn-mob"
                type="button"
                onClick={() => setShowConaePanel(!showConaePanel)}
                aria-pressed={showConaePanel}
                className={`h-7 px-2 flex items-center gap-1 border text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer ${
                  showConaePanel
                    ? 'bg-[#0f3260] border-[#0f3260] text-white dark:bg-sky-700 dark:border-sky-700'
                    : 'bg-white dark:bg-[#232326] border-slate-300 dark:border-[#38383e] text-[#0f3260] dark:text-sky-300'
                }`}
                title={lang === 'es' ? 'Capas reales de CONAE' : 'Real CONAE layers'}
              >
                <Layers size={13} />
                CONAE
              </button>
            </div>

            {/* Alert badge on top row */}
            <button
              type="button"
              id="map-legend-alert-btn-mob"
              onClick={() => {
                if (alerts.length > 0) {
                  onSelectAlert(alerts[0]);
                }
              }}
              className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
              title={lang === 'es' ? 'Ver detalle de alertas' : 'View alerts'}
            >
              <span className="w-3.5 h-3.5 bg-red-700 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                !
              </span>
              <span>{alerts.length} {lang === 'es' ? 'Alertas' : 'Alerts'}</span>
            </button>
          </div>

          {/* Row 2: Location name & Radius chips */}
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-300 pt-1.5 border-t border-slate-200 dark:border-[#2e2e33]">
            {/* Establishment Name */}
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-zinc-100 truncate min-w-0 pr-2">
              <span className="w-3.5 h-3.5 bg-[#0f3260] dark:bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </span>
              <span className="truncate" title={farmLocation.name}>
                {farmLocation.name || (lang === 'es' ? 'Mi establecimiento' : 'My farm')}
              </span>
            </div>

            {/* Radius chips */}
            <div className="flex items-center gap-2.5 shrink-0 text-[11px]">
              <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-300 select-none">
                <span className="w-2.5 h-2.5 border border-emerald-600 bg-emerald-600/30 shrink-0" />
                <span>50 km</span>
              </div>
              <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-300 select-none">
                <span className="w-2.5 h-2.5 border border-dashed border-[#0f3260] dark:border-sky-400 bg-[#0f3260]/15 dark:bg-sky-400/15 shrink-0" />
                <span>200 km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header Layout: Single Seamless Row */}
        <div className="hidden sm:flex items-center justify-between gap-3">
          {/* Left Side: Map View Switcher, Recenter & Zoom Controls (ONLY ICONS) */}
          <div className="flex items-center gap-1.5">
            {/* Layer switcher group */}
            <div className="flex items-center bg-white dark:bg-[#232326] border border-slate-300 dark:border-[#38383e] shadow-2xs overflow-hidden">
              {/* OpenStreetMap Estándar */}
              <button
                id="map-mode-standard-btn"
                type="button"
                onClick={() => handleSetLayerMode('standard')}
                className={`w-7 h-7 flex items-center justify-center transition-colors cursor-pointer ${
                  layerMode === 'standard'
                    ? 'bg-[#0f3260] text-white dark:bg-[#3f3f46]'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                }`}
                title={lang === 'es' ? 'Cartografía estándar (OpenStreetMap)' : 'Standard Cartography (OpenStreetMap)'}
                aria-label="Standard Base Map"
              >
                <GoogleIcon name="map" size={15} />
              </button>

              {/* Terreno OpenTopoMap */}
              <button
                id="map-mode-terrain-btn"
                type="button"
                onClick={() => handleSetLayerMode('terrain')}
                className={`w-7 h-7 flex items-center justify-center border-l border-slate-200 dark:border-[#38383e] transition-colors cursor-pointer ${
                  layerMode === 'terrain'
                    ? 'bg-[#0f3260] text-white dark:bg-[#3f3f46]'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                }`}
                title={lang === 'es' ? 'Relieve Topográfico (OpenTopoMap)' : 'Topographic Terrain (OpenTopoMap)'}
                aria-label="Topographic Terrain"
              >
                <GoogleIcon name="terrain" size={15} />
              </button>

              {/* Satelital Esri World Imagery */}
              <button
                id="map-mode-satellite-btn"
                type="button"
                onClick={() => handleSetLayerMode('satellite')}
                className={`w-7 h-7 flex items-center justify-center border-l border-slate-200 dark:border-[#38383e] transition-colors cursor-pointer ${
                  layerMode === 'satellite'
                    ? 'bg-[#0f3260] text-white dark:bg-[#3f3f46]'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                }`}
                title={lang === 'es' ? 'Imágenes Satelitales Reales (Esri World Imagery)' : 'Satellite Imagery (Esri World Imagery)'}
                aria-label="Satellite Imagery"
              >
                <Satellite size={15} strokeWidth={2.2} />
              </button>
            </div>

            {/* Centrar en lote */}
            <button
              id="map-recenter-btn"
              type="button"
              onClick={handleRecenter}
              className="w-7 h-7 bg-white dark:bg-[#232326] hover:bg-slate-100 dark:hover:bg-[#2c2c30] text-[#0f3260] dark:text-sky-400 border border-slate-300 dark:border-[#38383e] flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
              title={lang === 'es' ? 'Centrar en el establecimiento' : 'Center on farm'}
              aria-label="Center on farm"
            >
              <GoogleIcon name="my_location" size={15} />
            </button>

            {/* Zoom In & Out */}
            <div className="flex items-center bg-white dark:bg-[#232326] border border-slate-300 dark:border-[#38383e] shadow-2xs overflow-hidden">
              <button
                id="map-zoom-in-btn"
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="w-7 h-7 flex items-center justify-center text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#2c2c30] font-bold text-sm transition-colors cursor-pointer select-none"
                title={lang === 'es' ? 'Acercar zoom' : 'Zoom in'}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                id="map-zoom-out-btn"
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="w-7 h-7 flex items-center justify-center border-l border-slate-200 dark:border-[#38383e] text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#2c2c30] font-bold text-sm transition-colors cursor-pointer select-none"
                title={lang === 'es' ? 'Alejar zoom' : 'Zoom out'}
                aria-label="Zoom out"
              >
                −
              </button>
            </div>

            {/* Capas reales CONAE */}
            <button
              id="map-conae-layers-btn"
              type="button"
              onClick={() => setShowConaePanel(!showConaePanel)}
              aria-pressed={showConaePanel}
              className={`h-7 px-2.5 flex items-center gap-1.5 border text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
                showConaePanel
                  ? 'bg-[#0f3260] border-[#0f3260] text-white dark:bg-sky-700 dark:border-sky-700'
                  : 'bg-white dark:bg-[#232326] border-slate-300 dark:border-[#38383e] text-[#0f3260] dark:text-sky-300 hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
              }`}
              title={lang === 'es' ? 'Capas reales de CONAE' : 'Real CONAE layers'}
            >
              <Layers size={14} />
              {lang === 'es' ? 'Capas CONAE' : 'CONAE layers'}
            </button>
          </div>

          {/* Right Side: Establishment & Unified Legend Items */}
          <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-zinc-300">
            {/* Establishment name */}
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-zinc-100 font-semibold select-none">
              <span className="w-3.5 h-3.5 bg-[#0f3260] dark:bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </span>
              <span className="max-w-[150px] sm:max-w-[200px] truncate" title={farmLocation.name}>
                {farmLocation.name || (lang === 'es' ? 'Mi establecimiento' : 'My farm')}
              </span>
            </div>

            <span className="text-slate-300 dark:text-zinc-700 select-none">|</span>

            {/* 50 km indicator */}
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 select-none">
              <span className="w-3.5 h-3.5 border border-emerald-600 bg-emerald-600/30 shrink-0 shadow-2xs" />
              <span>50 km</span>
            </div>

            {/* 200 km indicator */}
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 select-none">
              <span className="w-3.5 h-3.5 border border-dashed border-[#0f3260] dark:border-sky-400 bg-[#0f3260]/15 dark:bg-sky-400/15 shrink-0 shadow-2xs" />
              <span>200 km</span>
            </div>

            {/* Alert indicator */}
            <button
              type="button"
              id="map-legend-alert-btn"
              onClick={() => {
                if (alerts.length > 0) {
                  onSelectAlert(alerts[0]);
                }
              }}
              className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 hover:text-red-700 dark:hover:text-red-400 transition-colors cursor-pointer select-none"
              title={lang === 'es' ? 'Click para ver detalle de alertas' : 'Click to view alert detail'}
            >
              <span className="w-3.5 h-3.5 bg-red-700 text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs">
                !
              </span>
              <span>{alerts.length} {lang === 'es' ? 'Alertas' : 'Alerts'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leaflet Map Canvas - Completely Unobstructed */}
      <div className="relative w-full flex-1 min-h-[420px] sm:min-h-[480px] z-0">
        <div
          ref={mapContainerRef}
          className="w-full h-full min-h-[420px] sm:min-h-[480px] select-none z-0"
          tabIndex={0}
        />
        {showConaePanel && (
          <ConaeLayerPanel
            lang={lang}
            layerId={conaeLayerId}
            onSelectLayer={handleSelectConaeLayer}
            day={conaeDay}
            onSelectDay={setConaeDay}
            opacity={conaeOpacity}
            onChangeOpacity={setConaeOpacity}
            status={conaeStatus}
            lastLoadedAt={conaeLoadedAt}
            farmLat={farmLocation.lat}
            farmLng={farmLocation.lng}
            onClose={() => setShowConaePanel(false)}
          />
        )}
      </div>
    </div>
  );
};
