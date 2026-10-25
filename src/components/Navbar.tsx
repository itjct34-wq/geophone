import React, { useEffect, useState } from 'react';
import { Radio, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { adminListCustomers } from '../services/accessService';

export type TabId =
  | 'lookup'
  | 'live_gps'
  | 'batch'
  | 'ip'
  | 'god_eye'
  | 'history'
  | 'investigations'
  | 'public_osint'
  | 'resource_hub'
  | 'plan'
  | 'admin'
  | 'python'
  | 'guide';

interface NavbarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

interface TabDef {
  id: TabId;
  label: string;
  /** Needs paid access; shown with a lock while the customer is on the free plan. */
  paid?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin, hasPaid, signOut } = useAuth();

  // Admin: how many customers are waiting, and whether any say they have paid
  const [waiting, setWaiting] = useState({ requests: 0, paid: 0 });
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const check = () =>
      adminListCustomers()
        .then((rows) => {
          if (cancelled) return;
          setWaiting({
            requests: rows.filter((r) => r.requested_at).length,
            paid: rows.filter((r) => r.paid_claimed_at).length,
          });
        })
        .catch(() => undefined);
    check();
    const id = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAdmin, activeTab]);

  const tabs: TabDef[] = [
    { id: 'lookup', label: 'Single Lookup' },
    { id: 'live_gps', label: 'Live GPS & Towers', paid: true },
    { id: 'batch', label: 'Batch Analysis' },
    { id: 'ip', label: 'IP & Network' },
    { id: 'god_eye', label: 'God Eye', paid: true },
    { id: 'history', label: 'History' },
    { id: 'investigations', label: 'Investigations' },
    { id: 'public_osint', label: 'Username / Email / Image' },
    { id: 'resource_hub', label: 'Resource Hub' },
    isAdmin ? { id: 'admin', label: 'Customers' } : { id: 'plan', label: 'Plan' },
  ];

  const content = (t: TabDef) => (
    <>
      {t.label}
      {t.paid && !hasPaid && (
        <Lock className="w-3 h-3 ml-1.5 inline-block align-[-1px] text-slate-400" aria-label="Paid feature" />
      )}
      {t.id === 'admin' && waiting.requests > 0 && (
        <span
          className={`ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold text-slate-950 ${
            waiting.paid > 0 ? 'bg-emerald-400' : 'bg-amber-300'
          }`}
          aria-label={`${waiting.requests} waiting${waiting.paid > 0 ? `, ${waiting.paid} say they have paid` : ''}`}
        >
          {waiting.requests}
        </span>
      )}
    </>
  );

  return (
    <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <header className="flex items-center justify-between gap-4 lg:gap-8 px-4 sm:px-6 py-3 lg:py-4">
        <button
          onClick={() => setActiveTab('lookup')}
          className="flex items-center gap-2 select-none shrink-0"
          aria-label="GeoPhone, go to Single Lookup"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            GeoPhone Intelligence
          </span>
        </button>

        <nav aria-label="Sections" className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              aria-current={activeTab === t.id ? 'page' : undefined}
              className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                activeTab === t.id
                  ? 'text-cyan-400 border-cyan-400 font-semibold'
                  : 'border-transparent hover:text-slate-100'
              }`}
            >
              {content(t)}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={signOut}
            title={`Signed in as ${user?.email}`}
            className="flex items-center gap-2 px-3 h-10 text-sm font-medium text-slate-300 hover:text-slate-100 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
            <span className="sm:hidden sr-only">Sign out</span>
          </button>
        </div>
      </header>

      {/* Mobile navigation (the desktop links above are hidden below lg) */}
      <nav
        aria-label="Sections"
        className="lg:hidden flex items-center gap-5 px-4 sm:px-6 overflow-x-auto text-sm font-medium text-slate-300 border-t border-slate-800/60"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            aria-current={activeTab === t.id ? 'page' : undefined}
            className={`py-3 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
              activeTab === t.id
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            {content(t)}
          </button>
        ))}
      </nav>
    </div>
  );
};
