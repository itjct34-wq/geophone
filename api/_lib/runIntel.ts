/**
 * Server-side intel orchestrator for POST /api/v1/intel.
 * Reuses curated Sherlock/Holehe probes with bounded concurrency.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  SHERLOCK_PROBE_SITES,
  formatSherlockUrl,
  usernameLooksValid,
  type SherlockSite,
} from '../../src/data/sherlockSites';
import { HOLEHE_ACTIVE_MODULES, type HoleheModuleDef } from '../../src/data/holeheModules';
import { createHash } from 'crypto';
import { mapPool } from './mapPool';

export type IntelType = 'phone' | 'email' | 'username' | 'ip' | 'domain' | 'url' | 'mac';

const SITE_MS = 3500;
const CONCURRENCY = 5;
const UA = 'GeoPhonePublicAPI/1.0 (+https://github.com/itjct34-wq/geophone)';

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

export interface IntelRequest {
  type: IntelType;
  value: string;
  modules?: string[];
}

function wants(modules: string[] | undefined, id: string): boolean {
  if (!modules || modules.length === 0) return true;
  return modules.map((m) => m.toLowerCase()).includes(id.toLowerCase());
}

async function checkSherlockSite(site: SherlockSite, username: string) {
  const profileUrl = formatSherlockUrl(site.url, username);
  if (!usernameLooksValid(username, site.regexCheck)) {
    return { name: site.name, url: profileUrl, status: 'invalid' as const };
  }
  const probe = site.urlProbe ? formatSherlockUrl(site.urlProbe, username) : profileUrl;
  try {
    const response = await fetch(probe, {
      headers: { Accept: 'text/html,application/json', 'User-Agent': UA },
      signal: AbortSignal.timeout(SITE_MS),
      redirect: 'follow',
    });
    const codes = site.errorCode;
    const list = codes === undefined ? [404] : Array.isArray(codes) ? codes : [codes];
    if (site.errorType === 'status_code') {
      if (list.includes(response.status)) return { name: site.name, url: profileUrl, status: 'not_found' as const };
      if (response.status >= 200 && response.status < 300)
        return { name: site.name, url: profileUrl, status: 'found' as const };
      return { name: site.name, url: profileUrl, status: 'error' as const, httpStatus: response.status };
    }
    const text = await response.text().catch(() => '');
    const msgs = site.errorMsg
      ? Array.isArray(site.errorMsg)
        ? site.errorMsg
        : [site.errorMsg]
      : [];
    if (msgs.some((m) => text.toLowerCase().includes(String(m).toLowerCase()))) {
      return { name: site.name, url: profileUrl, status: 'not_found' as const };
    }
    if (response.status >= 200 && response.status < 400 && text.length > 0) {
      return { name: site.name, url: profileUrl, status: 'found' as const };
    }
    return { name: site.name, url: profileUrl, status: 'error' as const };
  } catch (err) {
    return {
      name: site.name,
      url: profileUrl,
      status: 'error' as const,
      detail: err instanceof Error ? err.message : 'failed',
    };
  }
}

async function runHoleheModule(def: HoleheModuleDef, email: string) {
  const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex');
  try {
    let response: Response;
    if (def.method === 'gravatar') {
      response = await fetch(`https://www.gravatar.com/avatar/${hash}?d=404`, {
        method: 'HEAD',
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(SITE_MS),
      });
    } else if (def.method === 'http_get' && def.url) {
      const url = def.url.replace(/\{email\}/g, encodeURIComponent(email)).replace(/\{hash\}/g, hash);
      response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': UA },
        signal: AbortSignal.timeout(SITE_MS),
      });
    } else if (def.method === 'firefox_status') {
      response = await fetch(def.url || 'https://api.accounts.firefox.com/v1/account/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(SITE_MS),
      });
    } else {
      return { name: def.name, domain: def.domain, exists: null as boolean | null, skipped: true };
    }
    const bodyText = await response.text().catch(() => '');
    let exists: boolean | null = null;
    const rule = def.existsWhen;
    if (rule.kind === 'status') exists = rule.codes.includes(response.status);
    else if (rule.kind === 'body_includes') exists = bodyText.includes(rule.text);
    else if (rule.kind === 'body_excludes') exists = bodyText.length > 0 && !bodyText.includes(rule.text);
    else {
      try {
        const json = JSON.parse(bodyText) as Record<string, unknown>;
        if (rule.kind === 'json_field') {
          const val = json[rule.field];
          exists =
            rule.equals === 'nonempty_array'
              ? Array.isArray(val) && val.length > 0
              : val === rule.equals;
        } else if (rule.kind === 'json_field_false') {
          exists = json[rule.field] === false;
        }
      } catch {
        exists = null;
      }
    }
    return { name: def.name, domain: def.domain, exists, httpStatus: response.status };
  } catch (err) {
    return {
      name: def.name,
      domain: def.domain,
      exists: null as boolean | null,
      error: err instanceof Error ? err.message : 'failed',
    };
  }
}

async function lookupIp(ip: string) {
  const fields =
    'status,message,country,countryCode,regionName,city,lat,lon,isp,org,as,query,proxy,hosting';
  const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': UA },
  });
  return response.json();
}

async function lookupDns(domain: string) {
  const [a, mx] = await Promise.all([
    fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, {
      signal: AbortSignal.timeout(8000),
    }).then((r) => r.json()),
    fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      signal: AbortSignal.timeout(8000),
    }).then((r) => r.json()),
  ]);
  return { a, mx };
}

export async function runIntel(req: IntelRequest): Promise<{
  type: IntelType;
  value: string;
  modules: Record<string, unknown>;
}> {
  const type = req.type;
  const value = req.value.trim();
  const modules = req.modules;
  const out: Record<string, unknown> = {};

  if (type === 'phone' && wants(modules, 'phone')) {
    const parsed = parsePhoneNumberFromString(value);
    out.phone = parsed
      ? {
          valid: parsed.isValid(),
          e164: parsed.number,
          country: parsed.country,
          national: parsed.formatNational(),
          international: parsed.formatInternational(),
          type: parsed.getType?.() ?? null,
        }
      : { valid: false, error: 'Could not parse phone number' };
  }

  if ((type === 'username' || type === 'email') && wants(modules, 'sherlock')) {
    const username =
      type === 'email' ? value.split('@')[0] || value : value.replace(/^@/, '');
    if (/^[a-zA-Z0-9_.-]{1,60}$/.test(username)) {
      const results = await mapPool(SHERLOCK_PROBE_SITES, CONCURRENCY, (site) =>
        checkSherlockSite(site, username),
      );
      out.sherlock = {
        username,
        found: results.filter((r) => r.status === 'found').length,
        results,
      };
    }
  }

  if (type === 'email' && wants(modules, 'holehe')) {
    const results = await mapPool(HOLEHE_ACTIVE_MODULES, CONCURRENCY, (m) =>
      runHoleheModule(m, value.toLowerCase()),
    );
    out.holehe = {
      email: value.toLowerCase(),
      found: results.filter((r) => r.exists === true).length,
      results,
    };
  }

  if ((type === 'ip' || (type === 'domain' && IPV4.test(value))) && wants(modules, 'ip')) {
    const ip = type === 'ip' ? value : value;
    if (IPV4.test(ip)) out.ip = await lookupIp(ip);
  }

  if ((type === 'domain' || type === 'url' || type === 'email') && wants(modules, 'dns')) {
    let domain = value;
    if (type === 'url') {
      try {
        domain = new URL(value.includes('://') ? value : `https://${value}`).hostname;
      } catch {
        domain = value;
      }
    }
    if (type === 'email') domain = value.split('@')[1] || value;
    if (domain && domain.includes('.')) out.dns = await lookupDns(domain);
  }

  if (type === 'mac' && wants(modules, 'mac')) {
    const mac = value.replace(/[^a-fA-F0-9]/g, '').slice(0, 6);
    if (mac.length >= 6) {
      try {
        const response = await fetch(`https://api.macvendors.com/${encodeURIComponent(value)}`, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(8000),
        });
        const text = await response.text();
        out.mac = { vendor: response.ok ? text : null, httpStatus: response.status };
      } catch (err) {
        out.mac = { error: err instanceof Error ? err.message : 'failed' };
      }
    }
  }

  return { type, value, modules: out };
}
