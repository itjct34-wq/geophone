/**
 * Server proxy for PhoneInfoga-class public phone APIs (Numverify, AbstractAPI,
 * OVH Telecom zones). Keys stay server-side. No Truecaller / private app traffic.
 * Also hosts caller-check (Hobby plan function consolidation).
 */

import callerCheckHandler from './_lib/callerCheckHandler';

interface Req {
  query: Record<string, string | string[] | undefined>;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}

const TIMEOUT_MS = 8000;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

function isE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  const upstream = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await upstream.json().catch(() => null);
  return { ok: upstream.ok, status: upstream.status, body };
}

export default async function handler(req: Req, res: Res) {
  // Hobby plan: /api/caller-check is rewritten here.
  if (first(req.query.kind) === 'caller' || first(req.query.mode) === 'caller') {
    return callerCheckHandler(req, res);
  }

  const number = first(req.query.number).trim();
  if (!isE164(number)) {
    res.status(400).json({ error: 'Provide a valid E.164 "number" (e.g. +14155552671).' });
    return;
  }

  const digits = number.replace(/\D/g, '');
  const countryHint = number.startsWith('+33') ? 'fr' : number.startsWith('+1') ? 'us' : '';

  const numverifyKey = process.env.NUMVERIFY_API_KEY || '';
  const abstractKey = process.env.ABSTRACTAPI_PHONE_KEY || '';

  const providers: Record<string, unknown> = {};

  // --- Numverify (apilayer) -------------------------------------------------
  if (!numverifyKey) {
    providers.numverify = { configured: false };
  } else {
    try {
      const url = `https://apilayer.net/api/validate?access_key=${encodeURIComponent(numverifyKey)}&number=${encodeURIComponent(digits)}&format=1`;
      const { ok, body } = await fetchJson(url);
      const data = body as Record<string, unknown> | null;
      if (!ok || !data || data.success === false) {
        const errInfo = data?.error as { info?: string } | undefined;
        providers.numverify = {
          configured: true,
          error: errInfo?.info || 'Numverify request failed.',
        };
      } else {
        providers.numverify = {
          configured: true,
          valid: Boolean(data.valid),
          number: typeof data.number === 'string' ? data.number : undefined,
          local_format: typeof data.local_format === 'string' ? data.local_format : undefined,
          international_format:
            typeof data.international_format === 'string' ? data.international_format : undefined,
          country_name: typeof data.country_name === 'string' ? data.country_name : undefined,
          country_code: typeof data.country_code === 'string' ? data.country_code : undefined,
          location: typeof data.location === 'string' ? data.location : undefined,
          carrier: typeof data.carrier === 'string' ? data.carrier : undefined,
          line_type: typeof data.line_type === 'string' ? data.line_type : undefined,
        };
      }
    } catch {
      providers.numverify = { configured: true, error: 'Numverify timed out or was unreachable.' };
    }
  }

  // --- AbstractAPI Phone Validation -----------------------------------------
  if (!abstractKey) {
    providers.abstractapi = { configured: false };
  } else {
    try {
      const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${encodeURIComponent(abstractKey)}&phone=${encodeURIComponent(number)}`;
      const { ok, body } = await fetchJson(url);
      const data = body as Record<string, unknown> | null;
      if (!ok || !data) {
        providers.abstractapi = { configured: true, error: 'AbstractAPI phone request failed.' };
      } else if (typeof data.error === 'object' && data.error) {
        const msg = (data.error as { message?: string }).message;
        providers.abstractapi = { configured: true, error: msg || 'AbstractAPI error.' };
      } else {
        const country = data.country as { name?: string } | undefined;
        const carrier = data.carrier as string | undefined;
        providers.abstractapi = {
          configured: true,
          valid: Boolean(data.valid),
          phone: typeof data.phone === 'string' ? data.phone : number,
          country: country?.name,
          carrier: typeof carrier === 'string' ? carrier : undefined,
          type: typeof data.type === 'string' ? data.type : undefined,
        };
      }
    } catch {
      providers.abstractapi = {
        configured: true,
        error: 'AbstractAPI timed out or was unreachable.',
      };
    }
  }

  // --- OVH public telephony zones (PhoneInfoga-class, no key) ---------------
  // Useful mainly for FR geographic numbers; skipped otherwise.
  if (countryHint === 'fr' || number.startsWith('+33')) {
    try {
      const url = `https://api.ovh.com/1.0/telephony/number/detailedZones?country=fr&askingNumber=${encodeURIComponent(number)}`;
      const { ok, body } = await fetchJson(url);
      if (!ok || !Array.isArray(body)) {
        providers.ovh = { attempted: true, matched: false, error: 'OVH zones request failed.' };
      } else if (body.length === 0) {
        providers.ovh = { attempted: true, matched: false };
      } else {
        const zone = body[0] as { city?: string; zipCode?: string; number?: string };
        providers.ovh = {
          attempted: true,
          matched: true,
          city: zone.city,
          zip: zone.zipCode,
          number: zone.number,
        };
      }
    } catch {
      providers.ovh = { attempted: true, matched: false, error: 'OVH timed out or was unreachable.' };
    }
  } else {
    providers.ovh = { attempted: false };
  }

  res.setHeader('Cache-Control', 'private, max-age=30');
  res.status(200).json({ providers });
}
