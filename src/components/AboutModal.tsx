import React from 'react';
import { GoogleIcon } from './GoogleIcon';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'es' | 'en';
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-800 w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh] rounded-none animate-in fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Institutional Header */}
        <div className="bg-[#0f3260] dark:bg-[#070e1b] text-white p-4 flex items-center justify-between border-b border-[#092040] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <GoogleIcon name="info" className="text-white" size={20} />
            <h2 className="text-sm font-bold tracking-tight">
              {lang === 'es' ? 'Acerca de Argfield' : 'About Argfield'}
            </h2>
          </div>

          <button
            id="about-modal-close-header-btn"
            onClick={onClose}
            title={lang === 'es' ? 'Cerrar' : 'Close'}
            className="w-8 h-8 flex items-center justify-center bg-[#17437e] hover:bg-[#1f5499] text-white border border-[#2b64ab] transition-colors cursor-pointer"
          >
            <GoogleIcon name="close" size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* Mission Box */}
          <div className="bg-slate-50 dark:bg-[#111c2e] border border-slate-300 dark:border-slate-800 p-3.5 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <GoogleIcon name="satellite_alt" size={16} className="text-[#0f3260] dark:text-sky-400" />
              <span>{lang === 'es' ? 'Misión del Proyecto' : 'Project Mission'}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              {lang === 'es'
                ? 'Argfield reúne observaciones satelitales, clima y datos del productor para consultar condiciones del lote y explorar alternativas de rotación. La disponibilidad de cada lectura depende de su cobertura, fecha y calidad.'
                : 'Argfield brings together satellite observations, weather and producer-provided data to review field conditions and explore crop rotation options. Each reading depends on its coverage, date and quality.'}
            </p>
          </div>

          {/* Current app capabilities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-slate-300 dark:border-slate-800 p-3 bg-white dark:bg-[#111c2e] space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <GoogleIcon name="map" size={15} className="text-[#0f3260] dark:text-sky-400" />
                <span>{lang === 'es' ? 'Mapa y lecturas' : 'Map and readings'}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {lang === 'es'
                  ? 'Consultá capas satelitales y lecturas disponibles para el punto de tu lote, con su fecha y estado de cobertura.'
                  : 'View satellite layers and readings available at your field point, including their date and coverage status.'}
              </p>
            </div>

            <div className="border border-slate-300 dark:border-slate-800 p-3 bg-white dark:bg-[#111c2e] space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <GoogleIcon name="edit" size={15} className="text-[#0f3260] dark:text-sky-400" />
                <span>{lang === 'es' ? 'Perfil de una estancia' : 'Single farm profile'}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {lang === 'es'
                  ? 'Editá en un solo formulario su nombre, ubicación, superficie, cultivos, suelo, riego y prioridades.'
                  : 'Edit its name, location, area, crops, soil, irrigation and priorities in one form.'}
              </p>
            </div>

            <div className="border border-slate-300 dark:border-slate-800 p-3 bg-white dark:bg-[#111c2e] space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <GoogleIcon name="eco" size={15} className="text-[#0f3260] dark:text-sky-400" />
                <span>{lang === 'es' ? 'Optimizador de rotaciones' : 'Rotation optimizer'}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {lang === 'es'
                  ? 'Compará alternativas con el perfil del lote, la rotación declarada y datos climáticos y agronómicos disponibles.'
                  : 'Compare options using the field profile, declared rotation and available climate and agronomic data.'}
              </p>
            </div>

            <div className="border border-slate-300 dark:border-slate-800 p-3 bg-white dark:bg-[#111c2e] space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <GoogleIcon name="notifications" size={15} className="text-[#0f3260] dark:text-sky-400" />
                <span>{lang === 'es' ? 'Clima y avisos' : 'Weather and alerts'}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {lang === 'es'
                  ? 'Revisá el pronóstico y los avisos generados por las fuentes vigentes para este lote.'
                  : 'Review the forecast and notices generated from current sources for this field.'}
              </p>
            </div>
          </div>

          {/* Institutional note */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>NASA Space Apps Challenge 2026</span>
            <span>Versión 2.4.0 • Producción</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-[#070e1b] flex justify-end">
          <button
            id="about-modal-close-footer-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0f3260] hover:bg-[#17437e] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {lang === 'es' ? 'Entendido' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
};
