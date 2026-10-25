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
const IPV6 = /^[0-9a-f:]+$/i;

export function isIp(value: string): boolean {
  return IPV4.test(value) || (value.includes(':') && IPV6.test(value));
}

/** Resolves a hostname to its first A record using Google's DNS-over-HTTPS. */
async function resolveHost(host: string): Promise<string> {
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`);
  if (!res.ok) throw new Error('DNS lookup failed.');
  const data = await res.json();
  const answer = (data.Answer ?? []).find((a: { type: number; data: string }) => a.type === 1);
  if (!answer) throw new Error(`No address found for "${host}".`);
  return answer.data;
}

/**
 * Looks up an IP address or hostname. Pass nothing to look up the caller's own
 * public IP. Uses ipwho.is (free, no key, HTTPS).
 */
export async function lookupIp(query?: string): Promise<IpLookupResult> {
  let ip = query?.trim() ?? '';
  let hostname: string | undefined;

  if (ip) {
    // Accept pasted URLs and host:port; IPv6 (more than one colon) is left intact
    ip = ip.replace(/^https?:\/\//i, '').split('/')[0];
    if (ip.split(':').length === 2) ip = ip.split(':')[0];
    if (!isIp(ip)) {
      hostname = ip;
      ip = await resolveHost(ip);
    }
  }

  const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!res.ok) throw new Error('The IP lookup service is unavailable.');
  const d = await res.json();
  if (!d.success) throw new Error(d.message || 'Lookup failed.');

  return {
    ip: d.ip,
    type: d.type,
    country: d.country,
    countryCode: d.country_code,
    flag: d.flag?.emoji ?? '',
    region: d.region,
    city: d.city,
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
