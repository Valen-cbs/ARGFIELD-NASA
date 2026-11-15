/**
 * Preprocesamiento estático de las Estimaciones Agrícolas del MAGyP.
 *
 * Descarga una única vez el dataset nacional oficial y genera dos archivos
 * compactos que la aplicación consulta por provincia/departamento:
 *
 *   public/data/magyp-provincial.json      (total provincial por campaña)
 *   public/data/magyp-departamental.json   (solo departamentos con serie suficiente)
 *
 * Fuente: https://datosestimaciones.magyp.gob.ar/ (Dirección de Estimaciones
 * Agrícolas, MAGyP). Unidades oficiales: hectáreas, toneladas, kg/ha.
 *
 * Reglas anti doble conteo (señaladas por el desafío):
 *   - Se usan subcategorías reales: 'Soja 1ra' (34) y 'Soja 2da' (35).
 *   - Se EXCLUYE 'Soja total' (25) para no duplicar observaciones.
 *   - Para trigo se usa 'Trigo total' (28) como serie única; 'Trigo candeal'
 *     (29) es un subconjunto y jamás se suma al total.
 *
 * Uso: node scripts/buildMagypStats.mjs [--csv ruta-al-dataset.csv]
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.dirname(ROOT);
const OUT_DIR = path.join(PROJECT, 'public', 'data');
const CSV_PATH = path.join(PROJECT, 'scripts', 'data', 'magyp_estimaciones.csv');
const DATASET_URL = 'https://datosestimaciones.magyp.gob.ar/reportes.php?reporte=Estimaciones';
const DATASET_FORM = 'POST Dataset=Dataset sobre reportes.php?reporte=Estimaciones';

// Cultivos piloto del motor + series de referencia (IDs del catálogo MAGyP).
const PILOT_CROPS = [
  { id: 34, name: 'Soja 1ra', engineId: 'soja1' },
  { id: 35, name: 'Soja 2da', engineId: 'soja2' },
  { id: 32, name: 'Maíz', engineId: 'maiz' },
  { id: 28, name: 'Trigo total', engineId: 'trigo' },
  { id: 14, name: 'Girasol', engineId: 'girasol' },
  { id: 26, name: 'Sorgo', engineId: 'sorgo' }
];
const EXCLUDED_AGGREGATES = [25, 29]; // 'Soja total', 'Trigo candeal' → nunca junto con sus subconjuntos

// Campañas 2000/01 en adelante: serie moderna con TECHNO de siembra directa extendida.
const MIN_CAMPAIGN_ID = 32; // 1 = 1969/70 → 32 = 2000/01

const MIN_DEPT_CAMPAIGNS = 8; // mínimo de campañas válidas para publicar serie departamental

function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function campaignStartYear(campana) {
  const m = /^(\d{4})\/(\d{2})$/.exec(campana);
  if (!m) return null;
  return Number(m[1]);
}

function parseCsv(csvPath) {
  const text = readFileSync(csvPath).toString('latin1');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headerIndex = lines.findIndex(l => l.includes('ID Provincia'));
  if (headerIndex < 0) {
    throw new Error(`El CSV no corresponde al dataset de Estimaciones (primer línea: ${lines[0]?.slice(0, 80)})`);
  }
  const rows = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.includes('ID Provincia')) continue;
    const c = line.split(';');
    const row = {
      provinceId: Number(c[0]),
      province: (c[1] ?? '').replace(/"/g, '').trim(),
      deptId: c[2],
      dept: (c[3] ?? '').replace(/"/g, '').trim(),
      cropId: Number(c[4]),
      crop: (c[5] ?? '').replace(/"/g, '').trim(),
      campaignId: Number(c[6]),
      campaign: (c[7] ?? '').replace(/"/g, '').trim(),
      sownHa: Number(c[8] ?? 0),
      harvestedHa: Number(c[9] ?? 0),
      productionTn: Number(c[10] ?? 0),
      reportedYieldKgHa: Number(c[11] ?? 0)
    };
    rows.push(row);
  }
  return rows;
}

function buildGroup(rows) {
  // rows ya filtradas por cultivo/campaña; agrupa por campaña con control de calidad.
  const byCampaign = new Map();
  for (const r of rows) {
    if (!byCampaign.has(r.campaignId)) byCampaign.set(r.campaignId, []);
    byCampaign.get(r.campaignId).push(r);
  }
  const series = [];
  for (const [campaignId, group] of [...byCampaign.entries()].sort((a, b) => a[0] - b[0])) {
    const sownHa = group.reduce((s, r) => s + r.sownHa, 0);
    const harvestedHa = group.reduce((s, r) => s + r.harvestedHa, 0);
    const productionTn = group.reduce((s, r) => s + r.productionTn, 0);
    // Rendimiento ponderado Y = ΣP / ΣA_cosechada; filas con cosechada nula se
    // excluyen del rendimiento (señalado, no reemplazado).
    const yieldKgHa = harvestedHa > 0 ? Math.round((productionTn * 1000) / harvestedHa) : null;
    // [campaignId, sownHa, harvestedHa, productionTn] — la campaña se deriva del ID.
    series.push([campaignId, sownHa, harvestedHa, productionTn, group.filter(r => r.harvestedHa <= 0).length]);
  }
  return series;
}

/** Convierte un ID de campaña MAGyP (1 = 1969/70) en el rótulo oficial. */
export function campaignLabel(campaignId) {
  const sowYear = campaignId + 1968;
  return `${sowYear}/${String(sowYear + 1).slice(2)}`;
}

