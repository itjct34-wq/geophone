/**
 * Proxy for curated public-apis entries (no CORS, timeouts, optional keys).
 * Query: ?id=<catalog id>&q=<target>
 * Catalog: src/data/publicApisCatalog.ts
 */

import { PUBLIC_APIS_CATALOG } from '../src/data/publicApisCatalog';
import { cachedFetch } from './_lib/osintCache';

interface Req {
  query: Record<string, string | string[] | undefined>;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}

const TIMEOUT_MS = 10000;
const UA = 'GeoPhonePublicAPI/1.0 (+https://github.com/itjct34-wq/geophone; public-apis curated)';
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

function fillPath(template: string, q: string): string {
  if (template.includes('{lat}') || template.includes('{lng}')) {
    const [lat, lng] = q.split(',').map((s) => s.trim());
    return template
      .replace('{lat}', encodeURIComponent(lat || '0'))
      .replace('{lng}', encodeURIComponent(lng || '0'))
      .replace('{q}', encodeURIComponent(q));
  }
  return template.replace(/\{q\}/g, encodeURIComponent(q));
}

export default async function handler(req: Req, res: Res) {
  const id = first(req.query.id).trim();
  const q = first(req.query.q).trim();

  if (!id) {
    res.status(200).json({
      catalog: PUBLIC_APIS_CATALOG.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        auth: e.auth,
        https: e.https,
        cors: e.cors,
        link: e.link,
        callable: Boolean(e.callable),
        description: e.description,
        notes: e.notes,
      })),
      attribution: 'Curated from https://github.com/public-apis/public-apis for GeoPhone OSINT use.',
    });
    return;
  }

  const entry = PUBLIC_APIS_CATALOG.find((e) => e.id === id);
  if (!entry) {
    res.status(404).json({ error: `Unknown public API id: ${id}` });
    return;
  }
  if (!entry.callable) {
    res.status(400).json({
      error: 'This API is listed for reference only. Open its docs link, or use a dedicated GeoPhone tab.',
      link: entry.link,
      notes: entry.notes,
    });
    return;
  }

  const call = entry.callable;

  if (call.kind === 'osint_provider' && call.provider) {
    // Delegate to existing OSINT gateway pattern without double-hop complexity:
    // return a redirect hint so the client uses /api/osint (already cached).
    res.status(200).json({
      id: entry.id,
      name: entry.name,
      useOsintProxy: true,
      provider: call.provider,
      q,
      hint: `/api/osint?provider=${encodeURIComponent(call.provider)}&q=${encodeURIComponent(q)}`,
    });
    return;
  }

  if (call.envKey && !process.env[call.envKey]) {
    res.status(200).json({
      id: entry.id,
      configured: false,
      message: `${call.envKey} is not set. Add it to Vercel / .env.local for this free-tier API.`,
      link: entry.link,
    });
    return;
  }

  const pathTemplate = call.path || '';
  if (!pathTemplate) {
    res.status(400).json({ error: 'Catalog entry missing path template.' });
    return;
  }

  // ISS / MBTA style calls may not need q
  const needsQ = pathTemplate.includes('{q}') || pathTemplate.includes('{lat}');
  if (needsQ && !q) {
    res.status(400).json({ error: 'Provide q= for this API (see notes in catalog).' });
    return;
  }

  const url = fillPath(pathTemplate, q || 'self');
  const cacheKey = `${id}:${q || 'default'}`;

  try {
    const { cached, payload } = await cachedFetch('public_api', cacheKey, async () => {
      const headers: Record<string, string> = {
        Accept: 'application/json, application/dns-json, */*',
        'User-Agent': UA,
      };
      if (id === 'cloudflare-dns') headers.Accept = 'application/dns-json';
      if (call.envKey === 'IPINFO_TOKEN' && process.env.IPINFO_TOKEN) {
        // ipinfo.io/?token=
        const withToken = url.includes('?')
          ? `${url}&token=${encodeURIComponent(process.env.IPINFO_TOKEN)}`
          : `${url}?token=${encodeURIComponent(process.env.IPINFO_TOKEN)}`;
        const response = await fetch(withToken, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
        return body;
      }
      const response = await fetch(url, {
        method: id === 'urlhaus' ? 'POST' : 'GET',
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const text = await response.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        /* keep text */
      }
      if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
      return body;
    });

    res.setHeader('Cache-Control', 'private, max-age=60');
    res.status(200).json({
      id: entry.id,
      name: entry.name,
      configured: true,
      cached,
      data: payload,
      attribution: entry.link,
      source: 'https://github.com/public-apis/public-apis',
    });
  } catch (err) {
    res.status(502).json({
      id: entry.id,
      error: err instanceof Error ? err.message : 'Upstream request failed',
      link: entry.link,
    });
  }
}
