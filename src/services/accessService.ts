import { supabase } from '../lib/supabase';

export interface Profile {
  role: 'admin' | 'customer';
  plan: 'free' | 'paid';
  paid_until: string | null;
  disabled: boolean;
}

/** Paid access: the admin always, a customer while their paid period has not ended. */
export function hasPaidAccess(profile: Profile | null, now = Date.now()): boolean {
  if (!profile || profile.disabled) return false;
  if (profile.role === 'admin') return true;
  return profile.plan === 'paid' && !!profile.paid_until && new Date(profile.paid_until).getTime() > now;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, plan, paid_until, disabled')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}

export interface AccessRequest {
  status: 'pending' | 'done';
  note: string;
  created_at: string;
}

/** The customer's latest request for access, if any. */
export async function fetchMyRequest(): Promise<AccessRequest | null> {
  const { data, error } = await supabase
    .from('upgrade_requests')
    .select('status, note, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as AccessRequest | null;
}

export async function requestAccess(note: string): Promise<void> {
  const { error } = await supabase.from('upgrade_requests').insert({ note: note.trim().slice(0, 500) });
  if (error) {
    // The unique index allows one open request at a time
    if (error.code === '23505') throw new Error('You already have a request waiting for the admin.');
    throw new Error(error.message);
  }
}

// ---- Admin ----

export interface CustomerRow {
  user_id: string;
  email: string;
  role: 'admin' | 'customer';
  plan: 'free' | 'paid';
  paid_until: string | null;
  disabled: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  links: number;
  lookups: number;
  request_note: string | null;
  requested_at: string | null;
}

export async function adminListCustomers(): Promise<CustomerRow[]> {
  const { data, error } = await supabase.rpc('admin_list_customers');
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerRow[];
}

export async function adminSetAccess(
  userId: string,
  plan: 'free' | 'paid',
  days: number,
  disabled: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_access', {
    p_user: userId,
    p_plan: plan,
    p_days: days,
    p_disabled: disabled,
  });
  if (error) throw new Error(error.message);
}
