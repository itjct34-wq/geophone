// Serves the app for /s/<code> share links with a link preview (title and description)
// that names who is asking, so a message in WhatsApp, Telegram or SMS looks like:
//   "Alex is asking to see your location - Open the link, see who is asking, ..."
// Link-preview crawlers do not run JavaScript, so the tags have to be in the HTML itself.
// Only the requester's name is read from the database; the label, number and any
// position are never put in the page.

interface Req {
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

// Resolve the app's own origin to fetch index.html from. Never trust the
// request Host / X-Forwarded-Host header for this (it is attacker-controllable
// and would turn this self-fetch into an SSRF). Prefer a deployment-provided
// origin; only fall back to the request host, strictly validated, for local dev.
function selfOrigin(req: Req): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host);
  const proto = first(req.headers['x-forwarded-proto']) || 'https';
  // Dev fallback only: accept a plain DNS hostname, never an IP literal,
  // localhost, or internal/metadata address.
  if (
    /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/i.test(host) &&
    !/^\d{1,3}(\.\d{1,3}){3}/.test(host) &&
    !/^localhost/i.test(host)
  ) {
    return `${proto}://${host}`;
  }
  return '';
}

async function requesterName(code: string): Promise<string> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !/^[A-Za-z0-9]{6,80}$/.test(code)) return '';
  try {
    const res = await fetch(`${url}/rest/v1/rpc/share_info`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: code }),
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    return data?.state === 'active' && typeof data.requested_by === 'string' ? data.requested_by.slice(0, 60) : '';
  } catch {
    return '';
  }
}

export default async function handler(req: Req, res: Res) {
  const origin = selfOrigin(req);

  let html = '';
  if (origin) {
    try {
      html = await (await fetch(`${origin}/`, { signal: AbortSignal.timeout(5000) })).text();
    } catch {
      html = '';
    }
  }
  if (!html.includes('<head>')) {
    res.setHeader('Location', '/');
    res.status(200).send('<!doctype html><meta http-equiv="refresh" content="0; url=/">');
    return;
  }

  const who = await requesterName(first(req.query.code));
  const title = who ? `${who} is asking to see your location` : 'A location request on GeoPhone';
  const description =
    'Open the link, see who is asking, and choose exactly what to share. You can stop at any time.';

  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`)
    .replace('</head>', '<meta name="robots" content="noindex, nofollow" /></head>');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
}
