import type { CropManagementRecommendation } from '../engine/cropManagement';

const objectiveNames: Record<CropManagementRecommendation['actions'][number]['objective'], string> = {
  water: 'Agua',
  soil: 'Suelo',
  succession: 'Sucesión',
  margin: 'Margen'
};

const systemNames: Record<CropManagementRecommendation['system'], string> = {
  annual: 'Anual',
  perennial: 'Perenne',
  semi_perennial: 'Plurianual'
};

export function CropManagementRecommendations({ recommendations }: { recommendations: CropManagementRecommendation[] }) {
  return (
    <section aria-label="Recomendaciones por cultivo" className="space-y-4">
      <p className="text-right text-xs text-slate-500 dark:text-zinc-400">Ordenadas según la prioridad de la estancia</p>

      <div className="grid gap-4 lg:grid-cols-2">
        {recommendations.map(item => (
          <article key={item.crop} className="border border-slate-200 border-l-4 border-l-emerald-600 bg-white p-4 shadow-sm dark:border-zinc-700 dark:border-l-emerald-500 dark:bg-[#1c1c1e] sm:p-5">
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Cultivo</p>
                <h3 className="mt-1 text-lg font-bold">{item.crop}</h3>
              </div>
              <span className="shrink-0 border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {systemNames[item.system]}
              </span>
            </header>

            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {item.actions.map(action => (
                <li key={action.objective} className="border border-slate-200 bg-slate-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">{objectiveNames[action.objective]}</p>
                  <h4 className="mt-1 text-sm font-semibold leading-snug">{action.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">{action.detail}</p>
                </li>
              ))}
            </ol>

            {item.context.length > 0 && (
              <details className="mt-4 border-t border-slate-200 pt-3 dark:border-zinc-700">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600 marker:text-emerald-700 dark:text-zinc-300 dark:marker:text-emerald-400">
                  Contexto de la estancia considerado
                </summary>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
                  {item.context.map(detail => <li key={detail}>{detail}</li>)}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
