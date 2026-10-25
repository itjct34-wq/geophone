import React, { useCallback, useEffect, useState } from 'react';
import { Flag, Loader2, Check } from 'lucide-react';
import { adminListReports, adminResolveReport, type ReportRow } from '../services/accessService';
import { timeAgo } from '../services/lastLocationService';

/** Recipient reports and opt-outs, shown to the admin. */
export const ReportsPanel: React.FC = () => {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setRows(await adminListReports());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reports.');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: string) => {
    setBusyId(id);
    try {
      await adminResolveReport(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the report.');
    } finally {
      setBusyId(null);
    }
  };

  const open = (rows ?? []).filter((r) => !r.resolved).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Flag className="w-5 h-5 text-amber-300" aria-hidden="true" />
        <h2 className="text-lg font-bold tracking-tight text-slate-100">Reports</h2>
        {rows && open > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold text-slate-950 bg-amber-300">{open}</span>
        )}
      </div>
      <p className="text-xs text-slate-400">
        People who received a link and reported it or opted their number out. Opted-out numbers are blocked
        automatically.
      </p>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

      {rows === null ? (
        <div className="py-6 flex justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">No reports. Good.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`p-3 rounded-xl border text-sm ${
                r.resolved ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-900 border-amber-800/50 text-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">
                    {r.blocked ? 'Opted out' : 'Reported'} {timeAgo(r.created_at)}
                    {r.email && <span className="text-slate-400 font-normal"> · sent by {r.email}</span>}
                  </p>
                  {r.reason && <p className="text-slate-300 break-words">“{r.reason}”</p>}
                </div>
                {!r.resolved && (
                  <button
                    onClick={() => resolve(r.id)}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 border border-slate-700 rounded-lg transition-colors"
                  >
                    {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                    Mark done
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
