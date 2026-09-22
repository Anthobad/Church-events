'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChurchEvent, Registration, AdminReservationCode, Language } from './types';
import { translations } from './services/i18n';
import {
  getStoredEvents,
  saveStoredEvents,
  deleteStoredEvent,
  saveSingleEventToSupabase,
  deleteSingleEventFromSupabase,
  getStoredRegistrations,
  saveStoredRegistrations,
  saveSingleRegistrationToSupabase,
  getStoredAdminCodes,
  saveStoredAdminCodes,
  saveSingleCodeToSupabase,
  getUserLikes,
  setUserLikes,
  subscribeToRealtime,
  generateRandom8DigitCode,
  checkSeatConflict,
  syncFromSupabase,
  supabase,
  getStoredLanguage,
  saveStoredLanguage
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
  // Default to 'ar' on initial render for exact SSR hydration match, then restore user selection from localStorage
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
  const [selectedEventAdminTab, setSelectedEventAdminTab] = useState<'verify' | 'registrations' | 'generator' | undefined>(undefined);
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<ChurchEvent | null>(null);
  const [showAdminSignIn, setShowAdminSignIn] = useState<boolean>(false);

  // Load data directly from Supabase / in-memory cache
  const refreshData = useCallback(async () => {
    const synced = await syncFromSupabase();
    // Sort all new events at top (newest date or createdAt first)
    const sorted = [...synced.events].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setEvents(sorted);
    setRegistrations(synced.registrations);
    setAdminCodes(synced.codes);
    setUserLikesState(getUserLikes());
  }, []);

  useEffect(() => {
    // Safely restore stored user language preference after client hydration to prevent SSR mismatch
    const savedLang = getStoredLanguage();
    if (savedLang && savedLang !== 'ar') {
      setLanguage(savedLang);
    }
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

    // Subscribe to cross-tab/multi-window real-time events
    const unsubscribe = subscribeToRealtime((msg) => {
      if (msg?.type === 'SUPABASE_SYNC_COMPLETE' && msg.payload) {
        const sorted = [...(msg.payload.events as ChurchEvent[])].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setEvents(sorted);
        setRegistrations(msg.payload.registrations);
        setAdminCodes(msg.payload.codes);
      } else if (msg?.type === 'REGISTRATIONS_UPDATED' && msg.payload) {
        setRegistrations(msg.payload);
      } else {
        refreshData();
      }
    });

    // Active heartbeat: sync every 3.5 seconds to guarantee instant real-time updates without refresh
    const liveSyncInterval = setInterval(() => {
      syncFromSupabase();
    }, 3500);

    return () => {
      unsubscribe();
      clearInterval(liveSyncInterval);
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [refreshData]);

  // Sync HTML lang and dir attribute with selected language & persist language to localStorage
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    saveStoredLanguage(language);
  }, [language, mounted]);

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
    setSelectedEventAdminTab(undefined);
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
  const handleRegister = async (data: {
    eventId: string;
    userName: string;
    userPhone: string;
    partySize: number;
    elementId?: string;
    elementLabel?: string;
    isPaid: boolean;
    codeUsed?: string;
  }) => {
    const t = translations[language];

    // Fetch latest registrations to guarantee no concurrency conflict
    const currentRegs = getStoredRegistrations();
    const event = events.find((e) => e.id === data.eventId);

    if (!event) {
      return { success: false, error: t.eventNotFound };
    }

    // Require 8-digit code if event is paid
    if (event.isPaid && !data.codeUsed) {
      return { success: false, error: t.enterEightDigitCode };
    }

    // Strictly enforce single-use code verification
    if (data.codeUsed) {
      const currentCodes = getStoredAdminCodes();
      const codeRecord = currentCodes.find((c) => c.code === data.codeUsed && c.eventId === data.eventId);

      if (!codeRecord) {
        return { success: false, error: t.invalidCodeError };
      }

      if (codeRecord.claimed) {
        return { success: false, error: t.codeAlreadyUsedError };
      }

      // Check remote Supabase in real-time to avoid multi-tab or concurrent reuse
      if (supabase) {
        try {
          const { data: remoteCode } = await supabase
            .from('church_admin_codes')
            .select('*')
            .eq('code', data.codeUsed)
            .eq('event_id', data.eventId)
            .maybeSingle();

          if (remoteCode && remoteCode.claimed) {
            // Synchronize local memory with claimed status
            const updatedCodes = currentCodes.map((c) =>
              c.code === data.codeUsed ? { ...c, claimed: true } : c
            );
            saveStoredAdminCodes(updatedCodes);
            setAdminCodes(updatedCodes);
            return { success: false, error: t.codeAlreadyUsedError };
          }
        } catch (e) {
          console.warn('Remote code verify notice:', e);
        }
      }
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
          const claimedCode = { ...c, claimed: true, elementId: data.elementId };
          saveSingleCodeToSupabase(claimedCode);
          return claimedCode;
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
    saveSingleRegistrationToSupabase(newRegistration);

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
    saveSingleCodeToSupabase(newCodeRecord);
    return newCodeRecord;
  };

  // Admin Save / Edit Event
  const handleSaveEvent = async (eventData: ChurchEvent) => {
    let updatedEvents: ChurchEvent[];
    const exists = events.some((e) => e.id === eventData.id);

    if (exists) {
      updatedEvents = events.map((e) => (e.id === eventData.id ? eventData : e));
    } else {
      updatedEvents = [eventData, ...events];
    }

    // Immediately update UI & local cache
    saveStoredEvents(updatedEvents);
    setEvents(updatedEvents);
    setIsCreatingEvent(false);
    setEditingEvent(null);
    if (selectedEvent && selectedEvent.id === eventData.id) {
      setSelectedEvent(eventData);
    }

    // Persist directly to Supabase cloud database
    await saveSingleEventToSupabase(eventData);
  };

  // Admin Delete Event
  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    const deletedId = eventToDelete.id;
    deleteStoredEvent(deletedId);
    await deleteSingleEventFromSupabase(deletedId);

    const updatedEvents = events.filter((e) => e.id !== deletedId);
    setEvents(updatedEvents);

    // Clean up related registrations
    const updatedRegs = registrations.filter((r) => r.eventId !== deletedId);
    saveStoredRegistrations(updatedRegs);
    setRegistrations(updatedRegs);

    if (selectedEvent && selectedEvent.id === deletedId) {
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
                  onVerifyClick={(ev, e) => {
                    e.stopPropagation();
                    setSelectedEvent(ev);
                    setSelectedEventAdminTab('verify');
                  }}
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
          initialAdminTab={selectedEventAdminTab}
          onClose={() => {
            setSelectedEvent(null);
            setSelectedEventAdminTab(undefined);
          }}
          onToggleLike={handleToggleLike}
          onRegister={handleRegister}
          onGenerateAdminCode={handleGenerateAdminCode}
          onRegistrationUpdated={(updatedReg) => {
            setRegistrations((prev) =>
              prev.map((r) => (r.id === updatedReg.id ? updatedReg : r))
            );
          }}
          onRegistrationsSynced={(newRegs) => {
            setRegistrations(newRegs);
          }}
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
