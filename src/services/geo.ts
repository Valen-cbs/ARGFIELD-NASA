import { LatLng, RegionKey } from '../types';
import { BASINS } from '../data/regions';

/**
 * Geographic bounding limits for Argentine Territory.
 * Includes:
 * - Continental Argentina (mainland: Jujuy / La Quiaca down to Tierra del Fuego / Ushuaia)
 * - South Atlantic Islands (Islas Malvinas / Falklands, Georgias del Sur, Sandwich del Sur)
 * - Sector Antártico Argentino (down to the South Pole -90°)
 */
export const ARGENTINA_BOUNDS = {
  // Northernmost tip in Jujuy (Río Grande de San Juan / La Quiaca ~ -21.78°)
  north: -21.0,
  // Southernmost limit (Antártida Argentina reaches -90°)
  south: -90.0,
  // Westernmost point in Santa Cruz / Andes (~ -73.56°, Antarctic peninsula reaches ~ -74°)
  west: -75.0,
  // Easternmost maritime / island territory (Islas Sandwich del Sur ~ -25.0°)
  east: -25.0
};

/**
 * Determines if given latitude and longitude fall strictly within the Argentine territory,
 * encompassing the continental mainland, Islas Malvinas & South Atlantic archipelagos, and Argentine Antarctica.
 */
