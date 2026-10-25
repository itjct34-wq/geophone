/**
 * Client for Sherlock-style username hunts.
 * Server probes curated public sites; manual sites are open-link only.
 */

import {
  SHERLOCK_MANUAL_SITES,
  formatSherlockUrl,
  type SherlockSite,
} from '../data/sherlockSites';

export type SherlockHitStatus = 'found' | 'not_found' | 'invalid' | 'error' | 'manual';

export interface SherlockHit {
  name: string;
  url: string;
  status: SherlockHitStatus;
  httpStatus?: number;
  detail?: string;
}

export interface SherlockHuntReport {
  username: string;
  summary: { found: number; not_found: number; other: number; total: number };
  results: SherlockHit[];
  manual: SherlockHit[];
  attribution?: string;
  cliHint?: string;
  error?: string;
}

export function buildManualHits(username: string, sites: SherlockSite[] = SHERLOCK_MANUAL_SITES): SherlockHit[] {
  return sites.map((site) => ({
    name: site.name,
    url: formatSherlockUrl(site.url, username),
    status: 'manual' as const,
    detail: 'Open and verify yourself — this site often blocks automated checks.',
  }));
}

export async function runSherlockHunt(username: string): Promise<SherlockHuntReport> {
  const trimmed = username.trim();
  const manual = buildManualHits(trimmed);

  try {
    const response = await fetch(`/api/sherlock?username=${encodeURIComponent(trimmed)}`, {
      headers: { Accept: 'application/json' },
    });
    const body = (await response.json().catch(() => null)) as {
      username?: string;
      summary?: SherlockHuntReport['summary'];
      results?: SherlockHit[];
      attribution?: string;
      cliHint?: string;
      error?: string;
    } | null;

    if (!response.ok || !body) {
      return {
        username: trimmed,
        summary: { found: 0, not_found: 0, other: 0, total: 0 },
        results: [],
        manual,
        error: body?.error || `Sherlock hunt failed (HTTP ${response.status}).`,
        cliHint: 'pipx install sherlock-project && sherlock ' + trimmed,
      };
    }

    return {
      username: body.username || trimmed,
      summary: body.summary || { found: 0, not_found: 0, other: 0, total: 0 },
      results: body.results || [],
      manual,
      attribution: body.attribution,
      cliHint: body.cliHint,
    };
  } catch {
    return {
      username: trimmed,
      summary: { found: 0, not_found: 0, other: 0, total: 0 },
      results: [],
      manual,
      error: 'Could not reach /api/sherlock. You can still open manual profile links below, or use the local Sherlock CLI.',
      cliHint: `pipx install sherlock-project && sherlock ${trimmed}`,
    };
  }
}
