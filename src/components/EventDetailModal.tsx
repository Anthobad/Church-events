import React, { useState, useId, useEffect, useRef } from 'react';
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
  subscribeToRealtime,
  updateRegistrationTable,
  adminReserveTable,
  adminReleaseTable
} from '../services/storage';
import { BlueprintCanvas } from './BlueprintCanvas';
import { DigitalTicketModal } from './DigitalTicketModal';
import { exportEventSeatingToExcel } from '../utils/excelExport';
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
  Ticket,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Info,
  Printer
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
  const [activeFreePartySize, setActiveFreePartySize] = useState<number | null>(null);
  const [eightDigitCodeInput, setEightDigitCodeInput] = useState('');
  const [verifiedAdminCode, setVerifiedAdminCode] = useState<AdminReservationCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTicket, setSuccessTicket] = useState<Registration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Admin export to Excel handler
  const handleExportToExcel = () => {
    const success = exportEventSeatingToExcel(event, eventRegistrations, adminCodes, language);
    if (success) {
      setExportFeedback(t.exportSuccessNotice);
      setTimeout(() => setExportFeedback(null), 4500);
    }
  };

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

  // Admin tabs mouse wheel & drag scrolling controls for desktop
  const adminTabsRef = useRef<HTMLDivElement>(null);
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);
  const [isTabsOverflowing, setIsTabsOverflowing] = useState(false);
  const isDraggingTabs = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const hasMovedDuringDrag = useRef(false);

  const checkTabsScroll = () => {
    const el = adminTabsRef.current;
    if (!el) return;
    const overflowing = el.scrollWidth > el.clientWidth + 4;
    setIsTabsOverflowing(overflowing);
    const maxScroll = el.scrollWidth - el.clientWidth;
    const curScroll = Math.abs(el.scrollLeft);
    setCanScrollTabsLeft(curScroll > 6);
    setCanScrollTabsRight(curScroll < maxScroll - 6);
  };

  useEffect(() => {
    checkTabsScroll();
    const el = adminTabsRef.current;
    if (!el) return;

    // Translate vertical mouse wheel delta into horizontal scroll on desktop
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          const scrollFactor = language === 'ar' ? -1 : 1;
          el.scrollLeft += e.deltaY * scrollFactor;
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', checkTabsScroll, { passive: true });
    window.addEventListener('resize', checkTabsScroll);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', checkTabsScroll);
      window.removeEventListener('resize', checkTabsScroll);
    };
  }, [language, adminTab, event.id]);

  const handleScrollTabs = (direction: 'left' | 'right') => {
    const el = adminTabsRef.current;
    if (!el) return;
    const scrollAmount = 240;
    const dir = direction === 'left' ? -1 : 1;
    const scrollByAmount = language === 'ar' ? -dir * scrollAmount : dir * scrollAmount;
    el.scrollBy({ left: scrollByAmount, behavior: 'smooth' });
  };

  const handleTabsMouseDown = (e: React.MouseEvent) => {
    const el = adminTabsRef.current;
    if (!el) return;
    isDraggingTabs.current = true;
    hasMovedDuringDrag.current = false;
    dragStartX.current = e.pageX - el.offsetLeft;
    dragScrollLeft.current = el.scrollLeft;
  };

  const handleTabsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTabs.current) return;
    const el = adminTabsRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const dist = Math.abs(x - dragStartX.current);
    if (dist > 5) {
      hasMovedDuringDrag.current = true;
    }
    e.preventDefault();
    const walk = (x - dragStartX.current) * 1.5;
    el.scrollLeft = dragScrollLeft.current - walk;
  };

  const handleTabsMouseUpOrLeave = () => {
    isDraggingTabs.current = false;
  };

  const switchAdminTab = (tab: 'verify' | 'registrations' | 'generator') => {
    if (hasMovedDuringDrag.current) return;
    setAdminTab(tab);
  };

  // Table re-assignment & admin table reservation states
  const [reassigningRegistration, setReassigningRegistration] = useState<Registration | null>(null);
  const [targetNewElementId, setTargetNewElementId] = useState<string | null>(null);
  const [isUpdatingTable, setIsUpdatingTable] = useState(false);
  const blueprintSectionRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll directly to seating canvas when changing tables so user never has to scroll upwards
  useEffect(() => {
    if (reassigningRegistration && blueprintSectionRef.current) {
      blueprintSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [reassigningRegistration]);

  const handleExecuteTableChange = async () => {
    if (!reassigningRegistration || !targetNewElementId || !event.blueprint) return;
    const newElem = event.blueprint.elements.find((e) => e.id === targetNewElementId);
    if (!newElem) return;

    setIsUpdatingTable(true);
    try {
      await updateRegistrationTable(reassigningRegistration.id, newElem.id, newElem.label);
      const data = await syncFromSupabase();
      if (data?.registrations && onRegistrationsSynced) {
        onRegistrationsSynced(data.registrations);
      }
      setVerificationFeedback({
        type: 'success',
        message: `${t.tableChangedSuccess} (${reassigningRegistration.userName} ➔ ${newElem.label})`
      });
      if (selectedElement?.id === reassigningRegistration.elementId) {
        setSelectedElement(newElem);
      }
      setReassigningRegistration(null);
      setTargetNewElementId(null);
    } catch (err) {
      console.error('Error changing table:', err);
    } finally {
      setIsUpdatingTable(false);
    }
  };

  const handleReserveAdminTable = async (element: SeatingElement) => {
    try {
      await adminReserveTable(event.id, element);
      const data = await syncFromSupabase();
      if (data?.registrations && onRegistrationsSynced) {
        onRegistrationsSynced(data.registrations);
      }
      setVerificationFeedback({
        type: 'success',
        message: `${t.tableReservedSuccess} (${element.label})`
      });
    } catch (err) {
      console.error('Error reserving table:', err);
    }
  };

  const handleReleaseAdminTable = async (elementId: string) => {
    try {
      await adminReleaseTable(event.id, elementId);
      const data = await syncFromSupabase();
      if (data?.registrations && onRegistrationsSynced) {
        onRegistrationsSynced(data.registrations);
      }
      setVerificationFeedback({
        type: 'success',
        message: t.tableReleasedSuccess
      });
    } catch (err) {
      console.error('Error releasing table:', err);
    }
  };

  // Filter registrations and codes for this specific event
  const eventRegistrations = registrations.filter((r) => r.eventId === event.id);
  const eventCodes = adminCodes.filter((c) => c.eventId === event.id);

  // Admission Metrics
  const totalRegistrationsCount = eventRegistrations.length;
  const totalGuestsCount = eventRegistrations.reduce((sum, r) => sum + r.partySize, 0);
  const admittedGuestsCount = eventRegistrations.reduce((sum, r) => {
    const admitted = r.admittedCount !== undefined ? r.admittedCount : (r.checkedIn ? r.partySize : 0);
    return sum + admitted;
  }, 0);
  const admittedTicketsCount = eventRegistrations.filter((r) => {
    const admitted = r.admittedCount !== undefined ? r.admittedCount : (r.checkedIn ? r.partySize : 0);
    return admitted >= r.partySize;
  }).length;
  const partiallyAdmittedCount = eventRegistrations.filter((r) => {
    const admitted = r.admittedCount !== undefined ? r.admittedCount : (r.checkedIn ? r.partySize : 0);
    return admitted > 0 && admitted < r.partySize;
  }).length;
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

  // Confirm admission handler (supports passing 1 guest at a time or all remaining guests)
  const handleConfirmAdmission = async (regId: string, countToAdmit: number = 1) => {
    setIsCheckingIn(true);
    setVerificationFeedback(null);
    try {
      const res = await checkInRegistrationLive(regId, event.id, 'Admin', countToAdmit);
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

  // Undo admission handler (decrements by countToUndo)
  const handleUndoAdmission = async (regId: string, countToUndo: number = 1) => {
    setIsCheckingIn(true);
    setVerificationFeedback(null);
    try {
      const res = await undoCheckInLive(regId, event.id, countToUndo);
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
    const admitted = reg.admittedCount !== undefined ? reg.admittedCount : (reg.checkedIn ? reg.partySize : 0);
    const isFullyPassed = admitted >= reg.partySize;
    if (attendeeFilter === 'passed' && admitted === 0) return false;
    if (attendeeFilter === 'pending' && isFullyPassed) return false;

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

  // Handle validating 4-digit code (also accepts legacy codes)
  const handleVerifyCode = async () => {
    setErrorMessage(null);
    const cleanCode = eightDigitCodeInput.trim();
    if (cleanCode.length !== 4 && cleanCode.length !== 8) {
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

    // Non-admin user validation: cannot select admin-reserved, full, or unallowable empty tables
    if (!isAdmin) {
      if (event.isPaid && !verifiedAdminCode) {
        setSelectedElement(null);
        setErrorMessage(
          language === 'ar'
            ? 'يرجى إدخال رمز الحجز المكون من 4 أرقام والتحقق منه أولاً لاختيار مقاعدك.'
            : language === 'fr'
            ? 'Veuillez d’abord saisir et vérifier votre code à 4 chiffres pour choisir vos places.'
            : 'Please enter and verify your 4-digit reservation code above first to select seats.'
        );
        return;
      }

      const elementRegs = eventRegistrations.filter((r) => r.elementId === element.id);
      const isReservedByAdmin = elementRegs.some((r) => r.isReservedByAdmin);
      const occupied = elementRegs.reduce((sum, r) => sum + r.partySize, 0);
      const remaining = element.capacity - occupied;
      const currentPartySize = verifiedAdminCode ? verifiedAdminCode.partySize : partySize;
      const minRequired = Math.ceil(element.capacity / 2);

      if (isReservedByAdmin) {
        setSelectedElement(null);
        setErrorMessage(language === 'ar' ? 'هذه الطاولة محجوزة للإدارة.' : 'This table is reserved by admin.');
        return;
      }
      if (remaining <= 0) {
        setSelectedElement(null);
        setErrorMessage(t.tableFull);
        return;
      }

      // Empty Table Rule: If party size is explicitly set and below half capacity, block or auto-adjust
      if (element.type.startsWith('table') && occupied === 0) {
        if (!event.isPaid && currentPartySize < minRequired) {
          // If user picked an empty table on free event, set party size to required half capacity
          setPartySize(minRequired);
          setActiveFreePartySize(minRequired);
        } else if (currentPartySize < minRequired) {
          setSelectedElement(null);
          setErrorMessage(
            language === 'ar'
              ? `طاولة فارغة: يتطلب الحجز ${minRequired} أفراد على الأقل (نصف سعة الطاولة). يمكنك حجز طاولة مشتركة بها حضور.`
              : language === 'fr'
              ? `Table vide : nécessite au moins ${minRequired} personnes (moitié de la capacité). Veuillez choisir une table partagée.`
              : `Empty table requires at least ${minRequired} guests (half capacity). Please choose a shared table with guests.`
          );
          return;
        }
      }

      if (remaining < currentPartySize) {
        setSelectedElement(null);
        setErrorMessage(
          language === 'ar'
            ? `المتبقي في هذه الطاولة ${remaining} مقاعد فقط بينما حجزك لـ ${currentPartySize} أفراد.`
            : `Only ${remaining} seats left at this table for party of ${currentPartySize}.`
        );
        return;
      }
    }

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

    if (!isAdmin && selectedElement) {
      const elementRegs = eventRegistrations.filter((r) => r.elementId === selectedElement.id);
      const isReservedByAdmin = elementRegs.some((r) => r.isReservedByAdmin);
      if (isReservedByAdmin) {
        setErrorMessage(language === 'ar' ? 'هذه الطاولة محجوزة للإدارة.' : 'This table is reserved by admin.');
        return;
      }
      const occupied = elementRegs.reduce((sum, r) => sum + r.partySize, 0);
      const remaining = selectedElement.capacity - occupied;
      const currentPartySize = verifiedAdminCode ? verifiedAdminCode.partySize : partySize;
      const minRequired = Math.ceil(selectedElement.capacity / 2);

      if (selectedElement.type.startsWith('table') && occupied === 0 && currentPartySize < minRequired) {
        setErrorMessage(
          language === 'ar'
            ? `طاولة فارغة: يجب أن يكون الحجز لـ ${minRequired} أفراد على الأقل (نصف سعة الطاولة).`
            : language === 'fr'
            ? `Table vide : doit comporter au moins ${minRequired} personnes (moitié de la capacité).`
            : `Empty table requires at least ${minRequired} guests (half capacity).`
        );
        return;
      }

      if (remaining < currentPartySize) {
        setErrorMessage(
          language === 'ar'
            ? `المتبقي في هذه الطاولة ${remaining} مقاعد فقط بينما حجزك لـ ${currentPartySize} أفراد.`
            : `Only ${remaining} seats left at this table for party of ${currentPartySize}.`
        );
        return;
      }
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
    setEightDigitCodeInput(newCode.code);
    setAdminAttendeeName('');
    setAdminPartySize(2);
    setCopiedCode(false);
  };

  const handleApplyCodeDirectly = (codeItem: AdminReservationCode) => {
    setVerifiedAdminCode(codeItem);
    setUserName(codeItem.userName);
    setPartySize(codeItem.partySize);
    setEightDigitCodeInput(codeItem.code);
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
        dir={language === 'ar' ? 'rtl' : 'ltr'}
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

        <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          {/* Title & Stats */}
          <div className="space-y-2.5">
            {/* Title: spans edge to edge */}
            <h1 className="w-full text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug break-words text-start">
              {event.title}
            </h1>

            {/* Real-time stats: Likes & Views placed under title on small devices, aligned with language */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-start">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 bg-stone-100/90 px-2.5 py-1 rounded-full border border-stone-200/80 shrink-0"
                title={`${event.views} ${t.views}`}
              >
                <Eye className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="font-bold text-stone-800">{event.views}</span>
                <span className="text-[11px] text-stone-500 font-normal">{t.views}</span>
              </span>

              <button
                type="button"
                onClick={() => onToggleLike(event.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isLiked
                    ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs'
                    : 'bg-stone-100/90 hover:bg-rose-50 text-stone-700 hover:text-rose-600 border border-stone-200/80'
                }`}
                title={`${event.likes} ${t.likes}`}
              >
                <Heart className={`w-3.5 h-3.5 shrink-0 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
                <span className="font-bold">{event.likes}</span>
                <span className="text-[11px] font-normal opacity-75">{t.likes}</span>
              </button>
            </div>

            {/* Date, Time, Location Bar */}
            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2.5 sm:gap-4 text-xs sm:text-sm font-medium text-stone-600 p-2 sm:p-2.5 bg-stone-50 rounded-xl border border-stone-200">
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

          {/* For Non-Admin Paid Event: Register Code Entry Section appears BEFORE the seating plan */}
          {!isAdmin && event.type === 'registration_required' && event.isPaid && (
            <div
              id="event-registration-code-section"
              className="pt-4 border-t border-stone-200"
            >
              {!verifiedAdminCode ? (
                <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-200 space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-700" />
                    <span>{t.registerNow}</span>
                  </h3>
                  <p className="text-xs text-stone-600">
                    {t.paidSwitchDesc}
                  </p>

                  {/* Error notification */}
                  {errorMessage && (
                    <div
                      id="registration-error-box-top"
                      className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="space-y-3 p-4 bg-white rounded-xl border border-amber-300 shadow-xs">
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
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {t.codeVerifiedFor}
                      <strong>{verifiedAdminCode.userName}</strong> ({verifiedAdminCode.partySize} {t.guestsCount})
                    </span>
                  </div>
                  <span className="font-mono font-bold bg-emerald-100 px-2.5 py-1 rounded-lg text-emerald-800 shrink-0">
                    {verifiedAdminCode.code}
                  </span>
                </div>
              )}
            </div>
          )}

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

                <div className="flex flex-wrap items-center gap-2">
                  {/* Print / Export to Excel Button beside Canvas for Admin */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleExportToExcel}
                      id="admin-export-excel-blueprint-btn"
                      className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer border border-emerald-600 shrink-0"
                      title={t.exportToExcelTooltip}
                    >
                      <Printer className="w-4 h-4 shrink-0" />
                      <span>{t.exportToExcel}</span>
                    </button>
                  )}

                  {selectedElement && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                      {t.seatAssigned}: {selectedElement.label} ({selectedElement.capacity} {t.guestsCount})
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback toast when Excel is generated */}
              {exportFeedback && (
                <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{exportFeedback}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExportFeedback(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Live Party Size Chooser for Free Events */}
              {!event.isPaid && !isAdmin && (
                <div
                  id="canvas-party-size-bar"
                  className="mb-3 p-2.5 sm:p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-2xs"
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5 shrink-0">
                      <Users className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>{t.numberOfPeople}:</span>
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setActiveFreePartySize(null)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                          activeFreePartySize === null
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                        }`}
                      >
                        {language === 'ar' ? 'الكل (عرض)' : language === 'fr' ? 'Tout afficher' : 'All Tables'}
                      </button>
                      {[1, 2, 3, 4, 5, 6, 8, 10].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setActiveFreePartySize(size);
                            setPartySize(size);
                            if (selectedElement) {
                              const elementRegs = eventRegistrations.filter((r) => r.elementId === selectedElement.id);
                              const occ = elementRegs.reduce((sum, r) => sum + r.partySize, 0);
                              const rem = selectedElement.capacity - occ;
                              const minReq = Math.ceil(selectedElement.capacity / 2);
                              if (rem < size || (occ === 0 && size < minReq)) {
                                setSelectedElement(null);
                              }
                            }
                          }}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                            activeFreePartySize === size
                              ? 'bg-amber-700 text-white shadow-xs ring-2 ring-amber-600/30'
                              : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <span className="text-[11px] text-stone-500 font-medium">
                    {activeFreePartySize === null
                      ? (language === 'ar' ? 'اختر عدد الأفراد لتفعيل اقتراح وترتيب الطاولات' : language === 'fr' ? 'Sélectionnez la taille du groupe pour les recommandations' : 'Select party size to see recommended tables')
                      : t.selectPartySizeFirst}
                  </span>
                </div>
              )}

              {/* Interactive Blueprint Canvas & Change Table Overlay Container */}
              <div
                id="blueprint-canvas-viewport-wrapper"
                ref={blueprintSectionRef}
                className={`relative w-full rounded-2xl overflow-hidden transition-all duration-200 ${
                  reassigningRegistration ? 'min-h-[440px] sm:min-h-[480px]' : ''
                }`}
              >
                <BlueprintCanvas
                  blueprint={event.blueprint}
                  registrations={eventRegistrations}
                  selectedElementId={selectedElement?.id}
                  onSelectElement={handleSelectSeatingElement}
                  language={language}
                  partySizeForHighlight={event.isPaid ? (verifiedAdminCode ? verifiedAdminCode.partySize : undefined) : (activeFreePartySize ?? undefined)}
                  showAvailabilityBar={isAdmin}
                  isAdmin={isAdmin}
                />

                {/* Change Attendee Table / Reassign Seat Popup directly on top of the canvas */}
                {reassigningRegistration && event.blueprint && (
                  <div
                    id="reassign-table-canvas-overlay"
                    className="absolute inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md rounded-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="relative bg-white rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-stone-200 space-y-3.5 max-h-[96%] flex flex-col my-auto">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                            <RotateCcw className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-extrabold text-slate-900 truncate">
                              {t.changeTableTitle}
                            </h3>
                            <p className="text-xs text-stone-500 truncate">
                              <strong>{reassigningRegistration.userName}</strong> &bull; {reassigningRegistration.partySize} {t.personUnit}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReassigningRegistration(null);
                            setTargetNewElementId(null);
                          }}
                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Current Table Summary */}
                      <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs flex items-center justify-between text-amber-950 shrink-0">
                        <span className="font-semibold">{t.currentTableLabel}</span>
                        <span className="font-bold font-mono px-2.5 py-0.5 rounded bg-amber-200 text-amber-900">
                          {reassigningRegistration.elementLabel || 'None'}
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 shrink-0">
                        {t.changeTableDesc}
                      </p>

                      {/* List of Blueprint Tables/Chairs */}
                      <div className="flex-1 overflow-y-auto space-y-2 pe-1 max-h-56 sm:max-h-64 min-h-[140px]">
                        {event.blueprint.elements
                          .filter((elem) => elem.type !== 'label')
                          .map((elem) => {
                            const isCurrent = elem.id === reassigningRegistration.elementId;

                            // Occupancy excluding reassigningRegistration
                            const otherRegsOnElem = eventRegistrations.filter(
                              (r) => r.elementId === elem.id && r.id !== reassigningRegistration.id
                            );
                            const isElemAdminReserved = otherRegsOnElem.some((r) => r.isReservedByAdmin);
                            const otherOcc = otherRegsOnElem.reduce((sum, r) => sum + r.partySize, 0);
                            const availableSpots = Math.max(0, elem.capacity - otherOcc);

                            // Must allow reassigningRegistration's partySize and not be admin-reserved
                            const canAccommodate = !isElemAdminReserved && availableSpots >= reassigningRegistration.partySize;
                            const isSelected = targetNewElementId === elem.id;

                            return (
                              <button
                                key={elem.id}
                                type="button"
                                disabled={isCurrent || !canAccommodate}
                                onClick={() => setTargetNewElementId(elem.id)}
                                className={`w-full text-start p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                                  isCurrent
                                    ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed opacity-60'
                                    : isElemAdminReserved
                                    ? 'bg-purple-50/50 border-purple-200 text-purple-900 cursor-not-allowed opacity-60'
                                    : !canAccommodate
                                    ? 'bg-red-50/40 border-red-200 text-red-700 cursor-not-allowed opacity-60'
                                    : isSelected
                                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 text-emerald-950 shadow-xs cursor-pointer'
                                    : 'bg-white border-stone-200 hover:border-emerald-300 hover:bg-stone-50 text-slate-900 cursor-pointer'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-extrabold text-sm text-slate-900">{elem.label}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-semibold">
                                      {elem.type.startsWith('table') ? t.table : t.chair} • {t.capacity}: {elem.capacity}
                                    </span>
                                    {isCurrent && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                                        {t.currentTableLabel}
                                      </span>
                                    )}
                                    {isElemAdminReserved && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                                        {t.reservedByAdminBadge}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] mt-0.5 text-stone-500">
                                    {isCurrent ? (
                                      <span className="font-semibold text-amber-700">
                                        {language === 'ar' ? 'الطاولة المعينة حالياً للمشارك' : language === 'fr' ? 'Actuellement assigné' : 'Currently assigned to attendee'}
                                      </span>
                                    ) : isElemAdminReserved ? (
                                      <span className="text-purple-700 font-semibold">
                                        ✕ {language === 'ar' ? 'محجوزة للإدارة (غير متاحة)' : language === 'fr' ? 'Réservée par l’administration' : 'Reserved by Admin (Hold - Not available)'}
                                      </span>
                                    ) : elem.capacity < reassigningRegistration.partySize ? (
                                      <span className="text-red-600 font-semibold">
                                        ✕ {language === 'ar'
                                            ? `سعة الطاولة صغيرة (${elem.capacity} مقاعد، والمشارك يحتاج ${reassigningRegistration.partySize})`
                                            : language === 'fr'
                                            ? `Capacité trop petite (${elem.capacity} places, groupe de ${reassigningRegistration.partySize})`
                                            : `Table capacity too small (${elem.capacity} seats max, party requires ${reassigningRegistration.partySize})`}
                                      </span>
                                    ) : canAccommodate ? (
                                      <span className="text-emerald-700 font-semibold">
                                        ✓ {language === 'ar'
                                            ? `تتسع لـ ${reassigningRegistration.partySize} أفراد (${availableSpots}/${elem.capacity} مقعد متاح)`
                                            : language === 'fr'
                                            ? `Accueille ${reassigningRegistration.partySize} pers. (${availableSpots}/${elem.capacity} places dispo)`
                                            : `Accommodates ${reassigningRegistration.partySize} people (${availableSpots}/${elem.capacity} seats left)`}
                                      </span>
                                    ) : (
                                      <span className="text-red-600 font-semibold">
                                        ✕ {language === 'ar'
                                            ? `المتبقي ${availableSpots} مقاعد فقط (المشارك يحتاج ${reassigningRegistration.partySize})`
                                            : language === 'fr'
                                            ? `Seulement ${availableSpots} places libres (${reassigningRegistration.partySize} nécessaires)`
                                            : `Insufficient seats left (${availableSpots}/${elem.capacity} available, requires ${reassigningRegistration.partySize})`}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                      <Check className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </div>

                      {/* Modal Footer */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setReassigningRegistration(null);
                            setTargetNewElementId(null);
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          {t.cancelBtn}
                        </button>
                        <button
                          type="button"
                          disabled={!targetNewElementId || isUpdatingTable}
                          onClick={handleExecuteTableChange}
                          className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          {isUpdatingTable ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>{t.confirmChangeTable}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Table Management Panel when table selected */}
              {isAdmin && selectedElement && selectedElement.type !== 'label' && (() => {
                const elementRegs = eventRegistrations.filter((r) => r.elementId === selectedElement.id);
                const isTableAdminReserved = elementRegs.some((r) => r.isReservedByAdmin);
                const totalOccupied = elementRegs.reduce((sum, r) => sum + r.partySize, 0);
                const remainingSeats = Math.max(0, selectedElement.capacity - totalOccupied);

                return (
                  <div className="mt-3.5 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md animate-in fade-in duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-base text-amber-400">
                            {selectedElement.label}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                            {selectedElement.type.startsWith('table') ? t.table : t.chair} • {t.capacity}: {selectedElement.capacity}
                          </span>
                          {isTableAdminReserved && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-900/90 text-purple-200 border border-purple-600 font-bold">
                              {t.reservedByAdminBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {totalOccupied > 0 ? (
                            <span>{t.seatedGuests}: {totalOccupied} / {selectedElement.capacity} {t.personUnit} ({remainingSeats} {t.seatsLeft})</span>
                          ) : (
                            <span className="text-emerald-400">✓ {selectedElement.capacity} {t.seatsLeft}</span>
                          )}
                        </p>
                      </div>

                      {/* Admin Actions for Selected Table */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isTableAdminReserved ? (
                          <button
                            type="button"
                            onClick={() => handleReleaseAdminTable(selectedElement.id)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{t.releaseTableAdmin}</span>
                          </button>
                        ) : elementRegs.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleReserveAdminTable(selectedElement)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>{t.reserveTableAdmin}</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Registered attendees on this table */}
                    {elementRegs.filter((r) => !r.isReservedByAdmin).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          {t.seatedGuests}:
                        </span>
                        <div className="space-y-1.5">
                          {elementRegs.filter((r) => !r.isReservedByAdmin).map((reg) => (
                            <div
                              key={reg.id}
                              className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs"
                            >
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="font-bold text-white text-sm truncate">{reg.userName}</span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700 text-amber-300 font-mono font-bold">
                                  {reg.partySize} {t.personUnit}
                                </span>
                                {reg.userPhone && (
                                  <span className="text-[11px] text-slate-400 truncate">{reg.userPhone}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setReassigningRegistration(reg);
                                  setTargetNewElementId(null);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t.changeTableBtn}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
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
          {event.type === 'registration_required' && (isAdmin || !event.isPaid || Boolean(verifiedAdminCode)) && (
            <div
              id="event-registration-box"
              className="pt-6 border-t border-stone-200 bg-stone-50/70 p-5 sm:p-6 rounded-2xl border"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-700" />
                <span>{t.registerNow}</span>
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                {event.isPaid && !verifiedAdminCode ? t.paidSwitchDesc : t.freeRegistrationDesc}
              </p>

              {/* Error notification for Admin or general form */}
              {errorMessage && (isAdmin || !event.isPaid || verifiedAdminCode) && (
                <div
                  id="registration-error-box"
                  className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Paid Event Code Entry Step - Shown inside this box for Admin */}
              {isAdmin && event.isPaid && !verifiedAdminCode && (
                <div className="space-y-4 mb-5">
                  {/* Enter & Verify 4-Digit Code Box */}
                  <div className="space-y-3 p-4 bg-amber-50/80 rounded-2xl border border-amber-200">
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

                  {/* Admin Desk: Register Member & Generate 4-Digit Code Box (Moved right under code entry) */}
                  <div
                    id="admin-quick-code-generator-box"
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-300/90 shadow-xs space-y-3.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-900 shrink-0 mt-0.5">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {t.adminReservationSection}
                        </h4>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          {t.adminReservationDesc}
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleAdminGenerateCode}
                      className="space-y-3 pt-1"
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
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-600 bg-stone-50/40"
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
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-600 bg-stone-50/40"
                          />
                        </div>
                      </div>

                      <button
                        id="admin-generate-code-submit-btn"
                        type="submit"
                        className="w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 whitespace-normal text-center shadow-xs"
                      >
                        <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{t.generateCodeBtn}</span>
                      </button>
                    </form>

                    {/* Display Newly Generated Code with Copy & 1-Click Verification */}
                    {justGeneratedCode && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md animate-in zoom-in-95 duration-200 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-amber-100">{t.generatedCodeIs}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(justGeneratedCode.code)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold cursor-pointer transition-colors shrink-0"
                            >
                              {copiedCode ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                              <span>{copiedCode ? t.copiedText : t.copyText}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyCodeDirectly(justGeneratedCode)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer transition-colors shadow-xs shrink-0"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>{language === 'ar' ? 'استخدام وتفعيل الرمز الآن' : language === 'fr' ? 'Utiliser et vérifier ce code' : 'Apply & Verify Now'}</span>
                            </button>
                          </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold tracking-widest font-mono text-white select-all">
                          {justGeneratedCode.code}
                        </div>
                        <p className="text-xs text-amber-100/90 leading-relaxed">{t.codeInstructions}</p>
                      </div>
                    )}
                  </div>

                  {/* Verify & Validate Tickets & Entrance Passes Box (Moved here to eliminate scrolling) */}
                  <div
                    id="admin-quick-ticket-validator-box"
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-300 shadow-sm relative overflow-hidden"
                  >
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
                          maxLength={32}
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
                        {verifyResult.status === 'ADMISSION_CONFIRMED' && verifyResult.registration && (() => {
                          const reg = verifyResult.registration;
                          const admitted = reg.admittedCount !== undefined ? reg.admittedCount : (reg.checkedIn ? reg.partySize : 0);
                          const total = reg.partySize;
                          const remaining = Math.max(0, total - admitted);
                          const isFull = admitted >= total;

                          return (
                            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 shadow-sm space-y-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                    <CheckCircle2 className="w-6 h-6 animate-bounce" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block truncate">
                                      {isFull ? t.allGuestsEnteredTitle : t.admissionConfirmedTitle}
                                    </span>
                                    <h4 className="text-lg font-black text-slate-900 truncate">
                                      {reg.userName}
                                    </h4>
                                  </div>
                                </div>

                                <span className={`px-3 py-1 rounded-full text-xs font-black shrink-0 ${
                                  isFull ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-950'
                                }`}>
                                  {isFull
                                    ? `${t.statusPassed} (${total}/${total})`
                                    : `${admitted}/${total} ${t.personUnit}`
                                  }
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white/90 p-3 rounded-xl border border-emerald-200">
                                <div className="min-w-0">
                                  <span className="text-stone-500 block text-[11px] mb-0.5">{t.partyCount}</span>
                                  <span className="font-extrabold text-slate-900">
                                    {admitted} / {total} {t.guestsCount}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-stone-500 block text-[11px] mb-0.5">{t.seatAssigned}</span>
                                  <span className="font-extrabold text-amber-900 truncate block">
                                    {reg.elementLabel || (language === 'ar' ? 'دخول حر / بدون مقعد' : 'Open Entry')}
                                  </span>
                                </div>
                                <div className="min-w-0 col-span-2 sm:col-span-1">
                                  <span className="text-stone-500 block text-[11px] mb-0.5">{t.ticketCodeLabel}</span>
                                  <span className="font-mono font-bold text-slate-900 break-all">
                                    {getTicketDisplayCode(reg)}
                                  </span>
                                </div>
                              </div>

                              {/* Late Arrival Staggered Entry Notice */}
                              {!isFull && remaining > 0 && (
                                <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <span className="font-bold block">
                                      {t.passesRemainingLabel.replace('{count}', String(remaining))}
                                    </span>
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                      {t.lateGuestsAllowedNotice.replace('{total}', String(total))}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Progress Bar of admissions for this group */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-[11px] font-bold text-stone-600">
                                  <span>{admitted} of {total} {language === 'ar' ? 'ضيوف دخلوا' : 'guests inside'}</span>
                                  <span>{Math.round((admitted / total) * 100)}%</span>
                                </div>
                                <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, Math.round((admitted / total) * 100))}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVerifyResult(null);
                                      setVerifyCodeInput('');
                                      setVerificationFeedback(null);
                                    }}
                                    className="py-2.5 px-4 rounded-xl font-extrabold text-xs text-white bg-emerald-700 hover:bg-emerald-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                                  >
                                    <ScanLine className="w-4 h-4" />
                                    <span>{t.checkNextTicketBtn}</span>
                                  </button>

                                  {!isFull && remaining > 0 && (
                                    <button
                                      type="button"
                                      disabled={isCheckingIn}
                                      onClick={() => handleConfirmAdmission(reg.id, 1)}
                                      className="py-2.5 px-3.5 rounded-xl font-extrabold text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                                    >
                                      <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>{t.passNextGuestBtn}</span>
                                    </button>
                                  )}

                                  {!isFull && remaining > 1 && (
                                    <button
                                      type="button"
                                      disabled={isCheckingIn}
                                      onClick={() => handleConfirmAdmission(reg.id, remaining)}
                                      className="py-2.5 px-3.5 rounded-xl font-extrabold text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                                    >
                                      <Users className="w-3.5 h-3.5 text-amber-400" />
                                      <span>{t.passAllRemainingBtn.replace('{count}', String(remaining))}</span>
                                    </button>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  disabled={isCheckingIn}
                                  onClick={() => handleUndoAdmission(reg.id, 1)}
                                  className="py-2 px-3 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>{t.undoPass} (-1)</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 2. VALID TICKET - READY FOR ADMISSION */}
                        {verifyResult.status === 'VALID' && verifyResult.registration && (() => {
                          const reg = verifyResult.registration;
                          const admitted = reg.admittedCount !== undefined ? reg.admittedCount : (reg.checkedIn ? reg.partySize : 0);
                          const total = reg.partySize;
                          const remaining = Math.max(0, total - admitted);
                          const isLateArrival = admitted > 0;
                          const nextGuestNum = admitted + 1;

                          return (
                            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 shadow-sm space-y-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                    {isLateArrival ? <Clock className="w-6 h-6 text-amber-300" /> : <CheckCircle className="w-6 h-6" />}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 block truncate">
                                      {isLateArrival ? t.lateArrivalTitle : t.validTicketTitle}
                                    </span>
                                    <h4 className="text-lg font-black text-slate-900 truncate">
                                      {reg.userName}
                                    </h4>
                                  </div>
                                </div>

                                <div className="text-end shrink-0">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                                    isLateArrival ? 'bg-amber-200 text-amber-950' : 'bg-emerald-200/80 text-emerald-900'
                                  }`}>
                                    {t.passXofY.replace('{current}', String(nextGuestNum)).replace('{total}', String(total))}
                                  </span>
                                  {isLateArrival && (
                                    <span className="text-[11px] block font-bold text-amber-800 mt-0.5">
                                      {remaining} {t.remainingToEnter}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Code verification source badge */}
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                {verifyResult.matchedBy === 'ADMIN_CODE' ? (
                                  <span className="px-2.5 py-1 rounded-lg font-bold bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs">
                                    {t.verifiedViaAdminCode}
                                  </span>
                                ) : verifyResult.matchedBy === 'TICKET_CODE' ? (
                                  <span className="px-2.5 py-1 rounded-lg font-bold bg-blue-100 text-blue-900 border border-blue-200 shadow-2xs">
                                    {t.verifiedViaTicketCode}
                                  </span>
                                ) : null}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-white/80 p-3 rounded-xl border border-emerald-200">
                                <div className="min-w-0">
                                  <span className="text-stone-500 block text-[11px] mb-0.5">{t.attendeePhone}</span>
                                  <span className="font-semibold text-stone-900 truncate block">
                                    {reg.userPhone || t.noPhoneProvided}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-stone-500 block text-[11px] mb-0.5">{t.seatAssigned}</span>
                                  <span className="font-extrabold text-amber-900 truncate block">
                                    {reg.elementLabel || (language === 'ar' ? 'دخول حر / بدون مقعد' : 'Open Entry')}
                                  </span>
                                </div>
                                <div className="min-w-0 col-span-2 sm:col-span-1">
                                  <span className="text-stone-500 block text-[11px] mb-0.5">{t.ticketCodeLabel}</span>
                                  <span className="font-mono font-bold text-slate-900 break-all">
                                    {getTicketDisplayCode(reg)}
                                  </span>
                                </div>
                              </div>

                              {/* Notice on how many times the code can pass */}
                              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <Users className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                  <span>
                                    {t.lateGuestsAllowedNotice.replace('{total}', String(total))}
                                  </span>
                                </div>
                                {admitted > 0 && (
                                  <p className="text-[11px] text-amber-800 ps-5">
                                    {language === 'ar'
                                      ? `تم دخول ${admitted} ضيف مسبقاً. متبقي ${remaining} مرات دخول لهذا الرمز.`
                                      : `${admitted} guest(s) already inside. ${remaining} pass(es) remaining for this code.`
                                    }
                                  </p>
                                )}
                              </div>

                              {/* Confirm Entry CTA Button(s) */}
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={isCheckingIn}
                                  onClick={() => handleConfirmAdmission(reg.id, 1)}
                                  className="flex-1 py-3 px-4 rounded-xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                                >
                                  {isCheckingIn ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  ) : (
                                    <UserCheck className="w-5 h-5" />
                                  )}
                                  <span>
                                    {total > 1
                                      ? `${t.confirmEntryBtn} (${t.passXofY.replace('{current}', String(nextGuestNum)).replace('{total}', String(total))})`
                                      : t.confirmEntryBtn
                                    }
                                  </span>
                                </button>

                                {remaining > 1 && (
                                  <button
                                    type="button"
                                    disabled={isCheckingIn}
                                    onClick={() => handleConfirmAdmission(reg.id, remaining)}
                                    className="py-3 px-4 rounded-xl font-black text-xs text-slate-900 bg-amber-200 hover:bg-amber-300 border border-amber-300 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 shrink-0"
                                  >
                                    <Users className="w-4 h-4 text-amber-800" />
                                    <span>{t.passAllRemainingBtn.replace('{count}', String(remaining))}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* 3. ALREADY PASSED - DUPLICATE WARNING */}
                        {verifyResult.status === 'ALREADY_PASSED' && verifyResult.registration && (() => {
                          const reg = verifyResult.registration;
                          const total = reg.partySize;

                          return (
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
                                      {reg.userName}
                                    </h4>
                                  </div>
                                </div>

                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-200 text-red-900 shrink-0">
                                  {total}/{total} {t.statusPassed}
                                </span>
                              </div>

                              <div className="p-3 bg-white/90 rounded-xl border border-red-200 text-xs space-y-1.5">
                                <p className="font-bold text-red-800">
                                  {language === 'ar'
                                    ? `تم استهلاك جميع مرات الدخول بالكامل (${total} من ${total} ضيوف). لا تتوفر مرات دخول إضافية لهذا الرمز.`
                                    : `All ${total} of ${total} passes for this ticket/code have already been used. No passes remaining.`
                                  }
                                </p>
                                <div className="flex flex-wrap items-center gap-3 text-stone-700 font-medium">
                                  {reg.checkedInAt && (
                                    <span>
                                      🕒 {new Date(reg.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                  )}
                                  {reg.checkedInBy && (
                                    <span>
                                      👤 {t.admittedBy} {reg.checkedInBy}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-stone-500 pt-1 border-t border-red-100 flex flex-wrap gap-2">
                                  <span>{total} {t.guestsCount}</span>
                                  <span>&bull;</span>
                                  <span>{reg.elementLabel || 'General'}</span>
                                  {verifyResult.matchedBy === 'ADMIN_CODE' && (
                                    <>
                                      <span>&bull;</span>
                                      <span className="font-bold text-purple-800">{t.verifiedViaAdminCode}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                                <span className="text-xs text-red-700 font-semibold italic">
                                  🚫 {language === 'ar' ? 'لا تسمح بدخول أفراد إضافيين بدون تذكرة جديدة' : 'Do not allow extra guests beyond registered capacity'}
                                </span>
                                <button
                                  type="button"
                                  disabled={isCheckingIn}
                                  onClick={() => handleUndoAdmission(reg.id, 1)}
                                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-200 hover:bg-stone-300 text-stone-800 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>{t.undoPass} (-1)</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}

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
                </div>
              )}

              {/* When code is verified (shown for Admin here) */}
              {isAdmin && event.isPaid && verifiedAdminCode && (
                <div className="mb-5 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {t.codeVerifiedFor}
                      <strong>{verifiedAdminCode.userName}</strong> ({verifiedAdminCode.partySize} {t.guestsCount})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 shrink-0">
                      {verifiedAdminCode.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifiedAdminCode(null);
                        setUserName('');
                        setPartySize(2);
                        setEightDigitCodeInput('');
                        setSelectedElement(null);
                      }}
                      className="text-stone-500 hover:text-stone-900 text-xs font-semibold underline cursor-pointer"
                    >
                      {language === 'ar' ? 'تغيير' : language === 'fr' ? 'Changer' : 'Change'}
                    </button>
                  </div>
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
                          onChange={(e) => {
                            const newSize = parseInt(e.target.value);
                            setPartySize(newSize);
                            setActiveFreePartySize(newSize);
                          }}
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
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
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

                {/* Tab Selectors with Desktop Mouse Wheel, Drag-to-Scroll & Chevron Arrow Navigation */}
                <div className="relative flex items-center min-w-0 max-w-full">
                  {/* Left Scroll Chevron for Desktop Mouse Users */}
                  {isTabsOverflowing && (
                    <button
                      type="button"
                      onClick={() => handleScrollTabs('left')}
                      className={`flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-md border border-amber-200/90 text-stone-700 hover:text-amber-800 hover:bg-amber-50 shrink-0 z-10 -me-2.5 transition-all cursor-pointer ${
                        canScrollTabsLeft ? 'opacity-95 hover:opacity-100 hover:scale-105' : 'opacity-30 pointer-events-none'
                      }`}
                      title={language === 'ar' ? 'التمرير لليمين' : 'Scroll left'}
                      aria-label="Scroll tabs left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}

                  <div
                    ref={adminTabsRef}
                    onMouseDown={handleTabsMouseDown}
                    onMouseMove={handleTabsMouseMove}
                    onMouseUp={handleTabsMouseUpOrLeave}
                    onMouseLeave={handleTabsMouseUpOrLeave}
                    className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-amber-200/80 shadow-xs overflow-x-auto max-w-full select-none cursor-grab active:cursor-grabbing scroll-smooth"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    <button
                      type="button"
                      onClick={() => switchAdminTab('verify')}
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
                      onClick={() => switchAdminTab('registrations')}
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
                        onClick={() => switchAdminTab('generator')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          adminTab === 'generator'
                            ? 'bg-amber-700 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.issuedCodesTitle}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            adminTab === 'generator' ? 'bg-amber-800 text-amber-100' : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {eventCodes.length}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Right Scroll Chevron for Desktop Mouse Users */}
                  {isTabsOverflowing && (
                    <button
                      type="button"
                      onClick={() => handleScrollTabs('right')}
                      className={`flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-md border border-amber-200/90 text-stone-700 hover:text-amber-800 hover:bg-amber-50 shrink-0 z-10 -ms-2.5 transition-all cursor-pointer ${
                        canScrollTabsRight ? 'opacity-95 hover:opacity-100 hover:scale-105' : 'opacity-30 pointer-events-none'
                      }`}
                      title={language === 'ar' ? 'التمرير لليسار' : 'Scroll right'}
                      aria-label="Scroll tabs right"
                    >
                      <ChevronRight className="w-4 h-4" />
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
                        {filteredAttendees.map((reg) => {
                          const admitted = reg.admittedCount !== undefined ? reg.admittedCount : (reg.checkedIn ? reg.partySize : 0);
                          const total = reg.partySize;
                          const remaining = Math.max(0, total - admitted);
                          const isFullyPassed = admitted >= total;
                          const isPartial = admitted > 0 && admitted < total;

                          return (
                            <div
                              key={reg.id}
                              className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs min-w-0 ${
                                isFullyPassed
                                  ? 'bg-emerald-50/40 border-emerald-200'
                                  : isPartial
                                  ? 'bg-amber-50/40 border-amber-200'
                                  : 'bg-white border-stone-200 hover:border-amber-300'
                              }`}
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                  <span className="font-extrabold text-slate-900 text-sm break-words">
                                    {reg.userName}
                                  </span>

                                  {/* Party size and admission status pill */}
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                    isFullyPassed
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : isPartial
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                                      : 'bg-stone-100 text-stone-700'
                                  }`}>
                                    {isFullyPassed
                                      ? `${total}/${total} ${t.personUnit} (${t.statusPassed})`
                                      : isPartial
                                      ? `${admitted}/${total} ${t.personUnit} (${remaining} ${t.remainingToEnter})`
                                      : `${total} ${t.personUnit}`
                                    }
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
                                  <span className="font-mono font-bold text-stone-700 break-all" title="Ticket Code">
                                    TKT: {getTicketDisplayCode(reg)}
                                  </span>
                                  {reg.codeUsed && (
                                    <>
                                      <span>&bull;</span>
                                      <span className="font-mono text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 break-all" title="Admin Reservation Code">
                                        ADM: {reg.codeUsed}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                                {reg.isReservedByAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReleaseAdminTable(reg.elementId!)}
                                    className="px-2.5 py-1.5 rounded-xl font-bold text-xs bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>{t.releaseTableAdmin}</span>
                                  </button>
                                ) : (
                                  <>
                                    {event.blueprint && event.blueprint.elements.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReassigningRegistration(reg);
                                          setTargetNewElementId(null);
                                        }}
                                        className="px-2.5 py-1.5 rounded-xl font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                                        title={t.changeTableBtn}
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                                        <span>{t.changeTableBtn}</span>
                                      </button>
                                    )}

                                    {isFullyPassed ? (
                                      <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                          <span>{t.statusPassed} ({total}/{total})</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleUndoAdmission(reg.id, 1)}
                                          className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg cursor-pointer transition-colors shrink-0"
                                          title={`${t.undoPass} (-1)`}
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : isPartial ? (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          disabled={isCheckingIn}
                                          onClick={() => handleConfirmAdmission(reg.id, 1)}
                                          className="px-2.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs shrink-0"
                                          title={t.passNextGuestBtn}
                                        >
                                          <UserPlus className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                                          <span>+1 ({admitted + 1}/{total})</span>
                                        </button>

                                        {remaining > 1 && (
                                          <button
                                            type="button"
                                            disabled={isCheckingIn}
                                            onClick={() => handleConfirmAdmission(reg.id, remaining)}
                                            className="px-2 py-1.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer transition-colors flex items-center justify-center gap-1 shrink-0"
                                            title={t.passAllRemainingBtn.replace('{count}', String(remaining))}
                                          >
                                            <span>All ({remaining})</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleUndoAdmission(reg.id, 1)}
                                          className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg cursor-pointer transition-colors shrink-0"
                                          title={`${t.undoPass} (-1)`}
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          disabled={isCheckingIn}
                                          onClick={() => handleConfirmAdmission(reg.id, 1)}
                                          className="px-3 sm:px-4 py-2 sm:py-1.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                                        >
                                          <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                          <span>
                                            {total > 1 ? `Pass 1/${total}` : t.confirmEntryBtn}
                                          </span>
                                        </button>

                                        {total > 1 && (
                                          <button
                                            type="button"
                                            disabled={isCheckingIn}
                                            onClick={() => handleConfirmAdmission(reg.id, total)}
                                            className="px-2 py-1.5 rounded-xl font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer transition-colors shrink-0"
                                            title={t.passAllRemainingBtn.replace('{count}', String(total))}
                                          >
                                            <span>All ({total})</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                            className="p-2.5 sm:p-3 bg-white rounded-xl border border-stone-200 hover:border-amber-300 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0"
                          >
                            {/* Left: Attendee Details */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                <span className="font-extrabold text-slate-900 text-xs sm:text-sm break-words">
                                  {reg.userName}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700 shrink-0">
                                  {reg.partySize} {t.personUnit}
                                </span>
                                {reg.elementLabel && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 shrink-0">
                                    {reg.elementLabel}
                                  </span>
                                )}
                                {reg.checkedIn && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{t.statusPassed}</span>
                                  </span>
                                )}
                              </div>

                              <div className="text-stone-500 text-[10px] sm:text-[11px] flex flex-wrap items-center gap-1.5 min-w-0">
                                <span>{reg.userPhone || t.noPhoneProvided}</span>
                                <span>&bull;</span>
                                <span className="font-mono font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded text-[10px]">
                                  {getTicketDisplayCode(reg)}
                                </span>
                                {reg.codeUsed && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="font-mono text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] border border-amber-200/60">
                                      {reg.codeUsed}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Right: Actions & Badges */}
                            <div className="flex items-center gap-2 shrink-0 justify-end flex-wrap pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                              {reg.isReservedByAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleReleaseAdminTable(reg.elementId!)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>{t.releaseTableAdmin}</span>
                                </button>
                              ) : (
                                <>
                                  {event.blueprint && event.blueprint.elements.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReassigningRegistration(reg);
                                        setTargetNewElementId(null);
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                                      title={t.changeTableBtn}
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                                      <span>{t.changeTableBtn}</span>
                                    </button>
                                  )}
                                </>
                              )}

                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  reg.isPaid
                                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                }`}
                              >
                                {reg.isPaid ? t.paidBadge : t.freeBadge}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 3: ADMIN ISSUED CODES LOG (PAID EVENTS)                 */}
              {/* ============================================================ */}
              {adminTab === 'generator' && event.isPaid && event.type !== 'open' && (
                <div className="space-y-4">
                  {/* Admin Generated Codes Log */}
                  {eventCodes.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-stone-700">
                          {t.issuedCodesTitle} ({eventCodes.length})
                        </h4>
                        <span className="text-[11px] text-stone-500 font-medium">
                          {eventCodes.filter((c) => !c.claimed).length} {t.codeAvailable} &bull; {eventCodes.filter((c) => c.claimed).length} {t.codeClaimed}
                        </span>
                      </div>
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
                  ) : (
                    <div className="p-8 text-center bg-white rounded-2xl border border-stone-200">
                      <KeyRound className="w-8 h-8 text-stone-400 mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-stone-500">
                        {language === 'ar'
                          ? 'لا توجد رموز حجز مصدرة بعد. يمكنك توليد الرموز مباشرة من قسم التسجيل بالأعلى.'
                          : language === 'fr'
                          ? 'Aucun code émis pour le moment. Vous pouvez générer les codes directement dans la section inscription en haut.'
                          : 'No reservation codes issued yet. You can generate codes directly in the Registration section above.'}
                      </p>
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
