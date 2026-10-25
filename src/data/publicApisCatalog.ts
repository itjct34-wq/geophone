/**
 * Curated subset of https://github.com/public-apis/public-apis for GeoPhone.
 * Focus: Phone, Geolocation, Security, Open Data, Tracking, Transportation.
 * Auth: No / apiKey free-tier preferred. Callable entries use /api/public-api proxy.
 */

export type PublicApiAuth = 'No' | 'apiKey' | 'OAuth' | 'X-Mashape-Key' | 'User-Agent';

export type PublicApiCategory =
  | 'Phone'
  | 'Geolocation'
  | 'Security'
  | 'Open Data'
  | 'Tracking'
  | 'Transportation';

export interface PublicApiEntry {
  id: string;
  name: string;
  description: string;
  category: PublicApiCategory;
  auth: PublicApiAuth;
  https: boolean;
  cors: 'Yes' | 'No' | 'Unknown';
  /** Docs / homepage */
  link: string;
  /** When set, GeoPhone can call this via /api/public-api?id= */
  callable?: {
    kind: 'ip_json' | 'dns_json' | 'http_get' | 'osint_provider';
    /** Template with {q} placeholder, or osint provider id */
    path?: string;
    provider?: string;
    envKey?: string;
  };
  notes?: string;
}

