/**
 * Multi-provider OSINT gateway (server-only keys + Supabase osint_cache).
 * Query: ?provider=&q=  (and provider-specific params)
 *
 * Providers: ipapi | abuseipdb | macvendors | breachdirectory | hunter |
 *            virustotal | apivoid | otx | wigle | nominatim | shodan
 */

import { cachedFetch } from './_lib/osintCache';
import publicApiHandler from './_lib/publicApiHandler';
import { checkIpRateLimit, clientIpFromHeaders } from './_lib/ipRateLimit';

interface Req {
  query: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}

const TIMEOUT_MS = 12000;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const UA = 'GeoPhoneOSINT/1.0 (https://github.com/itjct34-wq/geophone; contact via repo issues)';

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

function missingKey(name: string) {
  return {
    configured: false,
    message: `${name} is not set on the server. Add it in Vercel / .env.local. Lookup skipped.`,
  };
}

async function upstreamJson(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      'User-Agent': UA,
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

async function runIpApi(q: string) {
  const target = q.trim();
  if (target && !IPV4.test(target) && !target.includes(':')) {
    // allow empty = caller IP via ip-api "query" field after fetch without path
  }
  const path = target ? `/${encodeURIComponent(target)}` : '';
  const fields =
    'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,proxy,hosting,mobile';
  const { cached, payload } = await cachedFetch('ipapi', target || 'self', async () => {
    // Prefer HTTPS endpoint (ip-api.com free tier is HTTP on non-pro; use http for free)
    const url = `http://ip-api.com/json${path}?fields=${fields}`;
    const { ok, body } = await upstreamJson(url);
    if (!ok || !body || typeof body !== 'object') throw new Error('IP-API request failed.');
    return body;
  });
  return { configured: true, cached, provider: 'ipapi', data: payload };
}

async function runAbuseIpdb(ip: string) {
  const key = process.env.ABUSEIPDB_API_KEY || '';
  if (!key) return { provider: 'abuseipdb', ...missingKey('ABUSEIPDB_API_KEY') };
  if (!IPV4.test(ip)) return { error: 'AbuseIPDB requires a valid IPv4 address.' };
  const { cached, payload } = await cachedFetch('abuseipdb', ip, async () => {
    const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose`;
    const { ok, body, status } = await upstreamJson(url, {
      headers: { Key: key, Accept: 'application/json' },
    });
    if (!ok) throw new Error(`AbuseIPDB HTTP ${status}`);
    return body;
  });
  return { configured: true, cached, provider: 'abuseipdb', data: payload };
}

async function runMacVendors(mac: string) {
  const clean = mac.trim();
  if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(clean) && !/^[0-9A-Fa-f]{6,12}$/.test(clean.replace(/[:-]/g, ''))) {
    return { error: 'Provide a MAC/BSSID like AA:BB:CC:DD:EE:FF.' };
  }
  const { cached, payload } = await cachedFetch('macvendors', clean, async () => {
    const url = `https://api.macvendors.com/${encodeURIComponent(clean)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/plain' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 404) return { mac: clean, vendor: null, found: false };
    if (!response.ok) throw new Error(`MacVendors HTTP ${response.status}`);
    const vendor = (await response.text()).trim();
    return { mac: clean, vendor, found: Boolean(vendor) };
  });
  return { configured: true, cached, provider: 'macvendors', data: payload };
}

async function runBreachDirectory(q: string) {
  const key = process.env.BREACHDIRECTORY_API_KEY || process.env.RAPIDAPI_KEY || '';
  if (!key) {
    return {
      provider: 'breachdirectory',
      ...missingKey('BREACHDIRECTORY_API_KEY or RAPIDAPI_KEY'),
    };
  }
  const { cached, payload } = await cachedFetch('breachdirectory', q, async () => {
    const url = `https://breachdirectory.p.rapidapi.com/?func=auto&term=${encodeURIComponent(q)}`;
    const { ok, body, status } = await upstreamJson(url, {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'breachdirectory.p.rapidapi.com',
      },
    });
    if (!ok) throw new Error(`BreachDirectory HTTP ${status}`);
    return body;
  });
  return { configured: true, cached, provider: 'breachdirectory', data: payload };
}

