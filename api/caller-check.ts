/**
 * Caller ID / spam-reputation proxy using documented public APIs only.
 * Providers: AbstractAPI Phone Validation, Numverify, Twilio Lookup v2 (optional).
 * Does NOT call Truecaller private / authenticated APIs.
 */

interface Req {
  query: Record<string, string | string[] | undefined>;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}

const TIMEOUT_MS = 9000;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

function isE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

export default async function handler(req: Req, res: Res) {
  const number = first(req.query.number).trim();
  if (!isE164(number)) {
    res.status(400).json({ error: 'Provide a valid E.164 "number" (e.g. +14155552671).' });
    return;
  }

  const digits = number.replace(/\D/g, '');
  const abstractKey = process.env.ABSTRACTAPI_PHONE_KEY || '';
  const numverifyKey = process.env.NUMVERIFY_API_KEY || '';
  const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
  const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';

  const anyKey = Boolean(abstractKey || numverifyKey || (twilioSid && twilioToken));
  if (!anyKey) {
    res.status(200).json({
      configured: false,
      number,
      providers: [],
      message:
        'No caller-check API keys are configured. Set ABSTRACTAPI_PHONE_KEY, NUMVERIFY_API_KEY, and/or TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN on the server.',
    });
    return;
  }

  const providers: Array<Record<string, unknown>> = [];

  if (abstractKey) {
    try {
      const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${encodeURIComponent(abstractKey)}&phone=${encodeURIComponent(number)}`;
      const upstream = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
      if (!upstream.ok || !data) {
        providers.push({
          id: 'abstractapi',
          name: 'AbstractAPI Phone Validation',
          status: 'error',
          summary: 'Upstream request failed.',
        });
      } else if (typeof data.error === 'object' && data.error) {
        providers.push({
          id: 'abstractapi',
          name: 'AbstractAPI Phone Validation',
          status: 'error',
          summary: (data.error as { message?: string }).message || 'AbstractAPI error.',
        });
      } else {
        const country = data.country as { name?: string; code?: string; prefix?: string } | undefined;
        providers.push({
          id: 'abstractapi',
          name: 'AbstractAPI Phone Validation',
          status: 'ok',
          summary: data.valid ? 'Number format validated by AbstractAPI.' : 'AbstractAPI did not mark the number valid.',
          callerName: null,
          spamRisk: null,
          carrier: typeof data.carrier === 'string' ? data.carrier : null,
          lineType: typeof data.type === 'string' ? data.type : null,
          country: country?.name ?? null,
          valid: Boolean(data.valid),
          attribution: 'AbstractAPI',
        });
      }
    } catch {
      providers.push({
        id: 'abstractapi',
        name: 'AbstractAPI Phone Validation',
        status: 'error',
        summary: 'Timed out or unreachable.',
      });
    }
  }

  if (numverifyKey) {
    try {
      const url = `https://apilayer.net/api/validate?access_key=${encodeURIComponent(numverifyKey)}&number=${encodeURIComponent(digits)}&format=1`;
      const upstream = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
      if (!upstream.ok || !data || data.success === false) {
        const errInfo = data?.error as { info?: string } | undefined;
        providers.push({
          id: 'numverify',
          name: 'Numverify',
          status: 'error',
          summary: errInfo?.info || 'Numverify request failed.',
        });
      } else {
        providers.push({
          id: 'numverify',
          name: 'Numverify',
          status: 'ok',
          summary: data.valid
            ? `Carrier/location metadata from Numverify (${data.line_type || 'unknown type'}).`
            : 'Numverify marked this number invalid.',
          callerName: null,
          spamRisk: null,
          carrier: typeof data.carrier === 'string' ? data.carrier : null,
          lineType: typeof data.line_type === 'string' ? data.line_type : null,
          country: typeof data.country_name === 'string' ? data.country_name : null,
          location: typeof data.location === 'string' ? data.location : null,
          valid: Boolean(data.valid),
          attribution: 'apilayer Numverify',
        });
      }
    } catch {
      providers.push({
        id: 'numverify',
        name: 'Numverify',
        status: 'error',
        summary: 'Timed out or unreachable.',
      });
    }
  }

  if (twilioSid && twilioToken) {
    try {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(number)}?Fields=line_type_intelligence`;
      const upstream = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${auth}`,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
      if (!upstream.ok || !data) {
        providers.push({
          id: 'twilio_lookup',
          name: 'Twilio Lookup',
          status: 'error',
          summary:
            typeof data?.message === 'string' ? data.message : 'Twilio Lookup request failed.',
        });
      } else {
        const line = data.line_type_intelligence as
          | { type?: string; carrier_name?: string; mobile_country_code?: string; mobile_network_code?: string }
          | null
          | undefined;
        providers.push({
          id: 'twilio_lookup',
          name: 'Twilio Lookup',
          status: 'ok',
          summary: 'Line-type intelligence from Twilio Lookup v2 (documented API).',
          callerName: typeof data.caller_name === 'string' ? data.caller_name : null,
          spamRisk: null,
          carrier: line?.carrier_name ?? null,
          lineType: line?.type ?? (typeof data.line_type === 'string' ? data.line_type : null),
          country: typeof data.country_code === 'string' ? data.country_code : null,
          valid: data.valid !== false,
          attribution: 'Twilio Lookup',
        });
      }
    } catch {
      providers.push({
        id: 'twilio_lookup',
        name: 'Twilio Lookup',
        status: 'error',
        summary: 'Timed out or unreachable.',
      });
    }
  }

  res.setHeader('Cache-Control', 'private, max-age=30');
  res.status(200).json({
    configured: true,
    number,
    providers,
    disclaimer:
      'Results are carrier / format metadata from the named providers. This is not Truecaller and does not reveal private identity databases.',
  });
}
