/**
 * Client helpers for the Caller check tab — public/documented caller-ID style
 * APIs only (AbstractAPI, Numverify, Twilio Lookup). Not Truecaller private RE.
 */

export interface CallerProviderResult {
  id: string;
  name: string;
  status: 'ok' | 'error' | 'skipped';
  summary: string;
  callerName?: string | null;
  spamRisk?: string | null;
  carrier?: string | null;
  lineType?: string | null;
  country?: string | null;
  location?: string | null;
  valid?: boolean;
  attribution?: string;
}

export interface CallerCheckResponse {
  configured: boolean;
  number: string;
  providers: CallerProviderResult[];
  message?: string;
  disclaimer?: string;
  error?: string;
}

export async function runCallerCheck(e164: string): Promise<CallerCheckResponse> {
  try {
    const response = await fetch(`/api/caller-check?number=${encodeURIComponent(e164)}`, {
      headers: { Accept: 'application/json' },
    });
    const body = (await response.json().catch(() => null)) as CallerCheckResponse | null;
    if (!body) {
      return {
        configured: false,
        number: e164,
        providers: [],
        error: `Caller check failed (HTTP ${response.status}).`,
      };
    }
    if (!response.ok && body.error) {
      return { ...body, configured: body.configured ?? false, providers: body.providers ?? [] };
    }
    return body;
  } catch {
    return {
      configured: false,
      number: e164,
      providers: [],
      error: 'Could not reach /api/caller-check. Check that the API route is deployed.',
    };
  }
}