function summarize(rows) {
  // 1) Agrega por campaña: Y(c,t) = ΣP(c,t) / ΣA(c,t) — filas con cosechada nula se excluyen.
  // 2) Estadísticas interanuales sobre las Y por campaña (CV = σ/μ, muestra).
  const byCampaign = new Map();
  for (const r of rows) {
    if (!byCampaign.has(r.campaignId)) byCampaign.set(r.campaignId, { prod: 0, area: 0 });
    const g = byCampaign.get(r.campaignId);
    g.prod += r.productionTn;
    g.area += r.harvestedHa;
  }
  const campaignYields = [];
  for (const [, g] of [...byCampaign.entries()].sort((a, b) => a[0] - b[0])) {
    if (g.area > 0) campaignYields.push((g.prod * 1000) / g.area); // kg/ha
  }
  if (!campaignYields.length) return null;
  const totalProd = rows.reduce((s, r) => s + r.productionTn, 0);
  const totalArea = rows.reduce((s, r) => s + r.harvestedHa, 0);
  const weighted = totalArea > 0 ? (totalProd * 1000) / totalArea : null; // Ȳ = Σt P / Σt A (kg/ha)
  if (weighted === null) return null;
  const n = campaignYields.length;
  const mu = campaignYields.reduce((s, y) => s + y, 0) / n;
  const variance = n > 1 ? campaignYields.reduce((s, y) => s + (y - mu) ** 2, 0) / (n - 1) : null;
  const sd = variance === null ? null : Math.sqrt(variance);
  return {
    campaigns: n,
    weightedYieldKgHa: Math.round(weighted),
    cv: sd !== null && mu > 0 ? Number((sd / mu).toFixed(4)) : null,
    minYieldKgHa: Math.round(Math.min(...campaignYields)),
    maxYieldKgHa: Math.round(Math.max(...campaignYields))
  };
}

