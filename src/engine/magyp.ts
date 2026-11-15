/**
 * Estadísticas regionales MAGyP para el motor de rotaciones.
 *
 * Los JSON se preprocesan una vez (scripts/buildMagypStats.mjs) desde el
 * dataset oficial de Estimaciones Agrícolas:
 *   https://datosestimaciones.magyp.gob.ar/
 * (método de descarga documentado en la propia carpeta scripts/).
 *
 * Reglas implementadas:
 *  - Prioriza la serie departamental cuando existe y tiene ≥ 8 campañas válidas;
 *    si no, usa la provincial y marca expresamente el cambio de escala.
 *  - Nunca suma 'Soja total' ni 'Trigo candeal' con sus subcategorías: el motor
 *    consume solo las series de subcategoría (Soja 1ra/2da) o el total único
 *    (Trigo total), según define src/engine/agronomy.ts.
 *  - Los rendimientos son estadísticas REGIONALES ponderadas (ΣP/ΣA) por
 *    campaña; NO son predicciones de rendimiento de la estancia individual.
 */

import { CropId } from './agronomy';
import { normalizeName, campaignLabel } from './statistics';

export interface MagypCampaignPoint {
  campaignId: number;
  campaign: string;
  sownHa: number;
  harvestedHa: number;
  productionTn: number;
  zeroHarvestRows: number;
}

export interface MagypCropStats {
  cropId: CropId;
  magypName: string;
  scale: 'departamento' | 'provincia';
  campaigns: number;
  weightedYieldKgHa: number | null;
  cv: number | null;
  minYieldKgHa: number | null;
  maxYieldKgHa: number | null;
  series: MagypCampaignPoint[];
  notes: string[];
}

export interface MagypSelection {
  provinceName: string;
  provinceKey: string;
  departmentName: string | null;
  departmentKey: string | null;
  crops: Partial<Record<CropId, MagypCropStats>>;
  notes: string[];
}

export interface MagypProvincialFile {
  meta: Record<string, unknown>;
  provinces: Array<{ provinceId: number; name: string; key: string; crops: Record<string, MagypCropFileEntry> }>;
}

export interface MagypDepartamentalFile {
  meta: Record<string, unknown>;
  departments: Array<{ provinceId: number; deptId: string; name: string; key: string; crops: Record<string, MagypCropFileEntry> }>;
}

export interface MagypCropFileEntry {
  magypName: string;
  summary: { campaigns: number; weightedYieldKgHa: number; cv: number | null; minYieldKgHa: number; maxYieldKgHa: number } | null;
  series: Array<[number, number, number, number, number]>;
}

const MIN_VALID_CAMPAIGNS = 8;

function normalizeCropId(rawId: string): CropId | null {
  const valid: CropId[] = ['soja1', 'soja2', 'maiz', 'trigo', 'girasol', 'sorgo'];
  return (valid as string[]).includes(rawId) ? (rawId as CropId) : null;
}

export function campaignPoints(series: Array<[number, number, number, number, number]>): MagypCampaignPoint[] {
  return series.map(([campaignId, sownHa, harvestedHa, productionTn, zeroHarvestRows]) => ({
    campaignId, campaign: campaignLabel(campaignId), sownHa, harvestedHa, productionTn, zeroHarvestRows
  }));
}

function buildCropStats(entry: MagypCropFileEntry, cropId: CropId, scale: 'departamento' | 'provincia'): MagypCropStats | null {
  const series = campaignPoints(entry.series);
  const validCampaigns = new Set(series.filter(p => p.harvestedHa > 0).map(p => p.campaignId)).size;
  const summary = entry.summary;
  const notes: string[] = [
    `Escala estadística: ${scale}.`,
    'Rendimiento ponderado regional Ȳ = ΣP/ΣA por campaña (kg/ha); NO es un rendimiento esperado del lote.',
    'El CV interanual describe dispersión de la serie regional; no es una probabilidad de fracaso.'
  ];
  const zeroHarvest = series.reduce((s, p) => s + p.zeroHarvestRows, 0);
  if (zeroHarvest > 0) notes.push(`${zeroHarvest} registro(s) con superficie cosechada nula fueron excluidos del rendimiento.`);
  if (validCampaigns < MIN_VALID_CAMPAIGNS) notes.push(`Serie corta: ${validCampaigns} campañas válidas (< ${MIN_VALID_CAMPAIGNS}); la estabilidad regional se marca como poco representativa.`);
  return {
    cropId,
    magypName: entry.magypName,
    scale,
    campaigns: validCampaigns,
    weightedYieldKgHa: summary?.weightedYieldKgHa ?? null,
    cv: summary?.cv ?? null,
    minYieldKgHa: summary?.minYieldKgHa ?? null,
    maxYieldKgHa: summary?.maxYieldKgHa ?? null,
    series,
    notes
  };
}

