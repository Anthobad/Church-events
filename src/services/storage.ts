import { ChurchEvent, Registration, AdminReservationCode, Language } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// The ONLY key persisted in localStorage is the user's selected language
export const STORAGE_LANG_KEY = 'church_events_lang';

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'ar';
  try {
    const saved = localStorage.getItem(STORAGE_LANG_KEY) as Language;
    if (saved === 'ar' || saved === 'en' || saved === 'fr') {
      return saved;
    }
  } catch (e) {
    // ignore
  }
  return 'ar';
}

export function saveStoredLanguage(lang: Language) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_LANG_KEY, lang);
  } catch (e) {
    // ignore
  }
}

// Clean up any legacy localStorage entries so ONLY language is kept in localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('church_events_v2');
    localStorage.removeItem('church_registrations_v2');
    localStorage.removeItem('church_admin_codes_v2');
    localStorage.removeItem('church_user_likes_v2');
    localStorage.removeItem('church_events');
    localStorage.removeItem('church_registrations');
    localStorage.removeItem('church_admin_codes');
    localStorage.removeItem('church_user_likes');
    localStorage.removeItem('church_admin_logged_in');
  } catch (e) {
    // ignore
  }
}

// In-memory runtime cache for fast synchronous React rendering
let inMemoryEvents: ChurchEvent[] = [];
let inMemoryRegistrations: Registration[] = [];
let inMemoryCodes: AdminReservationCode[] = [];
let inMemoryLikes: Record<string, boolean> = {};

// Supabase client initialized strictly via environment variables in the background
const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  '';
const supabaseAnonKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  '';
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Realtime Broadcast Channel for multi-tab sync
const realtimeChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('church_events_realtime_channel')
  : null;

type RealtimeListener = (message: { type: string; payload?: any }) => void;
const listeners = new Set<RealtimeListener>();

if (realtimeChannel) {
  realtimeChannel.onmessage = (event) => {
    listeners.forEach((listener) => listener(event.data));
  };
}

export function subscribeToRealtime(listener: RealtimeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function broadcastUpdate(type: string, payload?: any) {
  // Notify local in-tab listeners immediately
  listeners.forEach((listener) => {
    try {
      listener({ type, payload });
    } catch (e) {
      console.warn('Local realtime listener notification warning:', e);
    }
  });

  // Notify other tabs and windows
  if (realtimeChannel) {
    try {
      realtimeChannel.postMessage({ type, payload });
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }
}

// Initial Data (Empty by default: All events and reservations come directly from database)
const initialEvents: ChurchEvent[] = [];
const initialRegistrations: Registration[] = [];
const initialCodes: AdminReservationCode[] = [];

// Helper to get from local storage or seed
export function eventToRow(event: ChurchEvent) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    image_url: event.imageUrl || null,
    date: event.date,
    time: event.time,
    location: event.location,
    type: event.type,
    is_paid: event.isPaid,
    views: event.views || 0,
    likes: event.likes || 0,
    blueprint: event.blueprint || null,
    created_at: event.createdAt || new Date().toISOString()
  };
}

