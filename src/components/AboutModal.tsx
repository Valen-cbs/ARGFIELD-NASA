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
                ? 'Argfield es una plataforma institucional diseñada para traducir observaciones satelitales complejas de la NASA, CONAE e INTA en recomendaciones operativas concretas de rotación de cultivos y manejo hídrico para productores agrícolas.'
                : 'Argfield is an institutional platform built to translate complex NASA, CONAE, and INTA Earth observation data into actionable crop rotation and moisture management decisions for farmers and technical advisors.'}
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-slate-300 dark:border-slate-800 p-3 bg-white dark:bg-[#111c2e] space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <GoogleIcon name="map" size={15} className="text-[#0f3260] dark:text-sky-400" />
                <span>{lang === 'es' ? 'Vigilancia de Cuenca (200 km)' : 'Basin Surveillance (200 km)'}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {lang === 'es'
                  ? 'No nos limitamos al perímetro del lote: monitoreamos las condiciones hídricas y de napas de toda la cuenca hidrográfica regional.'
                  : 'We look beyond farm boundaries: analyzing moisture and groundwater dynamics across the entire 200 km hydrological basin.'}
              </p>
            </div>

            <div className="border border-slate-300 dark:border-slate-800 p-3 bg-white dark:bg-[#111c2e] space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <GoogleIcon name="eco" size={15} className="text-[#0f3260] dark:text-sky-400" />
                <span>{lang === 'es' ? 'Rotación Predictiva' : 'Predictive Crop Rotation'}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {lang === 'es'
                  ? 'Recomendaciones agronómicas para seleccionar cultivos principales y de cobertura según el perfil del suelo y el déficit proyectado.'
                  : 'Agronomic strategies selecting cash and cover crops based on soil retention capacities and projected water deficits.'}
              </p>
            </div>

            <div className="border border-slate-300 dark:border-slate-800 p-3 bg-white dark:bg-[#111c2e] space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <GoogleIcon name="notifications" size={15} className="text-[#0f3260] dark:text-sky-400" />
                <span>{lang === 'es' ? 'Alertas Tempranas' : 'Early Warning Alerts'}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {lang === 'es'
                  ? 'Ponderación de estrés hídrico, olas de calor y recarga subterránea combinando SMAP, GPM IMERG, MODIS y GRACE-FO.'
                  : 'Weighted alerts for moisture deficits, heat waves, and aquifer depletion fusing SMAP, GPM, MODIS, and GRACE-FO data.'}
              </p>
            </div>

            <div className="border border-slate-300 dark:border-slate-800 p-3 bg-white dark:bg-[#111c2e] space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <GoogleIcon name="wifi_off" size={15} className="text-amber-700 dark:text-amber-400" />
                <span>{lang === 'es' ? 'Resiliencia Rural Offline' : 'Rural Offline Resilience'}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {lang === 'es'
                  ? 'Persistencia local para operar en zonas de campo profundo sin cobertura celular o con baja conectividad.'
                  : 'Local data persistence designed to operate in deep rural fields without cellular network coverage.'}
              </p>
            </div>
          </div>

          {/* Institutional note */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>NASA Space Apps Challenge 2024-2026</span>
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
