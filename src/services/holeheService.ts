/**
 * Client for in-app Holehe-style email account checks.
 */

import { fetchWithTimeout } from '../lib/fetchWithTimeout';

const HOLEHE_CLIENT_MS = 28_000;

export interface HoleheHit {
  name: string;
  domain: string;
  exists: boolean | null;
  rateLimit: boolean;
  emailrecovery: string | null;
  phoneNumber: string | null;
  others: Record<string, unknown> | null;
  error?: string;
}

export interface HoleheReport {
  email: string;
  summary: { found: number; not_found: number; unknown: number; total: number };
  results: HoleheHit[];
  attribution?: string;
  cliHint?: string;
  error?: string;
}

export async function runHoleheCheck(email: string, signal?: AbortSignal): Promise<HoleheReport> {
  const trimmed = email.trim().toLowerCase();
  try {
    const response = await fetchWithTimeout(
      `/api/holehe?email=${encodeURIComponent(trimmed)}`,
      { headers: { Accept: 'application/json' }, signal },
      HOLEHE_CLIENT_MS,
    );
    const body = (await response.json().catch(() => null)) as HoleheReport | null;
    if (!body) {
      return {
        email: trimmed,
        summary: { found: 0, not_found: 0, unknown: 0, total: 0 },
        results: [],
        error: `Holehe check failed (HTTP ${response.status}).`,
      };
    }
    if (!response.ok) {
      return {
        email: trimmed,
        summary: { found: 0, not_found: 0, unknown: 0, total: 0 },
        results: body.results || [],
        error: body.error || `HTTP ${response.status}`,
      };
    }
    return body;
  } catch {
    return {
      email: trimmed,
      summary: { found: 0, not_found: 0, unknown: 0, total: 0 },
      results: [],
      error: 'Could not reach /api/holehe. Ensure the API route is running.',
      cliHint: `pip3 install holehe && holehe ${trimmed}`,
    };
  }
}
