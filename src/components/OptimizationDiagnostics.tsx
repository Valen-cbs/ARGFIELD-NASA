import type { EngineResult } from '../engine/engineTypes';

const outcomes = {
  viable: 'Rotaciones viables evaluadas',
  no_candidates: 'No se pudieron formar secuencias completas',
  incompatible_constraints: 'Las secuencias incumplen restricciones agronómicas',
  insufficient_data: 'Faltan datos o parámetros para evaluar las secuencias',
  calculation_error: 'Se registraron errores de cálculo',
  integration_error: 'Las entradas del optimizador son incompatibles con el contrato del motor',
  unsupported_perennial: 'El catálogo anual no corresponde a los cultivos perennes declarados'
};

export function OptimizationDiagnostics({ result }: { result: EngineResult }) {
  const d = result.diagnostics;
  return <details open={!result.alternatives.length} className="border border-slate-300 dark:border-zinc-700 p-4 text-xs" data-testid="optimization-diagnostics">
    <summary className="font-bold">Diagnóstico del optimizador · {outcomes[d.outcome]}</summary>
    <p className="mt-2">Región: {d.region ?? 'sin determinar'} · Horizonte: {d.horizonCampaigns} campañas. Generadas: {d.generated} · Evaluadas: {d.evaluated} · Viables: {d.viable}. Conteos de secuencias prospectivas en el escenario de referencia; la comparación declarada se evalúa por separado.</p>
    {d.generationBlocks.map((message, i) => <p key={i} className="mt-2">{message}</p>)}
    {d.rejections.map(r => <p key={r.rule} className="mt-2"><strong>{r.rule}: {r.count} secuencia(s).</strong> Ejemplo: {r.example}</p>)}
    {!!d.rejections.length && <p>Una secuencia puede incumplir varias reglas; las frecuencias no se suman como candidatos distintos. Las restricciones siguen activas.</p>}
    {!!d.missingInputs.length && <div className="mt-2"><strong>Insumos ausentes o criterios incompletos</strong><ul className="list-disc pl-5">{d.missingInputs.map(m => <li key={m}>{m}</li>)}</ul><p>Los criterios sin datos quedan sin puntuar; el puntaje utiliza los pesos disponibles e informa su completitud.</p></div>}
    {!!d.errors.length && <div className="mt-2"><strong>Errores de ejecución ({d.errors.length})</strong>{d.errors.map((e, i) => <p key={i}>{e.candidateId} · {e.scenarioId}: {e.message}</p>)}</div>}
    {!!result.excluded.length && <details className="mt-2"><summary>Secuencias descartadas y reglas aplicadas</summary>{result.excluded.map(c => <p key={c.id}><strong>{c.label}:</strong> {c.exclusions.map(e => e.reason).join(' ')}</p>)}</details>}
    {!!result.warnings.length && <details className="mt-2"><summary>Advertencias de datos y del modelo ({result.warnings.length})</summary><ul className="list-disc pl-5">{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
  </details>;
}
