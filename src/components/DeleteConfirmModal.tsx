import React from 'react';
import { ChurchEvent, Language } from '../types';
import { translations } from '../services/i18n';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  event: ChurchEvent;
  language: Language;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  event,
  language,
  onConfirm,
  onClose
}) => {
  const t = translations[language];

  return (
    <div
      id="delete-confirm-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="delete-confirm-card"
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-4"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-stone-400 hover:text-stone-700 rounded-full transition-colors cursor-pointer shrink-0"
          aria-label={t.cancelBtn}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-slate-900 mb-1">
            {t.deleteConfirmTitle}
          </h3>
          <p className="text-sm font-semibold text-amber-900 mb-2">
            «{event.title}»
          </p>
          <p className="text-xs text-stone-600 leading-relaxed">
            {t.deleteConfirmDesc}
          </p>
        </div>

        <div className="pt-3 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
          >
            {t.cancelBtn}
          </button>

          <button
            id="confirm-delete-action-btn"
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>{t.confirmDeleteBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