/**
 * Selecciona estadísticas regionales para la ubicación.
 * `departmentName` proviene del registro o de OpenStreetMap (Nominatim).
 * Si el departamento no se encuentra en el dataset, degrada a provincial
 * documentando el cambio de escala.
 */
export function selectMagypStats(
  provincial: MagypProvincialFile | null,
  departamental: MagypDepartamentalFile | null,
  provinceName: string | undefined,
  departmentName?: string | null
): MagypSelection | null {
  const provinceKey = provinceName ? normalizeName(provinceName) : '';
  const deptKey = departmentName ? normalizeName(departmentName) : '';
  const province = provincial?.provinces.find(p => p.key === provinceKey) ?? null;
  if (!province) return null;
  const notes: string[] = [`Escala provincial base: ${province.name}.`];
  const deptEntry = departamental && deptKey ? departamental.departments.find(d => d.provinceId === province.provinceId && d.key === deptKey) : null;
  if (deptKey && !deptEntry) {
    notes.push(`El departamento "${departmentName}" no tiene serie suficiente en el dataset MAGyP; se usa la serie provincial y se marca el cambio de escala.`);
  }
  const crops: Partial<Record<CropId, MagypCropStats>> = {};
  const cropIds: CropId[] = ['soja1', 'soja2', 'maiz', 'trigo', 'girasol', 'sorgo'];
  for (const cropId of cropIds) {
    const deptCrop = deptEntry?.crops?.[cropId];
    const provCrop = province.crops?.[cropId];
    const chosen = deptCrop && normalizeCropId(cropId) ? deptCrop : provCrop;
    if (!chosen) continue;
    const scale: 'departamento' | 'provincia' = deptCrop ? 'departamento' : 'provincia';
    if (deptCrop && provCrop && deptCrop.summary && provCrop.summary && deptCrop.summary.campaigns < provCrop.summary.campaigns * 0.8) {
      // Serie departamental sensiblemente más corta que la provincial: preferimos la provincial para estabilidad.
      const stats = buildCropStats(provCrop, cropId, 'provincia');
      if (stats) { stats.notes.unshift('Se prefirió la serie provincial por mayor longitud y representatividad.'); crops[cropId] = stats; continue; }
    }
    const stats = buildCropStats(chosen, cropId, scale);
    if (stats) crops[cropId] = stats;
  }
  return {
    provinceName: province.name,
    provinceKey: province.key,
    departmentName: deptEntry?.name ?? null,
    departmentKey: deptEntry?.key ?? null,
    crops,
    notes
  };
}

/* --------------------------- carga con caché --------------------------- */

const provincialCache: { promise: Promise<MagypProvincialFile | null> | null } = { promise: null };
const departamentalCache: { promise: Promise<MagypDepartamentalFile | null> | null } = { promise: null };

async function fetchJson<T>(url: string, fetchImpl: typeof fetch = fetch): Promise<T | null> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  try {
    return await response.json() as T;
  } catch (error) {
    throw new Error(`${url}: JSON inválido (${error instanceof Error ? error.message : String(error)})`);
  }
}

/** Carga (y memoiza) el archivo provincial; null si no está disponible. */
export function loadMagypProvincial(fetchImpl?: typeof fetch): Promise<MagypProvincialFile | null> {
  if (!provincialCache.promise) {
    const impl = fetchImpl ?? fetch;
    provincialCache.promise = fetchJson<MagypProvincialFile>('/data/magyp-provincial.json', impl);
  }
  return provincialCache.promise;
}

/** Carga (y memoiza) el archivo departamental; null si no está disponible. */
export function loadMagypDepartamental(fetchImpl?: typeof fetch): Promise<MagypDepartamentalFile | null> {
  if (!departamentalCache.promise) {
    const impl = fetchImpl ?? fetch;
    departamentalCache.promise = fetchJson<MagypDepartamentalFile>('/data/magyp-departamental.json', impl);
  }
  return departamentalCache.promise;
}

/** Utilidad de pruebas: vacía las cachés (los archivos son estáticos; no se usa en producción). */
export function resetMagypCaches(): void {
  provincialCache.promise = null;
  departamentalCache.promise = null;
}
