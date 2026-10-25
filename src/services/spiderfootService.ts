/**
 * SpiderFoot-style OSINT scan orchestrator.
 * Inspired by https://github.com/smicallef/spiderfoot — correlator over public modules.
 * Reuses in-app scanners (Sherlock, Holehe, PhoneInfoga-style, caller check, DNS/IP, Shodan).
 * Does not ship the full Python SpiderFoot server (optional CLI documented in UI).
 */

import { parsePhoneNumber } from './phoneParser';
import { runPhoneInfogaStyleScan, type PhoneInfogaScanReport } from './phoneInfogaService';
import { runCallerCheck, type CallerCheckResponse } from './callerCheckService';
import { runSherlockHunt, type SherlockHuntReport } from './sherlockService';
import { runHoleheCheck, type HoleheReport } from './holeheService';
import { lookupIp, isIp, type IpLookupResult } from './ipService';
import {
  lookupShodanHost,
  lookupShodanIp,
  vulnList,
  type ShodanLookupResponse,
} from './shodanService';
import {
  enrichDomain,
  enrichEmail,
  enrichIp,
  type OsintProviderResponse,
} from './osintProviders';

export type SpiderFootTargetType = 'phone' | 'email' | 'username' | 'ip' | 'domain';

export interface SpiderFootEvent {
  module: string;
  type: string;
  data: string;
  confidence: 'high' | 'medium' | 'low';
  source?: string;
}

export interface SpiderFootModuleResult {
  id: string;
  name: string;
  status: 'ok' | 'partial' | 'skipped' | 'error';
  summary: string;
  events: SpiderFootEvent[];
}

export interface SpiderFootScanReport {
  targetType: SpiderFootTargetType;
  target: string;
  startedAt: string;
  finishedAt: string;
  modules: SpiderFootModuleResult[];
  events: SpiderFootEvent[];
  raw: {
    phoneInfoga?: PhoneInfogaScanReport;
    callerCheck?: CallerCheckResponse;
    sherlock?: SherlockHuntReport;
    holehe?: HoleheReport;
    ip?: IpLookupResult;
    shodan?: ShodanLookupResponse;
    dns?: { mx?: string[]; a?: string[]; txt?: string[]; error?: string };
    providers?: Record<string, OsintProviderResponse>;
  };
}

function providerModule(
  id: string,
  name: string,
  result: OsintProviderResponse,
  eventType: string,
  pickSummary: (data: unknown) => string,
): SpiderFootModuleResult {
  if (result.configured === false) {
    return {
      id,
      name,
      status: 'skipped',
      summary: result.message || 'API key not configured',
      events: [],
    };
  }
  if (result.error) {
    return { id, name, status: 'error', summary: result.error, events: [] };
  }
  const summary = pickSummary(result.data);
  return {
    id,
    name: result.cached ? `${name} (cached)` : name,
    status: 'ok',
    summary,
    events: summary
      ? [{ module: name, type: eventType, data: summary, confidence: 'medium' }]
      : [],
  };
}

function detectTargetType(raw: string): SpiderFootTargetType {
  const v = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'email';
  if (isIp(v)) return 'ip';
  const phone = parsePhoneNumber(v);
  if (phone.isValid && phone.e164) return 'phone';
  if (/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v) && v.includes('.')) return 'domain';
  return 'username';
}

