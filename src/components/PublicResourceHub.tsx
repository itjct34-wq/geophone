import React, { useMemo, useState } from 'react';
import { ExternalLink, Search, ShieldCheck, CarFront, Mail, MessageSquareText, Globe2, AlertTriangle, HeartHandshake, BookOpen, LockKeyhole } from 'lucide-react';

type ResourceCategory =
  | 'Vehicles'
  | 'Email & SMS'
  | 'Account safety'
  | 'Domains & IPs'
  | 'Public-interest reporting'
  | 'OSINT directories';

type Resource = {
  name: string;
  category: ResourceCategory;
  url: string;
  summary: string;
  access: string;
  accessKind: 'Public' | 'Account / API key' | 'Trial / paid usage' | 'Mixed';
  region: string;
  caveat?: string;
};

const resources: Resource[] = [
  {
    name: 'Punjab MTMIS vehicle verification',
    category: 'Vehicles',
    url: 'https://mtmis.excise.punjab.gov.pk/',
    summary: 'Start here when checking a vehicle registered in Punjab before purchase.',
    access: 'Public government portal',
    accessKind: 'Public',
    region: 'Pakistan · Punjab',
    caveat: 'Confirm the result against original documents and a physical inspection.',
  },
  {
    name: 'Sindh Excise vehicle verification',
    category: 'Vehicles',
    url: 'https://taxportal.excise.gos.pk/home',
    summary: 'Official Sindh Excise portal lists online vehicle verification among its services.',
    access: 'Public government portal',
    accessKind: 'Public',
    region: 'Pakistan · Sindh',
    caveat: 'Use the official portal; do not treat a third-party lookup as proof of ownership.',
  },
  {
    name: 'Balochistan online vehicle verification',
    category: 'Vehicles',
    url: 'https://excise.balochistan.gov.pk/home/online-vehicle-verification/',
    summary: 'Government of Balochistan Excise page for online vehicle verification.',
    access: 'Public government portal',
    accessKind: 'Public',
    region: 'Pakistan · Balochistan',
    caveat: 'Availability and fields may vary; contact the department if a record is missing.',
  },
  {
    name: 'Islamabad Excise',
    category: 'Vehicles',
    url: 'https://islamabadexcise.gov.pk/',
    summary: 'Official Islamabad Excise website for vehicle services, registration and related tax information.',
    access: 'Public government portal',
    accessKind: 'Public',
    region: 'Pakistan · Islamabad',
    caveat: 'The department explicitly warns that other look-alike sources may be unofficial.',
  },
  {
    name: 'Punjab Police Anti-Vehicle Lifting System (AVLS)',
    category: 'Vehicles',
    url: 'https://punjabpolice.gov.pk/avls',
    summary: 'Official information about Punjab Police’s system for stolen and snatched vehicle cases.',
    access: 'Public information; some system access may be restricted',
    accessKind: 'Mixed',
    region: 'Pakistan · Punjab',
    caveat: 'A public information page is not a guarantee that every registration can be checked online.',
  },
  {
    name: 'NHTSA vehicle recalls',
    category: 'Vehicles',
    url: 'https://www.nhtsa.gov/recalls',
    summary: 'Check recall information for vehicles in the United States using the VIN or vehicle details.',
    access: 'Public',
    accessKind: 'Public',
    region: 'United States',
    caveat: 'Recall coverage is country- and manufacturer-dependent; it is not a global ownership database.',
  },
  {
    name: 'NHTSA VIN decoder',
    category: 'Vehicles',
    url: 'https://vpic.nhtsa.dot.gov/decoder/',
    summary: 'Decode available manufacturer and vehicle attributes from a VIN.',
    access: 'Public',
    accessKind: 'Public',
    region: 'United States / supported VIN data',
    caveat: 'A decoded VIN does not prove that a car is not stolen, has a clean title, or has never been damaged.',
  },
  {
    name: 'Brevo transactional email API',
    category: 'Email & SMS',
    url: 'https://developers.brevo.com/docs/send-a-transactional-email',
    summary: 'For consent-based service email: account notices, reports requested by a user, and confirmation messages.',
    access: 'API key and verified sender/domain required; limits depend on account',
    accessKind: 'Account / API key',
    region: 'Provider-dependent',
    caveat: 'Keep credentials on the server. Never expose an email provider API key in browser code.',
  },
  {
    name: 'Twilio Messaging API',
    category: 'Email & SMS',
    url: 'https://www.twilio.com/docs/messaging/api/message-resource',
    summary: 'Documented API for sending and receiving SMS and other supported messages.',
    access: 'Trial restrictions apply; paid usage and country rules may apply',
    accessKind: 'Trial / paid usage',
    region: 'Provider and destination dependent',
    caveat: 'Trial accounts can require recipient verification. Use only opt-in messages and add rate limits.',
  },
  {
    name: 'Have I Been Pwned',
    category: 'Account safety',
    url: 'https://haveibeenpwned.com/',
    summary: 'Help a person check whether their own email appears in known breach reports and take account-protection steps.',
    access: 'Website check; API access has its own authentication and usage rules',
    accessKind: 'Mixed',
    region: 'International',
    caveat: 'A missing result is not proof that an account was never compromised.',
  },
  {
    name: 'ICANN Registration Data Lookup',
    category: 'Domains & IPs',
    url: 'https://lookup.icann.org/en',
    summary: 'Look up available registration data for internet domain names from ICANN’s lookup service.',
    access: 'Public',
    accessKind: 'Public',
    region: 'International',
    caveat: 'Privacy services and data-protection rules may hide registrant details.',
  },
  {
    name: 'Google Public DNS lookup',
    category: 'Domains & IPs',
    url: 'https://dns.google/',
    summary: 'Inspect public DNS answers to help debug a domain or investigate email-domain configuration.',
    access: 'Public',
    accessKind: 'Public',
    region: 'International',
    caveat: 'DNS records do not identify a person or prove who operates a website.',
  },
  {
    name: 'VirusTotal',
    category: 'Domains & IPs',
    url: 'https://www.virustotal.com/gui/home/url',
    summary: 'Review a URL or file against multiple security engines and community signals.',
    access: 'Free website use with limits; API terms and quotas apply',
    accessKind: 'Mixed',
    region: 'International',
    caveat: 'Do not upload confidential files or private URLs unless you have reviewed the service’s sharing and privacy rules.',
  },
  {
    name: 'urlscan.io',
    category: 'Domains & IPs',
    url: 'https://urlscan.io/',
    summary: 'Inspect public website behavior, loaded resources, redirects, and page indicators.',
    access: 'Public website with submission and visibility choices',
    accessKind: 'Mixed',
    region: 'International',
    caveat: 'Review scan visibility before submitting anything; a scan can expose a URL and related page content.',
  },
  {
    name: 'NCCIA cybercrime complaint portal',
    category: 'Public-interest reporting',
    url: 'https://complaint.nccia.gov.pk/',
    summary: 'Pakistan’s National Cyber Crime Investigation Agency complaint channel for incidents such as online fraud or harassment.',
    access: 'Official complaint form; identity and supporting evidence may be required',
    accessKind: 'Public',
    region: 'Pakistan',
    caveat: 'GeoPhone is not law enforcement. Preserve evidence and use official reporting channels for real incidents.',
  },
  {
    name: 'PTA Complaint Management System',
    category: 'Public-interest reporting',
    url: 'https://complaint.pta.gov.pk/userlogin.aspx',
    summary: 'Pakistan Telecommunication Authority channel for eligible telecom-consumer complaints.',
    access: 'Account registration may be required',
    accessKind: 'Public',
    region: 'Pakistan',
    caveat: 'Use this for telecom-related complaints; report cybercrime through the relevant official channel.',
  },
  {
    name: 'OSINT Framework',
    category: 'OSINT directories',
    url: 'https://osintframework.com/',
    summary: 'A large directory of public-source research tools. Entries may be free, require registration, need local installation, or have paid tiers.',
    access: 'Mixed: free, registered, local-install and paid resources',
    accessKind: 'Mixed',
    region: 'International',
    caveat: 'The framework is a directory, not a single database and not an entitlement to third-party data.',
  },
];

