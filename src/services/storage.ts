import { ChurchEvent, Registration, AdminReservationCode } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_EVENTS_KEY = 'church_events_v2';
const STORAGE_REGISTRATIONS_KEY = 'church_registrations_v2';
const STORAGE_CODES_KEY = 'church_admin_codes_v2';
const STORAGE_USER_LIKES_KEY = 'church_user_likes_v2';

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
  if (realtimeChannel) {
    realtimeChannel.postMessage({ type, payload });
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
  return {
    id: reg.id,
    event_id: reg.eventId,
    user_name: reg.userName,
    user_phone: reg.userPhone,
    party_size: reg.partySize,
    element_id: reg.elementId || null,
    element_label: reg.elementLabel || null,
    is_paid: reg.isPaid,
    code_used: reg.codeUsed || null,
    registered_at: reg.registeredAt || new Date().toISOString()
  };
}

export function rowToRegistration(row: any): Registration {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    userName: String(row.user_name || ''),
    userPhone: String(row.user_phone || ''),
    partySize: Number(row.party_size || 1),
    elementId: row.element_id || undefined,
    elementLabel: row.element_label || undefined,
    isPaid: Boolean(row.is_paid),
    codeUsed: row.code_used || undefined,
    registeredAt: row.registered_at || new Date().toISOString()
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

/**
 * Fetch latest data directly from the Supabase cloud database,
 * store in local cache, and trigger realtime state update.
 */
/**
 * Fetch latest data directly from the Supabase cloud database,
 * store in local cache, and trigger realtime state update.
 */
export async function syncFromSupabase(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const [eventsRes, regsRes, codesRes] = await Promise.all([
      supabase.from('church_events').select('*').order('created_at', { ascending: false }),
      supabase.from('church_registrations').select('*'),
      supabase.from('church_admin_codes').select('*')
    ]);

    let changed = false;

    if (!eventsRes.error && Array.isArray(eventsRes.data)) {
      const parsedEvents = eventsRes.data.map(rowToEvent);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(parsedEvents));
      }
      changed = true;
    }

    if (!regsRes.error && Array.isArray(regsRes.data)) {
      const parsedRegs = regsRes.data.map(rowToRegistration);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_REGISTRATIONS_KEY, JSON.stringify(parsedRegs));
      }
      changed = true;
    }

    if (!codesRes.error && Array.isArray(codesRes.data)) {
      const parsedCodes = codesRes.data.map(rowToCode);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_CODES_KEY, JSON.stringify(parsedCodes));
      }
      changed = true;
    }

    if (changed) {
      broadcastUpdate('SUPABASE_SYNC_COMPLETE');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Supabase sync notice:', err);
    return false;
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

const MOCK_EVENT_IDS = new Set(['event-1', 'event-2', 'event-3', 'event-4']);
const MOCK_REG_IDS = new Set(['reg-demo-1', 'reg-demo-2', 'reg-demo-3']);
const MOCK_CODE_IDS = new Set(['code-1', 'code-2', 'code-3']);

export function getStoredEvents(): ChurchEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_EVENTS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((evt: ChurchEvent) => evt && !MOCK_EVENT_IDS.has(evt.id))
        .map((evt: ChurchEvent) => {
          if (evt.blueprint && (!evt.blueprint.width || evt.blueprint.width < 720)) {
            return {
              ...evt,
              blueprint: {
                ...evt.blueprint,
                width: 720,
                height: evt.blueprint.height || 480
              }
            };
          }
          return evt;
        });
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function saveStoredEvents(events: ChurchEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
    broadcastUpdate('EVENTS_UPDATED', events);

    // Sync to Supabase in background
    if (supabase && events.length > 0) {
      const rows = events.map(eventToRow);
      Promise.resolve(supabase.from('church_events').upsert(rows)).catch((err) =>
        console.warn('Supabase event upsert notice:', err)
      );
    }
  } catch (e) {
    console.error('Failed to save events to storage', e);
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
  if (typeof window === 'undefined') return;
  try {
    const events = getStoredEvents().filter((e) => e.id !== eventId);
    localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
    broadcastUpdate('EVENTS_UPDATED', events);

    if (supabase) {
      Promise.resolve(supabase.from('church_events').delete().eq('id', eventId)).catch((err) =>
        console.warn('Supabase delete event notice:', err)
      );
    }
  } catch (e) {
    console.error('Failed to delete event', e);
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
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_REGISTRATIONS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.filter((r: Registration) => r && !MOCK_REG_IDS.has(r.id)) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredRegistrations(registrations: Registration[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_REGISTRATIONS_KEY, JSON.stringify(registrations));
    broadcastUpdate('REGISTRATIONS_UPDATED', registrations);

    if (supabase && registrations.length > 0) {
      const rows = registrations.map(registrationToRow);
      Promise.resolve(supabase.from('church_registrations').upsert(rows)).catch((err) =>
        console.warn('Supabase registration upsert notice:', err)
      );
    }
  } catch (e) {
    console.error('Failed to save registrations', e);
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
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_CODES_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.filter((c: AdminReservationCode) => c && !MOCK_CODE_IDS.has(c.id)) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredAdminCodes(codes: AdminReservationCode[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_CODES_KEY, JSON.stringify(codes));
    broadcastUpdate('CODES_UPDATED', codes);

    if (supabase && codes.length > 0) {
      const rows = codes.map(codeToRow);
      Promise.resolve(supabase.from('church_admin_codes').upsert(rows)).catch((err) =>
        console.warn('Supabase admin codes upsert notice:', err)
      );
    }
  } catch (e) {
    console.error('Failed to save admin codes', e);
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
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_USER_LIKES_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

export function setUserLikes(likes: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_USER_LIKES_KEY, JSON.stringify(likes));
  } catch (e) {
    console.error('Failed to save user likes', e);
  }
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