export function isWithinArgentina(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  // Strict mainland outline. Broad latitude/longitude bands can accidentally
  // include areas of Brazil, Uruguay and Paraguay near the borders.
  const mainlandOutline: [number, number][] = [
    [-65.2, -21.8], [-62.2, -22.0], [-60.0, -23.0], [-58.2, -24.0],
    [-57.7, -25.2], [-57.5, -25.5], [-54.9, -25.5], [-54.7, -26.0],
    [-54.8, -27.0], [-53.7, -28.2], [-55.8, -29.2],
    [-57.3, -30.5], [-58.1, -32.1], [-58.4, -33.5], [-58.2, -34.6],
    [-57.8, -35.5], [-57.0, -36.7], [-57.4, -38.0], [-58.5, -39.0],
    [-62.0, -40.8], [-63.5, -42.0], [-65.5, -43.5], [-65.5, -46.0],
    [-65.5, -48.0], [-66.0, -50.0], [-66.0, -52.0], [-67.0, -54.0],
    [-66.5, -55.1], [-68.7, -55.1], [-69.0, -53.0], [-71.0, -51.0],
    [-72.5, -48.0], [-72.5, -45.0], [-71.5, -42.0], [-71.5, -39.0],
    [-70.0, -36.0], [-70.0, -33.0], [-69.5, -30.0], [-68.5, -27.0],
    [-68.0, -24.0], [-67.0, -22.0]
  ];
  const isInsideOutline = (x: number, y: number) => {
    let inside = false;
    for (let i = 0, j = mainlandOutline.length - 1; i < mainlandOutline.length; j = i++) {
      const [xi, yi] = mainlandOutline[i];
      const [xj, yj] = mainlandOutline[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  // 1. Argentine Antarctica: South of 60°S between 25°W and 74°W down to South Pole (-90°)
  if (lat <= -60.0 && lat >= -90.0) {
    return false;
  }

  // 2. Islas Malvinas (Falklands) and South Atlantic Islands
  // Malvinas: Lat ~ -51° to -53°, Lng ~ -61.5° to -57.5°
  // Georgias & Sandwich: Lat ~ -53° to -60°, Lng ~ -39° to -26°
  if (lat < -50.0 && lat > -60.0) {
    return false;
  }

  // 3. Continental Mainland Argentina (from Jujuy ~ -21.78° to Ushuaia/Tierra del Fuego ~ -55.2°)
  // Conservative guard for the Paraguay river border around Asunción.
  if (lat > -25.7 && lat < -24.7 && lng > -58.0 && lng < -57.3) return false;

  if (lat >= -55.2 && lat <= -21.5) return isInsideOutline(lng, lat);

  if (lat >= -55.2 && lat <= -21.5) {
    // Longitudinal boundary check
    if (lng < -73.8 || lng > -53.5) return false;

    // Refine western border along the Andes:
    // Northern Andes (Jujuy, Salta, Catamarca, La Rioja: -21.5° to -31.0°)
    if (lat > -31.0 && lng < -69.4) return false;
    // Cuyo Andes (San Juan, Mendoza: -31.0° to -36.0°)
    if (lat <= -31.0 && lat > -36.0 && lng < -70.5) return false;
    // North Patagonia (Neuquén, Río Negro: -36.0° to -42.0°)
    if (lat <= -36.0 && lat > -42.0 && lng < -72.0) return false;
    // Tierra del Fuego Isla Grande: Argentine sector is east of -68.7°W
    if (lat < -52.5 && lng < -68.7) return false;

    // Refine eastern borders:
    // North of Misiones latitude (-21.5° to -25.5°): Paraguay/Brazil border is west of -57.5°
    if (lat > -25.5 && lng > -57.5) return false;
    // Central North (-28.5° to -33.5°): Corrientes / Entre Ríos border along Río Uruguay is west of -57.0°
    if (lat <= -28.5 && lat > -33.5 && lng > -57.0) return false;

    return true;
  }

  return false;
}

/**
 * Accurately determines country and province/state for any clicked coordinate.
 */
export function determineLocationName(lat: number, lng: number, lang: 'es' | 'en' = 'es'): string {
  if (isNaN(lat) || isNaN(lng)) {
    return lang === 'es' ? 'Ubicación' : 'Location';
  }

  // Check Argentine Antarctica
  if (lat <= -60.0 && lat >= -90.0 && lng >= -74.0 && lng <= -25.0) {
    return 'Argentina, Antártida';
  }

  // Check South Atlantic Islands
  if (lat < -50.0 && lat > -54.0 && lng >= -62.5 && lng <= -57.0) {
    return 'Argentina, Islas Malvinas';
  }

  // Check if within Argentina mainland
  if (isWithinArgentina(lat, lng)) {
    // Specific province bounding boxes & centers
    const PROVINCES = [
      { name: 'CABA', minLat: -34.70, maxLat: -34.52, minLng: -58.53, maxLng: -58.35, cLat: -34.61, cLng: -58.42 },
      { name: 'Tierra del Fuego', minLat: -55.2, maxLat: -52.6, minLng: -68.7, maxLng: -65.0, cLat: -54.3, cLng: -67.7 },
      { name: 'Santa Cruz', minLat: -52.4, maxLat: -46.0, minLng: -73.6, maxLng: -65.7, cLat: -48.8, cLng: -70.0 },
      { name: 'Chubut', minLat: -46.0, maxLat: -42.0, minLng: -72.0, maxLng: -65.0, cLat: -44.0, cLng: -68.5 },
      { name: 'Río Negro', minLat: -42.0, maxLat: -37.5, minLng: -71.5, maxLng: -62.8, cLat: -40.0, cLng: -67.0 },
      { name: 'Neuquén', minLat: -41.1, maxLat: -36.1, minLng: -71.5, maxLng: -68.0, cLat: -38.8, cLng: -69.8 },
      { name: 'La Pampa', minLat: -39.0, maxLat: -35.0, minLng: -67.8, maxLng: -63.4, cLat: -37.2, cLng: -65.5 },
      { name: 'Mendoza', minLat: -37.6, maxLat: -32.0, minLng: -70.6, maxLng: -66.5, cLat: -34.5, cLng: -68.5 },
      { name: 'San Luis', minLat: -36.0, maxLat: -31.8, minLng: -67.2, maxLng: -64.9, cLat: -33.7, cLng: -66.0 },
      { name: 'San Juan', minLat: -32.6, maxLat: -30.0, minLng: -70.6, maxLng: -66.7, cLat: -30.9, cLng: -68.8 },
      { name: 'La Rioja', minLat: -31.9, maxLat: -27.8, minLng: -69.4, maxLng: -65.5, cLat: -29.5, cLng: -66.9 },
      { name: 'Catamarca', minLat: -30.1, maxLat: -25.2, minLng: -69.1, maxLng: -65.0, cLat: -27.5, cLng: -67.0 },
      { name: 'Tucumán', minLat: -28.0, maxLat: -26.0, minLng: -66.2, maxLng: -64.8, cLat: -26.9, cLng: -65.4 },
      { name: 'Salta', minLat: -26.4, maxLat: -22.0, minLng: -68.5, maxLng: -62.3, cLat: -24.8, cLng: -65.4 },
      { name: 'Jujuy', minLat: -24.5, maxLat: -21.8, minLng: -67.2, maxLng: -64.1, cLat: -23.3, cLng: -65.7 },
      { name: 'Formosa', minLat: -26.9, maxLat: -22.4, minLng: -62.4, maxLng: -57.6, cLat: -24.9, cLng: -60.0 },
      { name: 'Chaco', minLat: -28.0, maxLat: -24.2, minLng: -63.5, maxLng: -58.5, cLat: -26.4, cLng: -60.8 },
      { name: 'Santiago del Estero', minLat: -30.0, maxLat: -25.6, minLng: -65.3, maxLng: -61.7, cLat: -27.8, cLng: -63.5 },
      { name: 'Santa Fe', minLat: -34.4, maxLat: -28.0, minLng: -62.0, maxLng: -59.0, cLat: -31.5, cLng: -60.9 },
      { name: 'Corrientes', minLat: -30.7, maxLat: -27.2, minLng: -59.5, maxLng: -55.7, cLat: -28.8, cLng: -57.8 },
      { name: 'Misiones', minLat: -28.2, maxLat: -25.5, minLng: -56.0, maxLng: -53.6, cLat: -26.9, cLng: -54.8 },
      { name: 'Entre Ríos', minLat: -34.0, maxLat: -30.1, minLng: -60.8, maxLng: -57.8, cLat: -32.0, cLng: -59.3 },
      { name: 'Córdoba', minLat: -35.0, maxLat: -29.5, minLng: -65.8, maxLng: -61.8, cLat: -32.0, cLng: -63.8 },
      { name: 'Buenos Aires', minLat: -41.1, maxLat: -33.3, minLng: -63.4, maxLng: -56.7, cLat: -36.5, cLng: -60.5 },
    ];

    // Check direct bounding match first
    const matched = PROVINCES.filter(
      p => lat >= p.minLat && lat <= p.maxLat && lng >= p.minLng && lng <= p.maxLng
    );

    if (matched.length === 1) {
      return `Argentina, ${matched[0].name}`;
    }

    if (matched.length > 1) {
      // Pick the closest center
      let closest = matched[0];
      let minDist = Infinity;
      for (const p of matched) {
        const d = (lat - p.cLat) ** 2 + (lng - p.cLng) ** 2;
        if (d < minDist) {
          minDist = d;
          closest = p;
        }
      }
      return `Argentina, ${closest.name}`;
    }

    // Fallback closest province in Argentina
    let closest = PROVINCES[0];
    let minDist = Infinity;
    for (const p of PROVINCES) {
      const d = (lat - p.cLat) ** 2 + (lng - p.cLng) ** 2;
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }
    return `Argentina, ${closest.name}`;
  }

  // Exterior detection
  // Chile
  if (lat < -17.5 && lat > -56.0 && lng < -69.2) {
    return 'Chile';
  }
  // Uruguay
  if (lat >= -35.2 && lat <= -30.0 && lng >= -58.5 && lng <= -53.0) {
    return 'Uruguay';
  }
  // Paraguay
  if (lat >= -27.6 && lat <= -19.0 && lng >= -62.6 && lng <= -54.2) {
    return 'Paraguay';
  }
  // Bolivia
  if (lat >= -22.9 && lat <= -9.6 && lng >= -69.6 && lng <= -57.5) {
    return 'Bolivia';
  }
  // Brasil
  if (lat >= -33.8 && lat <= 5.3 && lng >= -73.0 && lng <= -34.8) {
    return 'Brasil';
  }
  // South Atlantic Ocean
  if (lat <= -35.0 && lat >= -60.0 && lng >= -65.0) {
    return lang === 'es' ? 'Océano Atlántico' : 'Atlantic Ocean';
  }

  return lang === 'es' ? 'Exterior' : 'International';
}

/**
 * Calculates great-circle distance between two points on the Earth (Haversine formula).
 * Returns distance in kilometers.
 */
export function haversineDistance(pt1: LatLng, pt2: LatLng): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((pt2.lat - pt1.lat) * Math.PI) / 180;
  const dLng = ((pt2.lng - pt1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pt1.lat * Math.PI) / 180) *
      Math.cos((pt2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Determines Argentine region by geographic coordinates.
 */
export function determineRegion(lat: number, lng: number): RegionKey {
  if (lat < -39.0) return 'sur';
  if (lat > -30.0 && lng > -63.0) return 'norte';
  if (lat > -30.0 && lng <= -63.0) return 'noa';
  if (lat <= -30.0 && lat >= -37.5 && lng < -65.5) return 'cuyo';
  return 'centro';
}

/**
 * Identifies the nearest hydrological basin and aquifer context.
 */
export function determineBasin(lat: number, lng: number): {
  id: string;
  name: string;
  mainRiver: string;
  aquifer: string;
} {
  if (lat < -39.0) {
    return {
      id: BASINS.chubut.id,
      name: BASINS.chubut.name,
      mainRiver: BASINS.chubut.majorRiver,
      aquifer: BASINS.chubut.aquiferName || 'Acuífero Aluvial Patagónico'
    };
  }
  if (lat > -30.0 && lng > -61.0) {
    return {
      id: BASINS.parana.id,
      name: BASINS.parana.name,
      mainRiver: BASINS.parana.majorRiver,
      aquifer: BASINS.parana.aquiferName || 'Sistema Acuífero Guaraní'
    };
  }
  if (lat > -29.0 && lng <= -61.0) {
    return {
      id: BASINS.bermejo.id,
      name: BASINS.bermejo.name,
      mainRiver: BASINS.bermejo.majorRiver,
      aquifer: BASINS.bermejo.aquiferName || 'Acuífero Chaqueño'
    };
  }
  if (lng < -63.0 && lat >= -35.0) {
    return {
      id: BASINS.rio_quinto.id,
      name: BASINS.rio_quinto.name,
      mainRiver: BASINS.rio_quinto.majorRiver,
      aquifer: BASINS.rio_quinto.aquiferName || 'Acuífero Pampeano Central'
    };
  }
  if (lng > -59.5 && lat > -34.0) {
    return {
      id: BASINS.uruguay.id,
      name: BASINS.uruguay.name,
      mainRiver: BASINS.uruguay.majorRiver,
      aquifer: BASINS.uruguay.aquiferName || 'Acuífero Guaraní Inferior'
    };
  }
  return {
    id: BASINS.salado_bonaerense.id,
    name: BASINS.salado_bonaerense.name,
    mainRiver: BASINS.salado_bonaerense.majorRiver,
    aquifer: BASINS.salado_bonaerense.aquiferName || 'Acuífero Puelche / Pampeano'
  };
}

/**
 * Analyzes hydrological relationship between observation point and user farm.
 */
export function analyzeHydrologicalRelation(
  obsLocation: LatLng,
  farmLocation: LatLng,
  basinId: string,
  isExplicitUpstream?: boolean
): 'upstream' | 'same_basin' | 'shared_aquifer' | 'direct_field' | 'regional_weather' {
  const dist = haversineDistance(obsLocation, farmLocation);
  if (dist <= 25) return 'direct_field';

  if (isExplicitUpstream) return 'upstream';

  // If in Paraná basin and observation is to the north (upstream along river course)
  if (basinId === 'parana' && obsLocation.lat > farmLocation.lat) {
    return 'upstream';
  }

  // If in Bermejo basin and observation is northwest (Andes / Salta / Chaco)
  if (basinId === 'bermejo' && obsLocation.lat > farmLocation.lat) {
    return 'upstream';
  }

  // If in Chubut basin and observation is west (Andean runoff source)
  if (basinId === 'chubut' && obsLocation.lng < farmLocation.lng) {
    return 'upstream';
  }

  if (dist <= 220) return 'same_basin';
  if (dist <= 400 && (basinId === 'parana' || basinId === 'uruguay')) return 'shared_aquifer';

  return 'regional_weather';
}
