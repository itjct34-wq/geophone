/**
 * Client for /api/osint multi-provider gateway (server keys + Postgres cache).
 */

import { fetchWithTimeout } from '../lib/fetchWithTimeout';

const OSINT_CLIENT_MS = 20_000;

export type OsintProviderId =
  | 'ipapi'
  | 'abuseipdb'
  | 'macvendors'
  | 'breachdirectory'
  | 'hunter'
  | 'virustotal'
  | 'apivoid'
  | 'otx'
  | 'wigle'
  | 'nominatim'
  | 'shodan';

export interface OsintProviderResponse {
  provider?: string;
  configured?: boolean;
  cached?: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

export async function callOsintProvider(
  provider: OsintProviderId,
  q: string,
  extras?: { kind?: string; mode?: string },
): Promise<OsintProviderResponse> {
  const params = new URLSearchParams({ provider, q });
  if (extras?.kind) params.set('kind', extras.kind);
  if (extras?.mode) params.set('mode', extras.mode);
  try {
    const response = await fetchWithTimeout(
      `/api/osint?${params.toString()}`,
      { headers: { Accept: 'application/json' } },
      OSINT_CLIENT_MS,
    );
    const body = (await response.json().catch(() => null)) as OsintProviderResponse | null;
    if (!body) {
      return { provider, error: `OSINT proxy HTTP ${response.status}` };
    }
    if (!response.ok && body.error) return { ...body, provider };
    return { ...body, provider: body.provider || provider };
  } catch (err) {
    return {
      provider,
      error: err instanceof Error ? err.message : 'Could not reach /api/osint.',
    };
  }
}

/** Parallel IP enrichment used by IP map tracker + SpiderFoot. */
export async function enrichIp(ip: string): Promise<{
  ipapi: OsintProviderResponse;
  abuseipdb: OsintProviderResponse;
  otx: OsintProviderResponse;
  virustotal: OsintProviderResponse;
  shodan: OsintProviderResponse;
}> {
  const [ipapi, abuseipdb, otx, virustotal, shodan] = await Promise.all([
    callOsintProvider('ipapi', ip),
    callOsintProvider('abuseipdb', ip),
    callOsintProvider('otx', ip, { kind: 'ip' }),
    callOsintProvider('virustotal', ip, { kind: 'ip' }),
    callOsintProvider('shodan', ip, { mode: 'host' }),
  ]);
  return { ipapi, abuseipdb, otx, virustotal, shodan };
}

export async function enrichEmail(email: string): Promise<{
  breachdirectory: OsintProviderResponse;
  hunter: OsintProviderResponse;
}> {
  const domain = email.split('@')[1] || '';
  const [breachdirectory, hunter] = await Promise.all([
    callOsintProvider('breachdirectory', email),
    domain ? callOsintProvider('hunter', domain) : Promise.resolve({ provider: 'hunter', configured: false, message: 'No domain' }),
  ]);
  return { breachdirectory, hunter };
}

export async function enrichDomain(domain: string): Promise<{
  hunter: OsintProviderResponse;
  virustotal: OsintProviderResponse;
  apivoid: OsintProviderResponse;
  otx: OsintProviderResponse;
  nominatim: OsintProviderResponse;
}> {
  const [hunter, virustotal, apivoid, otx, nominatim] = await Promise.all([
    callOsintProvider('hunter', domain),
    callOsintProvider('virustotal', domain, { kind: 'domain' }),
    callOsintProvider('apivoid', domain, { kind: 'domain' }),
    callOsintProvider('otx', domain, { kind: 'domain' }),
    callOsintProvider('nominatim', domain, { kind: 'search' }),
  ]);
  return { hunter, virustotal, apivoid, otx, nominatim };
}
