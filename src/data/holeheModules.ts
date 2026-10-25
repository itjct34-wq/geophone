/**
 * Holehe-style email→account check descriptors.
 * Inspired by https://github.com/megadose/holehe (public register / status endpoints).
 * NSFW / high-abuse targets omitted. Checks run server-side via /api/holehe.
 */

export type HoleheMethod = 'gravatar' | 'github_signup' | 'firefox_status' | 'http_get' | 'http_post_json';

export interface HoleheModuleDef {
  name: string;
  domain: string;
  method: HoleheMethod;
  /** URL template; `{email}` (URI-encoded) / `{hash}` substituted. */
  url?: string;
  /** JSON body template for POST; values use plain `{email}` / `{hash}`. */
  body?: Record<string, string>;
  /** How to interpret the response as "account exists". */
  existsWhen:
    | { kind: 'status'; codes: number[] }
    | { kind: 'json_field'; field: string; equals: boolean | string | number }
    | { kind: 'json_field_false'; field: string }
    | { kind: 'body_includes'; text: string }
    | { kind: 'body_excludes'; text: string };
  rateLimitHint?: boolean;
}

/** Curated public checks — results rendered in-app (not redirects to holehe.me). */
export const HOLEHE_ACTIVE_MODULES: HoleheModuleDef[] = [
  {
    name: 'gravatar',
    domain: 'gravatar.com',
    method: 'gravatar',
    existsWhen: { kind: 'status', codes: [200] },
  },
  {
    name: 'github',
    domain: 'github.com',
    method: 'github_signup',
    url: 'https://github.com/signup_check/email?value={email}',
    existsWhen: { kind: 'json_field_false', field: 'available' },
  },
  {
    name: 'firefox',
    domain: 'firefox.com',
    method: 'firefox_status',
    url: 'https://api.accounts.firefox.com/v1/account/status',
    existsWhen: { kind: 'json_field', field: 'exists', equals: true },
  },
  {
    name: 'duolingo',
    domain: 'duolingo.com',
    method: 'http_get',
    url: 'https://www.duolingo.com/2017-06-30/users?email={email}',
    existsWhen: { kind: 'json_field', field: 'users', equals: 'nonempty_array' },
  },
  {
    name: 'spotify',
    domain: 'spotify.com',
    method: 'http_get',
    url: 'https://spclient.wg.spotify.com/signup/public/v1/account?validate=1&email={email}',
    existsWhen: { kind: 'json_field', field: 'status', equals: 20 },
    rateLimitHint: true,
  },
  {
    name: 'instagram',
    domain: 'instagram.com',
    method: 'http_post_json',
    url: 'https://www.instagram.com/api/v1/web/accounts/web_create_ajax/attempt/',
    body: { email: '{email}' },
    existsWhen: { kind: 'body_includes', text: 'email_is_taken' },
    rateLimitHint: true,
  },
  {
    name: 'twitter',
    domain: 'twitter.com',
    method: 'http_get',
    url: 'https://api.twitter.com/i/users/email_available.json?email={email}',
    existsWhen: { kind: 'json_field', field: 'taken', equals: true },
    rateLimitHint: true,
  },
  {
    name: 'pinterest',
    domain: 'pinterest.com',
    method: 'http_post_json',
    url: 'https://www.pinterest.com/resource/EmailExistsResource/get/',
    body: { data: '{"options":{"email":"{email}"},"context":{}}' },
    existsWhen: { kind: 'body_includes', text: '"data":true' },
    rateLimitHint: true,
  },
  {
    name: 'wordpress',
    domain: 'wordpress.com',
    method: 'http_get',
    url: 'https://public-api.wordpress.com/rest/v1.1/users/{email}/auth-options',
    existsWhen: { kind: 'status', codes: [200] },
  },
  {
    name: 'atlassian',
    domain: 'atlassian.com',
    method: 'http_post_json',
    url: 'https://id.atlassian.com/rest/check-username',
    body: { username: '{email}' },
    existsWhen: { kind: 'json_field', field: 'errorCode', equals: 'USERNAME_UNAVAILABLE' },
  },
];
