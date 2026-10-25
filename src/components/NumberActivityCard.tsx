import React, { useEffect, useMemo, useState } from 'react';
import { Phone, MessageCircle, MessageSquare, Clock, History } from 'lucide-react';
import type { PhoneLookupResult } from '../types/phone';
import { timeAgo } from '../services/lastLocationService';
import {
  getLookupStats,
  getSharesForNumber,
  type LookupStats,
  type NumberShare,
} from '../services/numberActivityService';

interface NumberActivityCardProps {
  result: PhoneLookupResult;
}

const LINE_TYPE_LABEL: Record<string, string> = {
  MOBILE: 'Mobile',
  FIXED_LINE: 'Landline',
  FIXED_LINE_OR_MOBILE: 'Landline or mobile',
  TOLL_FREE: 'Toll-free',
  VOIP: 'Internet (VoIP)',
  PAGER: 'Pager',
  PERSONAL_NUMBER: 'Personal number',
  UAN: 'Company number',
  UNKNOWN: 'Unknown',
};

const SHARE_STATE_LABEL: Record<string, { text: string; tone: string }> = {
  waiting: { text: 'Sent, not opened or not shared yet', tone: 'text-amber-300' },
  live: { text: 'Sharing live now', tone: 'text-emerald-300' },
  stale: { text: 'Shared earlier, not updating', tone: 'text-cyan-300' },
  ended: { text: 'Ended', tone: 'text-slate-400' },
  expired: { text: 'Expired without being shared', tone: 'text-slate-400' },
};

/** Local clock for the number's time zone, and whether it is a reasonable hour to reach someone. */
function localContactInfo(timezone: string | undefined) {
  if (!timezone) return null;
  try {
    const now = new Date();
    const time = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(now);
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hour12: false }).format(now),
    ) % 24;
    return { time, reasonable: hour >= 8 && hour < 21 };
  } catch {
    return null;
  }
}

const Fact: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-800/60 last:border-0 text-xs">
    <span className="text-slate-400 shrink-0">{label}</span>
    <span className="text-slate-100 text-right">{value}</span>
  </div>
);

export const NumberActivityCard: React.FC<NumberActivityCardProps> = ({ result }) => {
  const e164 = result.e164 ?? '';
  const digits = e164.replace(/\D/g, '');
  const [stats, setStats] = useState<LookupStats | null>(null);
  const [shares, setShares] = useState<NumberShare[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    setStats(null);
    setShares([]);
    if (!e164) return;
    let cancelled = false;
    const load = () => {
      getLookupStats(e164).then((s) => !cancelled && setStats(s)).catch(() => undefined);
      getSharesForNumber(e164).then((s) => !cancelled && setShares(s)).catch(() => undefined);
    };
    load();
    const id = setInterval(() => {
      load();
      setTick((n) => n + 1);
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [e164]);

  const contact = useMemo(() => localContactInfo(result.timezones[0]), [result.timezones, stats]);

  // The newest link that came back with details
  const sharedDetails: [string, string][] = useMemo(() => {
    const info = shares.find((s) => s.info && Object.keys(s.info).length > 0)?.info;
    if (!info) return [];
    const rows: [string, string | undefined][] = [
      ['Name', info.name],
      ['Browser and system', info.device],
      ['Language', info.language],
      ['Time zone', info.timezone],
      ['Connection', info.connection],
    ];
    return rows.filter((r): r is [string, string] => Boolean(r[1]));
  }, [shares]);

  if (!e164) return null;

  const actionClass =
    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap border';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-slate-100">About this number</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
        <div>
          <Fact label="Number type" value={LINE_TYPE_LABEL[result.lineType] ?? result.lineType} />
          <Fact
            label="Validity"
            value={
              result.isValid ? (
                <span className="text-emerald-300">Valid for {result.countryName}</span>
              ) : result.isPossible ? (
                <span className="text-amber-300">Possible length, not a known pattern</span>
              ) : (
                <span className="text-rose-300">Not a valid number</span>
              )
            }
          />
          <Fact label="Carrier (from prefix)" value={result.carrier} />
          <Fact label="Time zone" value={result.timezones.join(', ') || 'Unknown'} />
          {contact && (
            <>
              <Fact
                label="Local time there"
                value={
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    {contact.time}
                  </span>
                }
              />
              <Fact
                label="Good time to reach them"
                value={
                  <span className={contact.reasonable ? 'text-emerald-300' : 'text-amber-300'}>
                    {contact.reasonable ? 'Yes, daytime there' : 'Better to wait'}
                  </span>
                }
              />
            </>
          )}        </div>

        <div>
          <Fact
            label="Your lookups of this number"
            value={
              stats === null ? (
                '…'
              ) : stats.count === 0 ? (
                'Not saved yet'
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <History className="w-3 h-3 text-slate-400" />
                  {stats.count}× · first {timeAgo(stats.firstAt!)}
                </span>
              )
            }
          />
          <div className="pt-2 space-y-1.5">
            <p className="text-xs text-slate-400">Location requests you sent for this number</p>
            {shares.length === 0 ? (
              <p className="text-xs text-slate-400">None yet. Send a consent link to get a real position.</p>
            ) : (
              <ul className="space-y-1">
                {shares.map((s) => {
                  const hasInfo = !!s.info && Object.keys(s.info).length > 0;
                  const st =
                    s.state === 'waiting' && hasInfo
                      ? { text: 'Details shared, no location', tone: 'text-cyan-300' }
                      : SHARE_STATE_LABEL[s.state];
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className={st.tone}>{st.text}</span>
                      <span className="text-slate-400 whitespace-nowrap">{timeAgo(s.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {sharedDetails.length > 0 && (
        <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg space-y-1">
          <p className="text-xs font-semibold text-emerald-300">Details the person chose to share</p>
          {sharedDetails.map(([label, value]) => (
            <Fact key={label} label={label} value={value} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/70">
        <a
          href={`https://wa.me/${digits}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${actionClass} text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </a>
        <a href={`sms:${e164}`} className={`${actionClass} text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700`}>
          <MessageSquare className="w-3.5 h-3.5" />
          <span>SMS</span>
        </a>
        <a href={`tel:${e164}`} className={`${actionClass} text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700`}>
          <Phone className="w-3.5 h-3.5" />
          <span>Call</span>
        </a>
      </div>
    </div>
  );
};
