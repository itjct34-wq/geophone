// Vercel serverless function: server-side proxy for the OpenCage geocoding API.
// The app's key stays in OPENCAGE_KEY (server env) and never ships in the
// browser bundle. Only a fixed, validated set of query parameters is forwarded,
// and the key is always appended here — never read from the request.

interface Req {
  query: Record<string, string | string[] | undefined>;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}

const TIMEOUT_MS = 7000;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function handler(req: Req, res: Res) {
  const key = process.env.OPENCAGE_KEY;
  if (!key) {
    res.status(500).json({ error: 'OPENCAGE_KEY is not configured on the server.' });
    return;
  }

  const q = first(req.query.q).trim();
  if (!q || q.length > 200) {
    res.status(400).json({ error: 'A non-empty "q" of at most 200 characters is required.' });
    return;
  }

  // Build the upstream query from a whitelist only; the client never supplies the key.
  const params = new URLSearchParams({ q, key });

  const limit = first(req.query.limit);
  if (/^\d{1,2}$/.test(limit)) {
    params.set('limit', String(Math.min(20, Math.max(1, Number(limit)))));
  }

  params.set('no_annotations', first(req.query.no_annotations) === '0' ? '0' : '1');

  const country = first(req.query.countrycode);
  if (/^[a-z]{2}(,[a-z]{2})*$/i.test(country)) params.set('countrycode', country.toLowerCase());

  const language = first(req.query.language);
  if (/^[a-z]{2}(-[a-z]{2})?$/i.test(language)) params.set('language', language);

  const proximity = first(req.query.proximity);
  if (/^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/.test(proximity)) params.set('proximity', proximity);

  try {
    const upstream = await fetch(`https://api.opencagedata.com/geocode/v1/json?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await upstream.json().catch(() => null);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(upstream.ok ? 200 : upstream.status).json(body ?? { error: 'Upstream geocoding error.' });
  } catch {
    res.status(504).json({ error: 'The geocoding service timed out.' });
  }
}
