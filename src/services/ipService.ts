export interface IpLookupResult {
  ip: string;
  type: string;
  country: string;
  countryCode: string;
  flag: string;
  region: string;
  city: string;
  postal: string;
  lat: number;
  lng: number;
  isp: string;
  org: string;
  asn: number | null;
  timezone: string;
  utcOffset: string;
  /** Domain that was resolved to this IP, when the user typed a hostname. */
  hostname?: string;
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

function isValidIpv6(value: string): boolean {
  const bare = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
  if (!bare || !bare.includes(':') || !/^[0-9a-f:.]+$/i.test(bare)) return false;
  try {
    // The WHATWG URL parser implements IPv6 syntax validation, including compressed forms.
    return new URL(`http://[${bare}]/`).hostname.startsWith('[');
  } catch {
    return false;
  }
}

export function isIp(value: string): boolean {
  const clean = value.trim();
  return IPV4.test(clean) || isValidIpv6(clean);
}

function validateHostname(host: string): string {
  const clean = host.replace(/\.$/, '').toLowerCase();
  if (
    clean.length > 253 ||
    !clean ||
    clean.split('.').some((label) =>
      !label ||
      label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
    )
  ) {
    throw new Error('Enter a valid IP address, hostname, or URL.');
  }
  return clean;
}

async function resolveHost(host: string): Promise<string> {
  // Try IPv4 first, then IPv6 for hosts without an A record.
  for (const type of ['A', 'AAAA']) {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`);
    if (!res.ok) throw new Error('DNS lookup failed. Please try again.');
    const data = await res.json() as {
      Answer?: Array<{ type?: number; data?: string }>;
      Status?: number;
    };
    const expectedType = type === 'A' ? 1 : 28;
    const answer = (data.Answer ?? []).find((a) =>
      a.type === expectedType && typeof a.data === 'string' && isIp(a.data),
    );
    if (answer?.data) return answer.data;
  }
  throw new Error(`No public A or AAAA address was found for "${host}".`);
}

function extractHost(input: string): { host: string; hostname?: string } {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Enter an IP address, hostname, or URL.');

  // Parse full URLs, host:port forms, and bracketed IPv6 addresses without splitting IPv6 colons.
  if (isIp(trimmed)) return { host: trimmed.replace(/^\[|\]$/g, '') };
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('[') || /^[^/\s?#]+:\d+(?:[/?#]|$)/.test(trimmed)) {
    try {
      const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
      const host = url.hostname.replace(/^\[|\]$/g, '');
      if (isIp(host)) return { host };
      return { host: validateHostname(host), hostname: validateHostname(host) };
    } catch {
      throw new Error('That URL or host:port is not valid.');
    }
  }

  const firstPart = trimmed.split(/[/?#]/, 1)[0];
  if (isIp(firstPart)) return { host: firstPart.replace(/^\[|\]$/g, '') };
  const host = validateHostname(firstPart);
  return { host, hostname: host };
}

/**
 * Looks up an IP address or hostname. With no argument, looks up the caller's own
 * public IP. Uses ipwho.is over HTTPS; IP-based location is approximate.
 */
export async function lookupIp(query?: string): Promise<IpLookupResult> {
  let ip = '';
  let hostname: string | undefined;

  if (query?.trim()) {
    const parsed = extractHost(query);
    if (isIp(parsed.host)) {
      ip = parsed.host;
    } else {
      hostname = parsed.hostname ?? parsed.host;
      ip = await resolveHost(parsed.host);
    }
  }

  const endpoint = ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : 'https://ipwho.is/';
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error('The IP lookup service is unavailable. Please try again.');
  const d = await res.json() as {
    success?: boolean;
    message?: string;
    ip?: string;
    type?: string;
    country?: string;
    country_code?: string;
    flag?: { emoji?: string };
    region?: string;
    city?: string;
    postal?: string | null;
    latitude?: number;
    longitude?: number;
    connection?: { isp?: string; org?: string; asn?: number | null };
    timezone?: { id?: string; utc?: string };
  };
  if (!d.success) throw new Error(d.message || 'The IP lookup service could not resolve that address.');
  if (
    typeof d.ip !== 'string' ||
    typeof d.latitude !== 'number' ||
    typeof d.longitude !== 'number' ||
    !Number.isFinite(d.latitude) ||
    !Number.isFinite(d.longitude) ||
    d.latitude < -90 ||
    d.latitude > 90 ||
    d.longitude < -180 ||
    d.longitude > 180
  ) {
    throw new Error('The IP lookup provider returned incomplete or invalid location data.');
  }

  return {
    ip: d.ip,
    type: d.type ?? '',
    country: d.country ?? '',
    countryCode: d.country_code ?? '',
    flag: d.flag?.emoji ?? '',
    region: d.region ?? '',
    city: d.city ?? '',
    postal: d.postal ?? '',
    lat: d.latitude,
    lng: d.longitude,
    isp: d.connection?.isp ?? '',
    org: d.connection?.org ?? '',
    asn: d.connection?.asn ?? null,
    timezone: d.timezone?.id ?? '',
    utcOffset: d.timezone?.utc ?? '',
    hostname,
  };
}