async function fetchDns(domain: string): Promise<{ mx?: string[]; a?: string[]; txt?: string[]; error?: string }> {
  try {
    const [mxRes, aRes, txtRes] = await Promise.all([
      fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`),
      fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`),
      fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`),
    ]);
    const mx = (await mxRes.json()) as { Answer?: Array<{ data?: string }> };
    const a = (await aRes.json()) as { Answer?: Array<{ data?: string }> };
    const txt = (await txtRes.json()) as { Answer?: Array<{ data?: string }> };
    return {
      mx: (mx.Answer ?? []).map((x) => x.data).filter(Boolean) as string[],
      a: (a.Answer ?? []).map((x) => x.data).filter(Boolean) as string[],
      txt: (txt.Answer ?? []).map((x) => x.data).filter(Boolean) as string[],
    };
  } catch {
    return { error: 'DNS lookup failed.' };
  }
}

export async function runSpiderFootScan(
  targetRaw: string,
  forcedType?: SpiderFootTargetType,
): Promise<SpiderFootScanReport> {
  const target = targetRaw.trim();
  const targetType = forcedType ?? detectTargetType(target);
  const startedAt = new Date().toISOString();
  const modules: SpiderFootModuleResult[] = [];
  const events: SpiderFootEvent[] = [];
  const raw: SpiderFootScanReport['raw'] = {};

  const push = (mod: SpiderFootModuleResult) => {
    modules.push(mod);
    events.push(...mod.events);
  };

  if (targetType === 'phone') {
    const [phoneInfoga, callerCheck] = await Promise.all([
      runPhoneInfogaStyleScan(target),
      (async () => {
        const parsed = parsePhoneNumber(target);
        if (!parsed.e164) return null;
        return runCallerCheck(parsed.e164);
      })(),
    ]);
    raw.phoneInfoga = phoneInfoga;
    if (callerCheck) raw.callerCheck = callerCheck;

    push({
      id: 'sfp_phoneinfoga',
      name: 'PhoneInfoga-style',
      status: phoneInfoga.number.isValid ? 'ok' : 'error',
      summary: phoneInfoga.number.isValid
        ? `${phoneInfoga.number.e164} · ${phoneInfoga.number.carrier} · ${phoneInfoga.number.lineType}`
        : 'Invalid phone number',
      events: phoneInfoga.number.isValid
        ? [
            {
              module: 'PhoneInfoga-style',
              type: 'PHONE_NUMBER',
              data: phoneInfoga.number.e164 || target,
              confidence: 'high',
            },
            {
              module: 'PhoneInfoga-style',
              type: 'PROVIDER_TELCO',
              data: phoneInfoga.number.carrier,
              confidence: 'medium',
            },
            {
              module: 'PhoneInfoga-style',
              type: 'COUNTRY_NAME',
              data: phoneInfoga.number.countryName,
              confidence: 'high',
            },
          ]
        : [],
    });

    if (callerCheck) {
      const okProviders = callerCheck.providers.filter((p) => p.status === 'ok');
      push({
        id: 'sfp_callercheck',
        name: 'Caller check',
        status: callerCheck.configured ? (okProviders.length ? 'ok' : 'partial') : 'skipped',
        summary: callerCheck.configured
          ? `${okProviders.length} provider(s) returned metadata`
          : callerCheck.message || 'Caller-check API keys not configured',
        events: okProviders.flatMap((p) => {
          const ev: SpiderFootEvent[] = [];
          if (p.carrier)
            ev.push({
              module: 'Caller check',
              type: 'PROVIDER_TELCO',
              data: `${p.carrier} (${p.attribution || p.name})`,
              confidence: 'medium',
              source: p.name,
            });
          if (p.lineType)
            ev.push({
              module: 'Caller check',
              type: 'PHONE_NUMBER_TYPE',
              data: p.lineType,
              confidence: 'medium',
              source: p.name,
            });
          return ev;
        }),
      });
    }
  }

  if (targetType === 'username') {
    const sherlock = await runSherlockHunt(target);
    raw.sherlock = sherlock;
    const found = sherlock.results.filter((r) => r.status === 'found');
    push({
      id: 'sfp_sherlock',
      name: 'Sherlock',
      status: sherlock.error ? 'error' : found.length ? 'ok' : 'partial',
      summary: sherlock.error || `${found.length} profile(s) found · ${sherlock.summary.not_found} not found`,
      events: found.map((r) => ({
        module: 'Sherlock',
        type: 'ACCOUNT_EXTERNAL_OWNED',
        data: `${r.name}: ${r.url}`,
        confidence: 'medium',
        source: r.name,
      })),
    });
  }

  if (targetType === 'email') {
    const [holehe, localPart] = await Promise.all([
      runHoleheCheck(target),
      Promise.resolve(target.split('@')[0] || ''),
    ]);
    raw.holehe = holehe;
    const found = holehe.results.filter((r) => r.exists === true);
    push({
      id: 'sfp_holehe',
      name: 'Holehe',
      status: holehe.error ? 'error' : found.length ? 'ok' : 'partial',
      summary: holehe.error || `${found.length} site(s) report an account for this email`,
      events: found.map((r) => ({
        module: 'Holehe',
        type: 'EMAIL_ADDRESS_COMPROMISED',
        data: `${r.name} (${r.domain}) — account likely exists`,
        confidence: 'medium',
        source: r.name,
      })),
    });

    // Also hunt username = local-part via Sherlock (SpiderFoot-style correlation).
    if (localPart && /^[a-zA-Z0-9_.-]{1,60}$/.test(localPart)) {
      const sherlock = await runSherlockHunt(localPart);
      raw.sherlock = sherlock;
      const foundUser = sherlock.results.filter((r) => r.status === 'found');
      push({
        id: 'sfp_sherlock_localpart',
        name: 'Sherlock (email local-part)',
        status: foundUser.length ? 'ok' : 'partial',
        summary: `Correlated username "${localPart}": ${foundUser.length} found`,
        events: foundUser.map((r) => ({
          module: 'Sherlock',
          type: 'ACCOUNT_EXTERNAL_OWNED',
          data: `${r.name}: ${r.url}`,
          confidence: 'low',
          source: r.name,
        })),
      });
    }

    const domain = target.split('@')[1];
    if (domain) {
      const dns = await fetchDns(domain);
      raw.dns = dns;
      push({
        id: 'sfp_dns',
        name: 'DNS (Google public)',
        status: dns.error ? 'error' : 'ok',
        summary: dns.error || `MX=${dns.mx?.length ?? 0} A=${dns.a?.length ?? 0} TXT=${dns.txt?.length ?? 0}`,
        events: [
          ...(dns.mx ?? []).map((d) => ({
            module: 'DNS',
            type: 'PROVIDER_MAIL',
            data: d,
            confidence: 'high' as const,
          })),
          ...(dns.a ?? []).map((d) => ({
            module: 'DNS',
            type: 'IP_ADDRESS',
            data: d,
            confidence: 'high' as const,
          })),
        ],
      });
    }

    try {
      const emailProviders = await enrichEmail(target);
      raw.providers = { ...(raw.providers || {}), ...emailProviders };
      push(
        providerModule('sfp_breachdirectory', 'BreachDirectory', emailProviders.breachdirectory, 'EMAIL_ADDRESS', (d) =>
          d ? `BreachDirectory payload received` : 'No breach data',
        ),
      );
      push(
        providerModule('sfp_hunter', 'Hunter.io', emailProviders.hunter, 'EMAIL_ADDRESS', (d) =>
          d ? `Hunter domain search returned` : 'No Hunter data',
        ),
      );
    } catch {
      /* optional enrichment */
    }
  }

  if (targetType === 'ip' || targetType === 'domain') {
    try {
      const ipResult = await lookupIp(target);
      raw.ip = ipResult;
      push({
        id: 'sfp_ipwhois',
        name: 'IP / geo (ipwho.is)',
        status: 'ok',
        summary: `${ipResult.ip} · ${ipResult.org || ipResult.isp} · ${ipResult.city || ipResult.country}`,
        events: [
          {
            module: 'IP lookup',
            type: 'IP_ADDRESS',
            data: ipResult.ip,
            confidence: 'high',
          },
          {
            module: 'IP lookup',
            type: 'PROVIDER_INTERNET',
            data: ipResult.org || ipResult.isp || 'unknown',
            confidence: 'medium',
          },
          {
            module: 'IP lookup',
            type: 'GEOINFO',
            data: [ipResult.city, ipResult.region, ipResult.country].filter(Boolean).join(', '),
            confidence: 'low',
          },
        ],
      });

      try {
        const ipProviders = await enrichIp(ipResult.ip);
        raw.providers = { ...(raw.providers || {}), ...ipProviders };
        push(
          providerModule('sfp_ipapi', 'IP-API', ipProviders.ipapi, 'GEOINFO', (d) => {
            const row = d as { city?: string; country?: string; isp?: string; query?: string } | null;
            if (!row) return 'No IP-API data';
            return [row.query, row.isp, row.city, row.country].filter(Boolean).join(' · ');
          }),
        );
        push(
          providerModule('sfp_abuseipdb', 'AbuseIPDB', ipProviders.abuseipdb, 'MALICIOUS_IPADDR', (d) => {
            const wrap = d as { data?: { abuseConfidenceScore?: number; ipAddress?: string } } | null;
            const score = wrap?.data?.abuseConfidenceScore;
            return score == null ? 'AbuseIPDB response' : `Abuse confidence ${score}% for ${wrap?.data?.ipAddress || ipResult.ip}`;
          }),
        );
        push(
          providerModule('sfp_otx', 'AlienVault OTX', ipProviders.otx, 'THREAT_INTEL', () => 'OTX indicator general'),
        );
        push(
          providerModule('sfp_virustotal', 'VirusTotal', ipProviders.virustotal, 'THREAT_INTEL', () => 'VirusTotal IP report'),
        );
      } catch {
        /* optional */
      }
    } catch (err) {
      push({
        id: 'sfp_ipwhois',
        name: 'IP / geo (ipwho.is)',
        status: 'error',
        summary: err instanceof Error ? err.message : 'IP lookup failed',
        events: [],
      });
    }

    if (targetType === 'domain') {
      const dns = await fetchDns(target);
      raw.dns = dns;
      push({
        id: 'sfp_dns',
        name: 'DNS (Google public)',
        status: dns.error ? 'error' : 'ok',
        summary: dns.error || `MX=${dns.mx?.length ?? 0} A=${dns.a?.length ?? 0}`,
        events: [
          ...(dns.a ?? []).map((d) => ({
            module: 'DNS',
            type: 'IP_ADDRESS',
            data: d,
            confidence: 'high' as const,
          })),
          ...(dns.mx ?? []).map((d) => ({
            module: 'DNS',
            type: 'PROVIDER_MAIL',
            data: d,
            confidence: 'high' as const,
          })),
        ],
      });

      try {
        const domainProviders = await enrichDomain(target);
        raw.providers = { ...(raw.providers || {}), ...domainProviders };
        push(
          providerModule('sfp_hunter_domain', 'Hunter.io', domainProviders.hunter, 'EMAIL_ADDRESS', () =>
            'Hunter domain search',
          ),
        );
        push(
          providerModule('sfp_vt_domain', 'VirusTotal', domainProviders.virustotal, 'THREAT_INTEL', () =>
            'VirusTotal domain report',
          ),
        );
        push(
          providerModule('sfp_apivoid', 'APIVoid', domainProviders.apivoid, 'THREAT_INTEL', () => 'APIVoid domain rep'),
        );
        push(
          providerModule('sfp_otx_domain', 'AlienVault OTX', domainProviders.otx, 'THREAT_INTEL', () =>
            'OTX domain indicator',
          ),
        );
        push(
          providerModule('sfp_nominatim', 'Nominatim', domainProviders.nominatim, 'GEOINFO', () =>
            'Nominatim geocode results',
          ),
        );
      } catch {
        /* optional */
      }
    }

    // Shodan module (official API via proxy)
    try {
      const shodan = isIp(target)
        ? await lookupShodanIp(target.replace(/^\[|\]$/g, ''))
        : await lookupShodanHost(target);
      raw.shodan = shodan;
      if (!shodan.configured) {
        push({
          id: 'sfp_shodan',
          name: 'Shodan',
          status: 'skipped',
          summary: shodan.message || 'SHODAN_API_KEY not configured',
          events: [],
        });
      } else if (shodan.error && !shodan.host) {
        push({
          id: 'sfp_shodan',
          name: 'Shodan',
          status: 'error',
          summary: shodan.error,
          events: [],
        });
      } else if (shodan.host) {
        const vulns = vulnList(shodan.host);
        const ports = shodan.host.ports ?? [];
        push({
          id: 'sfp_shodan',
          name: 'Shodan',
          status: 'ok',
          summary: `${shodan.host.ip_str || target} · ports ${ports.join(',') || 'n/a'} · org ${shodan.host.org || 'n/a'}`,
          events: [
            {
              module: 'Shodan',
              type: 'IP_ADDRESS',
              data: shodan.host.ip_str || target,
              confidence: 'high',
            },
            ...(shodan.host.org
              ? [
                  {
                    module: 'Shodan',
                    type: 'COMPANY_NAME',
                    data: shodan.host.org,
                    confidence: 'medium' as const,
                  },
                ]
              : []),
            ...ports.map((p) => ({
              module: 'Shodan',
              type: 'TCP_PORT_OPEN',
              data: String(p),
              confidence: 'high' as const,
            })),
            ...vulns.slice(0, 20).map((v) => ({
              module: 'Shodan',
              type: 'VULNERABILITY_CVE_CRITICAL',
              data: v,
              confidence: 'medium' as const,
            })),
          ],
        });
      } else {
        push({
          id: 'sfp_shodan',
          name: 'Shodan',
          status: 'partial',
          summary: 'No Shodan host record returned.',
          events: [],
        });
      }
    } catch (err) {
      push({
        id: 'sfp_shodan',
        name: 'Shodan',
        status: 'error',
        summary: err instanceof Error ? err.message : 'Shodan module failed',
        events: [],
      });
    }
  }

  return {
    targetType,
    target,
    startedAt,
    finishedAt: new Date().toISOString(),
    modules,
    events,
    raw,
  };
}

export function detectSpiderFootTargetType(raw: string): SpiderFootTargetType {
  return detectTargetType(raw);
}
