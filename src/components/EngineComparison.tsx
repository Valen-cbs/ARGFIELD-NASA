import type { EngineResult } from '../engine/engineTypes';
import { regionalMissions, regionalSourcePolicy } from '../data/regionalSources';

/** Uses existing panel/table styling; exposes the mathematical result without rounding it to a prediction. */
export function EngineComparison({ result }: { result: EngineResult | null | undefined }) {
  if (!result) return null;
  const baseline = result.baseline;
  const choices = result.alternatives.slice(0, 2);
  const rows = [...(baseline ? [baseline] : []), ...choices];
  const policy = regionalSourcePolicy(result.input);
  return <div className="space-y-3 text-xs">
    <div className="border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1c1c1e] p-4 space-y-2">
      <strong>Comparación con la rotación declarada</strong>
      {!baseline && <p>No hay una rotación actual evaluable declarada. Registrá 2 o 3 campañas en orden; los cultivos actuales no definen una secuencia.</p>}
      {choices.length < 2 && <p>No hay dos alternativas viables con los datos y restricciones actuales. No se fabrican opciones para completar la comparación.</p>}
      <p>Mismos criterios, horizonte, suelo, clima y pesos para todas las secuencias. Puntajes orientativos de un modelo; no predicen rendimiento, ahorro de agua, carbono ni resultados validados experimentalmente.</p>
      {rows.some(r => r.sequence.some(s => s.secondary)) && <p>Limitación heredada del motor v1.1.0: en trigo + soja de segunda, el balance hídrico evalúa el cultivo primario; no estima la demanda hídrica conjunta de ambos cultivos. No interpretar ese indicador como ventaja hídrica del doble cultivo.</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Criterio</th>{rows.map(r => <th className="p-2" key={r.id}>{r.isBaseline ? 'Actual declarada' : 'Alternativa'}: {r.label}</th>)}</tr></thead>
        <tbody>{rows[0]?.criteria.map(c => <tr key={c.id}><th className="p-2">{c.label} (peso {c.weight.toFixed(2)})</th>{rows.map(r => <td className="p-2" key={r.id}>{r.criteria.find(v => v.id === c.id)?.value?.toFixed(3) ?? 'Sin datos'}</td>)}</tr>)}
          <tr><th className="p-2">S(r)</th>{rows.map(r => <td className="p-2" key={r.id}>{r.score?.toFixed(3) ?? 'Excluida / sin puntaje'}</td>)}</tr></tbody></table></div>
      {rows.map(r => <details key={r.id}><summary>{r.isBaseline ? 'Actual' : 'Alternativa'} · justificación, riesgos y supuestos</summary>
        <ul className="list-disc pl-5">{[...r.exclusions.map(e => e.reason), ...r.justification, ...r.warnings].map((line, i) => <li key={i}>{line}</li>)}</ul>
        {baseline && !r.isBaseline && <p>Diferencias frente a la actual (puntos de indicador, no beneficios físicos garantizados): {r.criteria.map(c => {
          const v = baseline.criteria.find(b => b.id === c.id)?.value;
          return `${c.label}: ${v == null || c.value == null ? 'no estimada' : (c.value - v).toFixed(3)}`;
        }).join(' · ')}.</p>}
      </details>)}
      <p>{baseline?.score != null && choices[0]?.score != null && baseline.score >= choices[0].score ? 'La rotación actual iguala o supera las alternativas: el puntaje no justifica cambiarla.' : choices[0] ? `La primera alternativa encabeza el ranking viable según la prioridad ${result.input.priorities.priority}; revisar sus exclusiones, riesgos y completitud antes de decidir.` : 'No hay recomendación viable.'} Los escenarios climáticos son sensibilidades hipotéticas, no pronósticos.</p>
    </div>
    <details className="border border-slate-300 dark:border-zinc-700 p-4"><summary>Evidencia, datos faltantes y fuentes regionales</summary>
      <p>POWER: {result.provenance.climate ? `${result.provenance.climate.years.start}–${result.provenance.climate.years.end} · ${result.provenance.climate.resolutionNote}` : 'no disponible'}. MAGyP: {result.magyp ? 'estadística regional, no rendimiento del lote' : 'no disponible'}.</p>
      <p>Supuestos: propiedades por textura, coeficientes de cultivo, cobertura/rastrojo y penalizaciones del catálogo. Agua profunda no observada: 50% del agua útil. Beneficios físicos en agua, carbono y rendimiento: no estimados.</p>
      {result.observationIndicators?.map(i => <p key={i.id}><strong>{i.label}: {i.value.toFixed(3)} {i.unit}.</strong> {i.detail}</p>)}
      {result.provenance.satellite.map((s, i) => <p key={i}>{s.productLabel} · {s.source} · {s.observedAt ?? 'sin fecha'} · {s.resolutionNote} · {s.validity}. {s.used ? 'Utilizada: ' : 'No entra al cálculo: '}{s.reason} {s.sourceUrl && <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="underline">Producto / fuente</a>}</p>)}
      {result.provenance.satellite.filter(s => s.samples?.length).map(s => <details key={s.productId}><summary>Fechas y fuentes de la serie {s.productLabel} (píxeles con control de calidad)</summary>{s.samples!.map((v, i) => <p key={i}>{v.observedAt}: {v.value} · <a className="underline" href={v.sourceUrl} target="_blank" rel="noreferrer">Fuente de la observación</a></p>)}</details>)}
      <p>Prioridad {policy.region}: NASA + CONAE; complementos {policy.preferred.join(', ')}. Sin restricciones artificiales de cobertura: cada producto depende del punto, fecha, calidad y resolución publicados.</p>
      {regionalMissions(result.input).map(m => <p key={m.id}><a className="underline" href={m.sourceUrl} target="_blank" rel="noreferrer">{m.name}</a>: {m.integrationNote.es} {m.productIds.length === 0 ? 'No disponible para cálculo en ArgField; no se simulan productos.' : 'Disponibilidad puntual según las lecturas anteriores; conexión no implica dato vigente.'}</p>)}
    </details>
  </div>;
}
