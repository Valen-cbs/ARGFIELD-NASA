import React from 'react';
import { FarmProfile } from '../types';
import { LandingView } from './LandingView';

interface Props {
  open: boolean;
  lang: 'es' | 'en';
  template: FarmProfile;
  onClose: () => void;
  onSave: (profile: FarmProfile) => void;
}

export const FarmProfileEditorModal: React.FC<Props> = ({ open, lang, template, onClose, onSave }) => {
  if (!open) return null;

  const handleSave = (location: FarmProfile['location'], agriculturalData: Pick<FarmProfile, 'producerName' | 'fieldSizeHectares' | 'currentCrop' | 'cropAllocations' | 'previousCrop' | 'previousCrops' | 'irrigationAvailable'>) => {
    onSave({
      ...template,
      ...agriculturalData,
      location,
      irrigation: agriculturalData.irrigationAvailable ? template.irrigation : 'dryland'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-farm-title"
        className="max-h-[94vh] max-w-5xl flex w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-[#171719]"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-7 dark:border-zinc-700">
          <div>
            <h2 id="edit-farm-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              <span className="text-[#0f3260] dark:text-sky-300">◧</span>{lang === 'es' ? 'Editar estancia' : 'Edit farm'}
            </h2>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
              {lang === 'es' ? 'Actualizá los datos del lote y del productor.' : 'Update field and producer details.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={lang === 'es' ? 'Cerrar' : 'Close'} className="ml-4 text-xl text-slate-500">×</button>
        </div>
        <div className="min-h-0 overflow-y-auto">
          <LandingView
            currentLocation={template.location}
            currentProfile={template}
            onConfirmLocation={handleSave}
            lang={lang}
            presentation="modal"
            submitLabel={lang === 'es' ? 'Guardar cambios' : 'Save changes'}
          />
        </div>
      </div>
    </div>
  );
};