/** High-value free / free-tier APIs relevant to phone + geo + threat OSINT. */
export const PUBLIC_APIS_CATALOG: PublicApiEntry[] = [
  {
    id: 'ip-api',
    name: 'IP-API',
    description: 'IP geolocation (city, ISP, AS, proxy/hosting flags). Free HTTP tier.',
    category: 'Geolocation',
    auth: 'No',
    https: false,
    cors: 'Unknown',
    link: 'https://ip-api.com/',
    callable: { kind: 'osint_provider', provider: 'ipapi' },
    notes: 'Already wired via /api/osint?provider=ipapi',
  },
  {
    id: 'ipwhois',
    name: 'ipwho.is',
    description: 'HTTPS IP geolocation used by GeoPhone IP tab.',
    category: 'Geolocation',
    auth: 'No',
    https: true,
    cors: 'Yes',
    link: 'https://ipwho.is/',
    callable: { kind: 'http_get', path: 'https://ipwho.is/{q}' },
  },
  {
    id: 'ipinfo',
    name: 'IPinfo',
    description: 'IP → geo / ASN. Free tier needs token.',
    category: 'Geolocation',
    auth: 'apiKey',
    https: true,
    cors: 'Yes',
    link: 'https://ipinfo.io/',
    callable: { kind: 'http_get', path: 'https://ipinfo.io/{q}/json', envKey: 'IPINFO_TOKEN' },
    notes: 'Set IPINFO_TOKEN for authenticated free tier.',
  },
  {
    id: 'nominatim',
    name: 'OpenStreetMap Nominatim',
    description: 'Forward/reverse geocoding. Respect usage policy.',
    category: 'Geolocation',
    auth: 'User-Agent',
    https: true,
    cors: 'Yes',
    link: 'https://nominatim.org/',
    callable: { kind: 'osint_provider', provider: 'nominatim' },
  },
  {
    id: 'opencage',
    name: 'OpenCage Geocoding',
    description: 'Forward/reverse geocode via GeoPhone /api/geocode.',
    category: 'Geolocation',
    auth: 'apiKey',
    https: true,
    cors: 'Yes',
    link: 'https://opencagedata.com/',
    notes: 'Uses OPENCAGE_KEY server-side.',
  },
  {
    id: 'google-dns',
    name: 'Google Public DNS JSON',
    description: 'DNS A/MX/TXT lookups for domains.',
    category: 'Security',
    auth: 'No',
    https: true,
    cors: 'Yes',
    link: 'https://developers.google.com/speed/public-dns/docs/doh/json',
    callable: { kind: 'dns_json', path: 'https://dns.google/resolve?name={q}&type=A' },
  },
  {
    id: 'cloudflare-dns',
    name: 'Cloudflare DNS JSON',
    description: 'DNS over HTTPS JSON API.',
    category: 'Security',
    auth: 'No',
    https: true,
    cors: 'Yes',
    link: 'https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/',
    callable: {
      kind: 'http_get',
      path: 'https://cloudflare-dns.com/dns-query?name={q}&type=A',
    },
    notes: 'Requires Accept: application/dns-json (set by proxy).',
  },
  {
    id: 'abuseipdb',
    name: 'AbuseIPDB',
    description: 'IP abuse confidence / reports.',
    category: 'Security',
    auth: 'apiKey',
    https: true,
    cors: 'Unknown',
    link: 'https://www.abuseipdb.com/',
    callable: { kind: 'osint_provider', provider: 'abuseipdb', envKey: 'ABUSEIPDB_API_KEY' },
  },
  {
    id: 'otx',
    name: 'AlienVault OTX',
    description: 'Threat intel indicators (IP / domain / hostname).',
    category: 'Security',
    auth: 'apiKey',
    https: true,
    cors: 'Unknown',
    link: 'https://otx.alienvault.com/',
    callable: { kind: 'osint_provider', provider: 'otx', envKey: 'OTX_API_KEY' },
  },
  {
    id: 'virustotal',
    name: 'VirusTotal',
    description: 'File / URL / IP / domain reputation.',
    category: 'Security',
    auth: 'apiKey',
    https: true,
    cors: 'No',
    link: 'https://www.virustotal.com/',
    callable: { kind: 'osint_provider', provider: 'virustotal', envKey: 'VIRUSTOTAL_API_KEY' },
  },
  {
    id: 'urlhaus',
    name: 'URLhaus (abuse.ch)',
    description: 'Malware URL / host lookup — no key.',
    category: 'Security',
    auth: 'No',
    https: true,
    cors: 'Unknown',
    link: 'https://urlhaus-api.abuse.ch/',
    callable: {
      kind: 'http_get',
      path: 'https://urlhaus-api.abuse.ch/v1/host/{q}/',
    },
  },
  {
    id: 'numverify',
    name: 'Numverify',
    description: 'Phone validation / carrier / line type.',
    category: 'Phone',
    auth: 'apiKey',
    https: true,
    cors: 'Unknown',
    link: 'https://numverify.com/',
    notes: 'Wired via /api/phone-scan (NUMVERIFY_API_KEY).',
  },
  {
    id: 'abstract-phone',
    name: 'AbstractAPI Phone Validation',
    description: 'Phone carrier and type enrichment.',
    category: 'Phone',
    auth: 'apiKey',
    https: true,
    cors: 'Yes',
    link: 'https://www.abstractapi.com/api/phone-validation-api',
    notes: 'Wired via /api/phone-scan (ABSTRACTAPI_PHONE_KEY).',
  },
  {
    id: 'twilio-lookup',
    name: 'Twilio Lookup',
    description: 'Line type / caller name (paid free trial).',
    category: 'Phone',
    auth: 'apiKey',
    https: true,
    cors: 'No',
    link: 'https://www.twilio.com/docs/lookup/v2-api',
    notes: 'Wired via /api/caller-check when TWILIO_* set.',
  },
  {
    id: 'ovh-telecom',
    name: 'OVH Telecom zones',
    description: 'Public FR number → city/zip zones.',
    category: 'Phone',
    auth: 'No',
    https: true,
    cors: 'Unknown',
    link: 'https://api.ovh.com/',
    notes: 'Used by /api/phone-scan for +33 numbers.',
  },
  {
    id: 'opencellid',
    name: 'OpenCelliD',
    description: 'Cell tower MCC/MNC/LAC/CID → lat/lng.',
    category: 'Tracking',
    auth: 'apiKey',
    https: true,
    cors: 'Unknown',
    link: 'https://opencellid.org/',
    notes: 'Wired via /api/cell (OPENCELLID_KEY).',
  },
  {
    id: 'beacondb',
    name: 'BeaconDB',
    description: 'Open cell / Wi‑Fi location DB (no key).',
    category: 'Tracking',
    auth: 'No',
    https: true,
    cors: 'Unknown',
    link: 'https://beacondb.net/',
    notes: 'Fallback in /api/cell.',
  },
  {
    id: 'wigle',
    name: 'WiGLE',
    description: 'Wi‑Fi / cell observation search.',
    category: 'Tracking',
    auth: 'apiKey',
    https: true,
    cors: 'Unknown',
    link: 'https://wigle.net/',
    callable: { kind: 'osint_provider', provider: 'wigle', envKey: 'WIGLE_API_NAME' },
  },
  {
    id: 'shodan',
    name: 'Shodan',
    description: 'Internet-connected device / port search.',
    category: 'Security',
    auth: 'apiKey',
    https: true,
    cors: 'No',
    link: 'https://www.shodan.io/',
    callable: { kind: 'osint_provider', provider: 'shodan', envKey: 'SHODAN_API_KEY' },
  },
  {
    id: 'macvendors',
    name: 'MAC Vendors',
    description: 'MAC OUI → manufacturer.',
    category: 'Open Data',
    auth: 'No',
    https: true,
    cors: 'Yes',
    link: 'https://macvendors.com/',
    callable: { kind: 'osint_provider', provider: 'macvendors' },
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    description: 'Domain email discovery (free tier).',
    category: 'Open Data',
    auth: 'apiKey',
    https: true,
    cors: 'Yes',
    link: 'https://hunter.io/',
    callable: { kind: 'osint_provider', provider: 'hunter', envKey: 'HUNTER_API_KEY' },
  },
  {
    id: 'country-api',
    name: 'REST Countries',
    description: 'Country metadata (calling codes, region).',
    category: 'Open Data',
    auth: 'No',
    https: true,
    cors: 'Yes',
    link: 'https://restcountries.com/',
    callable: { kind: 'http_get', path: 'https://restcountries.com/v3.1/name/{q}' },
  },
  {
    id: 'zippopotam',
    name: 'Zippopotam.us',
    description: 'Postal code → place / coords.',
    category: 'Geolocation',
    auth: 'No',
    https: true,
    cors: 'Yes',
    link: 'https://www.zippopotam.us/',
    callable: { kind: 'http_get', path: 'https://api.zippopotam.us/{q}' },
    notes: 'Query like US/90210',
  },
  {
    id: 'sunrise-sunset',
    name: 'Sunrise Sunset',
    description: 'Sunrise/sunset for lat,lng (context for geo ops).',
    category: 'Geolocation',
    auth: 'No',
    https: true,
    cors: 'Yes',
    link: 'https://sunrise-sunset.org/api',
    callable: {
      kind: 'http_get',
      path: 'https://api.sunrise-sunset.org/json?lat={lat}&lng={lng}&formatted=0',
    },
    notes: 'Pass lat,lng as q like 40.7,-74.0',
  },
  {
    id: 'open-notify-iss',
    name: 'Open Notify ISS',
    description: 'Live ISS location (demo tracking feed).',
    category: 'Tracking',
    auth: 'No',
    https: true,
    cors: 'Yes',
    link: 'http://open-notify.org/Open-Notify-API/',
    callable: { kind: 'http_get', path: 'http://api.open-notify.org/iss-now.json' },
  },
  {
    id: 'transport-mbta',
    name: 'MBTA',
    description: 'Boston public transit realtime (sample transport API).',
    category: 'Transportation',
    auth: 'No',
    https: true,
    cors: 'Yes',
    link: 'https://www.mbta.com/developers/v3-api',
    callable: { kind: 'http_get', path: 'https://api-v3.mbta.com/routes?filter[type]=0,1' },
  },
];

export const PUBLIC_API_CATEGORIES: PublicApiCategory[] = [
  'Phone',
  'Geolocation',
  'Security',
  'Open Data',
  'Tracking',
  'Transportation',
];
