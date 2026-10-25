import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Clock3, LoaderCircle, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

type TargetType = 'domain' | 'ip' | 'phone' | 'username';
type Target = { id: string; label: string; target_type: TargetType; target_value: string; monitor_enabled: boolean; frequency_minutes: number | null; next_run_at: string | null; last_run_at: string | null; last_status: string | null; created_at: string };
type Run = { id: string; target_id: string; status: string; summary: string; checked_at: string };
const names: Record<TargetType,string> = { domain:'Domain', ip:'IP address', phone:'Phone metadata', username:'Username' };
const date = (s: string | null) => s ? new Date(s).toLocaleString() : 'Not run yet';

export function InvestigationCenter() {
  const { user } = useAuth();
  const [targets,setTargets] = useState<Target[]>([]);
  const [runs,setRuns] = useState<Run[]>([]);
  const [kind,setKind] = useState<TargetType>('domain');
  const [value,setValue] = useState('');
  const [label,setLabel] = useState('');
  const [monitor,setMonitor] = useState(true);
  const [frequency,setFrequency] = useState('360');
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const load = useCallback(async () => {
    if (!user) { setTargets([]); setRuns([]); setLoading(false); return; }
    setLoading(true); setError('');
    const [a,b] = await Promise.all([
      supabase.from('investigation_targets').select('id,label,target_type,target_value,monitor_enabled,frequency_minutes,next_run_at,last_run_at,last_status,created_at').order('created_at',{ascending:false}),
      supabase.from('monitoring_runs').select('id,target_id,status,summary,checked_at').order('checked_at',{ascending:false}).limit(12)
    ]);
    if (a.error) setError(a.error.message); else setTargets((a.data ?? []) as Target[]);
    if (b.error) setError((old) => old || b.error!.message); else setRuns((b.data ?? []) as Run[]);
    setLoading(false);
  },[user]);
  useEffect(() => { void load(); },[load]);

  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!user) return;
    const v = value.trim();
    if (!v) return;
    if (monitor && !['domain','ip'].includes(kind)) { setError('Scheduled checks currently support domains and IP addresses only.'); return; }
    if (kind === 'domain' && !/^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/.test(v)) { setError('Enter a domain such as example.com, without a URL path.'); return; }
    if (kind === 'ip' && !/^[0-9a-fA-F:.]{3,45}$/.test(v)) { setError('Enter an IPv4 or IPv6 address.'); return; }
    if (kind === 'phone' && !/^[+0-9(). -]{6,25}$/.test(v)) { setError('Enter a phone number using digits and standard punctuation.'); return; }
    if (kind === 'username' && !/^[a-zA-Z0-9_.-]{1,80}$/.test(v)) { setError('Enter a username without spaces.'); return; }
    setSaving(true); setError(''); setNotice('');
    const {error: err} = await supabase.from('investigation_targets').insert({
      user_id:user.id,label:label.trim() || names[kind]+': '+v,target_type:kind,target_value:v,
      monitor_enabled:monitor,frequency_minutes:monitor?Number(frequency):null,
      next_run_at:monitor?new Date(Date.now()+Number(frequency)*60000).toISOString():null
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setValue(''); setLabel(''); setNotice(monitor?'Target saved. Scheduled checks begin after the worker and scheduler are configured.':'Target saved to your private investigation workspace.');
    await load();
  }
  async function toggle(t: Target) {
    const on = !t.monitor_enabled;
    if (on && !['domain','ip'].includes(t.target_type)) { setError('Scheduled checks support domains and IP addresses only.'); return; }
    const {error:err} = await supabase.from('investigation_targets').update({monitor_enabled:on,next_run_at:on?new Date(Date.now()+(t.frequency_minutes??360)*60000).toISOString():null}).eq('id',t.id);
    if (err) setError(err.message); else await load();
  }
  async function remove(id: string) {
    if (!window.confirm('Delete this target and its monitoring history?')) return;
    const {error:err} = await supabase.from('investigation_targets').delete().eq('id',id);
    if (err) setError(err.message); else await load();
  }
  if (!user) return <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8"><ShieldCheck className="mb-4 h-8 w-8 text-cyan-400"/><h2 className="text-xl font-semibold text-white">Investigation workspace</h2><p className="mt-2 text-sm text-slate-400">Sign in to save private targets and schedules. Each account can access only its own targets and history.</p></section>;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Intelligence operations</p><h1 className="text-2xl font-bold text-white sm:text-3xl">Investigation center</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Save public-source targets and schedule recurring public RDAP checks for domains and IPs. Phone entries store metadata targets only; this tool cannot locate a person from a phone number.</p></div><button onClick={()=>void load()} type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm"><RefreshCw className="h-4 w-4"/>Refresh</button></div>
    <div className="grid gap-3 sm:grid-cols-3">{[['Saved targets',targets.length],['Monitoring enabled',targets.filter(t=>t.monitor_enabled).length],['Recent checks',runs.length]].map(([title,count])=><div key={String(title)} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-500">{title}</p><p className="mt-2 text-2xl font-semibold text-white">{count}</p></div>)}</div>
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <form onSubmit={add} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div><h2 className="text-lg font-semibold text-white">Add target</h2><p className="mt-1 text-sm text-slate-400">Use only public information you are authorized to investigate.</p></div>
        <label className="block text-sm text-slate-300">Target type<select value={kind} onChange={e=>{const k=e.target.value as TargetType;setKind(k);if(!['domain','ip'].includes(k))setMonitor(false);}} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"><option value="domain">Domain / website</option><option value="ip">Public IP address</option><option value="phone">Phone metadata target</option><option value="username">Public username</option></select></label>
        <label className="block text-sm text-slate-300">Target value<input value={value} onChange={e=>setValue(e.target.value)} required placeholder={kind==='domain'?'example.com':kind==='ip'?'203.0.113.10':kind==='phone'?'+923001234567':'public_username'} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-600"/></label>
        <label className="block text-sm text-slate-300">Label (optional)<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. company website" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-600"/></label>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><label className="flex gap-3 text-sm text-slate-200"><input type="checkbox" checked={monitor} disabled={!['domain','ip'].includes(kind)} onChange={e=>setMonitor(e.target.checked)} className="mt-1 accent-cyan-400"/><span><b>Enable scheduled monitoring</b><span className="mt-1 block text-xs leading-5 text-slate-500">Domain/IP RDAP checks. The scheduled worker must be deployed separately.</span></span></label>{monitor&&<label className="mt-3 block text-xs text-slate-400">Interval<select value={frequency} onChange={e=>setFrequency(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="60">Every hour</option><option value="360">Every 6 hours</option><option value="1440">Daily</option><option value="10080">Weekly</option></select></label>}</div>
        <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-60">{saving?<LoaderCircle className="h-4 w-4 animate-spin"/>:<Plus className="h-4 w-4"/>}{saving?'Saving…':'Save target'}</button>
      </form>
      <div className="space-y-4"><section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-lg font-semibold text-white">Saved targets</h2>{loading?<p className="py-8 text-sm text-slate-400">Loading…</p>:targets.length===0?<p className="py-8 text-sm text-slate-400">No targets yet.</p>:<div className="mt-4 space-y-3">{targets.map(t=><article key={t.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><span className="rounded bg-slate-800 px-2 py-1 text-[10px] uppercase text-cyan-300">{names[t.target_type]}</span><h3 className="mt-2 text-sm font-semibold text-white">{t.label}</h3><p className="mt-1 break-all font-mono text-xs text-slate-400">{t.target_value}</p></div><button title="Delete target" type="button" onClick={()=>void remove(t.id)} className="p-2 text-slate-500 hover:text-rose-300"><Trash2 className="h-4 w-4"/></button></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>Next: {date(t.next_run_at)}</span>{['domain','ip'].includes(t.target_type)&&<button type="button" onClick={()=>void toggle(t)} className="font-medium text-cyan-300">{t.monitor_enabled?'Pause monitoring':'Enable monitoring'}</button>}</div>{t.last_status&&<p className="mt-2 text-xs text-slate-400">Last status: {t.last_status} · {date(t.last_run_at)}</p>}</article>)}</div>}</section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-300"/><h2 className="text-lg font-semibold text-white">Recent monitoring activity</h2></div>{runs.length===0?<p className="py-6 text-sm text-slate-500">No checks yet. Configure the worker and scheduler to populate this timeline.</p>:<div className="mt-4 space-y-3">{runs.map(r=><div key={r.id} className="border-l-2 border-cyan-500/40 pl-3"><div className="flex flex-wrap gap-2 text-xs"><b className="text-slate-200">{targets.find(t=>t.id===r.target_id)?.label??'Target'}</b><span className={r.status==='ok'?'text-emerald-300':'text-amber-300'}>{r.status}</span><span className="text-slate-600">{date(r.checked_at)}</span></div><p className="mt-1 text-sm text-slate-400">{r.summary}</p></div>)}</div>}</section></div>
    </div>
    {error&&<div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}{notice&&<div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}
    <p className="text-xs leading-5 text-slate-500">Phone-number analysis remains metadata-only. A phone number does not reveal live GPS. Existing live-location features must continue to require explicit consent from the person sharing their location.</p>
  </div>;
}
