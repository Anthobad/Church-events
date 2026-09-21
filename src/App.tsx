'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChurchEvent, Registration, AdminReservationCode, Language } from './types';
import { translations } from './services/i18n';
import {
  getStoredEvents,
  saveStoredEvents,
  deleteStoredEvent,
  getStoredRegistrations,
  saveStoredRegistrations,
  getStoredAdminCodes,
  saveStoredAdminCodes,
  getUserLikes,
  setUserLikes,
  subscribeToRealtime,
  generateRandom8DigitCode,
  checkSeatConflict,
  syncFromSupabase,
  supabase
} from './services/storage';

import { Header } from './components/Header';
import { EventCard } from './components/EventCard';
import { EventDetailModal } from './components/EventDetailModal';
import { EventFormModal } from './components/EventFormModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { AdminSignInModal } from './components/AdminSignInModal';
import { MosaicBackground } from './components/MosaicBackground';
import { Loader2 } from 'lucide-react';

const PAGE_SIZE = 4;

export default function App() {
  // Primary language: Arabic ('ar') as specified in user prompt
  const [language, setLanguage] = useState<Language>('ar');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Events & real-time data
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [adminCodes, setAdminCodes] = useState<AdminReservationCode[]>([]);
  const [userLikes, setUserLikesState] = useState<Record<string, boolean>>({});

  // Pagination & Infinite Scroll
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Modals
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<ChurchEvent | null>(null);
  const [showAdminSignIn, setShowAdminSignIn] = useState<boolean>(false);

  // Load initial data
  const refreshData = useCallback(() => {
    const loadedEvents = getStoredEvents();
    // Sort all new events at top (newest date or createdAt first)
    const sorted = [...loadedEvents].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setEvents(sorted);
    setRegistrations(getStoredRegistrations());
    setAdminCodes(getStoredAdminCodes());
    setUserLikesState(getUserLikes());
  }, []);

  useEffect(() => {
    setMounted(true);

    // Clean up any legacy localStorage admin bypass
    if (typeof window !== 'undefined') {
      localStorage.removeItem('church_admin_logged_in');
    }

    // Supabase Auth session tracking
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsAdmin(Boolean(session?.user));
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAdmin(Boolean(session?.user));
      });
      authSubscription = data.subscription;
    }

    refreshData();

    // Trigger initial background sync from Supabase database if configured
    syncFromSupabase().then((changed) => {
      if (changed) refreshData();
    });

    // Subscribe to cross-tab/multi-window real-time events
    const unsubscribe = subscribeToRealtime(() => {
      refreshData();
    });

    return () => {
      unsubscribe();
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [refreshData]);

  // Sync HTML lang and dir attribute with selected language
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Admin authentication handlers via Supabase
  const handleAdminSignInSuccess = () => {
    setIsAdmin(true);
  };

  const handleAdminSignOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Sign out notice:', e);
    } finally {
      setIsAdmin(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('church_admin_logged_in');
      }
    }
  };

  // Click on Event card: reveal more info and increment views
  const handleEventClick = (event: ChurchEvent) => {
    // Increment view count in database/storage
    const updatedEvents = events.map((ev) => {
      if (ev.id === event.id) {
        return { ...ev, views: ev.views + 1 };
      }
      return ev;
    });
    saveStoredEvents(updatedEvents);
    setEvents(updatedEvents);

    const targetEvent = updatedEvents.find((ev) => ev.id === event.id) || event;
    setSelectedEvent(targetEvent);
  };

  // Like button handling
  const handleToggleLike = (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const currentlyLiked = Boolean(userLikes[eventId]);
    const updatedLikes = { ...userLikes, [eventId]: !currentlyLiked };
    setUserLikesState(updatedLikes);
    setUserLikes(updatedLikes);

    const delta = currentlyLiked ? -1 : 1;
    const updatedEvents = events.map((ev) => {
      if (ev.id === eventId) {
        return { ...ev, likes: Math.max(0, ev.likes + delta) };
      }
      return ev;
    });

    saveStoredEvents(updatedEvents);
    setEvents(updatedEvents);

    if (selectedEvent && selectedEvent.id === eventId) {
      setSelectedEvent((prev) => (prev ? { ...prev, likes: Math.max(0, prev.likes + delta) } : null));
    }
  };

  // Event Registration Submission with Conflict Check
  const handleRegister = (data: {
    eventId: string;
    userName: string;
    userPhone: string;
    partySize: number;
    elementId?: string;
    elementLabel?: string;
    isPaid: boolean;
    codeUsed?: string;
  }) => {
    // Fetch latest registrations to guarantee no concurrency conflict
    const currentRegs = getStoredRegistrations();
    const event = events.find((e) => e.id === data.eventId);

    if (!event) {
      return { success: false, error: translations[language].eventNotFound };
    }

    // Check seating conflict if seating element is assigned
    if (data.elementId && event.blueprint) {
      const element = event.blueprint.elements.find((el) => el.id === data.elementId);
      if (element && element.capacity > 0) {
        const conflict = checkSeatConflict(
          data.eventId,
          data.elementId,
          data.partySize,
          element.capacity,
          currentRegs
        );

        if (!conflict.available) {
          return { success: false, conflict: true };
        }
      }
    }

    // Mark 8-digit code as claimed if event is paid
    if (data.codeUsed) {
      const currentCodes = getStoredAdminCodes();
      const updatedCodes = currentCodes.map((c) => {
        if (c.code === data.codeUsed && c.eventId === data.eventId) {
          return { ...c, claimed: true, elementId: data.elementId };
        }
        return c;
      });
      saveStoredAdminCodes(updatedCodes);
      setAdminCodes(updatedCodes);
    }

    const newRegistration: Registration = {
      id: `reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventId: data.eventId,
      userName: data.userName,
      userPhone: data.userPhone,
      partySize: data.partySize,
      elementId: data.elementId,
      elementLabel: data.elementLabel,
      isPaid: data.isPaid,
      codeUsed: data.codeUsed,
      registeredAt: new Date().toISOString()
    };

    const updatedRegistrations = [newRegistration, ...currentRegs];
    saveStoredRegistrations(updatedRegistrations);
    setRegistrations(updatedRegistrations);

    return { success: true, registration: newRegistration };
  };

  // Admin 8-Digit Code Generator
  const handleGenerateAdminCode = (
    eventId: string,
    userName: string,
    partySize: number
  ): AdminReservationCode => {
    const currentCodes = getStoredAdminCodes();
    let uniqueCode = generateRandom8DigitCode();

    // Ensure code uniqueness
    while (currentCodes.some((c) => c.code === uniqueCode)) {
      uniqueCode = generateRandom8DigitCode();
    }

    const newCodeRecord: AdminReservationCode = {
      id: `code-${Date.now()}`,
      code: uniqueCode,
      eventId,
      userName,
      partySize,
      claimed: false,
      createdAt: new Date().toISOString()
    };

    const updated = [newCodeRecord, ...currentCodes];
    saveStoredAdminCodes(updated);
    setAdminCodes(updated);
    return newCodeRecord;
  };

  // Admin Save / Edit Event
  const handleSaveEvent = (eventData: ChurchEvent) => {
    let updatedEvents: ChurchEvent[];
    const exists = events.some((e) => e.id === eventData.id);

    if (exists) {
      updatedEvents = events.map((e) => (e.id === eventData.id ? eventData : e));
    } else {
      updatedEvents = [eventData, ...events];
    }

    saveStoredEvents(updatedEvents);
    setEvents(updatedEvents);
    setIsCreatingEvent(false);
    setEditingEvent(null);
    if (selectedEvent && selectedEvent.id === eventData.id) {
      setSelectedEvent(eventData);
    }
  };

  // Admin Delete Event
  const handleConfirmDelete = () => {
    if (!eventToDelete) return;
    deleteStoredEvent(eventToDelete.id);
    const updatedEvents = events.filter((e) => e.id !== eventToDelete.id);
    setEvents(updatedEvents);

    // Clean up related registrations
    const updatedRegs = registrations.filter((r) => r.eventId !== eventToDelete.id);
    saveStoredRegistrations(updatedRegs);
    setRegistrations(updatedRegs);

    if (selectedEvent && selectedEvent.id === eventToDelete.id) {
      setSelectedEvent(null);
    }
    setEventToDelete(null);
  };

  // Infinite Scroll Observer
  const handleLoadMore = useCallback(() => {
    if (visibleCount < events.length) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, events.length));
        setIsLoadingMore(false);
      }, 300);
    }
  }, [visibleCount, events.length]);

  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < events.length && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentTarget);
    return () => {
      observer.disconnect();
    };
  }, [handleLoadMore, visibleCount, events.length, isLoadingMore]);

  // Paginated events
  const paginatedEvents = events.slice(0, visibleCount);
  const t = translations[language];

  return (
    <div id="church-events-root" className="min-h-screen relative flex flex-col font-sans">
      {/* Mosaic Background Component with Stained Glass */}
      <MosaicBackground />

      {/* Header: Title "Events" depending on language + Admin Controls */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        isAdmin={isAdmin}
        onOpenAdminSignIn={() => setShowAdminSignIn(true)}
        onAdminSignOut={handleAdminSignOut}
        onOpenCreateEvent={() => setIsCreatingEvent(true)}
      />

      {/* Main Events Feed */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 relative z-10">
        {/* Events List */}
        {paginatedEvents.length > 0 ? (
          <div id="events-feed-list" className="space-y-4">
            {paginatedEvents.map((event) => {
              const regCount = registrations.filter((r) => r.eventId === event.id).length;
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  language={language}
                  isAdmin={isAdmin}
                  isLiked={Boolean(userLikes[event.id])}
                  registrationCount={regCount}
                  onCardClick={handleEventClick}
                  onLikeClick={(id, e) => handleToggleLike(id, e)}
                  onEditClick={(ev, e) => {
                    e.stopPropagation();
                    setEditingEvent(ev);
                  }}
                  onDeleteClick={(ev, e) => {
                    e.stopPropagation();
                    setEventToDelete(ev);
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center border border-stone-200 shadow-sm max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">{t.noEventsFound}</h3>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCreatingEvent(true)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white cursor-pointer"
              >
                + {t.addEvent}
              </button>
            )}
          </div>
        )}

        {/* Infinite Scroll & Paging Sentinel */}
        {events.length > visibleCount && (
          <div ref={observerTarget} className="py-6 flex flex-col items-center justify-center">
            {isLoadingMore ? (
              <div className="flex items-center gap-2 text-stone-300 text-xs font-semibold bg-slate-900/60 px-4 py-2 rounded-full backdrop-blur-sm">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                <span>{t.loadingMoreEvents}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLoadMore}
                className="px-5 py-2 rounded-full text-xs font-bold text-stone-200 bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-sm border border-white/10 transition-colors cursor-pointer shrink-0"
              >
                {t.loadMoreEvents} ({events.length - visibleCount} {t.remainingCount})
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modals & Dialogs */}

      {/* 1. Event Details & Seating Reservation Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          language={language}
          isAdmin={isAdmin}
          isLiked={Boolean(userLikes[selectedEvent.id])}
          registrations={registrations}
          adminCodes={adminCodes}
          onClose={() => setSelectedEvent(null)}
          onToggleLike={handleToggleLike}
          onRegister={handleRegister}
          onGenerateAdminCode={handleGenerateAdminCode}
          onEditClick={(ev) => {
            setSelectedEvent(null);
            setEditingEvent(ev);
          }}
          onDeleteClick={(ev) => {
            setSelectedEvent(null);
            setEventToDelete(ev);
          }}
        />
      )}

      {/* 2. Admin Create / Edit Event Modal */}
      {(isCreatingEvent || editingEvent) && (
        <EventFormModal
          initialEvent={editingEvent}
          language={language}
          onClose={() => {
            setIsCreatingEvent(false);
            setEditingEvent(null);
          }}
          onSave={handleSaveEvent}
        />
      )}

      {/* 3. Delete Verification Popup */}
      {eventToDelete && (
        <DeleteConfirmModal
          event={eventToDelete}
          language={language}
          onConfirm={handleConfirmDelete}
          onClose={() => setEventToDelete(null)}
        />
      )}

      {/* 4. Admin Sign-In Modal */}
      {showAdminSignIn && (
        <AdminSignInModal
          language={language}
          onSuccess={handleAdminSignInSuccess}
          onClose={() => setShowAdminSignIn(false)}
        />
      )}
    </div>
  );
}
