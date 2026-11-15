import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleX, Satellite } from 'lucide-react';
import { SATELLITE_MISSIONS, missionOperationalLabel } from '../data/satelliteMissions';
import { AgencySource } from '../types';
import { AgencyLogo } from './AgencyLogo';
import { FlagIcon } from './FlagIcon';

interface AgenciesViewProps {
  lang: 'es' | 'en';
}

const AGENCIES: AgencySource[] = ['NASA', 'CONAE', 'ESA', 'AEB', 'AEP', 'UKSA', 'CSA', 'ASI', 'AEE'];

export const AgenciesView: React.FC<AgenciesViewProps> = ({ lang }) => {
  const [agency, setAgency] = useState<string>('ALL');
  const es = lang === 'es';
  const missions = SATELLITE_MISSIONS.filter(mission => agency === 'ALL' || mission.filterAgencies.includes(agency as AgencySource));
  const statusIcon = (state: string) => {
    if (state === 'active') return <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400" />;
    if (state === 'transition') return <AlertTriangle size={17} className="text-amber-500 dark:text-amber-400" />;
    return <CircleX size={17} className="text-rose-600 dark:text-rose-400" />;
  };

  return <div className="max-w-[1500px] mx-auto space-y-4 pb-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-[#0f3260] dark:text-zinc-100"><Satellite size={20} /><h1 className="text-xl font-bold">{es ? 'Fuentes satelitales' : 'Satellite sources'}</h1></div>
        <p className="mt-1 max-w-3xl text-xs text-slate-600 dark:text-zinc-400">{es ? 'Misiones, sensores y características orbitales.' : 'Missions, sensors and orbital characteristics.'}</p>
      </div>
    </div>

    <section className="border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1c1c1e]">
      <div className="flex gap-2 overflow-x-auto px-3 py-3" role="group" aria-label={es ? 'Filtrar por agencia' : 'Filter by agency'}>
        <button type="button" aria-pressed={agency === 'ALL'} onClick={() => setAgency('ALL')} className={`shrink-0 border px-3 py-2 text-xs font-bold ${agency === 'ALL' ? 'bg-[#0f3260] text-white border-[#0f3260]' : 'bg-white dark:bg-[#1c1c1e] border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200'}`}>{es ? 'Todas' : 'All'} <span className="ml-1 opacity-70">{SATELLITE_MISSIONS.length}</span></button>
        {AGENCIES.map(item => {
          const count = SATELLITE_MISSIONS.filter(mission => mission.filterAgencies.includes(item)).length;
          if (!count) return null;
          return <button key={item} type="button" aria-label={item} title={item} aria-pressed={agency === item} onClick={() => setAgency(item)} className={`inline-flex h-9 w-12 shrink-0 items-center justify-center border ${agency === item ? 'bg-[#0f3260] text-white border-[#0f3260]' : 'bg-white dark:bg-[#1c1c1e] border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200'}`}><AgencyLogo agency={item} size="xs" /></button>;
        })}
      </div>
    </section>

    <section className="overflow-hidden border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1c1c1e]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead className="bg-[#0f3260] text-white"><tr>
            <th className="px-3 py-3 font-bold uppercase">{es ? 'Misión' : 'Mission'}</th>
            <th className="w-24 px-3 py-3 font-bold uppercase">{es ? 'País' : 'Country'}</th>
            <th className="w-28 px-3 py-3 font-bold uppercase">{es ? 'Agencia/s' : 'Agency / agencies'}</th>
            <th className="px-3 py-3 font-bold uppercase">{es ? 'Sensor' : 'Sensor'}</th>
            <th className="px-3 py-3 font-bold uppercase">{es ? 'Resolución' : 'Resolution'}</th>
            <th className="px-3 py-3 font-bold uppercase">{es ? 'Órbita' : 'Orbit'}</th>
            <th className="w-24 px-3 py-3 text-center font-bold uppercase">{es ? 'Estado' : 'Status'}</th>
          </tr></thead>
          <tbody>
            {missions.map(mission => {
              return <tr key={mission.id} className="border-t border-slate-200 align-top hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
                <td className="px-3 py-3"><div className="font-bold text-slate-900 dark:text-zinc-100">{mission.name}</div></td>
                <td className="px-3 py-3"><div className="flex items-center gap-2">{mission.countries.map(country => <FlagIcon key={country} country={country} size="sm" />)}</div></td>
                <td className="px-3 py-3"><div className="flex items-center gap-2">{mission.filterAgencies.filter(item => item !== 'NOAA').map(item => <AgencyLogo key={item} agency={item} size="sm" />)}</div></td>
                <td className="max-w-64 px-3 py-3 leading-relaxed text-slate-700 dark:text-zinc-300">{mission.sensor}</td>
                <td className="max-w-64 px-3 py-3 leading-relaxed text-slate-700 dark:text-zinc-300">{mission.resolution}</td>
                <td className="max-w-64 px-3 py-3 leading-relaxed text-slate-700 dark:text-zinc-300">{mission.orbit}</td>
                <td className="px-3 py-3 text-center" title={missionOperationalLabel(mission.operationalState, lang)}>
                  <span className="inline-flex" role="img" aria-label={missionOperationalLabel(mission.operationalState, lang)}>{statusIcon(mission.operationalState)}</span>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
};
