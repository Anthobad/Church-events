import React, { useState, useId } from 'react';
import {
  ChurchEvent,
  Registration,
  AdminReservationCode,
  Language,
  SeatingElement
} from '../types';
import { translations } from '../services/i18n';
import { BlueprintCanvas } from './BlueprintCanvas';
import { DigitalTicketModal } from './DigitalTicketModal';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Heart,
  Eye,
  Users,
  KeyRound,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Edit2,
  Trash2
} from 'lucide-react';

interface EventDetailModalProps {
  event: ChurchEvent;
  language: Language;
  isAdmin: boolean;
  isLiked: boolean;
  registrations: Registration[];
  adminCodes: AdminReservationCode[];
  onClose: () => void;
  onToggleLike: (eventId: string) => void;
  onRegister: (data: {
    eventId: string;
    userName: string;
    userPhone: string;
    partySize: number;
    elementId?: string;
    elementLabel?: string;
    isPaid: boolean;
    codeUsed?: string;
  }) => { success: boolean; conflict?: boolean; error?: string; registration?: Registration };
  onGenerateAdminCode: (
    eventId: string,
    userName: string,
    partySize: number
  ) => AdminReservationCode;
  onEditClick?: (event: ChurchEvent) => void;
  onDeleteClick?: (event: ChurchEvent) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  language,
  isAdmin,
  isLiked,
  registrations,
  adminCodes,
  onClose,
  onToggleLike,
  onRegister,
  onGenerateAdminCode,
  onEditClick,
  onDeleteClick
}) => {
  const t = translations[language];

  // User registration state
  const [selectedElement, setSelectedElement] = useState<SeatingElement | null>(null);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [partySize, setPartySize] = useState<number>(1);
  const [eightDigitCodeInput, setEightDigitCodeInput] = useState('');
  const [verifiedAdminCode, setVerifiedAdminCode] = useState<AdminReservationCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTicket, setSuccessTicket] = useState<Registration | null>(null);

  // Admin Code Generator state (form at bottom of page)
  const [adminAttendeeName, setAdminAttendeeName] = useState('');
  const [adminPartySize, setAdminPartySize] = useState<number>(2);
  const [justGeneratedCode, setJustGeneratedCode] = useState<AdminReservationCode | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Unique accessible IDs for inputs
  const nameInputId = useId();
  const phoneInputId = useId();
  const partySizeInputId = useId();
  const codeInputId = useId();
  const adminNameInputId = useId();
  const adminSizeInputId = useId();

  // Filter registrations and codes for this specific event
  const eventRegistrations = registrations.filter((r) => r.eventId === event.id);
  const eventCodes = adminCodes.filter((c) => c.eventId === event.id);

  // Handle validating 8-digit code
  const handleVerifyCode = () => {
    setErrorMessage(null);
    const cleanCode = eightDigitCodeInput.trim();
    if (cleanCode.length !== 8) {
      setErrorMessage(t.invalidCodeError);
      return;
    }

    const matchingCode = eventCodes.find((c) => c.code === cleanCode);
    if (!matchingCode) {
      setErrorMessage(t.invalidCodeError);
      return;
    }

    if (matchingCode.claimed) {
      setErrorMessage(t.codeAlreadyUsedError);
      return;
    }

    // Code verified! Pre-fill attendee name and party size
    setVerifiedAdminCode(matchingCode);
    setUserName(matchingCode.userName);
    setPartySize(matchingCode.partySize);
  };

  // Handle Seating Selection
  const handleSelectSeatingElement = (element: SeatingElement) => {
    setErrorMessage(null);
    setSelectedElement(element);

    if (element.type === 'chair') {
      setPartySize(1);
    } else if (element.type.startsWith('table')) {
      // Calculate remaining capacity on this table
      const occupied = eventRegistrations
        .filter((r) => r.elementId === element.id)
        .reduce((sum, r) => sum + r.partySize, 0);
      const remaining = element.capacity - occupied;

      if (remaining <= 0) {
        setErrorMessage(t.tableFull);
        return;
      }

      // If already verified code with party size, check fit
      if (verifiedAdminCode) {
        if (verifiedAdminCode.partySize > remaining) {
          setErrorMessage(`هذه الطاولة تتسع لـ ${remaining} أفراد فقط، بينما حجزك لـ ${verifiedAdminCode.partySize} أفراد.`);
          return;
        }
      } else {
        // Table packing guidance for free events
        // Default party size to min(remaining, 2)
        const defaultSize = Math.min(remaining, Math.max(1, partySize));
        setPartySize(defaultSize);
      }
    }
  };

  // Submit User Registration
  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!userName.trim()) {
      setErrorMessage('يرجى إدخال اسم الحاجز');
      return;
    }

    if (event.blueprint && !selectedElement) {
      setErrorMessage(t.selectASeatOrTable);
      return;
    }

    if (event.isPaid) {
      if (!verifiedAdminCode) {
        setErrorMessage(t.enterEightDigitCode);
        return;
      }
    }

    // Call registration handler
    const result = onRegister({
      eventId: event.id,
      userName: userName.trim(),
      userPhone: userPhone.trim(),
      partySize: verifiedAdminCode ? verifiedAdminCode.partySize : partySize,
      elementId: selectedElement?.id,
      elementLabel: selectedElement?.label,
      isPaid: event.isPaid,
      codeUsed: verifiedAdminCode?.code
    });

    if (!result.success) {
      if (result.conflict) {
        setErrorMessage(t.conflictError);
      } else {
        setErrorMessage(result.error || t.registrationFailedGeneric);
      }
      return;
    }

    // Success! Show digital ticket
    if (result.registration) {
      setSuccessTicket(result.registration);
    }
  };

  // Admin Code Generation Handler
  const handleAdminGenerateCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminAttendeeName.trim()) return;

    const newCode = onGenerateAdminCode(
      event.id,
      adminAttendeeName.trim(),
      Math.max(1, adminPartySize)
    );

    setJustGeneratedCode(newCode);
    setAdminAttendeeName('');
    setAdminPartySize(2);
    setCopiedCode(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      id="event-detail-modal-overlay"
      className="fixed inset-0 z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="event-detail-card"
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto"
      >
        {/* Sticky Header / Close bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-stone-200 flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 shrink-0">
              {t.eventDetails}
            </span>
            {event.type === 'open' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                <Sparkles className="w-3 h-3 text-emerald-700" />
                <span>{t.openForAll} ({t.freeEvent})</span>
              </span>
            ) : event.isPaid ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                <KeyRound className="w-3 h-3 shrink-0" />
                <span>{t.paidEvent}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 shrink-0">
                {t.freeEvent}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Admin fast edit / delete buttons */}
            {isAdmin && (
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0">
                {onEditClick && (
                  <button
                    type="button"
                    onClick={() => onEditClick(event)}
                    className="p-1.5 text-stone-700 hover:text-amber-800 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                    title={t.editEvent}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {onDeleteClick && (
                  <button
                    type="button"
                    onClick={() => onDeleteClick(event)}
                    className="p-1.5 text-stone-700 hover:text-red-600 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                    title={t.deleteEvent}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <button
              id="close-event-modal-btn"
              type="button"
              onClick={onClose}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors cursor-pointer shrink-0"
              aria-label={t.closeBtn}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Banner (if image exists) */}
        {event.imageUrl && (
          <div className="relative w-full h-56 sm:h-72 bg-stone-900 overflow-hidden">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          </div>
        )}

        <div className="p-5 sm:p-8 space-y-6">
          {/* Title & Stats */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {event.title}
              </h1>

              {/* Real-time stats: Likes & Views */}
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-500 bg-stone-50 px-3 py-1.5 rounded-full border border-stone-200">
                  <Eye className="w-4 h-4 text-stone-400" />
                  <span>{event.views} {t.views}</span>
                </span>

                <button
                  type="button"
                  onClick={() => onToggleLike(event.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isLiked
                      ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs'
                      : 'bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-600 border border-stone-200'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{event.likes} {t.likes}</span>
                </button>
              </div>
            </div>

            {/* Date, Time, Location Bar */}
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-stone-600 mt-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>{event.date}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>{event.time}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-700" />
                <span>{event.location}</span>
              </span>
            </div>
          </div>

          {/* Full Description */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-2">
              {t.description}
            </h2>
            <p className="text-stone-700 leading-relaxed whitespace-pre-line text-base">
              {event.description}
            </p>
          </div>

          {/* Seating Blueprint Section (only for registration required events) */}
          {event.type === 'registration_required' && event.blueprint && event.blueprint.elements.length > 0 && (
            <div className="pt-4 border-t border-stone-200">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <span>{t.blueprintTitle}</span>
                  </h2>
                  <p className="text-xs text-stone-500">{t.blueprintDesc}</p>
                </div>

                {selectedElement && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                    {t.seatAssigned}: {selectedElement.label} ({selectedElement.capacity} {t.guestsCount})
                  </span>
                )}
              </div>

              {/* Interactive Blueprint Canvas */}
              <BlueprintCanvas
                blueprint={event.blueprint}
                registrations={eventRegistrations}
                selectedElementId={selectedElement?.id}
                onSelectElement={handleSelectSeatingElement}
                language={language}
                partySizeForHighlight={verifiedAdminCode ? verifiedAdminCode.partySize : partySize}
              />
            </div>
          )}

          {/* Open For All Event Notice (Free admission, no seating reservation or payment required) */}
          {event.type === 'open' && (
            <div className="pt-4 border-t border-stone-200">
              <div className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                    <span>{t.openForAll}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-semibold">
                      {t.freeEvent}
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-800/90 mt-1 leading-relaxed">
                    {t.openEventNotice}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Registration Section for Members */}
          {event.type === 'registration_required' && (
            <div
              id="event-registration-box"
              className="pt-6 border-t border-stone-200 bg-stone-50/70 p-5 sm:p-6 rounded-2xl border"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-700" />
                <span>{t.registerNow}</span>
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                {event.isPaid ? t.paidSwitchDesc : t.freeRegistrationDesc}
              </p>

              {/* Error notification */}
              {errorMessage && (
                <div
                  id="registration-error-box"
                  className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Paid Event 8-Digit Code Entry Step */}
              {event.isPaid && !verifiedAdminCode && (
                <div className="space-y-3 mb-5 p-4 bg-amber-50/80 rounded-xl border border-amber-200">
                  <label htmlFor={codeInputId} className="block text-xs font-bold text-amber-950">
                    {t.enterEightDigitCode}
                  </label>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <input
                      id={codeInputId}
                      type="text"
                      maxLength={8}
                      value={eightDigitCodeInput}
                      onChange={(e) => setEightDigitCodeInput(e.target.value.replace(/\D/g, ''))}
                      placeholder={t.codePlaceholder}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-amber-300 font-mono text-base font-bold tracking-widest text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      className="px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-700 hover:bg-amber-800 text-white transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                    >
                      {t.verifyCodeBtn}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800/80">
                    {t.paidCodeHelpText}
                  </p>
                </div>
              )}

              {/* When 8-digit code is verified */}
              {event.isPaid && verifiedAdminCode && (
                <div className="mb-5 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {t.codeVerifiedFor}
                      <strong>{verifiedAdminCode.userName}</strong> ({verifiedAdminCode.partySize} {t.guestsCount})
                    </span>
                  </div>
                  <span className="font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 shrink-0">
                    {verifiedAdminCode.code}
                  </span>
                </div>
              )}

              {/* Registration Form */}
              {(!event.isPaid || verifiedAdminCode) && (
                <form onSubmit={handleSubmitRegistration} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={nameInputId} className="block text-xs font-semibold text-stone-700 mb-1">
                        {t.attendeeName} *
                      </label>
                      <input
                        id={nameInputId}
                        type="text"
                        required
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        readOnly={Boolean(verifiedAdminCode)}
                        placeholder={t.namePlaceholder}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-medium text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                      />
                    </div>

                    <div>
                      <label htmlFor={phoneInputId} className="block text-xs font-semibold text-stone-700 mb-1">
                        {t.attendeePhone}
                      </label>
                      <input
                        id={phoneInputId}
                        type="tel"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="+961 70 000000"
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-medium text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                      />
                    </div>
                  </div>

                  {/* Party Size Selector (For free events or when table has flexible capacity) */}
                  {!event.isPaid && (!selectedElement || selectedElement.type.startsWith('table')) && (
                    <div className="pt-2">
                      <label htmlFor={partySizeInputId} className="block text-xs font-semibold text-stone-700 mb-1">
                        {t.numberOfPeople} ({partySize} {t.personUnit})
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id={partySizeInputId}
                          type="range"
                          min="1"
                          max={selectedElement ? selectedElement.capacity : 10}
                          value={partySize}
                          onChange={(e) => setPartySize(parseInt(e.target.value))}
                          className="flex-1 accent-amber-700 cursor-pointer"
                        />
                        <span className="font-bold text-sm text-stone-900 w-8 text-center shrink-0">
                          {partySize}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        {t.optimalFitFitNote}
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      id="submit-registration-btn"
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-amber-700 hover:bg-amber-800 transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 whitespace-normal break-words shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="text-center">{event.isPaid ? t.verifyAndReserve : t.completeFreeRegistration}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* ADMIN MANAGEMENT PANEL (Visible only when Admin is logged in) */}
          {/* ================================================================= */}
          {isAdmin && (
            <div
              id="admin-event-management-panel"
              className="mt-8 pt-6 border-t-2 border-dashed border-amber-300 bg-amber-50/40 p-5 sm:p-6 rounded-3xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                    {t.adminReservationSection}
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full shrink-0">
                  {language === 'fr' ? 'Admin' : language === 'en' ? 'Admin' : 'لوحة المشرف'}
                </span>
              </div>

              {/* Admin Code Generation (only for paid events) or Open Event Note */}
              {event.type === 'open' ? (
                <div className="mb-6 p-4 rounded-2xl bg-white border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{t.openEventAdminNote}</span>
                </div>
              ) : event.isPaid ? (
                <>
                  <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                    {t.adminReservationDesc}
                  </p>

                  {/* Form at bottom of page to register member and generate 8-digit code */}
                  <form
                    onSubmit={handleAdminGenerateCode}
                    className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs space-y-4 mb-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={adminNameInputId} className="block text-xs font-bold text-stone-700 mb-1">
                          {t.attendeeName} *
                        </label>
                        <input
                          id={adminNameInputId}
                          type="text"
                          required
                          value={adminAttendeeName}
                          onChange={(e) => setAdminAttendeeName(e.target.value)}
                          placeholder={t.adminNamePlaceholder}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                        />
                      </div>

                      <div>
                        <label htmlFor={adminSizeInputId} className="block text-xs font-bold text-stone-700 mb-1">
                          {t.numberOfPeople} *
                        </label>
                        <input
                          id={adminSizeInputId}
                          type="number"
                          min="1"
                          max="20"
                          required
                          value={adminPartySize}
                          onChange={(e) => setAdminPartySize(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                        />
                      </div>
                    </div>

                    <button
                      id="admin-generate-code-submit-btn"
                      type="submit"
                      className="w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 whitespace-normal text-center"
                    >
                      <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{t.generateCodeBtn}</span>
                    </button>
                  </form>

                  {/* Display Newly Generated Code */}
                  {justGeneratedCode && (
                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-xs font-semibold text-amber-100">{t.generatedCodeIs}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(justGeneratedCode.code)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold cursor-pointer transition-colors shrink-0"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                          <span>{copiedCode ? t.copiedText : t.copyText}</span>
                        </button>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold tracking-widest font-mono text-white select-all my-1">
                        {justGeneratedCode.code}
                      </div>
                      <p className="text-xs text-amber-100/90 leading-relaxed">{t.codeInstructions}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="mb-6 p-4 rounded-2xl bg-white border border-stone-200 text-stone-600 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>{t.freeRegistrationDesc}</span>
                </div>
              )}

              {/* Registrations List (whether paid or not) */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex flex-wrap items-center justify-between gap-2">
                  <span>{t.registrationsList} ({eventRegistrations.length})</span>
                  <span className="text-xs text-stone-500 font-normal shrink-0">
                    {t.totalGuests} {eventRegistrations.reduce((sum, r) => sum + r.partySize, 0)}
                  </span>
                </h4>

                {eventRegistrations.length === 0 ? (
                  <p className="text-xs text-stone-500 p-3 bg-white rounded-xl border border-stone-200">
                    {t.noRegistrationsYet}
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pe-1">
                    {eventRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{reg.userName}</div>
                          <div className="text-stone-500 text-[11px]">
                            {reg.userPhone || t.noPhoneProvided} &bull; {reg.partySize} {t.guestsCount}
                            {reg.elementLabel && ` &bull; ${t.seatLabelPrefix} ${reg.elementLabel}`}
                          </div>
                        </div>
                        <div className="text-end">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              reg.isPaid
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {reg.isPaid ? t.paidBadge : t.freeBadge}
                          </span>
                          {reg.codeUsed && (
                            <div className="font-mono text-[10px] text-stone-400 mt-0.5">
                              {reg.codeUsed}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Generated Codes Log */}
              {eventCodes.length > 0 && (
                <div className="mt-5 pt-4 border-t border-amber-200">
                  <h4 className="text-xs font-bold text-stone-700 mb-2">
                    {t.issuedCodesTitle}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {eventCodes.map((codeItem) => (
                      <div
                        key={codeItem.id}
                        className="p-2.5 bg-white rounded-lg border border-stone-200 flex items-center justify-between text-xs font-mono"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{codeItem.code}</span>
                          <div className="font-sans text-[11px] text-stone-500">
                            {codeItem.userName} ({codeItem.partySize} {t.guestsCount})
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold ${
                            codeItem.claimed
                              ? 'bg-stone-100 text-stone-500'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {codeItem.claimed ? t.codeClaimed : t.codeAvailable}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Digital Ticket Modal when registration is successful */}
      {successTicket && (
        <DigitalTicketModal
          registration={successTicket}
          event={event}
          language={language}
          onClose={() => {
            setSuccessTicket(null);
            onClose();
          }}
        />
      )}
    </div>
  );
};
