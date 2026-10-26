import { supabase } from '../lib/supabase';
import { shareState, type ShareSession, type ShareState, type SharedInfo } from './shareService';

export interface LookupStats {
  count: number;
  firstAt: string | null;
  lastAt: string | null;
}

export interface NumberShare {
  id: string;
  label: string;
  createdAt: string;
  state: ShareState;
  lastAt: string | null;
  /** Extra details the person chose to share on the consent page. */
  info: SharedInfo | null;
}

/** How often the signed-in user has looked this number up, from their own history. */
export async function getLookupStats(e164: string): Promise<LookupStats> {
  const { data, error } = await supabase
    .from('lookup_history')
    .select('created_at')
    .eq('e164', e164)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return {
    count: rows.length,
    firstAt: rows[0]?.created_at ?? null,
    lastAt: rows[rows.length - 1]?.created_at ?? null,
  };
}

/** Consent links the signed-in user created for this number, newest first. */
export async function getSharesForNumber(e164: string): Promise<NumberShare[]> {
  const { data, error } = await supabase
    .from('share_sessions')
    .select('id, token, label, requested_by, created_at, expires_at, ended_at, started_at, last_lat, last_lng, last_accuracy, last_at, shared_info')
    .eq('phone_e164', e164)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const s = row as ShareSession & { shared_info: SharedInfo | null };
    return {
      id: s.id,
      label: s.label,
      createdAt: s.created_at,
      state: shareState(s),
      lastAt: s.last_at,
      info: s.shared_info,
    };
  });
}
