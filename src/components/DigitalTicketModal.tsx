import React from 'react';
import { ChurchEvent, Registration, Language } from '../types';
import { translations } from '../services/i18n';
import { CheckCircle, Camera, Calendar, Clock, MapPin, X, Ticket } from 'lucide-react';

interface DigitalTicketModalProps {
  registration: Registration;
  event: ChurchEvent;
  language: Language;
  onClose: () => void;
}

export const DigitalTicketModal: React.FC<DigitalTicketModalProps> = ({
  registration,
  event,
  language,
  onClose
}) => {
  const t = translations[language];

  return (
    <div
      id="ticket-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="ticket-modal-card"
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 end-4 z-10 p-2 text-stone-500 hover:text-stone-900 bg-white/80 hover:bg-white rounded-full transition-colors cursor-pointer"
          aria-label={t.closeBtn}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ticket Header */}
        <div className="bg-gradient-to-r from-amber-800 to-amber-950 text-white p-6 pb-8 text-center relative overflow-hidden">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
            <Ticket className="w-6 h-6 text-amber-300" />
          </div>
          <h3 className="text-xl font-extrabold tracking-tight mb-1">{t.ticketTitle}</h3>
          <p className="text-xs text-amber-200/90 max-w-xs mx-auto flex items-center justify-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{t.successReservation}</span>
          </p>
        </div>

        {/* Screenshot Reminder Banner */}
        <div className="bg-amber-50 border-y border-amber-200/80 px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-amber-900 text-center">
          <Camera className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{t.screenshotPrompt}</span>
        </div>

        {/* Ticket Body */}
        <div className="p-6 space-y-4 text-stone-800 text-sm">
          <div>
            <span className="text-xs font-medium text-stone-400 block mb-0.5">{t.title}</span>
            <h4 className="font-bold text-base text-slate-900 leading-snug">{event.title}</h4>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
            <div>
              <span className="text-xs font-medium text-stone-400 block mb-0.5">{t.attendeeName}</span>
              <span className="font-bold text-slate-900">{registration.userName}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-stone-400 block mb-0.5">{t.partyCount}</span>
              <span className="font-bold text-slate-900">{registration.partySize} {t.personUnit}</span>
            </div>
          </div>

          {registration.elementLabel && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-xs font-medium text-stone-500 block mb-0.5">{t.seatAssigned}</span>
              <span className="text-base font-extrabold text-amber-800">{registration.elementLabel}</span>
            </div>
          )}

          <div className="space-y-1.5 pt-1 text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{event.location}</span>
            </div>
          </div>

          {/* Verification Code Box */}
          <div className="pt-3 border-t border-dashed border-stone-300 text-center">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
              {t.confirmationCode}
            </span>
            <span className="inline-block px-4 py-1.5 bg-stone-100 rounded-lg font-mono text-base font-bold text-slate-900 tracking-widest border border-stone-200">
              {registration.id.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
