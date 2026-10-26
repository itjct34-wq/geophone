import { supabase } from '../lib/supabase';
import type { LabPayload } from './permissionLabCollectors';
import { generateShortToken } from './shareService';

export interface PermissionLabCampaign {
  id: string;
  token: string;
  label: string;
  created_at: string;
  expires_at: string;
  ended_at: string | null;
}

export interface PermissionLabEvent {
  id: string;
  campaign_id: string;
  created_at: string;
  read_at: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  client_ip: string | null;
  user_agent: string | null;
  payload: LabPayload & Record<string, unknown>;
  campaign?: { token: string; label: string } | null;
}

export function permissionLabUrl(token: string): string {
  return `${window.location.origin}/lab/${token}`;
}

export async function createPermissionLabCampaign(label: string, days = 7): Promise<PermissionLabCampaign> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to create a permission-lab link.');

  const expires = new Date();
  expires.setDate(expires.getDate() + Math.min(30, Math.max(1, days)));

  const { data, error } = await supabase
    .from('permission_lab_campaigns')
    .insert({
      owner_id: user.id,
      token: generateShortToken(12),
      label: label.trim() || 'Permission lab',
      expires_at: expires.toISOString(),
    })
    .select('id, token, label, created_at, expires_at, ended_at')
    .single();

  if (error) throw new Error(error.message);
  return data as PermissionLabCampaign;
}

export async function listPermissionLabCampaigns(): Promise<PermissionLabCampaign[]> {
  const { data, error } = await supabase
    .from('permission_lab_campaigns')
    .select('id, token, label, created_at, expires_at, ended_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as PermissionLabCampaign[];
}

export async function endPermissionLabCampaign(id: string): Promise<void> {
  const { error } = await supabase
    .from('permission_lab_campaigns')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listPermissionLabEvents(opts?: {
  campaignId?: string;
  unreadOnly?: boolean;
}): Promise<PermissionLabEvent[]> {
  let q = supabase
    .from('permission_lab_events')
    .select(
      'id, campaign_id, created_at, read_at, lat, lng, accuracy, client_ip, user_agent, payload, campaign:permission_lab_campaigns(token, label)',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (opts?.campaignId) q = q.eq('campaign_id', opts.campaignId);
  if (opts?.unreadOnly) q = q.is('read_at', null);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PermissionLabEvent[];
}

export async function markPermissionLabEventRead(id: string, read = true): Promise<void> {
  const { error } = await supabase
    .from('permission_lab_events')
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export interface LabInfo {
  state: 'active' | 'ended' | 'expired' | 'invalid';
  label?: string;
  expires_at?: string;
}

export async function fetchPermissionLabInfo(token: string): Promise<LabInfo> {
  const { data, error } = await supabase.rpc('permission_lab_info', { p_token: token });
  if (error) throw new Error(error.message);
  return data as LabInfo;
}

export async function submitPermissionLabPayload(
  token: string,
  payload: LabPayload,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase.rpc('permission_lab_submit', {
    p_token: token,
    p_payload: payload as unknown as Record<string, unknown>,
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; id?: string; error?: string };
}
