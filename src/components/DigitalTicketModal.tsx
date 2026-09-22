import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChurchEvent, Registration, Language } from '../types';
import { translations } from '../services/i18n';
import { getTicketDisplayCode } from '../services/storage';
import { CheckCircle, Camera, Calendar, Clock, MapPin, X, Ticket, Copy, Check, ShieldCheck } from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const t = translations[language];

  const handleCopy = (text: string, field: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  const ticketCode = getTicketDisplayCode(registration);

  const modalContent = (
    <div
      id="ticket-modal-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="ticket-modal-card"
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
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
        <div className="bg-gradient-to-r from-amber-800 to-amber-950 text-white p-6 pb-6 text-center relative overflow-hidden">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
            <Ticket className="w-6 h-6 text-amber-300" />
          </div>
          <h3 className="text-xl font-extrabold tracking-tight mb-1">{t.ticketTitle}</h3>
          <p className="text-xs text-amber-200/90 max-w-xs mx-auto flex items-center justify-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{t.successReservation}</span>
          </p>

          {/* Ticket Status Indicator */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm bg-white/15 backdrop-blur-sm border border-white/20">
            {registration.checkedIn ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-emerald-200">{t.statusPassed}</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-amber-100">{t.statusPending}</span>
              </>
            )}
          </div>
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
          <div className="pt-3 border-t border-dashed border-stone-300 space-y-2.5">
            {/* Primary Ticket Code */}
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  {t.ticketCodeLabel}
                </span>
                <span className="font-mono text-lg font-black text-slate-900 tracking-widest">
                  {ticketCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(ticketCode, 'ticket')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors cursor-pointer"
              >
                {copiedField === 'ticket' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">{t.copiedText}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>{t.copyText}</span>
                  </>
                )}
              </button>
            </div>

            {/* 8-Digit Admin Reservation Code if Paid Event */}
            {registration.codeUsed && (
              <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                    {t.reservationCodeLabel}
                  </span>
                  <span className="font-mono text-base font-black text-amber-950 tracking-wider">
                    {registration.codeUsed}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(registration.codeUsed!, 'adminCode')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                >
                  {copiedField === 'adminCode' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">{t.copiedText}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-800" />
                      <span>{t.copyText}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <p className="text-[11px] text-center text-stone-500 italic pt-1">
              {t.showTicketAtDoorPrompt}
            </p>
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

  return createPortal(modalContent, document.body);
};
