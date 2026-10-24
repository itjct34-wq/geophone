import { supabase } from '../lib/supabase';
import type { PhoneLookupResult } from '../types/phone';

export interface HistoryEntry {
  id: string;
  raw_input: string;
  e164: string | null;
  carrier: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface BatchList {
  id: string;
  name: string;
  numbers: string[];
  updated_at: string;
}

export async function addHistory(result: PhoneLookupResult): Promise<void> {
  const { error } = await supabase.from('lookup_history').insert({
    raw_input: result.rawInput,
    e164: result.e164 ?? null,
    carrier: result.carrier,
    region: result.regionOrCity,
    lat: result.coordinates.lat,
    lng: result.coordinates.lng,
  });
  if (error) throw new Error(error.message);
}

export async function listHistory(limit = 100): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('lookup_history')
    .select('id, raw_input, e164, carrier, region, lat, lng, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteHistory(id: string): Promise<void> {
  const { error } = await supabase.from('lookup_history').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function clearHistory(): Promise<void> {
  // RLS limits this to the signed-in user's rows.
  const { error } = await supabase.from('lookup_history').delete().not('id', 'is', null);
  if (error) throw new Error(error.message);
}

export async function listBatchLists(): Promise<BatchList[]> {
  const { data, error } = await supabase
    .from('batch_lists')
    .select('id, name, numbers, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveBatchList(name: string, numbers: string[]): Promise<void> {
  const { error } = await supabase.from('batch_lists').insert({ name, numbers });
  if (error) throw new Error(error.message);
}

export async function deleteBatchList(id: string): Promise<void> {
  const { error } = await supabase.from('batch_lists').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
