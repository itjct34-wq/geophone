/**
 * Holehe-style email ? registered-account checks (public endpoints only).
 * Results are returned as JSON for in-app rendering — no redirects to holehe.me.
 * Pattern: https://github.com/megadose/holehe
 */

import { createHash } from 'crypto';
import { HOLEHE_ACTIVE_MODULES, type HoleheModuleDef } from '../../src/data/holeheModules';
import { mapPool } from './mapPool';

interface Req {
  query: Record<string, string | string[] | undefined>;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}

const TIMEOUT_MS = 4000;
const MODULE_CONCURRENCY = 5;
const UA = 'GeoPhoneHolehe/1.0 (+https://github.com/megadose/holehe; educational OSINT)';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

function gravatarHash(email: string): string {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex');
}

function subst(template: string, email: string, hash: string): string {
  return template.replace(/\{email\}/g, encodeURIComponent(email)).replace(/\{hash\}/g, hash);
}

function substPlain(template: string, email: string, hash: string): string {
  return template.replace(/\{email\}/g, email).replace(/\{hash\}/g, hash);
}

function interpretExists(
  def: HoleheModuleDef,
  httpStatus: number,
  bodyText: string,
  json: Record<string, unknown> | null,
): boolean | null {
  const rule = def.existsWhen;
  switch (rule.kind) {
    case 'status':
      return rule.codes.includes(httpStatus);
    case 'json_field': {
      if (!json) return null;
      const val = json[rule.field];
      if (rule.equals === 'nonempty_array') {
        return Array.isArray(val) && val.length > 0;
      }
      return val === rule.equals;
    }
    case 'json_field_false': {
      if (!json) return null;
      return json[rule.field] === false;
    }
    case 'body_includes':
      return bodyText.includes(rule.text);
    case 'body_excludes':
      return bodyText.length > 0 && !bodyText.includes(rule.text);
    default: {
      const _exhaustive: never = rule;
      return _exhaustive;
    }
  }
}

async function runModule(
  def: HoleheModuleDef,
  email: string,
): Promise<{
  name: string;
  domain: string;
  exists: boolean | null;
  rateLimit: boolean;
  emailrecovery: null;
  phoneNumber: null;
  others: Record<string, unknown> | null;
  error?: string;
}> {
  const hash = gravatarHash(email);
  const base = {
    name: def.name,
    domain: def.domain,
    exists: null as boolean | null,
    rateLimit: false,
    emailrecovery: null,
    phoneNumber: null,
    others: null as Record<string, unknown> | null,
  };

  try {
    let response: Response;

    switch (def.method) {
      case 'gravatar': {
        response = await fetch(`https://www.gravatar.com/avatar/${hash}?d=404`, {
          method: 'HEAD',
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        break;
      }
      case 'github_signup': {
        const url = subst(def.url || '', email, hash);
        response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': UA,
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        break;
      }
      case 'firefox_status': {
        response = await fetch(def.url || 'https://api.accounts.firefox.com/v1/account/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': UA,
          },
          body: JSON.stringify({ email }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        break;
      }
      case 'http_get': {
        const url = subst(def.url || '', email, hash);
        response = await fetch(url, {
          headers: { Accept: 'application/json, text/plain, */*', 'User-Agent': UA },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        break;
      }
      case 'http_post_json': {
        const url = subst(def.url || '', email, hash);
        const rawBody: Record<string, string> = {};
        for (const [k, v] of Object.entries(def.body || {})) {
          rawBody[k] = substPlain(v, email, hash);
        }
        // Pinterest wants `data` as a string field already.
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': UA,
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(rawBody),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        break;
      }
      default: {
        const _exhaustive: never = def.method;
        return { ...base, error: `Unknown method ${_exhaustive}` };
      }
    }

    if (response.status === 429) {
      return { ...base, rateLimit: true, error: 'Rate limited by upstream.' };
    }

    const bodyText = await response.text().catch(() => '');
    let json: Record<string, unknown> | null = null;
    try {
      json = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      json = null;
    }

    const exists = interpretExists(def, response.status, bodyText, json);
    return {
      ...base,
      exists,
      others: { httpStatus: response.status },
      error: exists === null ? 'Could not classify response.' : undefined,
    };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : 'Request failed',
    };
  }
}

export default async function handler(req: Req, res: Res) {
  const email = first(req.query.email).trim().toLowerCase();
  if (!isEmail(email)) {
    res.status(400).json({ error: 'Provide a valid email address.' });
    return;
  }

  // Bounded concurrency — unbounded Promise.all saturated sockets and froze scans.
  const results = await mapPool(HOLEHE_ACTIVE_MODULES, MODULE_CONCURRENCY, (m) => runModule(m, email));
  const found = results.filter((r) => r.exists === true).length;
  const notFound = results.filter((r) => r.exists === false).length;
  const unknown = results.filter((r) => r.exists !== true && r.exists !== false).length;

  res.setHeader('Cache-Control', 'private, max-age=60');
  res.status(200).json({
    email,
    summary: { found, not_found: notFound, unknown, total: results.length },
    results,
    attribution:
      'In-app Holehe-style checks inspired by https://github.com/megadose/holehe (curated public endpoints). Does not alert the mailbox for Gravatar/GitHub/Firefox-class probes; some sites may rate-limit.',
    cliHint: 'Optional full CLI: pip3 install holehe && holehe you@example.com',
  });
}
