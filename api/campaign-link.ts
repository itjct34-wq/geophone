interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  json(body: unknown): void;
  send(body: string): void;
}

const DB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

function sendHtml(res: VercelResponse, status: number, body: string) {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', 'no-store, max-age=0')
    .setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
    .send(body);
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return sendHtml(res, 405, '<h1>Method not allowed</h1>');
  const code = String(req.query.code || '');
  if (!/^[A-Za-z0-9]{10,16}$/.test(code) || !DB_URL || !SERVICE_KEY) return sendHtml(res, 404, '<h1>This campaign link is unavailable.</h1>');
  try {
    const response = await fetch(`${DB_URL}/rest/v1/campaign_links?code=eq.${encodeURIComponent(code)}&select=title,destination_url,expires_at,click_count&limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, signal: AbortSignal.timeout(8000),
    });
    const rows = await response.json().catch(() => []);
    const campaign = Array.isArray(rows) ? rows[0] : null;
    if (!response.ok || !campaign || new Date(campaign.expires_at).getTime() <= Date.now()) return sendHtml(res, 404, '<h1>This campaign link has expired or is unavailable.</h1>');
    await fetch(`${DB_URL}/rest/v1/campaign_links?code=eq.${encodeURIComponent(code)}`, {
      method: 'PATCH', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ click_count: (Number(campaign.click_count) || 0) + 1, last_clicked_at: new Date().toISOString() }),
    }).catch(() => undefined);
    const title = escape(campaign.title);
    const destination = JSON.stringify(String(campaign.destination_url)).replace(/</g, '\\u003c');
    return sendHtml(res, 200, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · GeoPhone</title><style>body{font:16px system-ui;background:#020617;color:#e2e8f0;margin:0;min-height:100vh;display:grid;place-items:center}.card{max-width:560px;margin:24px;padding:28px;border:1px solid #334155;border-radius:20px;background:#0f172a}h1{font-size:26px}p{line-height:1.6;color:#cbd5e1}.btn{display:inline-block;padding:12px 16px;border:0;border-radius:10px;background:#22d3ee;color:#082f49;font-weight:700;text-decoration:none}.note{font-size:13px;color:#94a3b8}</style></head><body><main class="card"><p>GEOPHONE · CAMPAIGN</p><h1>${title}</h1><p>This is a campaign link. Continue to the game or promotion. Opening this page does not collect your location or request location permission.</p><p><a class="btn" id="continue" href="#">Continue to campaign</a></p><p class="note">If you want to share location, use GeoPhone's separate live-location sharing flow. That flow explains the request and lets you choose whether to share. Location sharing is not required to access this campaign.</p></main><script>document.getElementById('continue').href=${destination};</script></body></html>`);
  } catch {
    return sendHtml(res, 500, '<h1>Campaign link temporarily unavailable.</h1>');
  }
}
