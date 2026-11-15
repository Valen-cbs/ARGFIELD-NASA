export type ReadingStatus = 'loading' | 'available' | 'no_data' | 'stale' | 'undated' | 'error' | 'offline';
export type DataErrorCode = 'network' | 'timeout' | 'http' | 'ogc' | 'format' | 'unsupported';

export interface SatelliteReading {
  productId: string;
  status: ReadingStatus;
  value: number | null;
  unit: string;
  observedAt: string | null;
  fetchedAt: string | null;
  source: string;
  sourceUrl: string;
  detail?: string;
  errorCode?: DataErrorCode;
  entries?: Array<[string, string]>;
  sceneId?: string;
  tileUrl?: string;
  sceneBounds?: [number, number, number, number];
  cached?: boolean;
  missingReason?: 'outside_coverage' | 'provider_nodata' | 'quality' | 'no_scenes' | 'partial_failure';
  scenesChecked?: number;
  samples?: Array<{ value: number; observedAt: string; sourceUrl: string }>;
  location?: { lat: number; lng: number };
}