async function runHunter(domain: string) {
  const key = process.env.HUNTER_API_KEY || '';
  if (!key) return { provider: 'hunter', ...missingKey('HUNTER_API_KEY') };
  const d = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  const { cached, payload } = await cachedFetch('hunter', d, async () => {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(d)}&api_key=${encodeURIComponent(key)}`;
    const { ok, body, status } = await upstreamJson(url);
    if (!ok) throw new Error(`Hunter HTTP ${status}`);
    return body;
  });
  return { configured: true, cached, provider: 'hunter', data: payload };
}

async function runVirusTotal(q: string, kind: string) {
  const key = process.env.VIRUSTOTAL_API_KEY || '';
  if (!key) return { provider: 'virustotal', ...missingKey('VIRUSTOTAL_API_KEY') };
  const type = kind === 'domain' ? 'domains' : kind === 'url' ? 'urls' : 'ip_addresses';
  let id = q.trim();
  if (type === 'urls') {
    id = Buffer.from(id).toString('base64url');
  }
  const cacheKey = `${type}:${q.trim()}`;
  const { cached, payload } = await cachedFetch('virustotal', cacheKey, async () => {
    const url = `https://www.virustotal.com/api/v3/${type}/${encodeURIComponent(id)}`;
    const { ok, body, status } = await upstreamJson(url, {
      headers: { 'x-apikey': key },
    });
    if (!ok) throw new Error(`VirusTotal HTTP ${status}`);
    return body;
  });
  return { configured: true, cached, provider: 'virustotal', data: payload };
}

async function runApiVoid(q: string, kind: string) {
  const key = process.env.APIVOID_API_KEY || '';
  if (!key) return { provider: 'apivoid', ...missingKey('APIVOID_API_KEY') };
  const endpoint =
    kind === 'domain'
      ? 'domainrep/v1/pay-as-you-go/'
      : kind === 'url'
        ? 'urlrep/v1/pay-as-you-go/'
        : 'iprep/v1/pay-as-you-go/';
  const param = kind === 'domain' ? 'host' : kind === 'url' ? 'url' : 'ip';
  const { cached, payload } = await cachedFetch('apivoid', `${kind}:${q}`, async () => {
    const url = `https://endpoint.apivoid.com/${endpoint}?key=${encodeURIComponent(key)}&${param}=${encodeURIComponent(q)}`;
    const { ok, body, status } = await upstreamJson(url);
    if (!ok) throw new Error(`APIVoid HTTP ${status}`);
    return body;
  });
  return { configured: true, cached, provider: 'apivoid', data: payload };
}

async function runOtx(q: string, kind: string) {
  const key = process.env.OTX_API_KEY || '';
  if (!key) return { provider: 'otx', ...missingKey('OTX_API_KEY') };
  const section =
    kind === 'domain' ? 'domain' : kind === 'hostname' ? 'hostname' : kind === 'url' ? 'url' : 'IPv4';
  const { cached, payload } = await cachedFetch('otx', `${section}:${q}`, async () => {
    const url = `https://otx.alienvault.com/api/v1/indicators/${section}/${encodeURIComponent(q)}/general`;
    const { ok, body, status } = await upstreamJson(url, {
      headers: { 'X-OTX-API-KEY': key },
    });
    if (!ok) throw new Error(`OTX HTTP ${status}`);
    return body;
  });
  return { configured: true, cached, provider: 'otx', data: payload };
}

async function runWigle(q: string, kind: string) {
  const name = process.env.WIGLE_API_NAME || '';
  const token = process.env.WIGLE_API_TOKEN || '';
  if (!name || !token) {
    return { provider: 'wigle', ...missingKey('WIGLE_API_NAME + WIGLE_API_TOKEN') };
  }
  const auth = Buffer.from(`${name}:${token}`).toString('base64');
  const { cached, payload } = await cachedFetch('wigle', `${kind}:${q}`, async () => {
    let url: string;
    if (kind === 'ssid') {
      url = `https://api.wigle.net/api/v2/network/search?onlymine=false&freenet=false&paynet=false&ssid=${encodeURIComponent(q)}`;
    } else if (kind === 'bssid') {
      url = `https://api.wigle.net/api/v2/network/detail?netid=${encodeURIComponent(q)}`;
    } else {
      // cell / lat,lng box search — expect "lat,lng" or lat&lng query extras
      const [lat, lng] = q.split(',').map((x) => x.trim());
      url = `https://api.wigle.net/api/v2/network/search?onlymine=false&latrange1=${encodeURIComponent(lat)}&longrange1=${encodeURIComponent(lng)}&latrange2=${encodeURIComponent(lat)}&longrange2=${encodeURIComponent(lng)}`;
    }
    const { ok, body, status } = await upstreamJson(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!ok) throw new Error(`WiGLE HTTP ${status}`);
    return body;
  });
  return { configured: true, cached, provider: 'wigle', data: payload };
}

