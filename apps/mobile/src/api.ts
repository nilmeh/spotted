import Constants from 'expo-constants';

type EventCard = {
  id: number;
  title: string;
  description?: string | null;
  community?: string | null;
  event_time?: string | null;
  lat?: number | null;
  lng?: number | null;
  status?: string | null;
  distance_km?: number | null;
  score?: number | null;
};

const cfg = Constants.expoConfig?.extra as any;
const API_BASE_URL: string = (cfg?.apiBaseUrl as string) || 'http://localhost:8000';

export async function fetchRecommendations(userId: number, limit = 30): Promise<EventCard[]> {
  const url = `${API_BASE_URL}/recommendations?user_id=${encodeURIComponent(
    userId,
  )}&limit=${encodeURIComponent(limit)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`recommendations failed: ${res.status}`);
  return res.json();
}

export async function swipeEvent(opts: {
  userId: number;
  eventId: number;
  action: 'save' | 'pass' | 'rsvp';
  dwellMs?: number;
}) {
  const url = `${API_BASE_URL}/swipe/event`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: opts.userId,
      event_id: opts.eventId,
      action: opts.action,
      dwell_ms: opts.dwellMs ?? null,
    }),
  });
  if (!res.ok) throw new Error(`swipe event failed: ${res.status}`);
  return res.json();
}

export function getDefaultUserId(): number {
  const id = cfg?.defaultUserId;
  return typeof id === 'number' ? id : 1;
}

import Constants from 'expo-constants';

type EventCard = {
  id: number;
  title: string;
  description?: string | null;
  community?: string | null;
  event_time?: string | null;
  lat?: number | null;
  lng?: number | null;
  status?: string | null;
  distance_km?: number | null;
  score?: number | null;
};

const cfg = Constants.expoConfig?.extra as any;
const API_BASE_URL: string = (cfg?.apiBaseUrl as string) || 'http://localhost:8000';

export async function fetchRecommendations(userId: number, limit = 30): Promise<EventCard[]> {
  const url = `${API_BASE_URL}/recommendations?user_id=${encodeURIComponent(userId)}&limit=${encodeURIComponent(limit)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`recommendations failed: ${res.status}`);
  return res.json();
}

export async function swipeEvent(opts: { userId: number; eventId: number; action: 'save' | 'pass' | 'rsvp'; dwellMs?: number }) {
  const url = `${API_BASE_URL}/swipe/event`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: opts.userId,
      event_id: opts.eventId,
      action: opts.action,
      dwell_ms: opts.dwellMs ?? null,
    }),
  });
  if (!res.ok) throw new Error(`swipe event failed: ${res.status}`);
  return res.json();
}

export function getDefaultUserId(): number {
  const id = cfg?.defaultUserId;
  return typeof id === 'number' ? id : 1;
}


