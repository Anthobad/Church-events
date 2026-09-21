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

// Initial Seed Data
const initialEvents: ChurchEvent[] = [
  {
    id: 'event-1',
    title: 'عشاء المحبة السنوي ورسالة القيامة | Annual Parish Agape Dinner',
    description: 'ندعو جميع العائلات وأبناء الرعية للمشاركة في عشاء المحبة الأخوي المبارك. يتضمن الحفل كلمة راعي الكنيسة، عروض كورال الأطفال، وتكريم المتطوعين. يرجى التنسيق مع الإدارة لتأكيد الحجز.',
    imageUrl: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&q=80',
    date: '2026-04-18',
    time: '19:30',
    location: 'قاعة القديس بولس الكبرى - مجمع الكنيسة',
    type: 'registration_required',
    isPaid: true,
    views: 142,
    likes: 38,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    blueprint: {
      width: 720,
      height: 480,
      perimeterPoints: [
        { x: 8, y: 8 },
        { x: 712, y: 8 },
        { x: 712, y: 472 },
        { x: 8, y: 472 }
      ],
      elements: [
        { id: 't-1', type: 'table_round', x: 120, y: 110, width: 80, height: 80, label: 'طاولة 1 (VIP)', capacity: 4 },
        { id: 't-2', type: 'table_round', x: 270, y: 110, width: 80, height: 80, label: 'طاولة 2', capacity: 4 },
        { id: 't-3', type: 'table_round', x: 420, y: 110, width: 80, height: 80, label: 'طاولة 3', capacity: 4 },
        { id: 't-4', type: 'table_round', x: 560, y: 110, width: 80, height: 80, label: 'طاولة 4', capacity: 4 },
        { id: 't-5', type: 'table_rect', x: 150, y: 250, width: 140, height: 80, label: 'طاولة العائلات A', capacity: 6 },
        { id: 't-6', type: 'table_rect', x: 380, y: 250, width: 140, height: 80, label: 'طاولة العائلات B', capacity: 6 },
        { id: 't-7', type: 'table_round', x: 200, y: 380, width: 90, height: 90, label: 'طاولة الرعاة', capacity: 8 },
        { id: 't-8', type: 'table_round', x: 440, y: 380, width: 90, height: 90, label: 'طاولة الشباب', capacity: 8 },
        { id: 'lbl-stage', type: 'label', x: 350, y: 40, width: 160, height: 30, label: 'منصة التكريم والكورال (Stage)', capacity: 0 }
      ]
    }
  },
  {
    id: 'event-2',
    title: 'أمسية ترانيم جوقة الرجاء الروحية | Choir Recital of Hope',
    description: 'أمسية صلاة وتأمل تحييها جوقة شبيبة الكنيسة مع تراتيل شرقية وغربية وألحان كنسية تراثية. الدخول مجاني مع ضرورة حجز المقاعد مسبقاً لضمان الأماكن.',
    imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
    date: '2026-04-24',
    time: '18:00',
    location: 'كنيسة البشارة - الصحن الرئيسي',
    type: 'registration_required',
    isPaid: false,
    views: 215,
    likes: 64,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    blueprint: {
      width: 720,
      height: 480,
      perimeterPoints: [
        { x: 8, y: 8 },
        { x: 712, y: 8 },
        { x: 712, y: 472 },
        { x: 8, y: 472 }
      ],
      elements: [
        { id: 'c-a1', type: 'chair', x: 100, y: 130, width: 44, height: 44, label: 'A1', capacity: 1 },
        { id: 'c-a2', type: 'chair', x: 160, y: 130, width: 44, height: 44, label: 'A2', capacity: 1 },
        { id: 'c-a3', type: 'chair', x: 220, y: 130, width: 44, height: 44, label: 'A3', capacity: 1 },
        { id: 'c-a4', type: 'chair', x: 280, y: 130, width: 44, height: 44, label: 'A4', capacity: 1 },
        { id: 'c-a5', type: 'chair', x: 360, y: 130, width: 44, height: 44, label: 'A5', capacity: 1 },
        { id: 'c-a6', type: 'chair', x: 420, y: 130, width: 44, height: 44, label: 'A6', capacity: 1 },
        { id: 'c-a7', type: 'chair', x: 480, y: 130, width: 44, height: 44, label: 'A7', capacity: 1 },
        { id: 'c-a8', type: 'chair', x: 540, y: 130, width: 44, height: 44, label: 'A8', capacity: 1 },

        { id: 'c-b1', type: 'chair', x: 100, y: 200, width: 44, height: 44, label: 'B1', capacity: 1 },
        { id: 'c-b2', type: 'chair', x: 160, y: 200, width: 44, height: 44, label: 'B2', capacity: 1 },
        { id: 'c-b3', type: 'chair', x: 220, y: 200, width: 44, height: 44, label: 'B3', capacity: 1 },
        { id: 'c-b4', type: 'chair', x: 280, y: 200, width: 44, height: 44, label: 'B4', capacity: 1 },
        { id: 'c-b5', type: 'chair', x: 360, y: 200, width: 44, height: 44, label: 'B5', capacity: 1 },
        { id: 'c-b6', type: 'chair', x: 420, y: 200, width: 44, height: 44, label: 'B6', capacity: 1 },
        { id: 'c-b7', type: 'chair', x: 480, y: 200, width: 44, height: 44, label: 'B7', capacity: 1 },
        { id: 'c-b8', type: 'chair', x: 540, y: 200, width: 44, height: 44, label: 'B8', capacity: 1 },

        { id: 'c-c1', type: 'chair', x: 100, y: 270, width: 44, height: 44, label: 'C1', capacity: 1 },
        { id: 'c-c2', type: 'chair', x: 160, y: 270, width: 44, height: 44, label: 'C2', capacity: 1 },
        { id: 'c-c3', type: 'chair', x: 220, y: 270, width: 44, height: 44, label: 'C3', capacity: 1 },
        { id: 'c-c4', type: 'chair', x: 280, y: 270, width: 44, height: 44, label: 'C4', capacity: 1 },
        { id: 'c-c5', type: 'chair', x: 360, y: 270, width: 44, height: 44, label: 'C5', capacity: 1 },
        { id: 'c-c6', type: 'chair', x: 420, y: 270, width: 44, height: 44, label: 'C6', capacity: 1 },
        { id: 'c-c7', type: 'chair', x: 480, y: 270, width: 44, height: 44, label: 'C7', capacity: 1 },
        { id: 'c-c8', type: 'chair', x: 540, y: 270, width: 44, height: 44, label: 'C8', capacity: 1 },

        { id: 'lbl-altar', type: 'label', x: 320, y: 50, width: 220, height: 32, label: 'مذبح الكنيسة ومنصة المرنمين', capacity: 0 }
      ]
    }
  },
  {
    id: 'event-3',
    title: 'الخلوة الروحية السنوية للعائلات | Annual Family Spiritual Retreat',
    description: 'يوم روحي كامل يتخلله قداس إلهي، محاضرات إرشادية حول التربية المسيحية وتحديات العصر، وبرامج ترفيهية وتعليمية خاصة بالأطفال والناشئة. الدعوة عامة ومفتوحة للجميع.',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    date: '2026-05-02',
    time: '09:00',
    location: 'دير مار إلياس - الجبل الأخضر',
    type: 'open',
    isPaid: false,
    views: 98,
    likes: 29,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
  },
  {
    id: 'event-4',
    title: 'معرض الرعية الخيري ومهرجان المحبة | Parish Charity Festival',
    description: 'بازار ريعي يعود ريعه بالكامل لدعم العائلات المستورة والمرضى في رعية الكنيسة. يشمل مأكولات منزلية، أعمال يدوية، كتب، وألعاب وهدايا للأطفال. مفتوح لجميع أبناء المنطقة.',
    imageUrl: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=800&q=80',
    date: '2026-05-15',
    time: '11:00',
    location: 'ساحة الكنيسة الخارجية والحديقة',
    type: 'open',
    isPaid: false,
    views: 76,
    likes: 21,
    createdAt: new Date().toISOString()
  }
];

