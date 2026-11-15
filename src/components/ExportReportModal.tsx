import React from 'react';
import { GoogleIcon } from './GoogleIcon';
import { FarmProfile, Alert, CropRotationPlan } from '../types';
import { SatelliteReading } from '../types/satellite';

interface ExportReportModalProps {
  farmProfile: FarmProfile;
  alerts: Alert[];
  readings: SatelliteReading[];
  plans: CropRotationPlan[];
  onClose: () => void;
  lang: 'es' | 'en';
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  farmProfile,
  alerts,
  readings,
  plans,
  onClose,
  lang
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const reportData = {
      exportTimestamp: new Date().toISOString(),
      platform: 'Argfield (NASA Space Apps)',
      dataNotice: 'Satellite readings are provider data at a point, with individual date/coverage/quality states. Weather and rotation estimates remain illustrative demo data.',
      rotationStrategiesMode: 'demo',
      satelliteReadings: readings,
      farmProfile,
      activeAlertsCount: alerts.length,
      alerts,
      rotationStrategies: plans
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `informe-argfield-${farmProfile.location.basinId}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-800 w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col rounded-none animate-in fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0f3260] dark:bg-[#070e1b] text-white p-4 flex items-center justify-between border-b border-[#092040] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <GoogleIcon name="description" size={20} className="text-white" />
            <h2 className="text-sm font-bold tracking-tight">
              {lang === 'es' ? 'Exportar informe del lote' : 'Export farm report'}
            </h2>
          </div>

          <button
            id="export-modal-close-header-btn"
            onClick={onClose}
            title={lang === 'es' ? 'Cerrar' : 'Close'}
            className="w-8 h-8 flex items-center justify-center bg-[#17437e] hover:bg-[#1f5499] text-white border border-[#2b64ab] transition-colors cursor-pointer"
          >
            <GoogleIcon name="close" size={16} />
          </button>
        </div>

        {/* Modal Preview Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <div id="printable-report" className="space-y-4">
            <p className="p-2 border border-amber-300 bg-amber-50 text-amber-950">{lang === 'es' ? 'Las lecturas satelitales conservan su fuente, fecha y estado. Los planes de rotación y sus beneficios son ejemplos de la demo.' : 'Satellite readings retain their source, date and status. Rotation plans and benefits are demo examples.'}</p>
            <div className="space-y-1">
              {readings.map(r => <p key={r.productId} className="text-[11px] break-words"><strong>{r.productId}</strong>: {r.value ?? '—'} {r.unit} · {r.observedAt ?? 'sin fecha'} · {r.status}{r.cached ? ' · guardado' : ''} · {r.source}</p>)}
            </div>
            <div className="bg-slate-50 dark:bg-[#111c2e] p-4 border border-slate-300 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 text-sm">
                <span>{farmProfile.location.name}</span>
                <span className="text-xs font-mono text-[#0f3260] dark:text-sky-400">{new Date().toLocaleDateString()}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                {lang === 'es' ? 'Cuenca Hidrográfica' : 'Basin'}: <strong className="text-slate-800 dark:text-slate-200">{farmProfile.location.basinName}</strong> • {lang === 'es' ? 'Suelo' : 'Soil'}: <strong className="text-slate-800 dark:text-slate-200">{farmProfile.soilType}</strong> • {lang === 'es' ? 'Cultivo actual' : 'Current crop'}: <strong className="text-slate-800 dark:text-slate-200">{farmProfile.currentCrop}</strong>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Coordenadas: {farmProfile.location.lat.toFixed(4)}, {farmProfile.location.lng.toFixed(4)} | Superficie: {farmProfile.fieldSizeHectares} ha
              </p>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 dark:bg-[#111c2e] p-3 border border-slate-300 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  {lang === 'es' ? 'Alertas Satelitales' : 'Satellite Alerts'}
                </span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{alerts.length}</span>
              </div>
              <div className="bg-slate-50 dark:bg-[#111c2e] p-3 border border-slate-300 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  {lang === 'es' ? 'Resiliencia Plan' : 'Plan Resilience'}
                </span>
                <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">{plans[0]?.resilienceScore || 85}/100</span>
              </div>
              <div className="bg-slate-50 dark:bg-[#111c2e] p-3 border border-slate-300 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  {lang === 'es' ? 'Ahorro Hídrico' : 'Water Savings'}
                </span>
                <span className="text-lg font-bold font-mono text-[#0f3260] dark:text-sky-400">-{plans[0]?.waterSavingsPct || 28}%</span>
              </div>
            </div>

            {/* Rotation Plan Summary */}
            {plans[0] && (
              <div className="border border-slate-300 dark:border-slate-800 p-3 bg-white dark:bg-[#111c2e] space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center justify-between">
                  <span>{lang === 'es' ? 'Estrategia Recomendada' : 'Recommended Strategy'}: {plans[0].title}</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{plans[0].primaryGoal}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  {plans[0].summary}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-[#070e1b] flex items-center justify-end">
          <div className="flex items-center gap-2">
            <button
              id="export-json-btn"
              onClick={handleDownloadJSON}
              title={lang === 'es' ? 'Descargar datos en JSON' : 'Download JSON dataset'}
              className="px-3 py-1.5 bg-white dark:bg-[#111c2e] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <GoogleIcon name="download" size={15} className="text-[#0f3260] dark:text-sky-400" />
              <span>JSON</span>
            </button>

            <button
              id="print-report-btn"
              onClick={handlePrint}
              title={lang === 'es' ? 'Imprimir / Exportar a PDF' : 'Print / Export to PDF'}
              className="px-4 py-1.5 bg-[#0f3260] hover:bg-[#17437e] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <GoogleIcon name="print" size={15} />
              <span>{lang === 'es' ? 'Imprimir PDF' : 'Print PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
