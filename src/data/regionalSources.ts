import type { AgencySource, LatLng } from '../types';
import { SATELLITE_MISSIONS } from './satelliteMissions';

/** Preference only, never a coverage mask. Coordinates select a broad policy region. */
export function regionalSourcePolicy(point: LatLng) {
  const region = point.lat <= -38 ? 'Patagonia y sur' : point.lat > -30 && point.lng > -62 ? 'NEA'
    : point.lng < -66 || point.lat > -30 ? 'NOA y cordillera' : 'Centro y región pampeana';
  const preferred: AgencySource[] = region === 'NEA' ? ['AEB', 'AEP'] : region === 'Patagonia y sur' ? ['UKSA', 'ESA', 'AEE', 'ASI']
    : region === 'NOA y cordillera' ? ['ESA', 'AEE', 'ASI', 'CSA'] : ['ESA', 'AEE', 'ASI', 'CSA'];
  return { region, primary: ['NASA', 'CONAE'] as AgencySource[], preferred };
}

export function regionalMissions(point: LatLng) {
  const policy = regionalSourcePolicy(point);
  const rank = (agencies: AgencySource[]) => agencies.some(a => policy.primary.includes(a)) ? 0 : agencies.some(a => policy.preferred.includes(a)) ? 1 : 2;
  return [...SATELLITE_MISSIONS].sort((a, b) => rank(a.filterAgencies) - rank(b.filterAgencies));
}
