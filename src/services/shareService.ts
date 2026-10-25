import { supabase } from '../lib/supabase';

export interface ShareSession {
  id: string;
  token: string;
  label: string;
  requested_by: string;
  created_at: string;
  expires_at: string;
  ended_at: string | null;
  started_at: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_accuracy: number | null;
  last_at: string | null;
}

export type ShareState = 'waiting' | 'live' | 'stale' | 'ended' | 'expired';

const COLUMNS =
  'id, token, label, requested_by, created_at, expires_at, ended_at, started_at, last_lat, last_lng, last_accuracy, last_at';

/** A share counts as live if a position arrived in the last 30 seconds. */
export function shareState(s: ShareSession, now = Date.now()): ShareState {
  if (s.ended_at) return 'ended';
  if (new Date(s.expires_at).getTime() <= now) return 'expired';
  if (!s.last_at) return 'waiting';
  return now - new Date(s.last_at).getTime() <= 30_000 ? 'live' : 'stale';
}

/** Short link, for example https://geophone-alpha.vercel.app/s/k7Qm2xW9tRpB */
export function shareUrl(token: string): string {
  return `${window.location.origin}/s/${token}`;
}

// Letters and digits that cannot be confused when read aloud or retyped (no 0/O, 1/l/I)
const TOKEN_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * A short random code for the link. 12 characters from a 55-letter alphabet is about
 * 69 bits, far more than can be guessed within the link's 24 hours.
 */
export function generateShortToken(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
  let out = '';
  for (const b of bytes) {
    if (b >= 255 - (255 % TOKEN_ALPHABET.length)) continue; // avoid modulo bias
    out += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
    if (out.length === length) break;
  }
  return out.length === length ? out : generateShortToken(length);
}

// ---- Owner side (signed in) ----

export async function createShare(label: string, requestedBy: string, phoneE164?: string): Promise<ShareSession> {
  const { data, error } = await supabase
    .from('share_sessions')
    .insert({ token: generateShortToken(), label, requested_by: requestedBy, phone_e164: phoneE164 ?? null })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listShares(): Promise<ShareSession[]> {
  const { data, error } = await supabase
    .from('share_sessions')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function endShare(id: string): Promise<void> {
  const { error } = await supabase
    .from('share_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteShare(id: string): Promise<void> {
  const { error } = await supabase.from('share_sessions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Person being asked (no account; acts only through the secret token) ----

export interface ShareInfo {
  state: 'active' | 'ended' | 'expired' | 'invalid';
  requested_by?: string;
  expires_at?: string;
}

export async function fetchShareInfo(token: string): Promise<ShareInfo> {
  const { data, error } = await supabase.rpc('share_info', { p_token: token });
  if (error) throw new Error(error.message);
  return data as ShareInfo;
}

export async function postSharePosition(
  token: string,
  lat: number,
  lng: number,
  accuracy: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('share_post', {
    p_token: token,
    p_lat: lat,
    p_lng: lng,
    p_accuracy: accuracy,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function stopSharing(token: string): Promise<void> {
  const { error } = await supabase.rpc('share_stop', { p_token: token });
  if (error) throw new Error(error.message);
}

/** Details the person chose to share on the consent page (all optional). */
export interface SharedInfo {
  name?: string;
  device?: string;
  language?: string;
  timezone?: string;
  connection?: string;
}

export async function sendShareInfo(token: string, info: SharedInfo): Promise<boolean> {
  const { data, error } = await supabase.rpc('share_set_info', { p_token: token, p_info: info });
  if (error) throw new Error(error.message);
  return Boolean(data);
}