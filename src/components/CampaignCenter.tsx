import React, { useState } from 'react';
import { Link2, MessageSquare, ShieldCheck, Copy, Check, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Campaign = { code: string; url: string; title: string; expiresAt: string };

export function CampaignCenter() {
  const [title, setTitle] = useState('GeoPhone demo');
  const [destinationUrl, setDestinationUrl] = useState('https://example.com/');
  const [to, setTo] = useState('');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function request(action: 'create' | 'send', extra: Record<string, string>) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Please sign in before using campaign tools.');
    const response = await fetch('/api/campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...extra }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Request failed.');
    return result;
  }

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setStatus('');
    try {
      const result = await request('create', { title, destinationUrl });
      setCampaign(result); setStatus('Short link created. It expires in seven days.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create link.'); }
    finally { setBusy(false); }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (!campaign) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const result = await request('send', { code: campaign.code, to });
      setStatus(result.message || 'SMS accepted by provider.');
    } catch (e) { setError(e instanceof Error ? e.message : 'SMS could not be sent.'); }
    finally { setBusy(false); }
  }
  async function copy() {
    if (!campaign) return;
    try { await navigator.clipboard.writeText(campaign.url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setError('Clipboard access failed. Copy the link manually.'); }
  }

  return <section className="space-y-6">
    <header><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"><Link2 className="h-4 w-4"/>Campaign tools</div>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Short links & test SMS</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Create an expiring link to a game or promotion and send it only to your own verified test number. Phone-number metadata stays separate from location sharing.</p>
    </header>
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={create} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="font-semibold text-slate-100">Create campaign link</h2>
        <label className="block text-sm text-slate-300">Campaign title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} required className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"/></label>
        <label className="block text-sm text-slate-300">Destination URL (HTTPS)<input type="url" value={destinationUrl} onChange={e=>setDestinationUrl(e.target.value)} required pattern="https://.*" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"/></label>
        <button disabled={busy} className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{busy?'Working…':'Create short link'}</button>
        {campaign && <div className="rounded-xl border border-cyan-900 bg-slate-950 p-3"><p className="break-all text-sm text-cyan-200">{campaign.url}</p><div className="mt-3 flex gap-2"><button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm">{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copied':'Copy link'}</button><a href={campaign.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Preview</a></div><p className="mt-2 text-xs text-slate-500">Expires {new Date(campaign.expiresAt).toLocaleString()}</p></div>}
      </form>
      <form onSubmit={send} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-slate-100"><MessageSquare size={18}/>Send a test SMS</h2>
        <p className="text-sm leading-6 text-slate-400">Uses Robo SMS Pakistan if configured. The server must allowlist your own verified number before sending.</p>
        <label className="block text-sm text-slate-300">Your verified Pakistani mobile number<input value={to} onChange={e=>setTo(e.target.value)} placeholder="+923001234567" required className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"/></label>
        <button disabled={busy||!campaign} className="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{busy?'Working…':'Send test SMS'}</button>
        {!campaign && <p className="text-xs text-amber-200">Create a campaign link first.</p>}
        <div className="flex gap-2 rounded-lg border border-slate-800 p-3 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"/><span>The message discloses the GeoPhone campaign and says location is not collected unless the visitor actively chooses the optional location-sharing control.</span></div>
      </form>
    </div>
    {(status||error) && <p role="status" className={error?'rounded-lg border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200':'rounded-lg border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-200'}>{error||status}</p>}
    <aside className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm leading-6 text-slate-400"><Info className="mt-1 h-4 w-4 shrink-0 text-cyan-300"/><p>Location permission must be requested only after a visitor explicitly presses a clearly labelled button. Declining must not block the game. This panel requires the server API and database migration to be configured before it can send anything.</p></aside>
  </section>;
}