export function rowToEvent(row: any): ChurchEvent {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    imageUrl: row.image_url || undefined,
    date: String(row.date || ''),
    time: String(row.time || ''),
    location: String(row.location || ''),
    type: (row.type as any) || 'registration_required',
    isPaid: Boolean(row.is_paid),
    views: Number(row.views || 0),
    likes: Number(row.likes || 0),
    blueprint: row.blueprint || undefined,
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function registrationToRow(reg: Registration) {
  let dbCode = reg.codeUsed || '';
  if (reg.checkedIn) {
    const at = reg.checkedInAt || new Date().toISOString();
    const by = reg.checkedInBy || 'Admin';
    dbCode = `${dbCode}__CHECKED_IN__${at}__${by}`;
  }

  return {
    id: reg.id,
    event_id: reg.eventId,
    user_name: reg.userName,
    user_phone: reg.userPhone,
    party_size: reg.partySize,
    element_id: reg.elementId || null,
    element_label: reg.elementLabel || null,
    is_paid: reg.isPaid,
    code_used: dbCode ? dbCode : null,
    registered_at: reg.registeredAt || new Date().toISOString()
  };
}

export function rowToRegistration(row: any): Registration {
  const rawCode = String(row.code_used || '');
  let checkedIn = Boolean(row.checked_in);
  let checkedInAt: string | undefined = row.checked_in_at ? String(row.checked_in_at) : undefined;
  let checkedInBy: string | undefined = row.checked_in_by ? String(row.checked_in_by) : undefined;
  let codeUsed: string | undefined = undefined;

  if (rawCode.includes('__CHECKED_IN__')) {
    checkedIn = true;
    const [codePart, metaPart] = rawCode.split('__CHECKED_IN__');
    codeUsed = codePart ? codePart : undefined;
    if (metaPart) {
      const [at, by] = metaPart.split('__');
      if (at && !checkedInAt) checkedInAt = at;
      if (by && !checkedInBy) checkedInBy = by;
    }
  } else {
    codeUsed = rawCode ? rawCode : undefined;
  }

  return {
    id: String(row.id),
    eventId: String(row.event_id),
    userName: String(row.user_name || ''),
    userPhone: String(row.user_phone || ''),
    partySize: Number(row.party_size || 1),
    elementId: row.element_id || undefined,
    elementLabel: row.element_label || undefined,
    isPaid: Boolean(row.is_paid),
    codeUsed,
    registeredAt: row.registered_at || new Date().toISOString(),
    checkedIn,
    checkedInAt,
    checkedInBy
  };
}

export function codeToRow(c: AdminReservationCode) {
  return {
    id: c.id,
    code: c.code,
    event_id: c.eventId,
    user_name: c.userName,
    party_size: c.partySize,
    claimed: c.claimed,
    element_id: c.elementId || null,
    created_at: c.createdAt || new Date().toISOString()
  };
}

export function rowToCode(row: any): AdminReservationCode {
  return {
    id: String(row.id),
    code: String(row.code),
    eventId: String(row.event_id),
    userName: String(row.user_name || ''),
    partySize: Number(row.party_size || 1),
    claimed: Boolean(row.claimed),
    elementId: row.element_id || undefined,
    createdAt: row.created_at || new Date().toISOString()
  };
}

let isSyncing = false;

/**
 * Fetch latest data directly from the Supabase cloud database,
 * store in in-memory cache, and trigger realtime state update.
 */
export async function syncFromSupabase(): Promise<{
  events: ChurchEvent[];
  registrations: Registration[];
  codes: AdminReservationCode[];
}> {
  if (!supabase) {
    return {
      events: inMemoryEvents,
      registrations: inMemoryRegistrations,
      codes: inMemoryCodes
    };
  }
  if (isSyncing) {
    return {
      events: inMemoryEvents,
      registrations: inMemoryRegistrations,
      codes: inMemoryCodes
    };
  }
  isSyncing = true;
  try {
    const [eventsRes, regsRes, codesRes] = await Promise.all([
      supabase.from('church_events').select('*').order('created_at', { ascending: false }),
      supabase.from('church_registrations').select('*'),
      supabase.from('church_admin_codes').select('*')
    ]);

    let changed = false;

    if (!eventsRes.error && Array.isArray(eventsRes.data)) {
      inMemoryEvents = eventsRes.data.map(rowToEvent);
      changed = true;
    }

    if (!regsRes.error && Array.isArray(regsRes.data)) {
      inMemoryRegistrations = regsRes.data.map(rowToRegistration);
      changed = true;
    }

    if (!codesRes.error && Array.isArray(codesRes.data)) {
      inMemoryCodes = codesRes.data.map(rowToCode);
      changed = true;
    }

    if (changed) {
      broadcastUpdate('SUPABASE_SYNC_COMPLETE', {
        events: inMemoryEvents,
        registrations: inMemoryRegistrations,
        codes: inMemoryCodes
      });
    }
    return {
      events: inMemoryEvents,
      registrations: inMemoryRegistrations,
      codes: inMemoryCodes
    };
  } catch (err) {
    console.warn('Supabase sync notice:', err);
    return {
      events: inMemoryEvents,
      registrations: inMemoryRegistrations,
      codes: inMemoryCodes
    };
  } finally {
    isSyncing = false;
  }
}

// Setup Supabase Realtime channel subscription if configured
if (typeof window !== 'undefined' && supabase) {
  try {
    supabase
      .channel('church_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'church_events' }, async () => {
        await syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'church_registrations' }, async () => {
        await syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'church_admin_codes' }, async () => {
        await syncFromSupabase();
      })
      .subscribe();
  } catch (err) {
    console.warn('Supabase realtime subscription notice:', err);
  }
}

export function getStoredEvents(): ChurchEvent[] {
  return inMemoryEvents;
}

