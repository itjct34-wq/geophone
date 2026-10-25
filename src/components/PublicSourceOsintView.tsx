import React, { useEffect, useMemo, useState } from 'react';
import { AtSign, CheckCircle2, ExternalLink, FileImage, Globe2, MailCheck, Search, ShieldCheck, UserRoundSearch, XCircle } from 'lucide-react';

type EmailState = { state: 'idle' | 'checking' | 'ok' | 'missing' | 'error'; message: string; records: string[] };
const profileSources = [
  { name: 'GitHub', url: (u: string) => `https://github.com/${u}` },
  { name: 'GitLab', url: (u: string) => `https://gitlab.com/${u}` },
  { name: 'Reddit', url: (u: string) => `https://www.reddit.com/user/${u}/` },
  { name: 'Instagram', url: (u: string) => `https://www.instagram.com/${u}/` },
  { name: 'X', url: (u: string) => `https://x.com/${u}` },
  { name: 'TikTok', url: (u: string) => `https://www.tiktok.com/@${u}` },
  { name: 'YouTube', url: (u: string) => `https://www.youtube.com/@${u}` },
  { name: 'Pinterest', url: (u: string) => `https://www.pinterest.com/${u}/` },
  { name: 'Twitch', url: (u: string) => `https://www.twitch.tv/${u}` },
  { name: 'Medium', url: (u: string) => `https://medium.com/@${u}` },
  { name: 'SoundCloud', url: (u: string) => `https://soundcloud.com/${u}` },
  { name: 'Telegram', url: (u: string) => `https://t.me/${u}` },
];

function externalSearch(query: string, engine: 'Google' | 'Bing' | 'DuckDuckGo') {
  const q = encodeURIComponent(query);
  if (engine === 'Google') return `https://www.google.com/search?q=${q}`;
  if (engine === 'Bing') return `https://www.bing.com/search?q=${q}`;
  return `https://duckduckgo.com/?q=${q}`;
}

