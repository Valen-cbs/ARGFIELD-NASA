/**
 * Prueba de humo del motor con datos reales:
 *  - NASA POWER en vivo para Presidencia Roque Sáenz Peña / Comandante Fernández (Chaco).
 *  - Archivos estáticos MAGyP preprocesados (dataset nacional real).
 * Ejecutar: npx tsx scripts/smoke-engine.ts
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { evaluateRotations, defaultEngineDeps } from '../src/engine/engine';
import { MagypProvincialFile, MagypDepartamentalFile } from '../src/engine/magyp';

async function main() {
  const root = path.dirname(new URL(import.meta.url).pathname);
  const loadJson = (name: string): unknown => JSON.parse(readFileSync(path.join(root, '..', 'public', 'data', name), 'utf8'));
  const deps = {
    ...defaultEngineDeps,
    loadProvincial: async () => loadJson('magyp-provincial.json') as MagypProvincialFile,
    loadDepartamental: async () => loadJson('magyp-departamental.json') as MagypDepartamentalFile
  };
  const result = await evaluateRotations({
    lat: -26.786,
    lng: -60.443,
    province: 'Chaco',
    department: 'Comandante Fernández',
    hectares: 850,
    currentCropIds: ['soybean'],
    previousCropId: 'soybean',
    irrigationAvailable: false,
    soil: { type: 'clay_vertisol' },
    priorities: { priority: 'drought_resilience', label: 'drought_resilience' },
    nowIso: '2026-11-15T18:00:00Z'
  }, deps);
  console.log('=== advertencias ===');
  result.warnings.forEach(w => console.log(' •', w));
  console.log('=== alternativas (referencia) ===');
  for (const alt of result.alternatives) {
    console.log(` ${alt.score !== null ? (alt.score * 100).toFixed(1) : 's/d'} [compl ${(alt.completeness * 100).toFixed(0)}%] ${alt.label}`);
  }
  console.log('=== excluidas ===');
  for (const ex of result.excluded) {
    console.log(` ${ex.label} ← ${ex.exclusions.map(e => e.rule).join(', ')}`);
  }
  console.log('=== escenarios (top 3) ===');
  for (const s of result.scenarios) {
    console.log(` ${s.scenario.id}: ${s.ranking.slice(0, 3).map(r => `${r.id}=${r.score !== null ? (r.score * 100).toFixed(0) : 's/d'}`).join(' · ')}`);
  }
  console.log('=== proveniencia ===');
  console.log(' clima:', result.provenance.climate ? `${result.provenance.climate.years.start}-${result.provenance.climate.years.end} elev ${result.provenance.climate.altitudeM}m` : 'NO DISPONIBLE');
  console.log(' magyp:', result.magyp ? `${result.magyp.provinceName} / ${result.magyp.departmentName ?? 'provincial'} cultivos=${Object.keys(result.magyp.crops).join(',')}` : 'NO DISPONIBLE');
  const best = result.alternatives[0];
  if (best) {
    console.log('=== desglose de la mejor alternativa ===');
    best.criteria.forEach(c => console.log(`  ${c.id}: ${c.value ?? 's/d'} (w=${c.weight.toFixed(2)})`));
    console.log(' ejemplo balance campaña 1:', JSON.stringify(best.steps[0]?.balance.totals));
    const soja1Stats = result.magyp?.crops.soja1;
  console.log(' soja1 regional:', soja1Stats ? `${soja1Stats.magypName} ${soja1Stats.scale} Ȳ=${soja1Stats.weightedYieldKgHa} kg/ha CV=${soja1Stats.cv} campañas=${soja1Stats.campaigns}` : 'sin serie');
  }
}

void main();
