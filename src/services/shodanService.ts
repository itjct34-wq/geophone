/**
 * Client for official Shodan lookups via /api/shodan (server-held SHODAN_API_KEY).
 */

export interface ShodanHostData {
  ip_str?: string;
  org?: string;
  isp?: string;
  asn?: string;
  hostnames?: string[];
  ports?: number[];
  country_code?: string;
  country_name?: string;
  city?: string;
  region_code?: string;
  latitude?: number;
  longitude?: number;
  vulns?: string[] | Record<string, unknown>;
  tags?: string[];
  last_update?: string;
  data?: Array<{
    port?: number;
    transport?: string;
    product?: string;
    version?: string;
    banner?: string;
    data?: string;
  }>;
}

export interface ShodanSearchMatch {
  ip_str?: string;
  org?: string;
  isp?: string;
  port?: number;
  product?: string;
  location?: { city?: string; country_name?: string; country_code?: string };
  hostnames?: string[];
}

export interface ShodanLookupResponse {
  configured: boolean;
  message?: string;
  error?: string;
  hostname?: string;
  resolvedIp?: string;
  host?: ShodanHostData | null;
  search?: { matches?: ShodanSearchMatch[]; total?: number } | null;
  resolved?: Record<string, string> | null;
}

export function vulnList(host: ShodanHostData | null | undefined): string[] {
  if (!host?.vulns) return [];
  if (Array.isArray(host.vulns)) return host.vulns.map(String);
  return Object.keys(host.vulns);
}

export async function lookupShodanIp(ip: string): Promise<ShodanLookupResponse> {
  const response = await fetch(`/api/shodan?ip=${encodeURIComponent(ip)}`, {
    headers: { Accept: 'application/json' },
  });
  const body = (await response.json().catch(() => null)) as ShodanLookupResponse | null;
  if (!body) {
    return { configured: false, error: `Shodan proxy failed (HTTP ${response.status}).`, host: null };
  }
  return body;
}

export async function lookupShodanHost(hostname: string): Promise<ShodanLookupResponse> {
  const response = await fetch(`/api/shodan?host=${encodeURIComponent(hostname)}`, {
    headers: { Accept: 'application/json' },
  });
  const body = (await response.json().catch(() => null)) as ShodanLookupResponse | null;
  if (!body) {
    return { configured: false, error: `Shodan proxy failed (HTTP ${response.status}).`, host: null };
  }
  return body;
}

export async function searchShodan(query: string): Promise<ShodanLookupResponse> {
  const response = await fetch(`/api/shodan?q=${encodeURIComponent(query)}&mode=search`, {
    headers: { Accept: 'application/json' },
  });
  const body = (await response.json().catch(() => null)) as ShodanLookupResponse | null;
  if (!body) {
    return { configured: false, error: `Shodan proxy failed (HTTP ${response.status}).`, search: null };
  }
  return body;
}
