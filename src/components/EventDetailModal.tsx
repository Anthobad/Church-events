import React, { useState, useId, useEffect } from 'react';
import {
  ChurchEvent,
  Registration,
  AdminReservationCode,
  Language,
  SeatingElement
} from '../types';
import { translations } from '../services/i18n';
import {
  supabase,
  rowToCode,
  verifyTicketCodeLive,
  checkInRegistrationLive,
  undoCheckInLive,
  getTicketDisplayCode,
  cleanTicketCode,
  TicketVerificationResult,
  syncFromSupabase,
  subscribeToRealtime
} from '../services/storage';
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
  Trash2,
  Loader2,
  ScanLine,
  UserCheck,
  RotateCcw,
  Search,
  ShieldAlert,
  CheckCircle,
  Ticket
} from 'lucide-react';

interface EventDetailModalProps {
  event: ChurchEvent;
  language: Language;
  isAdmin: boolean;
  isLiked: boolean;
  registrations: Registration[];
  adminCodes: AdminReservationCode[];
  initialAdminTab?: 'verify' | 'registrations' | 'generator';
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
  }) => Promise<{ success: boolean; conflict?: boolean; error?: string; registration?: Registration }> | { success: boolean; conflict?: boolean; error?: string; registration?: Registration };
  onGenerateAdminCode: (
    eventId: string,
    userName: string,
    partySize: number
  ) => AdminReservationCode;
  onRegistrationUpdated?: (registration: Registration) => void;
  onRegistrationsSynced?: (registrations: Registration[]) => void;
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
  initialAdminTab,
  onClose,
  onToggleLike,
  onRegister,
  onGenerateAdminCode,
  onRegistrationUpdated,
  onRegistrationsSynced,
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
  const ticketVerifyInputId = useId();

  // Admin tabs and verification states
  const [adminTab, setAdminTab] = useState<'verify' | 'registrations' | 'generator'>(initialAdminTab || 'verify');
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verifyResult, setVerifyResult] = useState<TicketVerificationResult | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
  const [attendeeFilter, setAttendeeFilter] = useState<'all' | 'passed' | 'pending'>('all');

  // Filter registrations and codes for this specific event
  const eventRegistrations = registrations.filter((r) => r.eventId === event.id);
  const eventCodes = adminCodes.filter((c) => c.eventId === event.id);

  // Admission Metrics
  const totalRegistrationsCount = eventRegistrations.length;
  const totalGuestsCount = eventRegistrations.reduce((sum, r) => sum + r.partySize, 0);
  const admittedGuestsCount = eventRegistrations
    .filter((r) => r.checkedIn)
    .reduce((sum, r) => sum + r.partySize, 0);
  const admittedTicketsCount = eventRegistrations.filter((r) => r.checkedIn).length;
  const pendingGuestsCount = Math.max(0, totalGuestsCount - admittedGuestsCount);
  const admissionPercentage = totalGuestsCount > 0 ? Math.round((admittedGuestsCount / totalGuestsCount) * 100) : 0;

  // Active real-time synchronizer for seating chart & registrations
  useEffect(() => {
    // 1. Fetch latest registrations from cloud on modal open
    syncFromSupabase().then((data) => {
      if (data && data.registrations && onRegistrationsSynced) {
        onRegistrationsSynced(data.registrations);
      }
    });

    // 2. Subscribe to realtime broadcast events (multi-tab, multi-device, or Supabase push)
    const unsubscribe = subscribeToRealtime((msg) => {
      if (msg?.type === 'REGISTRATIONS_UPDATED' && Array.isArray(msg.payload) && onRegistrationsSynced) {
        onRegistrationsSynced(msg.payload);
      } else if (msg?.type === 'SUPABASE_SYNC_COMPLETE' && msg.payload?.registrations && onRegistrationsSynced) {
        onRegistrationsSynced(msg.payload.registrations);
      }
    });

    // 3. Heartbeat polling loop (every 2.5s) to guarantee real-time updates without user having to refresh
    const liveInterval = setInterval(async () => {
      const data = await syncFromSupabase();
      if (data && data.registrations && onRegistrationsSynced) {
        onRegistrationsSynced(data.registrations);
      }
    }, 2500);

    return () => {
      unsubscribe();
      clearInterval(liveInterval);
    };
  }, [event.id, onRegistrationsSynced]);

  // Live ticket verification handler
  const handleLiveTicketVerify = async (codeToVerify?: string) => {
    const targetCode = (codeToVerify ?? verifyCodeInput).trim();
    if (!targetCode) return;
    setIsVerifyingCode(true);
    setVerificationFeedback(null);
    try {
      const res = await verifyTicketCodeLive(event.id, targetCode);
      setVerifyResult(res);
      if (res.status === 'ALREADY_PASSED') {
        setVerificationFeedback({
          type: 'warning',
          message: t.alreadyPassedTitle
        });
      } else if (res.status === 'INVALID') {
        setVerificationFeedback({
          type: 'error',
          message: t.invalidTicketTitle
        });
      }
    } catch (e) {
      console.error('Live verification error:', e);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Confirm admission handler
  const handleConfirmAdmission = async (regId: string) => {
    setIsCheckingIn(true);
    setVerificationFeedback(null);
    try {
      const res = await checkInRegistrationLive(regId, event.id, 'Admin');
      if (res.success && res.registration) {
        setVerifyResult({ status: 'ADMISSION_CONFIRMED', registration: res.registration });
        setVerificationFeedback({
          type: 'success',
          message: t.entrySuccessNotice
        });
        setVerifyCodeInput('');
        if (onRegistrationUpdated) {
          onRegistrationUpdated(res.registration);
        }
      } else if (res.status === 'ALREADY_PASSED') {
        setVerifyResult({ status: 'ALREADY_PASSED', registration: res.registration });
        setVerificationFeedback({
          type: 'warning',
          message: t.alreadyPassedTitle
        });
        if (res.registration && onRegistrationUpdated) {
          onRegistrationUpdated(res.registration);
        }
      }
    } catch (e) {
      console.error('Check-in admission error:', e);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Undo admission handler
  const handleUndoAdmission = async (regId: string) => {
    setIsCheckingIn(true);
    setVerificationFeedback(null);
    try {
      const res = await undoCheckInLive(regId, event.id);
      if (res.success && res.registration) {
        setVerifyResult({ status: 'VALID', registration: res.registration });
        if (onRegistrationUpdated) {
          onRegistrationUpdated(res.registration);
        }
      }
    } catch (e) {
      console.error('Undo admission error:', e);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Filtered attendees for the entrance management table
  const filteredAttendees = eventRegistrations.filter((reg) => {
    if (attendeeFilter === 'passed' && !reg.checkedIn) return false;
    if (attendeeFilter === 'pending' && reg.checkedIn) return false;

    if (attendeeSearchQuery.trim()) {
      const q = attendeeSearchQuery.toLowerCase().trim();
      const nameMatch = reg.userName.toLowerCase().includes(q);
      const phoneMatch = reg.userPhone.toLowerCase().includes(q);
      const codeMatch = reg.codeUsed?.toLowerCase().includes(q) || false;
      const ticketCode = getTicketDisplayCode(reg).toLowerCase();
      const ticketMatch = ticketCode.includes(q) || reg.id.toLowerCase().includes(q);
      const seatMatch = reg.elementLabel?.toLowerCase().includes(q) || false;
      return nameMatch || phoneMatch || codeMatch || ticketMatch || seatMatch;
    }
    return true;
  });

  // Handle validating 8-digit code
  const handleVerifyCode = async () => {
    setErrorMessage(null);
    const cleanCode = eightDigitCodeInput.trim();
    if (cleanCode.length !== 8) {
      setErrorMessage(t.invalidCodeError);
      return;
    }

    let matchingCode = eventCodes.find((c) => c.code === cleanCode);

    // Always verify against Supabase directly to get real-time claimed status
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('church_admin_codes')
          .select('*')
          .eq('code', cleanCode)
          .eq('event_id', event.id)
          .maybeSingle();
        if (!error && data) {
          matchingCode = rowToCode(data);
        }
      } catch (err) {
        console.warn('Direct code check notice:', err);
      }
    }

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
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
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
      if (verifiedAdminCode.claimed) {
        setErrorMessage(t.codeAlreadyUsedError);
        setVerifiedAdminCode(null);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Call registration handler
      const result = await onRegister({
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
        setIsSubmitting(false);
        return;
      }

      // Success! Clear verified code and form fields immediately so code cannot be submitted again
      setVerifiedAdminCode(null);
      setEightDigitCodeInput('');
      setUserName('');
      setUserPhone('');
      setSelectedElement(null);
      setIsSubmitting(false);

      // Show digital ticket on top
      if (result.registration) {
        setSuccessTicket(result.registration);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMessage(t.registrationFailedGeneric);
      setIsSubmitting(false);
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
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 border-b border-stone-200 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 shrink-0">
              {t.eventDetails}
            </span>
            {event.type === 'open' ? (
              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 min-w-0 truncate">
                <Sparkles className="w-3 h-3 text-emerald-700 shrink-0" />
                <span className="truncate">{t.openForAll} ({t.freeEvent})</span>
              </span>
            ) : event.isPaid ? (
              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                <KeyRound className="w-3 h-3 shrink-0" />
                <span>{t.paidEvent}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-100 text-emerald-900 shrink-0">
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
              className="p-1.5 sm:p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors cursor-pointer shrink-0"
              aria-label={t.closeBtn}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Banner (if image exists) */}
        {event.imageUrl && (
          <div className="relative w-full h-48 sm:h-72 bg-stone-900 overflow-hidden">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          </div>
        )}

        <div className="p-4 sm:p-8 space-y-6">
          {/* Title & Stats */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight break-words min-w-0 flex-1">
                {event.title}
              </h1>

              {/* Real-time stats: Likes & Views */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-500 bg-stone-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-stone-200">
                  <Eye className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-stone-400 shrink-0" />
                  <span>{event.views} {t.views}</span>
                </span>

                <button
                  type="button"
                  onClick={() => onToggleLike(event.id)}
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isLiked
                      ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs'
                      : 'bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-600 border border-stone-200'
                  }`}
                >
                  <Heart className={`w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{event.likes} {t.likes}</span>
                </button>
              </div>
            </div>

            {/* Date, Time, Location Bar */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-3 sm:gap-4 text-xs sm:text-sm font-medium text-stone-600 mt-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="flex items-center gap-1.5 shrink-0">
                <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{event.date}</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{event.time}</span>
              </span>
              <span className="flex items-center gap-1.5 min-w-0 max-w-full break-words">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="break-words">{event.location}</span>
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
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 whitespace-normal break-words shrink-0"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      )}
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
              {/* Admin Header & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-sm shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-slate-900 leading-tight truncate">
                      {language === 'ar' ? 'لوحة تحكم المشرف وإدارة الدخول' : language === 'fr' ? 'Panneau d\'administration et contrôle d\'entrée' : 'Admin Control & Entrance Verification'}
                    </h3>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0"></span>
                      <span className="truncate">{t.multiAdminSyncNotice}</span>
                    </p>
                  </div>
                </div>

                {/* Tab Selectors */}
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-amber-200/80 shadow-xs overflow-x-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => setAdminTab('verify')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      adminTab === 'verify'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <ScanLine className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.ticketVerificationTab}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      adminTab === 'verify' ? 'bg-amber-800 text-amber-200' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {admittedTicketsCount}/{totalRegistrationsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminTab('registrations')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      adminTab === 'registrations'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.registrationsList}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      adminTab === 'registrations' ? 'bg-amber-800 text-amber-200' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {eventRegistrations.length}
                    </span>
                  </button>

                  {event.isPaid && event.type !== 'open' && (
                    <button
                      type="button"
                      onClick={() => setAdminTab('generator')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        adminTab === 'generator'
                          ? 'bg-amber-700 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.adminReservationSection}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ============================================================ */}
              {/* TAB 1: TICKET VERIFICATION & ENTRANCE CONTROL                */}
              {/* ============================================================ */}
              {adminTab === 'verify' && (
                <div className="space-y-6">
                  {/* Live Entrance Metrics Dashboard */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                          {t.admissionStats}
                        </span>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900">
                            {admittedGuestsCount}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-stone-500">
                            / {totalGuestsCount} {t.guestsCount} ({admittedTicketsCount}/{totalRegistrationsCount} {language === 'ar' ? 'تذاكر' : 'tickets'})
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                        <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 min-w-0">
                          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">{t.passedCount}: {admittedGuestsCount}</span>
                        </div>
                        <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 min-w-0">
                          <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                          <span className="truncate">{t.remainingToEnter}: {pendingGuestsCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200">
                      <div
                        className="bg-gradient-to-r from-amber-600 to-emerald-600 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(100, admissionPercentage)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-stone-500 mt-1.5">
                      <span>{admissionPercentage}% {language === 'ar' ? 'من الحضور اكتمل دخولهم' : 'admitted'}</span>
                      <span>{t.multiAdminSyncNotice}</span>
                    </div>
                  </div>

                  {/* Verification Form Box */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-sm relative overflow-hidden">
                    <div className="mb-4">
                      <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                        <ScanLine className="w-4 h-4 text-amber-700" />
                        <span>{t.verifyTicketTitle}</span>
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {t.verifyTicketDesc}
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleLiveTicketVerify();
                      }}
                      className="flex flex-col sm:flex-row gap-2.5"
                    >
                      <div className="relative flex-1">
                        <label htmlFor={ticketVerifyInputId} className="sr-only">
                          {t.enterTicketCodePlaceholder}
                        </label>
                        <input
                          id={ticketVerifyInputId}
                          type="text"
                          value={verifyCodeInput}
                          onChange={(e) => {
                            setVerifyCodeInput(e.target.value);
                            if (verifyResult) setVerifyResult(null);
                            if (verificationFeedback) setVerificationFeedback(null);
                          }}
                          placeholder={t.enterTicketCodePlaceholder}
                          className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-mono font-bold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-600 bg-stone-50/50"
                          autoComplete="off"
                        />
                        {verifyCodeInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setVerifyCodeInput('');
                              setVerifyResult(null);
                              setVerificationFeedback(null);
                            }}
                            className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isVerifyingCode || !verifyCodeInput.trim()}
                        className="py-3 px-6 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
                      >
                        {isVerifyingCode ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{t.verifying}</span>
                          </>
                        ) : (
                          <>
                            <ScanLine className="w-4 h-4 text-amber-400" />
                            <span>{t.verifyBtn}</span>
                          </>
                        )}
                      </button>
                    </form>

                    {/* Verification Result Banner */}
                    {verifyResult && (
                      <div className="mt-5 animate-in zoom-in-95 duration-200">
                        {/* 1. ADMISSION CONFIRMED - SUCCESSFUL ENTRY */}
                        {verifyResult.status === 'ADMISSION_CONFIRMED' && verifyResult.registration && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 shadow-sm space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <CheckCircle2 className="w-6 h-6 animate-bounce" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block truncate">
                                    {t.admissionConfirmedTitle}
                                  </span>
                                  <h4 className="text-lg font-black text-slate-900 truncate">
                                    {verifyResult.registration.userName}
                                  </h4>
                                </div>
                              </div>

                              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-200 text-emerald-900 shrink-0">
                                {t.statusPassed}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white/90 p-3 rounded-xl border border-emerald-200">
                              <div className="min-w-0">
                                <span className="text-stone-500 block text-[11px] mb-0.5">{t.partyCount}</span>
                                <span className="font-extrabold text-slate-900">
                                  {verifyResult.registration.partySize} {t.guestsCount}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-stone-500 block text-[11px] mb-0.5">{t.seatAssigned}</span>
                                <span className="font-extrabold text-amber-900 truncate block">
                                  {verifyResult.registration.elementLabel || (language === 'ar' ? 'دخول حر / بدون مقعد' : 'Open Entry')}
                                </span>
                              </div>
                              <div className="min-w-0 col-span-2 sm:col-span-1">
                                <span className="text-stone-500 block text-[11px] mb-0.5">{t.ticketCodeLabel}</span>
                                <span className="font-mono font-bold text-slate-900 break-all">
                                  {getTicketDisplayCode(verifyResult.registration)}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setVerifyResult(null);
                                  setVerifyCodeInput('');
                                  setVerificationFeedback(null);
                                }}
                                className="w-full sm:w-auto py-2.5 px-4 rounded-xl font-extrabold text-xs text-white bg-emerald-700 hover:bg-emerald-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                              >
                                <ScanLine className="w-4 h-4" />
                                <span>{t.checkNextTicketBtn}</span>
                              </button>

                              <button
                                type="button"
                                disabled={isCheckingIn}
                                onClick={() => handleUndoAdmission(verifyResult.registration!.id)}
                                className="w-full sm:w-auto py-2 px-3 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t.undoPass}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 2. VALID TICKET - READY FOR ADMISSION */}
                        {verifyResult.status === 'VALID' && verifyResult.registration && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 shadow-sm space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                  <CheckCircle className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 block truncate">
                                    {t.validTicketTitle}
                                  </span>
                                  <h4 className="text-lg font-black text-slate-900 truncate">
                                    {verifyResult.registration.userName}
                                  </h4>
                                </div>
                              </div>

                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-200/80 text-emerald-900 shrink-0">
                                {verifyResult.registration.partySize} {t.guestsCount}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-white/80 p-3 rounded-xl border border-emerald-200">
                              <div className="min-w-0">
                                <span className="text-stone-500 block text-[11px] mb-0.5">{t.attendeePhone}</span>
                                <span className="font-semibold text-stone-900 truncate block">
                                  {verifyResult.registration.userPhone || t.noPhoneProvided}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-stone-500 block text-[11px] mb-0.5">{t.seatAssigned}</span>
                                <span className="font-extrabold text-amber-900 truncate block">
                                  {verifyResult.registration.elementLabel || (language === 'ar' ? 'دخول حر / بدون مقعد' : 'Open Entry')}
                                </span>
                              </div>
                              <div className="min-w-0 col-span-2 sm:col-span-1">
                                <span className="text-stone-500 block text-[11px] mb-0.5">{t.ticketCodeLabel}</span>
                                <span className="font-mono font-bold text-slate-900 break-all">
                                  {getTicketDisplayCode(verifyResult.registration)}
                                </span>
                              </div>
                            </div>

                            {/* Confirm Entry CTA Button */}
                            <button
                              type="button"
                              disabled={isCheckingIn}
                              onClick={() => handleConfirmAdmission(verifyResult.registration!.id)}
                              className="w-full py-3 px-4 rounded-xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                            >
                              {isCheckingIn ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <UserCheck className="w-5 h-5" />
                              )}
                              <span>{t.confirmEntryBtn}</span>
                            </button>
                          </div>
                        )}

                        {/* 3. ALREADY PASSED - DUPLICATE WARNING */}
                        {verifyResult.status === 'ALREADY_PASSED' && verifyResult.registration && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-red-50 border-2 border-red-500 text-red-950 shadow-sm space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-extrabold uppercase tracking-wider text-red-700 block truncate">
                                    {t.alreadyPassedTitle}
                                  </span>
                                  <h4 className="text-lg font-black text-slate-900 truncate">
                                    {verifyResult.registration.userName}
                                  </h4>
                                </div>
                              </div>

                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-200 text-red-900 shrink-0">
                                {t.statusPassed}
                              </span>
                            </div>

                            <div className="p-3 bg-white/90 rounded-xl border border-red-200 text-xs space-y-1.5">
                              <p className="font-bold text-red-800">
                                {t.alreadyPassedWarning}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-stone-700 font-medium">
                                {verifyResult.registration.checkedInAt && (
                                  <span>
                                    🕒 {new Date(verifyResult.registration.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                )}
                                {verifyResult.registration.checkedInBy && (
                                  <span>
                                    👤 {t.admittedBy} {verifyResult.registration.checkedInBy}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500 pt-1 border-t border-red-100">
                                {verifyResult.registration.partySize} {t.guestsCount} &bull; {verifyResult.registration.elementLabel || 'General'}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                              <span className="text-xs text-red-700 font-semibold italic">
                                🚫 {language === 'ar' ? 'لا تسمح بالدخول مرة أخرى لتجنب التكرار' : 'Do not allow re-entry with this duplicate ticket'}
                              </span>
                              <button
                                type="button"
                                disabled={isCheckingIn}
                                onClick={() => handleUndoAdmission(verifyResult.registration!.id)}
                                className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-200 hover:bg-stone-300 text-stone-800 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t.undoPass}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 4. INVALID TICKET - NOT FOUND */}
                        {verifyResult.status === 'INVALID' && (
                          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
                            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                              <span>{t.invalidTicketTitle}</span>
                            </div>
                            <p className="text-stone-600 leading-relaxed">
                              {t.invalidTicketDesc}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Feedback Alert if shown */}
                    {verificationFeedback && !verifyResult && (
                      <div className={`mt-4 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        verificationFeedback.type === 'success'
                          ? 'bg-emerald-100 text-emerald-900'
                          : verificationFeedback.type === 'warning'
                          ? 'bg-red-100 text-red-900'
                          : 'bg-stone-100 text-stone-800'
                      }`}>
                        {verificationFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                        )}
                        <span>{verificationFeedback.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Attendees Live Entrance Roster */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {language === 'ar' ? 'سجل الحضور والدخول المباشر' : language === 'fr' ? 'Registre des présences et entrées' : 'Live Entrance & Attendance Roster'}
                        </h4>
                        <p className="text-xs text-stone-500">
                          {language === 'ar' ? 'يمكنك التحقق والبحث بالاسم، الهاتف، أو الرمز وتمرير التذاكر بنقرة واحدة' : 'Search by name, phone or code and admit with 1-click'}
                        </p>
                      </div>

                      {/* Filter Tabs */}
                      <div className="flex flex-wrap items-center gap-1 bg-stone-100 p-1 rounded-xl w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setAttendeeFilter('all')}
                          className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                            attendeeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                          }`}
                        >
                          {t.filterAll} ({eventRegistrations.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendeeFilter('passed')}
                          className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                            attendeeFilter === 'passed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-900'
                          }`}
                        >
                          {t.filterPassed} ({admittedTicketsCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendeeFilter('pending')}
                          className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                            attendeeFilter === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-900'
                          }`}
                        >
                          {t.filterPending} ({eventRegistrations.length - admittedTicketsCount})
                        </button>
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-stone-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={attendeeSearchQuery}
                        onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                        placeholder={language === 'ar' ? 'ابحث باسم المشارك، رقم الهاتف، رمز التذكرة أو رقم الطاولة...' : 'Search attendee name, phone, ticket code or table...'}
                        className="w-full ps-10 pe-4 py-2 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                      />
                    </div>

                    {/* Attendees Table List */}
                    {filteredAttendees.length === 0 ? (
                      <p className="text-xs text-stone-500 p-4 text-center bg-stone-50 rounded-xl border border-stone-200">
                        {language === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching attendees found'}
                      </p>
                    ) : (
                      <div className="max-h-72 overflow-y-auto space-y-2 pe-1">
                        {filteredAttendees.map((reg) => (
                          <div
                            key={reg.id}
                            className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs min-w-0 ${
                              reg.checkedIn
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : 'bg-white border-stone-200 hover:border-amber-300'
                            }`}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                <span className="font-extrabold text-slate-900 text-sm break-words">
                                  {reg.userName}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 shrink-0">
                                  {reg.partySize} {t.personUnit}
                                </span>
                                {reg.elementLabel && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 shrink-0">
                                    {reg.elementLabel}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-1.5 break-words">
                                <span>{reg.userPhone || t.noPhoneProvided}</span>
                                <span>&bull;</span>
                                <span className="font-mono font-bold text-stone-700 break-all">
                                  {getTicketDisplayCode(reg)}
                                </span>
                                {reg.codeUsed && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="font-mono text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded break-all">
                                      {reg.codeUsed}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                              {reg.checkedIn ? (
                                <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>{t.statusPassed}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUndoAdmission(reg.id)}
                                    className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg cursor-pointer transition-colors"
                                    title={t.undoPass}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isCheckingIn}
                                  onClick={() => handleConfirmAdmission(reg.id)}
                                  className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>{t.confirmEntryBtn}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 2: ALL REGISTRATIONS & SEATING                           */}
              {/* ============================================================ */}
              {adminTab === 'registrations' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-stone-200">
                    <h4 className="text-sm font-bold text-slate-900 flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span>{t.registrationsList} ({eventRegistrations.length})</span>
                      <span className="text-xs text-stone-500 font-normal shrink-0">
                        {t.totalGuests} {totalGuestsCount}
                      </span>
                    </h4>

                    {eventRegistrations.length === 0 ? (
                      <p className="text-xs text-stone-500 p-3 bg-stone-50 rounded-xl border border-stone-200">
                        {t.noRegistrationsYet}
                      </p>
                    ) : (
                      <div className="max-h-80 overflow-y-auto space-y-2 pe-1">
                        {eventRegistrations.map((reg) => (
                          <div
                            key={reg.id}
                            className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs min-w-0"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5 min-w-0">
                                <span className="break-words">{reg.userName}</span>
                                {reg.checkedIn && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                    {t.statusPassed}
                                  </span>
                                )}
                              </div>
                              <div className="text-stone-500 text-[11px] break-words mt-0.5">
                                {reg.userPhone || t.noPhoneProvided} &bull; {reg.partySize} {t.guestsCount}
                                {reg.elementLabel && ` &bull; ${t.seatLabelPrefix} ${reg.elementLabel}`}
                              </div>
                            </div>
                            <div className="text-end shrink-0">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  reg.isPaid
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-emerald-100 text-emerald-900'
                                }`}
                              >
                                {reg.isPaid ? t.paidBadge : t.freeBadge}
                              </span>
                              <div className="font-mono text-[10px] text-stone-400 mt-0.5">
                                {getTicketDisplayCode(reg)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 3: ADMIN CODE GENERATOR (PAID EVENTS)                   */}
              {/* ============================================================ */}
              {adminTab === 'generator' && event.isPaid && event.type !== 'open' && (
                <div className="space-y-4">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {t.adminReservationDesc}
                  </p>

                  <form
                    onSubmit={handleAdminGenerateCode}
                    className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs space-y-4 mb-4"
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
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md animate-in zoom-in-95 duration-200">
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