export function PublicSourceOsintView() {
  const [tab, setTab] = useState<'username' | 'email' | 'image'>('username');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailState, setEmailState] = useState<EmailState>({ state: 'idle', message: '', records: [] });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const validUsername = /^[a-zA-Z0-9_.-]{1,60}$/.test(username.trim());
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const emailDomain = useMemo(() => email.trim().split('@').pop()?.toLowerCase() ?? '', [email]);

  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function checkEmailDomain(event: React.FormEvent) {
    event.preventDefault();
    if (!validEmail) return;
    setEmailState({ state: 'checking', message: 'Checking public DNS MX records…', records: [] });
    try {
      const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(emailDomain)}&type=MX`, {
        headers: { accept: 'application/dns-json' },
      });
      if (!response.ok) throw new Error('The public DNS resolver returned an error.');
      const payload = await response.json() as { Status?: number; Answer?: Array<{ data?: string; type?: number }> };
      if (payload.Status === 3) {
        setEmailState({ state: 'missing', message: 'The domain returned NXDOMAIN. Check the spelling or domain name.', records: [] });
        return;
      }
      const records = (payload.Answer ?? []).filter((record) => record.type === 15 && record.data).map((record) => record.data as string);
      if (records.length) {
        setEmailState({ state: 'ok', message: 'Public MX records were found for this domain. This does not confirm that the mailbox exists or belongs to a particular person.', records });
      } else {
        setEmailState({ state: 'missing', message: 'No MX records were returned. Some domains may accept mail through other DNS configuration, so this alone is not conclusive.', records: [] });
      }
    } catch {
      setEmailState({ state: 'error', message: 'Could not complete the DNS check from this browser. Try again or use another DNS tool.', records: [] });
    }
  }

  const profileQuery = username.trim();
  const exactEmailQuery = email.trim();

  return <div className="space-y-6">
    <header>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"><Search className="h-4 w-4"/>Public-source research</div>
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Username, email & image OSINT</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Review publicly accessible profile links, check email-domain DNS, and look for copies of an image on public websites. This screen does not scrape private accounts, query leaked identity databases, or identify people from facial features.</p>
    </header>

    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3" role="tablist" aria-label="OSINT tools">
      {([{id:'username',label:'Username search',icon:UserRoundSearch},{id:'email',label:'Email & domain',icon:AtSign},{id:'image',label:'Reverse image search',icon:FileImage}] as const).map(item => <button key={item.id} role="tab" aria-selected={tab===item.id} onClick={()=>setTab(item.id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${tab===item.id?'bg-cyan-400 text-slate-950':'border border-slate-700 text-slate-300 hover:bg-slate-900'}`}><item.icon className="h-4 w-4"/>{item.label}</button>)}
    </div>

    {tab==='username' && <section className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <label className="block text-sm font-medium text-slate-200">Username or handle
          <input value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') e.preventDefault();}} placeholder="e.g. public_handle" autoComplete="off" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"/>
        </label>
        <p className="mt-2 text-xs text-slate-500">Opens known public profile URLs so you can verify matches yourself. Platform restrictions mean this tool does not claim a profile exists just because a URL opens.</p>
        {!validUsername && username.trim() && <p className="mt-2 text-xs text-amber-300">Use 1–60 letters, numbers, dots, underscores or hyphens.</p>}
      </div>
      {validUsername && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {profileSources.map(source=><a key={source.name} href={source.url(encodeURIComponent(profileQuery))} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-900"><span>{source.name}<span className="mt-1 block text-xs text-slate-500">Open public profile URL</span></span><ExternalLink className="h-4 w-4 text-cyan-300"/></a>)}
      </div>}
      {validUsername && <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"><h2 className="font-semibold text-white">Search indexed public mentions</h2><p className="mt-1 text-xs leading-5 text-slate-500">These are external searches. The search provider receives the username only after you open a link.</p><div className="mt-3 flex flex-wrap gap-2">{(['Google','Bing','DuckDuckGo'] as const).map(engine=><a key={engine} href={externalSearch(`"${profileQuery}"`,engine)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-cyan-300 hover:bg-slate-800">Search with {engine}</a>)}</div></div>}
    </section>}

    {tab==='email' && <section className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={checkEmailDomain} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <AtSign className="h-7 w-7 text-cyan-300"/>
        <h2 className="text-lg font-semibold text-white">Check an email domain</h2>
        <p className="text-sm leading-6 text-slate-400">This checks email syntax and public DNS mail-exchange (MX) records. It cannot confirm a mailbox, reveal its owner, or confirm delivery.</p>
        <label className="block text-sm text-slate-200">Email address
          <input type="email" required value={email} onChange={e=>{setEmail(e.target.value);setEmailState({state:'idle',message:'',records:[]});}} placeholder="you@example.com" autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"/>
        </label>
        <button disabled={!validEmail||emailState.state==='checking'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"><MailCheck className="h-4 w-4"/>{emailState.state==='checking'?'Checking DNS…':'Check public MX records'}</button>
        {emailState.state!=='idle'&&<div role="status" className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-start gap-2">{emailState.state==='ok'?<CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300"/>:emailState.state==='missing'||emailState.state==='error'?<XCircle className="mt-0.5 h-4 w-4 text-amber-300"/>:null}<p className="text-sm leading-6 text-slate-300">{emailState.message}</p></div>
          {emailState.records.length>0&&<ul className="mt-3 space-y-1">{emailState.records.slice(0,8).map((record,i)=><li key={i} className="break-all font-mono text-xs text-slate-400">{record}</li>)}</ul>}
        </div>}
      </form>
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <ShieldCheck className="h-7 w-7 text-cyan-300"/>
        <h2 className="text-lg font-semibold text-white">Account exposure & public mentions</h2>
        <p className="text-sm leading-6 text-slate-400">Use breach-checking services to assess your own email or an address you are authorised to review. GeoPhone does not ingest stolen databases or return passwords.</p>
        <a href="https://haveibeenpwned.com/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-slate-700 p-4 text-sm text-slate-200 hover:border-cyan-500/50"><span><b>Have I Been Pwned</b><span className="mt-1 block text-xs text-slate-500">Check an email for known breach exposure</span></span><ExternalLink className="h-4 w-4 text-cyan-300"/></a>
        {validEmail&&<a href={externalSearch(`"${exactEmailQuery}"`,'Google')} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-slate-700 p-4 text-sm text-slate-200 hover:border-cyan-500/50"><span><b>Search exact email on Google</b><span className="mt-1 block text-xs text-slate-500">The address is sent to Google only if you click</span></span><ExternalLink className="h-4 w-4 text-cyan-300"/></a>}
        <p className="text-xs leading-5 text-slate-500">An MX record is a domain-level signal only. Never use this screen to test passwords or gain access to accounts.</p>
      </div>
    </section>}

    {tab==='image' && <section className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <FileImage className="h-7 w-7 text-cyan-300"/>
        <h2 className="mt-3 text-lg font-semibold text-white">Select an image on this device</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">The preview stays in this page. GeoPhone does not upload the image; open a provider and submit it there yourself.</p>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-8 text-center hover:border-cyan-500/60">
          <FileImage className="h-8 w-8 text-slate-500"/>
          <span className="mt-3 text-sm font-medium text-slate-200">{imageFile?imageFile.name:'Choose image file'}</span>
          <span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP · image preview only</span>
          <input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files?.[0]??null)} className="sr-only"/>
        </label>
        {imagePreview&&<img src={imagePreview} alt="Selected image preview" className="mt-4 max-h-72 w-full rounded-xl border border-slate-800 object-contain"/>}
        {imageFile&&<button type="button" onClick={()=>setImageFile(null)} className="mt-3 text-xs text-slate-400 hover:text-white">Remove selected image</button>}
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <Globe2 className="h-7 w-7 text-cyan-300"/>
        <h2 className="text-lg font-semibold text-white">Find public appearances of an image</h2>
        <p className="text-sm leading-6 text-slate-400">Reverse-image tools can find the same or similar image and pages where it appears. Review source pages and context; a match does not verify a person's identity.</p>
        <div className="space-y-3">
          {[{name:'Google Lens',url:'https://lens.google.com/',detail:'Find matching and visually similar images'},{name:'TinEye',url:'https://tineye.com/',detail:'Search for copies, crops and edited versions'},{name:'Bing Visual Search',url:'https://www.bing.com/visualsearch',detail:'Find similar images and public pages'}].map(provider=><a key={provider.name} href={provider.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 p-4 transition hover:border-cyan-500/50 hover:bg-slate-950/50"><span><b className="text-sm text-slate-100">{provider.name}</b><span className="mt-1 block text-xs text-slate-500">{provider.detail}</span></span><ExternalLink className="h-4 w-4 shrink-0 text-cyan-300"/></a>)}
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-100/80">Privacy note: GeoPhone does not perform facial recognition to identify a person from a photo. Use images you own or are authorised to investigate, and check each provider's privacy policy before uploading.</div>
      </div>
    </section>}
  </div>;
}
