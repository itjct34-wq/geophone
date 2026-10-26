import React, { startTransition, useEffect, useId, useRef, useState } from 'react';
import { Radio, Lock, LogOut, LogIn, ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { adminListCustomers } from '../services/accessService';
import { useI18n } from '../i18n';
import { LangToggle } from './LangToggle';

export type TabId =
  | 'home'
  | 'signin'
  | 'consent'
  | 'search'
  | 'lookup'
  | 'phoneinfoga'
  | 'caller_check'
  | 'sherlock'
  | 'holehe'
  | 'shodan'
  | 'osint_providers'
  | 'spiderfoot'
  | 'live_gps'
  | 'batch'
  | 'ip'
  | 'god_eye'
  | 'history'
  | 'investigations'
  | 'public_osint'
  | 'resource_hub'
  | 'public_apis'
  | 'campaigns'
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
  /** Needs a signed-in account (personal data); hidden from logged-out visitors. */
  account?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin, hasPaid, signOut } = useAuth();
  const { t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Always close the mega-menu when the active tab changes (belt-and-suspenders with onSelect).
  useEffect(() => {
    setMoreOpen(false);
  }, [activeTab]);

  // Escape closes the menu; click-outside is handled by the full-screen backdrop button.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

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

  /** Two primary product jobs — everything else under More. */
  const primaryTabs: TabDef[] = [
    { id: 'consent', label: 'Consent link', paid: true },
    { id: 'search', label: 'Search resources' },
  ];

  const moreTabs: TabDef[] = (
    [
      { id: 'lookup', label: t('navLookup') },
      { id: 'ip', label: t('navIp') },
      { id: 'live_gps', label: t('navLive'), paid: true },
      { id: 'god_eye', label: t('navGodEye'), paid: true },
      { id: 'public_osint', label: t('navOsint') },
      { id: 'spiderfoot', label: t('navSpiderFoot') },
      { id: 'phoneinfoga', label: t('navPhoneInfoga') },
      { id: 'caller_check', label: t('navCallerCheck') },
      { id: 'sherlock', label: t('navSherlock') },
      { id: 'holehe', label: t('navHolehe') },
      { id: 'shodan', label: t('navShodan') },
      { id: 'osint_providers', label: t('navProviders') },
      { id: 'public_apis', label: 'Public APIs' },
      { id: 'batch', label: t('navBatch'), account: true },
      { id: 'history', label: t('navHistory'), account: true },
      { id: 'resource_hub', label: t('navHub') },
      { id: 'investigations', label: t('navInvest'), paid: true },
      { id: 'campaigns', label: t('navCampaigns'), paid: true },
      ...(user
        ? [isAdmin ? { id: 'admin' as const, label: 'Admin' } : { id: 'plan' as const, label: t('navPlan') }]
        : []),
    ] as TabDef[]
  ).filter((tab) => !tab.account || user);

  const allTabs = [...primaryTabs, ...moreTabs];
  const moreActive = moreTabs.some((tab) => tab.id === activeTab);

  const selectTab = (id: TabId) => {
    // Close the overlay first so it never sticks over the app while a heavy view mounts.
    setMoreOpen(false);
    startTransition(() => setActiveTab(id));
  };

  const content = (tab: TabDef) => (
    <>
      {tab.label}
      {tab.paid && !hasPaid && (
        <Lock className="w-3 h-3 mx-1.5 inline-block align-[-1px] text-slate-400" aria-label="Paid feature" />
      )}
      {tab.id === 'admin' && waiting.requests > 0 && (
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

  const tabButtonClass = (id: TabId, active: boolean) =>
    `transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
      active ? 'text-cyan-400 border-cyan-400 font-semibold' : 'border-transparent hover:text-slate-100'
    }`;

  return (
    <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <header className="flex items-center justify-between gap-4 lg:gap-8 px-4 sm:px-6 py-3 lg:py-4">
        <button
          onClick={() => selectTab(user ? 'search' : 'home')}
          className="flex items-center gap-2 select-none shrink-0"
          aria-label={user ? 'GeoPhone home' : 'GeoPhone, go to home'}
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            GeoPhone Intelligence
          </span>
        </button>

        <nav aria-label="Primary sections" className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-300">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={tabButtonClass(tab.id, activeTab === tab.id)}
            >
              {content(tab)}
            </button>
          ))}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-controls={menuId}
              className={`inline-flex items-center gap-1 ${tabButtonClass('resource_hub', moreActive && !primaryTabs.some((p) => p.id === activeTab))}`}
            >
              More tools
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {moreOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                  aria-label="Close menu"
                  onClick={() => setMoreOpen(false)}
                />
                <div
                  id={menuId}
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 min-w-[14rem] max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain rounded-xl border border-slate-800 bg-slate-950 py-1 shadow-xl"
                >
                  {moreTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="menuitem"
                      onClick={() => selectTab(tab.id)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        activeTab === tab.id ? 'bg-slate-900 text-cyan-300' : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                      }`}
                    >
                      {content(tab)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LangToggle />
          {user ? (
            <button
              onClick={signOut}
              title={`Signed in as ${user.email}`}
              className="flex items-center gap-2 px-3 h-10 text-sm font-medium text-slate-300 hover:text-slate-100 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('signOut')}</span>
              <span className="sm:hidden sr-only">Sign out</span>
            </button>
          ) : (
            <button
              onClick={() => selectTab('signin')}
              className="flex items-center gap-2 px-4 h-10 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile navigation */}
      <nav
        aria-label="Sections"
        className="lg:hidden flex items-center gap-5 px-4 sm:px-6 overflow-x-auto text-sm font-medium text-slate-300 border-t border-slate-800/60"
      >
        {allTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`py-3 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            {content(tab)}
          </button>
        ))}
      </nav>
    </div>
  );
};
