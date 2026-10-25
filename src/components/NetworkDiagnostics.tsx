import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

/**
 * A visitor-controlled helper for checking their own public network information.
 * It does not request network data in the background or send diagnostics to GeoPhone.
 */
function describeBrowserAndSystem(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' :
    /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) ? 'Safari' : 'Unknown browser';
  const system = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
    /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' : 'Unknown system';
  return `${browser} on ${system}`;
}

export function NetworkDiagnostics() {
  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Optional network information</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Your browser/system estimate is shown here only. GeoPhone does not collect or transmit it through this tool.
            To check your public IP and approximate network area, you can choose to open the external checker below.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Browser and system estimate</p>
        <p className="mt-1 text-sm text-slate-200">{describeBrowserAndSystem()}</p>
        <p className="mt-1 text-[11px] text-slate-500">Estimated from browser-provided information; not a unique device identifier.</p>
      </div>
      <a
        href="https://ipinfo.io/what-is-my-ip"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-700/70 px-3 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-950/40"
      >
        Open public-IP checker <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
      <p className="text-[11px] leading-5 text-slate-500">
        The external service receives your IP when you visit it. IP-based location is approximate and may show a VPN, proxy, or mobile-carrier gateway, not your GPS position. This page cannot read an IMEI.
      </p>
    </section>
  );
}
