import { supabase } from '../lib/supabase';

export interface LastKnownLocation {
  lat: number;
  lng: number;
  accuracy: number | null;
  at: string;
  label: string;
  /** True while the person's page is still sending positions. */
  live: boolean;
}

const LIVE_WINDOW_MS = 30_000;

/**
 * The most recent position that someone shared for this phone number through a
 * consent link the signed-in user created. Returns null when nobody has shared.
 */
export async function getLastKnownLocation(e164: string): Promise<LastKnownLocation | null> {
  const { data, error } = await supabase
    .from('share_sessions')
    .select('last_lat, last_lng, last_accuracy, last_at, label, ended_at')
    .eq('phone_e164', e164)
    .not('last_at', 'is', null)
    .order('last_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.last_lat === null || data.last_lng === null || !data.last_at) return null;

  return {
    lat: data.last_lat,
    lng: data.last_lng,
    accuracy: data.last_accuracy,
    at: data.last_at,
    label: data.label,
    live: !data.ended_at && Date.now() - new Date(data.last_at).getTime() <= LIVE_WINDOW_MS,
  };
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} hour${h === 1 ? '' : 's'} ago`;
  return `${Math.round(h / 24)} days ago`;
}