const categories: Array<'All' | ResourceCategory> = [
  'All',
  'Vehicles',
  'Email & SMS',
  'Account safety',
  'Domains & IPs',
  'Public-interest reporting',
  'OSINT directories',
];

const categoryIcon: Record<ResourceCategory, React.ReactNode> = {
  Vehicles: <CarFront className="w-4 h-4" />,
  'Email & SMS': <MessageSquareText className="w-4 h-4" />,
  'Account safety': <LockKeyhole className="w-4 h-4" />,
  'Domains & IPs': <Globe2 className="w-4 h-4" />,
  'Public-interest reporting': <HeartHandshake className="w-4 h-4" />,
  'OSINT directories': <BookOpen className="w-4 h-4" />,
};

function accessBadge(kind: Resource['accessKind']) {
  if (kind === 'Public') return 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300';
  if (kind === 'Account / API key') return 'border-sky-800/60 bg-sky-950/30 text-sky-300';
  if (kind === 'Trial / paid usage') return 'border-amber-800/60 bg-amber-950/30 text-amber-300';
  return 'border-slate-700 bg-slate-950 text-slate-300';
}

export function PublicResourceHub() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | ResourceCategory>('All');

  const visibleResources = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return resources.filter((resource) => {
      const matchesCategory = category === 'All' || resource.category === category;
      const searchable = [
        resource.name,
        resource.summary,
        resource.access,
        resource.region,
        resource.category,
        resource.caveat ?? '',
      ].join(' ').toLowerCase();
      return matchesCategory && (!clean || searchable.includes(clean));
    });
  }, [category, query]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-900/50 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">Public-interest research</p>
            <h2 className="mt-1 text-xl font-bold text-slate-100 sm:text-2xl">Trusted Resource Hub</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
              A curated starting point for vehicle checks, account safety, public DNS, service messaging, and reporting online abuse.
              Sources open on their own official websites; GeoPhone does not claim ownership of these databases.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-700/70 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>
            <strong className="text-slate-100">Read before using:</strong> access, prices, quotas, and coverage vary. Some sources require accounts or API keys.
            This directory does not send SMS/email or fetch private records yet. Any future integrations should be server-side, consent-based, rate-limited, and clearly attributed.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block flex-1">
            <span className="sr-only">Search trusted resources</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vehicles, recalls, email, domain, scam reporting…"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </label>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5">
              {visibleResources.length} resources
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter resources by category">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === item
                  ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {visibleResources.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <Search className="mx-auto h-6 w-6 text-slate-500" />
            <p className="mt-3 text-sm font-semibold text-slate-200">No matching resources</p>
            <p className="mt-1 text-xs text-slate-400">Try another term or clear the category filter.</p>
            <button
              type="button"
              onClick={() => { setQuery(''); setCategory('All'); }}
              className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleResources.map((resource) => (
              <article key={resource.url} className="flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-cyan-300">
                    {categoryIcon[resource.category]}
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                    accessBadge(resource.accessKind)
                  }`}>{resource.accessKind}</span>
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">{resource.category}</p>
                <h3 className="mt-1 text-sm font-bold leading-snug text-slate-100">{resource.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{resource.summary}</p>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{resource.access}</p>
                <p className="mt-1 text-[10px] text-slate-500">{resource.region}</p>
                {resource.caveat && (
                  <p className="mt-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-2 text-[11px] leading-relaxed text-slate-400">
                    {resource.caveat}
                  </p>
                )}
                <div className="mt-auto pt-4">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded"
                  >
                    Open source <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <HeartHandshake className="h-4 w-4 text-emerald-300" />
          Make this useful to people
        </h3>
        <p className="mt-2 max-w-4xl text-xs leading-relaxed text-slate-300">
          Good next steps are VIN/registration checks that always link back to the issuing authority, a transparent opt-in email/SMS service for verification and safety alerts,
          a scam-reporting guide, and clear privacy notices. Never send bulk unsolicited messages, publish a private person’s data, or present an estimate as confirmed fact.
        </p>
      </section>
    </div>
  );
}
