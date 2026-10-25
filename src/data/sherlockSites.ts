/**
 * Curated Sherlock-style site list for in-app username hunts.
 * Pattern mirrors open-source Sherlock (github.com/sherlock-project/sherlock):
 * public profile URL templates + status_code / message detection.
 * NSFW sites are intentionally omitted. Full catalogue = optional local CLI.
 */

export type SherlockErrorType = 'status_code' | 'message' | 'manual';

export interface SherlockSite {
  name: string;
  /** Profile URL with `{}` placeholder for the username. */
  url: string;
  urlMain: string;
  /** Optional probe URL (often an unauthenticated public API). */
  urlProbe?: string;
  errorType: SherlockErrorType;
  /** HTTP status that means "not found" when errorType is status_code. */
  errorCode?: number | number[];
  /** Substring(s) in body that mean "not found" when errorType is message. */
  errorMsg?: string | string[];
  regexCheck?: string;
  /** Prefer probe for existence; always show `url` as the human link. */
  tags?: string[];
}

/** Sites checked server-side via /api/sherlock (reliable public probes). */
export const SHERLOCK_PROBE_SITES: SherlockSite[] = [
  {
    name: 'GitHub',
    url: 'https://github.com/{}',
    urlMain: 'https://github.com/',
    urlProbe: 'https://api.github.com/users/{}',
    errorType: 'status_code',
    errorCode: 404,
    regexCheck: '^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$',
    tags: ['dev'],
  },
  {
    name: 'GitLab',
    url: 'https://gitlab.com/{}',
    urlMain: 'https://gitlab.com/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['dev'],
  },
  {
    name: 'Bitbucket',
    url: 'https://bitbucket.org/{}/',
    urlMain: 'https://bitbucket.org/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['dev'],
  },
  {
    name: 'Codeberg',
    url: 'https://codeberg.org/{}',
    urlMain: 'https://codeberg.org/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['dev'],
  },
  {
    name: 'Reddit',
    url: 'https://www.reddit.com/user/{}',
    urlMain: 'https://www.reddit.com/',
    urlProbe: 'https://www.reddit.com/user/{}/about.json',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['social'],
  },
  {
    name: 'HackerNews',
    url: 'https://news.ycombinator.com/user?id={}',
    urlMain: 'https://news.ycombinator.com/',
    errorType: 'message',
    errorMsg: 'No such user',
    tags: ['dev'],
  },
  {
    name: 'Dev.to',
    url: 'https://dev.to/{}',
    urlMain: 'https://dev.to/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['dev'],
  },
  {
    name: 'Keybase',
    url: 'https://keybase.io/{}',
    urlMain: 'https://keybase.io/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['identity'],
  },
  {
    name: 'About.me',
    url: 'https://about.me/{}',
    urlMain: 'https://about.me/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['identity'],
  },
  {
    name: 'Medium',
    url: 'https://medium.com/@{}',
    urlMain: 'https://medium.com/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['social'],
  },
  {
    name: 'Replit',
    url: 'https://replit.com/@{}',
    urlMain: 'https://replit.com/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['dev'],
  },
  {
    name: 'npm',
    url: 'https://www.npmjs.com/~{}',
    urlMain: 'https://www.npmjs.com/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['dev'],
  },
  {
    name: 'Docker Hub',
    url: 'https://hub.docker.com/u/{}',
    urlMain: 'https://hub.docker.com/',
    urlProbe: 'https://hub.docker.com/v2/users/{}/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['dev'],
  },
  {
    name: 'PyPI',
    url: 'https://pypi.org/user/{}/',
    urlMain: 'https://pypi.org/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['dev'],
  },
  {
    name: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/User:{}',
    urlMain: 'https://en.wikipedia.org/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['wiki'],
  },
  {
    name: 'Steam',
    url: 'https://steamcommunity.com/id/{}',
    urlMain: 'https://steamcommunity.com/',
    errorType: 'message',
    errorMsg: 'The specified profile could not be found',
    tags: ['gaming'],
  },
  {
    name: 'Twitch',
    url: 'https://www.twitch.tv/{}',
    urlMain: 'https://www.twitch.tv/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['social'],
  },
  {
    name: 'Pinterest',
    url: 'https://www.pinterest.com/{}/',
    urlMain: 'https://www.pinterest.com/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['social'],
  },
  {
    name: 'SoundCloud',
    url: 'https://soundcloud.com/{}',
    urlMain: 'https://soundcloud.com/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['social'],
  },
  {
    name: 'Flickr',
    url: 'https://www.flickr.com/people/{}/',
    urlMain: 'https://www.flickr.com/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['social'],
  },
  {
    name: 'Behance',
    url: 'https://www.behance.net/{}',
    urlMain: 'https://www.behance.net/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['creative'],
  },
  {
    name: 'Dribbble',
    url: 'https://dribbble.com/{}',
    urlMain: 'https://dribbble.com/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['creative'],
  },
  {
    name: 'Product Hunt',
    url: 'https://www.producthunt.com/@{}',
    urlMain: 'https://www.producthunt.com/',
    errorType: 'status_code',
    errorCode: 404,
    tags: ['social'],
  },
];

/**
 * Extra public profile URL templates shown as manual open-links
 * (sites that often block bots or need JS — same idea as Sherlock’s human verify).
 */
export const SHERLOCK_MANUAL_SITES: SherlockSite[] = [
  {
    name: 'X (Twitter)',
    url: 'https://x.com/{}',
    urlMain: 'https://x.com/',
    errorType: 'manual',
    tags: ['social'],
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/{}/',
    urlMain: 'https://www.instagram.com/',
    errorType: 'manual',
    tags: ['social'],
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@{}',
    urlMain: 'https://www.tiktok.com/',
    errorType: 'manual',
    tags: ['social'],
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/@{}',
    urlMain: 'https://www.youtube.com/',
    errorType: 'manual',
    tags: ['social'],
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/{}/',
    urlMain: 'https://www.linkedin.com/',
    errorType: 'manual',
    tags: ['social'],
  },
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/{}',
    urlMain: 'https://www.facebook.com/',
    errorType: 'manual',
    tags: ['social'],
  },
  {
    name: 'Telegram',
    url: 'https://t.me/{}',
    urlMain: 'https://telegram.org/',
    errorType: 'manual',
    tags: ['social'],
  },
];

export function formatSherlockUrl(template: string, username: string): string {
  return template.replace(/\{\}/g, encodeURIComponent(username));
}

export function usernameLooksValid(username: string, regexCheck?: string): boolean {
  const u = username.trim();
  if (!u || u.length > 60) return false;
  if (!/^[a-zA-Z0-9_.-]+$/.test(u)) return false;
  if (!regexCheck) return true;
  try {
    return new RegExp(regexCheck).test(u);
  } catch {
    return true;
  }
}
