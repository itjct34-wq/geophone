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
const APP_URL = (process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function reply(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}
function code(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}
async function db(path: string, init: RequestInit = {}) {
  if (!DB_URL || !SERVICE_KEY) throw new Error('Campaign storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  const response = await fetch(`${DB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...((init.headers || {}) as Record<string, string>) },
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || body?.error || 'Database request failed.');
  return body;
}
async function getUser(req: VercelRequest) {
  const auth = String(req.headers.authorization || '');
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  if (!auth.startsWith('Bearer ') || !DB_URL || !anon) return null;
  const response = await fetch(`${DB_URL}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return typeof user?.id === 'string' ? user : null;
}
function normalizedPkNumber(input: string) {
  const digits = input.replace(/[\s()-]/g, '');
  if (/^03\d{9}$/.test(digits)) return `92${digits.slice(1)}`;
  if (/^\+923\d{9}$/.test(digits)) return digits.slice(1);
  if (/^923\d{9}$/.test(digits)) return digits;
  return null;
}
async function sendRoboSms(to: string, message: string) {
  const email = process.env.ROBOSMS_EMAIL || '';
  const key = process.env.ROBOSMS_API_KEY || '';
  const mask = process.env.ROBOSMS_SENDER_ID || '';
  if (!email || !key || !mask) throw new Error('SMS is not configured. Set ROBOSMS_EMAIL, ROBOSMS_API_KEY, and an approved ROBOSMS_SENDER_ID.');
  const form = new URLSearchParams({ email, key, mask, to, message, type: 'transactional', unicode: '0' });
  const response = await fetch('https://portal.robosms.pk/api/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !['000', '100', '200'].includes(String(result?.code || ''))) {
    throw new Error('SMS provider did not confirm acceptance. Check account, balance, sender ID and API configuration.');
  }
  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Use POST.' });
  const user = await getUser(req);
  if (!user) return reply(res, 401, { error: 'Sign in to create or send campaign links.' });
  try {
    const parsedBody: unknown = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const body = parsedBody && typeof parsedBody === 'object' ? parsedBody as Record<string, unknown> : {};
    if (body.action === 'create') {
      const title = String(body.title || '').trim().slice(0, 100);
      const destination = String(body.destinationUrl || '').trim();
      if (!title) return reply(res, 400, { error: 'Enter a campaign title.' });
      let dest: URL;
      try { dest = new URL(destination); } catch { return reply(res, 400, { error: 'Enter a valid HTTPS destination URL.' }); }
      if (dest.protocol !== 'https:' || dest.username || dest.password) return reply(res, 400, { error: 'Only public HTTPS destination URLs are allowed.' });
      const codeValue = code();
      const rows = await db('campaign_links', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ code: codeValue, owner_id: user.id, title, destination_url: dest.toString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString() }),
      });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) throw new Error('Campaign link could not be saved.');
      const origin = APP_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
      return reply(res, 201, { code: codeValue, url: `${origin}/c/${codeValue}`, title, expiresAt: row.expires_at });
    }
    if (body.action === 'send') {
      const recipient = normalizedPkNumber(String(body.to || ''));
      if (!recipient) return reply(res, 400, { error: 'Enter a valid Pakistani mobile number.' });
      const allowlist = (process.env.SMS_TEST_RECIPIENTS || '').split(',').map(n => n.trim().replace(/^\+/, '')).filter(Boolean);
      if (!allowlist.includes(recipient)) return reply(res, 403, { error: 'Test-only SMS is locked. Add your own verified number to SMS_TEST_RECIPIENTS using country-code digits, e.g. 923001234567.' });
      const campaignCode = String(body.code || '');
      if (!/^[A-Za-z0-9]{10,16}$/.test(campaignCode)) return reply(res, 400, { error: 'Invalid campaign code.' });
      const rows = await db(`campaign_links?code=eq.${encodeURIComponent(campaignCode)}&owner_id=eq.${encodeURIComponent(user.id)}&select=code,title,expires_at`);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row || new Date(row.expires_at).getTime() <= Date.now()) return reply(res, 404, { error: 'Campaign not found or expired.' });
      const origin = APP_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
      const message = `GeoPhone test campaign: ${row.title}. Link: ${origin}/c/${row.code}. Location is not collected on this campaign page.`;
      const result = await sendRoboSms(recipient, message);
      await db(`campaign_links?code=eq.${encodeURIComponent(campaignCode)}&owner_id=eq.${encodeURIComponent(user.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ sms_sent_at: new Date().toISOString(), sms_provider_id: String(result.message_id || result.code || 'accepted') }),
      });
      return reply(res, 200, { ok: true, message: 'SMS accepted by provider.', provider: 'Robo SMS Pakistan' });
    }
    return reply(res, 400, { error: 'Unknown action.' });
  } catch (error) {
    return reply(res, 500, { error: error instanceof Error ? error.message : 'Unexpected campaign error.' });
  }
}