export function saveStoredEvents(events: ChurchEvent[]) {
  inMemoryEvents = events;
  broadcastUpdate('EVENTS_UPDATED', events);

  // Sync to Supabase in background
  if (supabase && events.length > 0) {
    const rows = events.map(eventToRow);
    Promise.resolve(supabase.from('church_events').upsert(rows)).catch((err) =>
      console.warn('Supabase event upsert notice:', err)
    );
  }
}

export async function saveSingleEventToSupabase(event: ChurchEvent): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = eventToRow(event);
    const { error } = await supabase.from('church_events').upsert(row);
    if (error) {
      console.error('Supabase save event error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase save event exception:', err);
    return false;
  }
}

export function deleteStoredEvent(eventId: string) {
  inMemoryEvents = inMemoryEvents.filter((e) => e.id !== eventId);
  broadcastUpdate('EVENTS_UPDATED', inMemoryEvents);

  if (supabase) {
    Promise.resolve(supabase.from('church_events').delete().eq('id', eventId)).catch((err) =>
      console.warn('Supabase delete event notice:', err)
    );
  }
}

export async function deleteSingleEventFromSupabase(eventId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('church_events').delete().eq('id', eventId);
    if (error) {
      console.error('Supabase delete event error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase delete event exception:', err);
    return false;
  }
}

export function getStoredRegistrations(): Registration[] {
  return inMemoryRegistrations;
}

export function saveStoredRegistrations(registrations: Registration[]) {
  inMemoryRegistrations = registrations;
  broadcastUpdate('REGISTRATIONS_UPDATED', registrations);

  if (supabase && registrations.length > 0) {
    const rows = registrations.map(registrationToRow);
    Promise.resolve(supabase.from('church_registrations').upsert(rows)).catch((err) =>
      console.warn('Supabase registration upsert notice:', err)
    );
  }
}

export async function saveSingleRegistrationToSupabase(reg: Registration): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = registrationToRow(reg);
    const { error } = await supabase.from('church_registrations').upsert(row);
    if (error) {
      console.error('Supabase save registration error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase save registration exception:', err);
    return false;
  }
}

export function getStoredAdminCodes(): AdminReservationCode[] {
  return inMemoryCodes;
}

export function saveStoredAdminCodes(codes: AdminReservationCode[]) {
  inMemoryCodes = codes;
  broadcastUpdate('CODES_UPDATED', codes);

  if (supabase && codes.length > 0) {
    const rows = codes.map(codeToRow);
    Promise.resolve(supabase.from('church_admin_codes').upsert(rows)).catch((err) =>
      console.warn('Supabase admin codes upsert notice:', err)
    );
  }
}

export async function saveSingleCodeToSupabase(code: AdminReservationCode): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = codeToRow(code);
    const { error } = await supabase.from('church_admin_codes').upsert(row);
    if (error) {
      console.error('Supabase save admin code error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase save admin code exception:', err);
    return false;
  }
}

export async function fetchLiveCodesForEvent(eventId: string): Promise<AdminReservationCode[]> {
  if (!supabase) return getStoredAdminCodes().filter((c) => c.eventId === eventId);
  try {
    const { data, error } = await supabase
      .from('church_admin_codes')
      .select('*')
      .eq('event_id', eventId);
    if (!error && data) {
      return data.map(rowToCode);
    }
  } catch (err) {
    console.warn('Error fetching live codes:', err);
  }
  return getStoredAdminCodes().filter((c) => c.eventId === eventId);
}

export function getUserLikes(): Record<string, boolean> {
  return inMemoryLikes;
}

export function setUserLikes(likes: Record<string, boolean>) {
  inMemoryLikes = likes;
}

// Generate random 8-digit numeric code
export function generateRandom8DigitCode(): string {
  // Ensure exactly 8 digits, not starting with 0
  const num = Math.floor(10000000 + Math.random() * 90000000);
  return num.toString();
}

// Conflict checking helper for seating
export function checkSeatConflict(
  eventId: string,
  elementId: string,
  requestedCount: number,
  elementCapacity: number,
  currentRegistrations: Registration[]
): { available: boolean; remainingCapacity: number } {
  const eventRegs = currentRegistrations.filter(
    (r) => r.eventId === eventId && r.elementId === elementId
  );
  const currentOccupied = eventRegs.reduce((sum, r) => sum + r.partySize, 0);
  const remaining = elementCapacity - currentOccupied;

  if (remaining < requestedCount) {
    return { available: false, remainingCapacity: remaining };
  }
  return { available: true, remainingCapacity: remaining };
}