const initialRegistrations: Registration[] = [
  {
    id: 'reg-demo-1',
    eventId: 'event-1',
    userName: 'عائلة الخوري الياس',
    userPhone: '+961 70 123456',
    partySize: 4,
    elementId: 't-1',
    elementLabel: 'طاولة 1 (VIP)',
    isPaid: true,
    codeUsed: '84920173',
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: 'reg-demo-2',
    eventId: 'event-1',
    userName: 'عائلة نجار',
    userPhone: '+961 03 456789',
    partySize: 3,
    elementId: 't-5',
    elementLabel: 'طاولة العائلات A',
    isPaid: true,
    codeUsed: '55129481',
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
  },
  {
    id: 'reg-demo-3',
    eventId: 'event-2',
    userName: 'ماري سركيس',
    userPhone: '+961 71 889900',
    partySize: 1,
    elementId: 'c-a1',
    elementLabel: 'A1',
    isPaid: false,
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  }
];

const initialCodes: AdminReservationCode[] = [
  {
    id: 'code-1',
    code: '84920173',
    eventId: 'event-1',
    userName: 'عائلة الخوري الياس',
    partySize: 4,
    claimed: true,
    elementId: 't-1',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
  },
  {
    id: 'code-2',
    code: '55129481',
    eventId: 'event-1',
    userName: 'عائلة نجار',
    partySize: 3,
    claimed: true,
    elementId: 't-5',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
  },
  {
    id: 'code-3',
    code: '19472658',
    eventId: 'event-1',
    userName: 'طوني حداد (مدفوع)',
    partySize: 2,
    claimed: false,
    createdAt: new Date().toISOString()
  }
];

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
export async function syncFromSupabase(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const [eventsRes, regsRes, codesRes] = await Promise.all([
      supabase.from('church_events').select('*').order('created_at', { ascending: false }),
      supabase.from('church_registrations').select('*'),
      supabase.from('church_admin_codes').select('*')
    ]);

    let changed = false;

    if (!eventsRes.error && eventsRes.data && eventsRes.data.length > 0) {
      const parsedEvents = eventsRes.data.map(rowToEvent);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(parsedEvents));
      }
      changed = true;
    }

    if (!regsRes.error && regsRes.data) {
      const parsedRegs = regsRes.data.map(rowToRegistration);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_REGISTRATIONS_KEY, JSON.stringify(parsedRegs));
      }
      changed = true;
    }

    if (!codesRes.error && codesRes.data) {
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

export function getStoredEvents(): ChurchEvent[] {
  if (typeof window === 'undefined') return initialEvents;
  try {
    const data = localStorage.getItem(STORAGE_EVENTS_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(initialEvents));
      return initialEvents;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((evt: ChurchEvent) => {
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
    return initialEvents;
  } catch (e) {
    return initialEvents;
  }
}

export function saveStoredEvents(events: ChurchEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
    broadcastUpdate('EVENTS_UPDATED', events);

    // Sync to Supabase in background
    if (supabase) {
      const rows = events.map(eventToRow);
      Promise.resolve(supabase.from('church_events').upsert(rows)).catch((err) =>
        console.warn('Supabase event upsert notice:', err)
      );
    }
  } catch (e) {
    console.error('Failed to save events to storage', e);
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

export function getStoredRegistrations(): Registration[] {
  if (typeof window === 'undefined') return initialRegistrations;
  try {
    const data = localStorage.getItem(STORAGE_REGISTRATIONS_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_REGISTRATIONS_KEY, JSON.stringify(initialRegistrations));
      return initialRegistrations;
    }
    return JSON.parse(data);
  } catch (e) {
    return initialRegistrations;
  }
}

export function saveStoredRegistrations(registrations: Registration[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_REGISTRATIONS_KEY, JSON.stringify(registrations));
    broadcastUpdate('REGISTRATIONS_UPDATED', registrations);

    if (supabase) {
      const rows = registrations.map(registrationToRow);
      Promise.resolve(supabase.from('church_registrations').upsert(rows)).catch((err) =>
        console.warn('Supabase registration upsert notice:', err)
      );
    }
  } catch (e) {
    console.error('Failed to save registrations', e);
  }
}

export function getStoredAdminCodes(): AdminReservationCode[] {
  if (typeof window === 'undefined') return initialCodes;
  try {
    const data = localStorage.getItem(STORAGE_CODES_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_CODES_KEY, JSON.stringify(initialCodes));
      return initialCodes;
    }
    return JSON.parse(data);
  } catch (e) {
    return initialCodes;
  }
}

export function saveStoredAdminCodes(codes: AdminReservationCode[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_CODES_KEY, JSON.stringify(codes));
    broadcastUpdate('CODES_UPDATED', codes);

    if (supabase) {
      const rows = codes.map(codeToRow);
      Promise.resolve(supabase.from('church_admin_codes').upsert(rows)).catch((err) =>
        console.warn('Supabase admin codes upsert notice:', err)
      );
    }
  } catch (e) {
    console.error('Failed to save admin codes', e);
  }
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