async function runNominatim(q: string, kind: string) {
  const { cached, payload } = await cachedFetch('nominatim', `${kind}:${q}`, async () => {
    let url: string;
    if (kind === 'reverse') {
      const [lat, lon] = q.split(',').map((x) => x.trim());
      url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    } else {
      url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5`;
    }
    const { ok, body, status } = await upstreamJson(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
    if (!ok) throw new Error(`Nominatim HTTP ${status}`);
    return body;
  }, 7 * 24 * 3600);
  return { configured: true, cached, provider: 'nominatim', data: payload };
}

async function runShodan(q: string, mode: string) {
  const key = process.env.SHODAN_API_KEY || '';
  if (!key) return { provider: 'shodan', ...missingKey('SHODAN_API_KEY') };
  const { cached, payload } = await cachedFetch('shodan', `${mode}:${q}`, async () => {
    if (mode === 'search') {
      const url = `https://api.shodan.io/shodan/host/search?key=${encodeURIComponent(key)}&query=${encodeURIComponent(q)}&minify=true`;
      const { ok, body, status } = await upstreamJson(url);
      if (!ok) throw new Error(`Shodan HTTP ${status}`);
      return body;
    }
    if (mode === 'host' || IPV4.test(q)) {
      const url = `https://api.shodan.io/shodan/host/${encodeURIComponent(q)}?key=${encodeURIComponent(key)}`;
      const { ok, body, status } = await upstreamJson(url);
      if (!ok && status !== 404) throw new Error(`Shodan HTTP ${status}`);
      return body;
    }
    const resolveUrl = `https://api.shodan.io/dns/resolve?hostnames=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`;
    const resolved = await upstreamJson(resolveUrl);
    const map = resolved.body as Record<string, string> | null;
    const ip = map?.[q];
    if (!ip) return { error: 'No IPv4 from Shodan DNS resolve', resolved: map };
    const hostUrl = `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(key)}`;
    const host = await upstreamJson(hostUrl);
    return { hostname: q, resolvedIp: ip, host: host.body };
  });
  return { configured: true, cached, provider: 'shodan', data: payload };
}

export default async function handler(req: Req, res: Res) {
  // Burst guard for unauthenticated OSINT / public-api proxies (per instance).
  const ipGate = checkIpRateLimit(clientIpFromHeaders(req.headers), 60, 60_000);
  if (!ipGate.ok) {
    res.setHeader('Retry-After', String(ipGate.retryAfterSec));
    res.status(429).json({ error: 'Too many requests. Slow down and retry.' });
    return;
  }

  // Hobby plan: /api/public-api is rewritten here (catalog id proxy).
  if (first(req.query.id) || first(req.query.kind) === 'public') {
    return publicApiHandler(req, res);
  }

  const provider = first(req.query.provider).trim().toLowerCase();
  const q = first(req.query.q).trim();
  const kind = first(req.query.kind).trim().toLowerCase() || 'ip';
  const mode = first(req.query.mode).trim().toLowerCase() || 'host';

  if (!provider) {
    res.status(400).json({
      error: 'Missing provider',
      providers: [
        'ipapi',
        'abuseipdb',
        'macvendors',
        'breachdirectory',
        'hunter',
        'virustotal',
        'apivoid',
        'otx',
        'wigle',
        'nominatim',
        'shodan',
      ],
    });
    return;
  }

  try {
    let result: unknown;
    switch (provider) {
      case 'ipapi':
        result = await runIpApi(q);
        break;
      case 'abuseipdb':
        if (!q) {
          res.status(400).json({ error: 'q=IP required' });
          return;
        }
        result = await runAbuseIpdb(q);
        break;
      case 'macvendors':
        if (!q) {
          res.status(400).json({ error: 'q=MAC required' });
          return;
        }
        result = await runMacVendors(q);
        break;
      case 'breachdirectory':
        if (!q) {
          res.status(400).json({ error: 'q=email_or_username required' });
          return;
        }
        result = await runBreachDirectory(q);
        break;
      case 'hunter':
        if (!q) {
          res.status(400).json({ error: 'q=domain required' });
          return;
        }
        result = await runHunter(q);
        break;
      case 'virustotal':
        if (!q) {
          res.status(400).json({ error: 'q=target required' });
          return;
        }
        result = await runVirusTotal(q, kind);
        break;
      case 'apivoid':
        if (!q) {
          res.status(400).json({ error: 'q=target required' });
          return;
        }
        result = await runApiVoid(q, kind);
        break;
      case 'otx':
        if (!q) {
          res.status(400).json({ error: 'q=target required' });
          return;
        }
        result = await runOtx(q, kind);
        break;
      case 'wigle':
        if (!q) {
          res.status(400).json({ error: 'q=ssid|bssid|lat,lng required' });
          return;
        }
        result = await runWigle(q, kind || 'ssid');
        break;
      case 'nominatim':
        if (!q) {
          res.status(400).json({ error: 'q=address or lat,lon required' });
          return;
        }
        result = await runNominatim(q, kind || 'search');
        break;
      case 'shodan':
        if (!q) {
          res.status(400).json({ error: 'q=ip|host|query required' });
          return;
        }
        result = await runShodan(q, mode);
        break;
      default:
        res.status(400).json({ error: `Unknown provider: ${provider}` });
        return;
    }

    res.setHeader('Cache-Control', 'private, max-age=60');
    res.status(200).json(result);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Upstream OSINT provider failed.',
      provider,
    });
  }
}
