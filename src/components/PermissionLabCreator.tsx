import React, { useCallback, useEffect, useState } from 'react';
import { Copy, FlaskConical, Loader2, Link2 } from 'lucide-react';
import {
  createPermissionLabCampaign,
  endPermissionLabCampaign,
  listPermissionLabCampaigns,
  permissionLabUrl,
  type PermissionLabCampaign,
} from '../services/permissionLabService';

/** Create / manage educational permission-lab links (Consent section). */
export const PermissionLabCreator: React.FC = () => {
  const [label, setLabel] = useState('Dev permission lab');
  const [rows, setRows] = useState<PermissionLabCampaign[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setRows(await listPermissionLabCampaigns());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load lab campaigns.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      await createPermissionLabCampaign(label);
      setLabel('Dev permission lab');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create link.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (token: string) => {
    const url = permissionLabUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-white inline-flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-emerald-400" /> Permission lab links
        </h2>
        <p className="text-sm text-slate-400 leading-6">
          Generate a consent page that probes browser permissions and device signals (R4ven-style:
          IP, UA, GPU, screen, geo/camera/mic results). Recipients see a clear consent screen first.
          Captures land in <strong className="text-slate-200">Admin → Inbox</strong> — never Discord
          or external webhooks.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="Lab label"
            className="h-10 flex-1 min-w-[12rem] px-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100"
          />
          <button
            type="button"
            disabled={busy || !label.trim()}
            onClick={() => void create()}
            className="h-10 px-4 rounded-lg bg-emerald-400 text-slate-950 text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Create lab link
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No lab campaigns yet.</p>
        ) : (
          rows.map((c) => {
            const url = permissionLabUrl(c.token);
            const inactive = !!c.ended_at || new Date(c.expires_at).getTime() <= Date.now();
            return (
              <li
                key={c.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100">{c.label}</p>
                  <p className="text-xs text-slate-500 break-all">{url}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {inactive ? 'Inactive' : `Expires ${new Date(c.expires_at).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copy(c.token)}
                    className="h-9 px-3 rounded-lg border border-slate-700 text-xs text-slate-300 inline-flex items-center gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied === c.token ? 'Copied' : 'Copy'}
                  </button>
                  {!c.ended_at && (
                    <button
                      type="button"
                      onClick={() => void endPermissionLabCampaign(c.id).then(load)}
                      className="h-9 px-3 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-rose-300"
                    >
                      End
                    </button>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};
