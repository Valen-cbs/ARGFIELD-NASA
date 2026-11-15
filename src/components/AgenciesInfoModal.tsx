import React, { useState } from 'react';
import { 
  X, 
  Satellite, 
  Globe, 
  Layers, 
  ExternalLink, 
  Sparkles, 
  Radar, 
  Cpu, 
  Waves
} from 'lucide-react';
import { SPACE_AGENCIES } from '../data/agencies';
import { AgencySource } from '../types';

interface AgenciesInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'es' | 'en';
}

export const AgenciesInfoModal: React.FC<AgenciesInfoModalProps> = ({
  isOpen,
  onClose,
  lang
}) => {
  const [selectedAgencyKey, setSelectedAgencyKey] = useState<AgencySource>('NASA');

  if (!isOpen) return null;

  const agencyKeys = Object.keys(SPACE_AGENCIES) as AgencySource[];
  const activeAgency = SPACE_AGENCIES[selectedAgencyKey];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {lang === 'es' ? 'Federación Multi-Agencia de Observación Terrestre' : 'Multi-Agency Earth Observation Federation'}
              </h2>
              <p className="text-xs text-slate-400">
                NASA Space Apps Challenge 2026 • Arquitectura Abierta
              </p>
            </div>
          </div>

          <button
            id="close-agency-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Agency Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 overflow-x-auto no-scrollbar">
          {agencyKeys.map((key) => {
            const agency = SPACE_AGENCIES[key];
            const isSelected = key === selectedAgencyKey;
            return (
              <button
                key={key}
                id={`agency-tab-${key}`}
                onClick={() => setSelectedAgencyKey(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{agency.flag}</span>
                <span>{agency.id}</span>
              </button>
            );
          })}
        </div>

        {/* Agency Missions Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <span>{activeAgency.flag}</span>
                <span>{activeAgency.fullName}</span>
              </div>
              <div className="text-xs text-slate-400">{activeAgency.country}</div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono text-[11px] text-blue-400">
              {lang === 'es' ? 'Catálogo informativo' : 'Informational catalogue'}
            </span>
          </div>

          {/* Missions Grid */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Radar className="w-4 h-4 text-emerald-400" />
              {lang === 'es' ? 'Sensores y misiones de referencia' : 'Reference missions and sensors'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeAgency.missions.map((mission, idx) => (
                <div key={idx} className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{mission.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 font-mono">
                      {mission.resolution}
                    </span>
                  </div>
                  <div className="text-emerald-400 font-semibold text-[11px]">
                    {mission.sensor}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    <strong>{lang === 'es' ? 'Capa Agronómica:' : 'Agronomic Layer:'}</strong> {mission.type}
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed pt-1 border-t border-slate-800/80">
                    {mission.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Why Multi-Agency Matters for Argfield */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs leading-relaxed">
            <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
              <Waves className="w-4 h-4" />
              {lang === 'es' ? '¿Por qué la Federación Multi-Agencia supera a los silos de datos?' : 'Why Federated Earth Observation Outperforms Silos'}
            </h4>
            <p className="text-slate-300">
              {lang === 'es'
                ? 'Los productos aportan información diferente: SMAP observa humedad superficial; CONAE combina información SAOCOM con modelos para estimar la humedad del perfil hasta 50 cm; GPM estima precipitación. Consultá Fuentes para ver qué productos están conectados, sus fechas y sus limitaciones. Las misiones de este catálogo no están todas integradas.'
                : 'Products provide different information: SMAP observes surface moisture; CONAE combines SAOCOM data and models to estimate moisture down to 50 cm; GPM estimates precipitation. Check Sources for connected products, their dates and limitations. Not all missions in this catalogue are integrated.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            {lang === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
