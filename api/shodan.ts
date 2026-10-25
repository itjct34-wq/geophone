/**
 * Official Shodan REST API proxy. SHODAN_API_KEY stays server-side.
 * No scraping / paywall bypass — graceful empty state when key missing.
 */

interface Req {
  query: Record<string, string | string[] | undefined>;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}

const TIMEOUT_MS = 12000;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

function isHostname(value: string): boolean {
  const clean = value.replace(/\.$/, '').toLowerCase();
  if (!clean || clean.length > 253) return false;
  return clean.split('.').every(
    (label) =>
      label &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  );
}

export default async function handler(req: Req, res: Res) {
  const key = process.env.SHODAN_API_KEY || '';
  if (!key) {
    res.status(200).json({
      configured: false,
      message:
        'SHODAN_API_KEY is not set. Add your Shodan API key on the server (Vercel / .env.local) to enable in-app host lookups. Get a key at https://account.shodan.io/',
      host: null,
      search: null,
    });
    return;
  }

  const ip = first(req.query.ip).trim();
  const host = first(req.query.host).trim().toLowerCase();
  const q = first(req.query.q).trim();
  const mode = first(req.query.mode).trim() || (ip ? 'host' : q ? 'search' : host ? 'resolve_host' : '');

  try {
    if (mode === 'host' || (ip && IPV4.test(ip))) {
      if (!IPV4.test(ip)) {
        res.status(400).json({ error: 'Provide a valid IPv4 address in "ip".' });
        return;
      }
      const url = `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(key)}`;
      const upstream = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const body = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        res.status(upstream.status === 404 ? 200 : upstream.status).json({
          configured: true,
          error:
            body && typeof body === 'object' && 'error' in body
              ? String((body as { error: unknown }).error)
              : `Shodan host lookup failed (HTTP ${upstream.status}).`,
          host: upstream.status === 404 ? null : body,
        });
        return;
      }
      res.setHeader('Cache-Control', 'private, max-age=120');
      res.status(200).json({ configured: true, host: body, search: null });
      return;
    }

    if (mode === 'resolve_host' || (host && isHostname(host) && !q)) {
      if (!isHostname(host)) {
        res.status(400).json({ error: 'Provide a valid hostname in "host".' });
        return;
      }
      const resolveUrl = `https://api.shodan.io/dns/resolve?hostnames=${encodeURIComponent(host)}&key=${encodeURIComponent(key)}`;
      const resolveRes = await fetch(resolveUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const resolved = (await resolveRes.json().catch(() => null)) as Record<string, string> | null;
      const resolvedIp = resolved?.[host];
      if (!resolvedIp || !IPV4.test(resolvedIp)) {
        res.status(200).json({
          configured: true,
          error: `Shodan DNS resolve returned no IPv4 for ${host}.`,
          host: null,
          resolved: resolved,
        });
        return;
      }
      const hostUrl = `https://api.shodan.io/shodan/host/${encodeURIComponent(resolvedIp)}?key=${encodeURIComponent(key)}`;
      const hostRes = await fetch(hostUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const hostBody = await hostRes.json().catch(() => null);
      res.setHeader('Cache-Control', 'private, max-age=120');
      res.status(200).json({
        configured: true,
        hostname: host,
        resolvedIp,
        host: hostRes.ok ? hostBody : null,
        error: hostRes.ok
          ? undefined
          : hostBody && typeof hostBody === 'object' && 'error' in hostBody
            ? String((hostBody as { error: unknown }).error)
            : `Shodan host lookup failed for ${resolvedIp}.`,
      });
      return;
    }

    if (mode === 'search' || q) {
      if (!q || q.length > 200) {
        res.status(400).json({ error: 'Provide a non-empty Shodan query "q" (max 200 chars).' });
        return;
      }
      const url = `https://api.shodan.io/shodan/host/search?key=${encodeURIComponent(key)}&query=${encodeURIComponent(q)}&minify=true`;
      const upstream = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const body = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        res.status(upstream.status).json({
          configured: true,
          error:
            body && typeof body === 'object' && 'error' in body
              ? String((body as { error: unknown }).error)
              : `Shodan search failed (HTTP ${upstream.status}).`,
          search: null,
        });
        return;
      }
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.status(200).json({ configured: true, search: body, host: null });
      return;
    }

    res.status(400).json({
      error: 'Provide ip= (IPv4), host= (hostname), or q= (Shodan search query).',
    });
  } catch {
    res.status(504).json({ error: 'Shodan request timed out or was unreachable.' });
  }
}
