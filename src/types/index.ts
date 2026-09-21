export type Language = 'ar' | 'en' | 'fr';

export type EventType = 'open' | 'registration_required';

export interface SeatingElement {
  id: string;
  type: 'chair' | 'table_round' | 'table_rect' | 'label';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  capacity: number; // 1 for chair, 2-12 for tables
}

export interface SeatingBlueprint {
  width: number;
  height: number;
  perimeterPoints?: { x: number; y: number }[];
  elements: SeatingElement[];
}

export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  time: string;
  location: string;
  type: EventType;
  isPaid: boolean;
  views: number;
  likes: number;
  blueprint?: SeatingBlueprint;
  createdAt: string;
}

export interface Registration {
  id: string;
  eventId: string;
  userName: string;
  userPhone: string;
  partySize: number;
  elementId?: string;
  elementLabel?: string;
  isPaid: boolean;
  codeUsed?: string;
  registeredAt: string;
}

export interface AdminReservationCode {
  id: string;
  code: string; // 8 digits
  eventId: string;
  userName: string;
  partySize: number;
  claimed: boolean;
  elementId?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  role: string;
  createdAt: string;
}
