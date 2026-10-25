/**
 * Sherlock-style username existence checks (public profile URLs only).
 * Architecture mirrors open-source Sherlock: substitute username into URL /
 * urlProbe, then classify by HTTP status or error message body.
 * No login-walled private APIs.
 */

import {
  SHERLOCK_PROBE_SITES,
  formatSherlockUrl,
  usernameLooksValid,
  type SherlockSite,
} from '../src/data/sherlockSites';
import { mapPool } from './_lib/mapPool';
import holeheHandler from './_lib/holeheHandler';

interface Req {
  query: Record<string, string | string[] | undefined>;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}

const PER_SITE_MS = 3500;
/** Hard cap so Vercel / the browser never wait on dozens of slow upstreams at once. */
const SITE_CONCURRENCY = 5;
const UA =
  'GeoPhoneSherlock/1.0 (+https://github.com/sherlock-project/sherlock; public OSINT; respectful)';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

function asList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function statusMeansMissing(site: SherlockSite, status: number): boolean {
  const codes = site.errorCode;
  if (codes === undefined) return status === 404;
  const list = Array.isArray(codes) ? codes : [codes];
  return list.includes(status);
}

function bodyMeansMissing(site: SherlockSite, body: string): boolean {
  const msgs = asList(site.errorMsg as string | string[] | undefined);
  if (!msgs.length) return false;
  const lower = body.toLowerCase();
  return msgs.some((m) => lower.includes(String(m).toLowerCase()));
}

async function checkSite(
  site: SherlockSite,
  username: string,
): Promise<{
  name: string;
  url: string;
  status: 'found' | 'not_found' | 'invalid' | 'error';
  httpStatus?: number;
  detail?: string;
}> {
  const profileUrl = formatSherlockUrl(site.url, username);
  if (!usernameLooksValid(username, site.regexCheck)) {
    return {
      name: site.name,
      url: profileUrl,
      status: 'invalid',
      detail: 'Username fails this site’s format check.',
    };
  }

  const probe = site.urlProbe
    ? formatSherlockUrl(site.urlProbe, username)
    : profileUrl;

  try {
    const response = await fetch(probe, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'User-Agent': UA,
      },
      signal: AbortSignal.timeout(PER_SITE_MS),
    });

    const httpStatus = response.status;

    if (site.errorType === 'status_code') {
      if (statusMeansMissing(site, httpStatus)) {
        return { name: site.name, url: profileUrl, status: 'not_found', httpStatus };
      }
      if (httpStatus >= 200 && httpStatus < 300) {
        return { name: site.name, url: profileUrl, status: 'found', httpStatus };
      }
      return {
        name: site.name,
        url: profileUrl,
        status: 'error',
        httpStatus,
        detail: `Unexpected HTTP ${httpStatus}`,
      };
    }

    // message detection
    const text = await response.text().catch(() => '');
    if (bodyMeansMissing(site, text)) {
      return { name: site.name, url: profileUrl, status: 'not_found', httpStatus };
    }
    if (httpStatus >= 200 && httpStatus < 400 && text.length > 0) {
      // Telegram-style: presence of certain strings can mean *found* templates;
      // if errorMsg not present and page loaded, treat as found cautiously.
      return { name: site.name, url: profileUrl, status: 'found', httpStatus };
    }
    if (statusMeansMissing(site, httpStatus) || httpStatus === 404) {
      return { name: site.name, url: profileUrl, status: 'not_found', httpStatus };
    }
    return {
      name: site.name,
      url: profileUrl,
      status: 'error',
      httpStatus,
      detail: 'Could not classify response.',
    };
  } catch (err) {
    return {
      name: site.name,
      url: profileUrl,
      status: 'error',
      detail: err instanceof Error ? err.message : 'Request failed',
    };
  }
}

export default async function handler(req: Req, res: Res) {
  // Hobby plan: /api/holehe is rewritten here (email probe).
  if (first(req.query.email) || first(req.query.kind) === 'holehe') {
    return holeheHandler(req, res);
  }

  const username = first(req.query.username).trim();
  if (!username || username.length > 60 || !/^[a-zA-Z0-9_.-]+$/.test(username)) {
    res.status(400).json({
      error: 'Provide a username of 1–60 letters, numbers, dots, underscores or hyphens.',
    });
    return;
  }

  // Bounded concurrency — unbounded Promise.all froze the UI / exhausted serverless sockets.
  const results = await mapPool(SHERLOCK_PROBE_SITES, SITE_CONCURRENCY, (site) =>
    checkSite(site, username),
  );

  const found = results.filter((r) => r.status === 'found').length;
  const notFound = results.filter((r) => r.status === 'not_found').length;
  const errors = results.filter((r) => r.status === 'error' || r.status === 'invalid').length;

  res.setHeader('Cache-Control', 'private, max-age=60');
  res.status(200).json({
    username,
    summary: { found, not_found: notFound, other: errors, total: results.length },
    results,
    attribution:
      'In-app Sherlock-style checks inspired by https://github.com/sherlock-project/sherlock (curated public sites only).',
    cliHint:
      'For the full site catalogue locally: pipx install sherlock-project && sherlock <username>',
  });
}
