import React, { useState, useEffect } from 'react';
import { SPACE_AGENCIES, OperationalStatus } from '../data/agencies';
import { AgencySource } from '../types';
import { FlagIcon } from './FlagIcon';
import { AgencyLogo } from './AgencyLogo';
import { GoogleIcon } from './GoogleIcon';
import { SkeletonLoader } from './SkeletonLoader';

interface AgenciesViewProps {
  lang: 'es' | 'en';
}

export const AgenciesView: React.FC<AgenciesViewProps> = ({ lang }) => {
  const [selectedAgency, setSelectedAgency] = useState<AgencySource | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(t);
  }, [selectedAgency]);

  const agencyKeys = Object.keys(SPACE_AGENCIES) as AgencySource[];

  const allMissions = agencyKeys.flatMap((key) => {
    const agency = SPACE_AGENCIES[key];
    return agency.missions.map((m) => ({
      ...m,
      agencyId: key,
      agencyName: agency.fullName,
      country: agency.country
    }));
  });

  const filteredMissions = selectedAgency === 'ALL'
    ? allMissions
    : allMissions.filter(m => m.agencyId === selectedAgency);

  const getStatusBadge = (status: OperationalStatus) => {
    switch (status) {
      case 'operational':
      case 'nominal':
        return (
          <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5">
            {lang === 'es' ? 'OPERATIVO' : 'ACTIVE'}
          </span>
        );
      case 'calibrating':
        return (
          <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-2 py-0.5">
            {lang === 'es' ? 'CALIBRANDO' : 'CALIBRATING'}
          </span>
        );
      default:
        return (
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-zinc-300 bg-slate-200 dark:bg-[#27272a] border border-slate-300 dark:border-[#3f3f46] px-2 py-0.5">
            {lang === 'es' ? 'EN REVISIÓN' : 'STANDBY'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Agency Filter Bar */}
      <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33] p-2.5 sm:p-3">
        {/* Header row: Label & Constellation Status */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-[#2e2e33]">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              {lang === 'es' ? 'Agencia' : 'Agency'}:
            </span>
            <span className="text-[11px] font-mono font-bold text-[#0f3260] dark:text-sky-400">
              {selectedAgency === 'ALL' ? (lang === 'es' ? 'Todas' : 'All') : selectedAgency}
            </span>
          </div>

          <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
            100% {lang === 'es' ? 'Constelación Activa' : 'Active'}
          </span>
        </div>

        {/* Buttons row: In mobile ONLY ICONS (or "Todas"), in desktop icons + text */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <button
            type="button"
            id="agency-filter-all"
            onClick={() => setSelectedAgency('ALL')}
            className={`h-8 sm:h-auto px-2.5 py-1 text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
              selectedAgency === 'ALL'
                ? 'bg-[#0f3260] dark:bg-[#27272a] text-white border-[#0f3260] dark:border-[#3f3f46]'
                : 'bg-slate-50 dark:bg-[#232326] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-[#333336] hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
            }`}
          >
            {lang === 'es' ? 'Todas' : 'All'} ({allMissions.length})
          </button>

          {agencyKeys.map((key) => {
            const isSelected = selectedAgency === key;
            return (
              <button
                key={key}
                type="button"
                id={`agency-filter-${key.toLowerCase()}`}
                onClick={() => setSelectedAgency(key)}
                title={`${key} - ${SPACE_AGENCIES[key].fullName}`}
                aria-label={`Filtrar por ${key}`}
                className={`h-8 sm:h-auto min-w-[38px] px-2 sm:px-2.5 py-1 text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-sky-100/90 dark:bg-[#323238] text-[#0f3260] dark:text-white border-[#0f3260] dark:border-zinc-300 font-bold ring-1 ring-[#0f3260]/40'
                    : 'bg-slate-50 dark:bg-[#232326] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-[#333336] hover:bg-slate-100 dark:hover:bg-[#2c2c30]'
                }`}
              >
                <AgencyLogo agency={key} size="xs" />
                <span className="hidden sm:inline">{key}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Skeleton or Telemetry Table */}
      {isLoading ? (
        <SkeletonLoader type="table" />
      ) : (
        <div className="bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-[#2e2e33]">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#0f3260] dark:bg-[#161618] text-white uppercase text-[10px] tracking-wider font-semibold border-b border-[#092040] dark:border-[#2e2e33]">
                <tr>
                  <th className="px-3 py-2.5 border-r border-[#092040] dark:border-[#2e2e33]">Satélite / Misión</th>
                  <th className="px-3 py-2.5 border-r border-[#092040] dark:border-[#2e2e33] text-center w-14">
                    {lang === 'es' ? 'País' : 'Country'}
                  </th>
                  <th className="px-3 py-2.5 border-r border-[#092040] dark:border-[#2e2e33] text-center w-16">
                    {lang === 'es' ? 'Agencia' : 'Agency'}
                  </th>
                  <th className="px-3 py-2.5 border-r border-[#092040] dark:border-[#2e2e33]">Sensor</th>
                  <th className="px-3 py-2.5 border-r border-[#092040] dark:border-[#2e2e33]">Resolución</th>
                  <th className="px-3 py-2.5 border-r border-[#092040] dark:border-[#2e2e33]">Órbita</th>
                  <th className="px-3 py-2.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#2e2e33]">
                {filteredMissions.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#232326] transition-colors">
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-zinc-100 border-r border-slate-200 dark:border-[#2e2e33]">
                      {m.name}
                    </td>
                    {/* País column (flag SVG icon only, no name) */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-200 dark:border-[#2e2e33]">
                      <div className="flex justify-center items-center">
                        <FlagIcon agency={m.agencyId} size="sm" />
                      </div>
                    </td>
                    {/* Agencia column (SVG agency logo only, no siglas) */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-200 dark:border-[#2e2e33]">
                      <div className="flex justify-center items-center">
                        <AgencyLogo agency={m.agencyId} size="sm" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-zinc-300 border-r border-slate-200 dark:border-[#2e2e33]">
                      <div className="font-semibold text-slate-800 dark:text-zinc-200">{m.type}</div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">{m.sensor}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700 dark:text-zinc-300 border-r border-slate-200 dark:border-[#2e2e33]">
                      {m.resolution}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700 dark:text-zinc-300 border-r border-slate-200 dark:border-[#2e2e33]">
                      {m.altitudeKm} km
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {getStatusBadge(m.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-[#2e2e33]">
            {filteredMissions.map((m, idx) => (
              <div key={idx} className="p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlagIcon agency={m.agencyId} size="xs" />
                    <AgencyLogo agency={m.agencyId} size="xs" />
                    <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">{m.name}</span>
                  </div>
                  <div>
                    {getStatusBadge(m.status)}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#232326] p-2 border border-slate-200 dark:border-[#2e2e33]">
                  <div className="font-semibold text-slate-800 dark:text-zinc-200">{m.type}</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">{m.sensor}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-zinc-400">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Resolución</span>
                    <span className="text-slate-800 dark:text-zinc-200">{m.resolution}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Órbita</span>
                    <span className="text-slate-800 dark:text-zinc-200">{m.altitudeKm} km</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