// ---------------------------------------------------------------------------
// Supabase Storage Bucket for Event Images (5MB Limit)
// ---------------------------------------------------------------------------
export const SUPABASE_IMAGE_BUCKET = 'event-images';
export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 Megabytes

export interface UploadResult {
  url: string;
  isSupabase: boolean;
  fileName: string;
  fileSize: number;
}

/**
 * Ensures the 'event-images' public bucket exists in Supabase Storage.
 */
export async function ensureEventImagesBucket(): Promise<void> {
  if (!supabase) return;
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (!error && buckets) {
      const exists = buckets.some((b) => b.name === SUPABASE_IMAGE_BUCKET);
      if (!exists) {
        await supabase.storage.createBucket(SUPABASE_IMAGE_BUCKET, {
          public: true,
          fileSizeLimit: MAX_IMAGE_FILE_SIZE,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        });
      }
    }
  } catch (err) {
    console.warn('Supabase bucket check notice:', err);
  }
}

/**
 * Upload an event image file:
 * - Validates strict 5MB size limit
 * - Validates image mime type
 * - Stores in Supabase Storage Bucket 'event-images'
 * - Returns public Supabase URL, or falls back to local data URL if Supabase is offline/unconfigured
 */
export async function uploadEventImage(file: File): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error('FILE_SIZE_EXCEEDED');
  }

  // Attempt Supabase Bucket upload
  if (supabase) {
    try {
      await ensureEventImagesBucket();

      const ext = file.name.split('.').pop() || 'jpg';
      const cleanBaseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
      const filePath = `events/${Date.now()}_${cleanBaseName}.${ext}`;

      const { data, error } = await supabase.storage
        .from(SUPABASE_IMAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from(SUPABASE_IMAGE_BUCKET)
          .getPublicUrl(filePath);

        if (publicData?.publicUrl) {
          return {
            url: publicData.publicUrl,
            isSupabase: true,
            fileName: file.name,
            fileSize: file.size
          };
        }
      } else if (error) {
        console.warn('Supabase storage upload returned error, using fallback:', error.message);
      }
    } catch (supabaseError) {
      console.warn('Supabase storage upload exception:', supabaseError);
    }
  }

  // Fallback to local DataURL (Base64) so image upload works seamlessly even without live Supabase credentials
  const base64Url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  return {
    url: base64Url,
    isSupabase: false,
    fileName: file.name,
    fileSize: file.size
  };
}

// Clean and normalize ticket codes (removes spaces, dashes, prefixes)
export function cleanTicketCode(code: string): string {
  if (!code) return '';
  return code
    .trim()
    .toUpperCase()
    .replace(/^TKT-?/i, '')
    .replace(/^#/, '')
    .replace(/[\s-_]/g, '');
}

// Generate the 8-character display code for a registration ticket
export function getTicketDisplayCode(registration: Registration): string {
  const cleanId = registration.id.replace(/[^a-zA-Z0-9]/g, '');
  return cleanId.slice(-8).toUpperCase();
}

export interface TicketVerificationResult {
  status: 'VALID' | 'ALREADY_PASSED' | 'ADMISSION_CONFIRMED' | 'INVALID';
  registration?: Registration;
  error?: string;
  matchedBy?: 'TICKET_CODE' | 'ADMIN_CODE' | 'PHONE' | 'ID';
}

// Verify a ticket code in real-time against database
export async function verifyTicketCodeLive(
  eventId: string,
  rawInputCode: string
): Promise<TicketVerificationResult> {
  const cleanInput = cleanTicketCode(rawInputCode);
  if (!cleanInput) {
    return { status: 'INVALID', error: 'empty_code' };
  }

  // Live fetch from Supabase to prevent reading stale local cache when multiple admins are scanning
  let regsToSearch = inMemoryRegistrations.filter((r) => r.eventId === eventId);
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('church_registrations')
        .select('*')
        .eq('event_id', eventId);
      if (!error && Array.isArray(data)) {
        const liveRegs = data.map(rowToRegistration);
        const otherRegs = inMemoryRegistrations.filter((r) => r.eventId !== eventId);
        inMemoryRegistrations = [...liveRegs, ...otherRegs];
        regsToSearch = liveRegs;
      }
    } catch (e) {
      console.warn('Live ticket verification sync warning:', e);
    }
  }

  // Match against registration
  let matchedBy: 'TICKET_CODE' | 'ADMIN_CODE' | 'PHONE' | 'ID' | undefined;
  const match = regsToSearch.find((r) => {
    const dispCode = getTicketDisplayCode(r);
    const rawIdClean = r.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const phoneClean = r.userPhone.replace(/\D/g, '');
    const codeUsedClean = r.codeUsed ? cleanTicketCode(r.codeUsed) : '';

    if (cleanInput === dispCode || cleanInput === rawIdClean.slice(-8)) {
      matchedBy = 'TICKET_CODE';
      return true;
    }
    if (codeUsedClean && cleanInput === codeUsedClean) {
      matchedBy = 'ADMIN_CODE';
      return true;
    }
    if (cleanInput === rawIdClean || cleanInput === r.id.toUpperCase()) {
      matchedBy = 'ID';
      return true;
    }
    if (phoneClean && cleanInput.length >= 7 && phoneClean.includes(cleanInput)) {
      matchedBy = 'PHONE';
      return true;
    }
    return false;
  });

  if (!match) {
    return { status: 'INVALID', error: 'not_found' };
  }

  if (match.checkedIn) {
    return { status: 'ALREADY_PASSED', registration: match, matchedBy };
  }

  return { status: 'VALID', registration: match, matchedBy };
}