function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`Falta el dataset en ${CSV_PATH}.`);
    console.error(`Descárgalo una vez con: curl -X POST "${DATASET_URL}" -d "Dataset=Dataset" -o ${CSV_PATH}`);
    console.error(`(${DATASET_FORM})`);
    process.exit(1);
  }
  const downloadedAt = new Date().toISOString().slice(0, 10);
  const all = parseCsv(CSV_PATH);
  // Mapa real id→campaña extraído del dataset (la numeración no es estrictamente anual:
  // p. ej. 54=2022/23 y 57=2023/24; los IDs 55-56 no existen).
  const campaignLabelsById = new Map();
  for (const row of all) campaignLabelsById.set(row.campaignId, row.campaign);
  const pilotIds = new Set(PILOT_CROPS.map(c => c.id));
  const pilot = all.filter(r => pilotIds.has(r.cropId) && r.campaignId >= MIN_CAMPAIGN_ID && !EXCLUDED_AGGREGATES.includes(r.cropId));
  console.log(`Filas del dataset: ${all.length} · filas piloto (>= 2000/01): ${pilot.length}`);

  const cropById = new Map(PILOT_CROPS.map(c => [c.id, c]));
  const provinces = new Map();
  const departments = [];

  const provGroups = new Map();
  for (const r of pilot) {
    const key = `${r.provinceId}|${normalizeName(r.province)}`;
    if (!provGroups.has(key)) provGroups.set(key, []);
    provGroups.get(key).push(r);
  }
  for (const [key, rows] of provGroups) {
    const [provinceIdStr] = key.split('|');
    const provinceId = Number(provinceIdStr);
    const name = rows[0].province;
    const crops = {};
    for (const crop of PILOT_CROPS) {
      const cropRows = rows.filter(r => r.cropId === crop.id);
      if (!cropRows.length) continue;
      const series = buildGroup(cropRows);
      const summary = summarize(cropRows);
      if (series.length) crops[crop.engineId] = { magypName: crop.name, summary, series };
    }
    provinces.set(provinceId, { provinceId, name: name.replace(/"/g, '').trim(), key: normalizeName(name), crops });
  }

  const deptGroups = new Map();
  for (const r of pilot) {
    const key = `${r.provinceId}|${r.deptId}`;
    if (!deptGroups.has(key)) deptGroups.set(key, []);
    deptGroups.get(key).push(r);
  }
  for (const [key, rows] of deptGroups) {
    const [provinceIdStr, deptId] = key.split('|');
    const provinceId = Number(provinceIdStr);
    const deptName = rows[0].dept.replace(/"/g, '').trim();
    const crops = {};
    let included = false;
    for (const crop of PILOT_CROPS) {
      const cropRows = rows.filter(r => r.cropId === crop.id);
      if (!cropRows.length) continue;
      const validCampaigns = new Set(cropRows.filter(r => r.harvestedHa > 0).map(r => r.campaignId)).size;
      if (validCampaigns < MIN_DEPT_CAMPAIGNS) continue; // serie departamental insuficiente → solo provincial
      const series = buildGroup(cropRows);
      const summary = summarize(cropRows);
      if (series.length) {
        crops[crop.engineId] = { magypName: crop.name, summary, series };
        included = true;
      }
    }
    if (included) {
      departments.push({ provinceId, deptId, name: deptName, key: normalizeName(deptName), crops });
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const provincial = {
    meta: {
      source: DATASET_URL,
      sourceDownload: DATASET_FORM,
      downloadedAt,
      units: { sownHa: 'ha', harvestedHa: 'ha', productionTn: 'tn', yieldKgHa: 'kg/ha' },
      campaignDefinition: 'ID de campaña MAGyP: siembra año/cosecha año (1 = 1969/70)',
      minCampaignId: MIN_CAMPAIGN_ID,
      campaignLabelsById: Object.fromEntries([...campaignLabelsById.entries()].sort((a, b) => a[0] - b[0])),
      excludedAggregates: { ids: EXCLUDED_AGGREGATES, note: "'Soja total' y 'Trigo candeal' se excluyen para evitar doble conteo con sus subcategorías." },
      rowNotes: 'Cada serie es [campaignId, sembradaHa, cosechadaHa, produccionTn, filasConCosechadaNula]. Registros con cosechada nula se excluyen del rendimiento ponderado (Y=ΣP/ΣA) y se marcan para trazabilidad.'
    },
    provinces: [...provinces.values()]
  };
  const departamental = {
    meta: { ...provincial.meta, minValidCampaigns: MIN_DEPT_CAMPAIGNS, note: 'Solo departamentos con al menos N campañas válidas por cultivo; si no, el motor usa la serie provincial y lo documenta.' },
    departments: departments.sort((a, b) => a.provinceId - b.provinceId || a.deptId.localeCompare(b.deptId))
  };
  writeFileSync(path.join(OUT_DIR, 'magyp-provincial.json'), JSON.stringify(provincial));
  writeFileSync(path.join(OUT_DIR, 'magyp-departamental.json'), JSON.stringify(departamental));
  const kb = p => `${(existsSync(p) ? 0 : 0) + Math.round(readFileSync(p).length / 1024)} KB`;
  console.log(`OK public/data/magyp-provincial.json (${kb(path.join(OUT_DIR, 'magyp-provincial.json'))}) · magyp-departamental.json (${kb(path.join(OUT_DIR, 'magyp-departamental.json'))}) · departamentos incluidos: ${departments.length}`);
}

main();
