/**
 * PhoneInfoga-style OSINT helpers inspired by the open-source project
 * https://github.com/sundowndev/phoneinfoga (public README / scanner model).
 *
 * Parity is intentional at a high level only:
 * - local number parse / country / carrier / line type (libphonenumber)
 * - search-engine footprint links (same class as PhoneInfoga google/ddg scanners)
 * - optional keyed public APIs (Numverify-class) via /api/phone-scan
 *
 * This module does not scrape private apps, bypass paywalls, or claim live tracking.
 */

import { parsePhoneNumber } from './phoneParser';
import type { PhoneLookupResult } from '../types/phone';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';

const PHONE_SCAN_CLIENT_MS = 22_000;

export type FootprintEngine = 'Google' | 'Bing' | 'DuckDuckGo';

export interface FootprintLink {
  engine: FootprintEngine;
  label: string;
  url: string;
}

export interface ScannerResultRow {
  id: string;
  name: string;
  status: 'ok' | 'partial' | 'skipped' | 'error';
  summary: string;
  details?: Record<string, string | number | boolean | null>;
  attribution?: string;
}

export interface PhoneInfogaScanReport {
  number: PhoneLookupResult;
  footprints: FootprintLink[];
  scanners: ScannerResultRow[];
  scannedAt: string;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function searchUrl(engine: FootprintEngine, query: string): string {
  const q = encodeURIComponent(query);
  switch (engine) {
    case 'Google':
      return `https://www.google.com/search?q=${q}`;
    case 'Bing':
      return `https://www.bing.com/search?q=${q}`;
    case 'DuckDuckGo':
      return `https://duckduckgo.com/?q=${q}`;
    default: {
      const _exhaustive: never = engine;
      return _exhaustive;
    }
  }
}

/** Build public search-engine footprint URLs for common phone formats (PhoneInfoga-style). */
export function buildFootprintLinks(result: PhoneLookupResult): FootprintLink[] {
  if (!result.isValid || !result.e164) return [];

  const e164 = result.e164;
  const intl = result.international ?? e164;
  const national = result.national ?? '';
  const bare = digitsOnly(e164);
  const queries = [
    { label: 'Exact E.164', query: `"${e164}"` },
    { label: 'International format', query: `"${intl}"` },
    { label: 'National format', query: national ? `"${national}"` : `"${bare}"` },
    { label: 'Digits only', query: `"${bare}"` },
    {
      label: 'Reputation / spam mentions',
      query: `"${e164}" OR "${bare}" (spam OR scam OR "who called" OR "phone number")`,
    },
  ];

  const engines: FootprintEngine[] = ['Google', 'Bing', 'DuckDuckGo'];
  const links: FootprintLink[] = [];
  for (const item of queries) {
    for (const engine of engines) {
      links.push({
        engine,
        label: `${item.label} · ${engine}`,
        url: searchUrl(engine, item.query),
      });
    }
  }
  return links;
}

function localScannerRows(result: PhoneLookupResult): ScannerResultRow[] {
  if (!result.isValid) {
    return [
      {
        id: 'local',
        name: 'Local (libphonenumber)',
        status: 'error',
        summary: 'Number could not be parsed as a valid phone number.',
        attribution: 'libphonenumber-js',
      },
    ];
  }

  return [
    {
      id: 'local',
      name: 'Local (libphonenumber)',
      status: 'ok',
      summary: `${result.e164} · ${result.countryName} · ${result.carrier} · ${result.lineType}`,
      details: {
        e164: result.e164 ?? null,
        country: result.countryCode ?? null,
        callingCode: result.countryCallingCode ?? null,
        region: result.regionOrCity,
        carrier: result.carrier,
        lineType: result.lineType,
        mccMnc: result.mccMnc ?? null,
        possible: result.isPossible,
      },
      attribution: 'libphonenumber-js + GeoPhone carrier tables',
    },
    {
      id: 'line_hints',
      name: 'Line-type hints',
      status: result.lineType === 'UNKNOWN' ? 'partial' : 'ok',
      summary:
        result.lineType === 'VOIP'
          ? 'Number type looks like VoIP / non-geographic. Useful for disposable-number checks.'
          : result.lineType === 'TOLL_FREE'
            ? 'Toll-free / special-service line type.'
            : `Reported line type: ${result.lineType}.`,
      details: { lineType: result.lineType },
      attribution: 'libphonenumber type classification',
    },
  ];
}

export interface RemoteScanPayload {
  providers?: {
    numverify?: {
      configured: boolean;
      valid?: boolean;
      number?: string;
      local_format?: string;
      international_format?: string;
      country_name?: string;
      country_code?: string;
      location?: string;
      carrier?: string;
      line_type?: string;
      error?: string;
    };
    abstractapi?: {
      configured: boolean;
      valid?: boolean;
      phone?: string;
      country?: string;
      carrier?: string;
      type?: string;
      error?: string;
    };
    ovh?: {
      attempted: boolean;
      matched?: boolean;
      city?: string;
      zip?: string;
      number?: string;
      error?: string;
    };
  };
  error?: string;
}

/** Merge local + optional remote provider results into a PhoneInfoga-style report. */
export function buildScanReport(
  rawInput: string,
  remote?: RemoteScanPayload | null,
): PhoneInfogaScanReport {
  const number = parsePhoneNumber(rawInput);
  const scanners = localScannerRows(number);
  const providers = remote?.providers;

  if (providers?.numverify) {
    const n = providers.numverify;
    if (!n.configured) {
      scanners.push({
        id: 'numverify',
        name: 'Numverify',
        status: 'skipped',
        summary: 'NUMVERIFY_API_KEY is not set. Add it to enable this public validation API.',
        attribution: 'apilayer Numverify',
      });
    } else if (n.error) {
      scanners.push({
        id: 'numverify',
        name: 'Numverify',
        status: 'error',
        summary: n.error,
        attribution: 'apilayer Numverify',
      });
    } else {
      scanners.push({
        id: 'numverify',
        name: 'Numverify',
        status: n.valid ? 'ok' : 'partial',
        summary: n.valid
          ? `${n.international_format ?? n.number} · ${n.carrier || 'carrier n/a'} · ${n.line_type || 'type n/a'}`
          : 'Provider marked this number as invalid or incomplete.',
        details: {
          valid: n.valid ?? false,
          country: n.country_name ?? null,
          location: n.location ?? null,
          carrier: n.carrier ?? null,
          line_type: n.line_type ?? null,
        },
        attribution: 'apilayer Numverify',
      });
    }
  }

  if (providers?.abstractapi) {
    const a = providers.abstractapi;
    if (!a.configured) {
      scanners.push({
        id: 'abstractapi',
        name: 'AbstractAPI Phone',
        status: 'skipped',
        summary: 'ABSTRACTAPI_PHONE_KEY is not set. Add it for carrier / type enrichment.',
        attribution: 'AbstractAPI Phone Validation',
      });
    } else if (a.error) {
      scanners.push({
        id: 'abstractapi',
        name: 'AbstractAPI Phone',
        status: 'error',
        summary: a.error,
        attribution: 'AbstractAPI Phone Validation',
      });
    } else {
      scanners.push({
        id: 'abstractapi',
        name: 'AbstractAPI Phone',
        status: a.valid ? 'ok' : 'partial',
        summary: a.valid
          ? `${a.phone} · ${a.carrier || 'carrier n/a'} · ${a.type || 'type n/a'}`
          : 'Provider did not confirm the number as valid.',
        details: {
          valid: a.valid ?? false,
          country: a.country ?? null,
          carrier: a.carrier ?? null,
          type: a.type ?? null,
        },
        attribution: 'AbstractAPI Phone Validation',
      });
    }
  }

  if (providers?.ovh) {
    const o = providers.ovh;
    if (!o.attempted) {
      scanners.push({
        id: 'ovh',
        name: 'OVH Telecom zones',
        status: 'skipped',
        summary: 'OVH detailed-zones lookup applies mainly to FR numbers; skipped for this country.',
        attribution: 'OVH api.ovh.com (public)',
      });
    } else if (o.error) {
      scanners.push({
        id: 'ovh',
        name: 'OVH Telecom zones',
        status: 'error',
        summary: o.error,
        attribution: 'OVH api.ovh.com (public)',
      });
    } else {
      scanners.push({
        id: 'ovh',
        name: 'OVH Telecom zones',
        status: o.matched ? 'ok' : 'partial',
        summary: o.matched
          ? `Matched OVH zone: ${[o.city, o.zip].filter(Boolean).join(', ') || o.number || 'zone found'}`
          : 'No OVH detailed zone matched this number.',
        details: {
          city: o.city ?? null,
          zip: o.zip ?? null,
          number: o.number ?? null,
        },
        attribution: 'OVH api.ovh.com (public)',
      });
    }
  }

  if (remote?.error) {
    scanners.push({
      id: 'remote_proxy',
      name: 'Remote scanners proxy',
      status: 'error',
      summary: remote.error,
      attribution: '/api/phone-scan',
    });
  }

  scanners.push({
    id: 'footprints',
    name: 'Search footprints',
    status: number.isValid ? 'ok' : 'skipped',
    summary: number.isValid
      ? `${buildFootprintLinks(number).length} public search links prepared. Open them yourself — GeoPhone does not scrape SERP HTML.`
      : 'Skipped until a valid number is provided.',
    attribution: 'PhoneInfoga-style public search dorks',
  });

  return {
    number,
    footprints: buildFootprintLinks(number),
    scanners,
    scannedAt: new Date().toISOString(),
  };
}

/** Call the server proxy for keyed / CORS-bound public phone APIs. */
export async function fetchRemotePhoneScan(
  e164: string,
  signal?: AbortSignal,
): Promise<RemoteScanPayload | null> {
  try {
    const response = await fetchWithTimeout(
      `/api/phone-scan?number=${encodeURIComponent(e164)}`,
      { headers: { Accept: 'application/json' }, signal },
      PHONE_SCAN_CLIENT_MS,
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return { error: body?.error || `Remote scan HTTP ${response.status}` };
    }
    return (await response.json()) as RemoteScanPayload;
  } catch {
    return { error: 'Could not reach /api/phone-scan. Local scanners still work.' };
  }
}

export async function runPhoneInfogaStyleScan(
  rawInput: string,
  signal?: AbortSignal,
): Promise<PhoneInfogaScanReport> {
  const local = parsePhoneNumber(rawInput);
  let remote: RemoteScanPayload | null = null;
  if (local.isValid && local.e164) {
    remote = await fetchRemotePhoneScan(local.e164, signal);
  }
  return buildScanReport(rawInput, remote);
}