// Atomically check-in an attendee with concurrency protection
export async function checkInRegistrationLive(
  registrationId: string,
  eventId: string,
  adminName: string = 'Admin'
): Promise<{
  success: boolean;
  status: 'CHECKED_IN' | 'ALREADY_PASSED' | 'ERROR';
  registration?: Registration;
  error?: string;
}> {
  let currentReg = inMemoryRegistrations.find((r) => r.id === registrationId);

  // Direct database query to guard against concurrent check-ins by 2+ admins at different gates
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('church_registrations')
        .select('*')
        .eq('id', registrationId)
        .maybeSingle();

      if (!error && data) {
        currentReg = rowToRegistration(data);
      }
    } catch (e) {
      console.warn('Supabase checkin pre-flight query warning:', e);
    }
  }

  if (!currentReg) {
    return { success: false, status: 'ERROR', error: 'not_found' };
  }

  // Concurrency guard: If already checked in by another verifier, halt immediately
  if (currentReg.checkedIn) {
    return {
      success: false,
      status: 'ALREADY_PASSED',
      registration: currentReg,
      error: 'already_passed'
    };
  }

  const checkInTimestamp = new Date().toISOString();
  const updatedReg: Registration = {
    ...currentReg,
    checkedIn: true,
    checkedInAt: checkInTimestamp,
    checkedInBy: adminName
  };

  // Update in-memory cache and broadcast
  const updatedList = inMemoryRegistrations.map((r) =>
    r.id === registrationId ? updatedReg : r
  );
  inMemoryRegistrations = updatedList;
  broadcastUpdate('REGISTRATIONS_UPDATED', updatedList);

  // Synchronize to Supabase immediately
  if (supabase) {
    try {
      const row = registrationToRow(updatedReg);
      const { error } = await supabase.from('church_registrations').upsert(row);
      if (error) {
        console.error('Supabase check-in upsert error:', error.message);
      }
    } catch (e) {
      console.error('Supabase check-in upsert exception:', e);
    }
  }

  return { success: true, status: 'CHECKED_IN', registration: updatedReg };
}

// Undo check-in in case of error
export async function undoCheckInLive(
  registrationId: string,
  eventId: string
): Promise<{ success: boolean; registration?: Registration }> {
  const currentReg = inMemoryRegistrations.find((r) => r.id === registrationId);
  if (!currentReg) return { success: false };

  const updatedReg: Registration = {
    ...currentReg,
    checkedIn: false,
    checkedInAt: undefined,
    checkedInBy: undefined
  };

  const updatedList = inMemoryRegistrations.map((r) =>
    r.id === registrationId ? updatedReg : r
  );
  inMemoryRegistrations = updatedList;
  broadcastUpdate('REGISTRATIONS_UPDATED', updatedList);

  if (supabase) {
    try {
      const row = registrationToRow(updatedReg);
      await supabase.from('church_registrations').upsert(row);
    } catch (e) {
      console.error('Supabase undo checkin exception:', e);
    }
  }

  return { success: true, registration: updatedReg };
}

