/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Navbar, type TabId } from './components/Navbar';
import { HistoryView } from './components/HistoryView';
import { IpNetworkView } from './components/IpNetworkView';
import { addHistory } from './services/dataService';
import { PhoneLookupView } from './components/PhoneLookupView';
import { LiveHandsetTrackerView } from './components/LiveHandsetTrackerView';
import { BatchTrackerView } from './components/BatchTrackerView';
import { PlanView } from './components/PlanView';
import { AdminView } from './components/AdminView';
import { LockedFeature } from './components/LockedFeature';
import { InvestigationCenter } from './components/InvestigationCenter';
import { PublicSourceOsintView } from './components/PublicSourceOsintView';
import { PublicResourceHub } from './components/PublicResourceHub';
import { CampaignCenter } from './components/CampaignCenter';
import { TermsGate } from './components/TermsGate';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { UsageMeter } from './components/UsageMeter';
import { useAuth } from './auth/AuthContext';
import { canUse, consumeUsage, usageLimitMessage } from './services/usageLimits';
const GodEyeView = lazy(() => import('./components/GodEyeView').then((m) => ({ default: m.GodEyeView })));
import { parsePhoneNumber } from './services/phoneParser';
import { Info, ShieldCheck } from 'lucide-react';

/** Tabs that require a signed-in account; a logged-out visitor is sent home instead. */
const ACCOUNT_TABS: TabId[] = ['batch', 'history', 'plan', 'admin'];

export default function App() {
  const { user, isAdmin, hasPaid } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>(user ? 'lookup' : 'home');
  const [inputNumber, setInputNumber] = useState('');
  const [usageTick, setUsageTick] = useState(0);
  const [lookupBlocked, setLookupBlocked] = useState(false);

  // Keep the active tab consistent with the sign-in state.
  React.useEffect(() => {
    if (user && activeTab === 'signin') setActiveTab('lookup');
    if (!user && ACCOUNT_TABS.includes(activeTab)) setActiveTab('home');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Compute parsed phone intelligence
  const phoneResult = useMemo(() => {
    return parsePhoneNumber(inputNumber);
  }, [inputNumber]);

  // Freemium: count distinct valid numbers per UTC day for free / anonymous users.
  React.useEffect(() => {
    if (hasPaid) {
      setLookupBlocked(false);
      return;
    }
    if (!phoneResult.isValid || !phoneResult.e164) {
      setLookupBlocked(false);
      return;
    }
    if (!canUse('phone_lookup', false, phoneResult.e164)) {
      setLookupBlocked(true);
      return;
    }
    consumeUsage('phone_lookup', phoneResult.e164);
    setLookupBlocked(false);
    setUsageTick((n) => n + 1);
  }, [phoneResult.e164, phoneResult.isValid, hasPaid]);

  // A position sent to the globe from another tab (e.g. an IP lookup) wins over the number's
  const [globeOverride, setGlobeOverride] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // A newly entered number takes the globe back from an IP lookup
  React.useEffect(() => {
    setGlobeOverride(null);
  }, [phoneResult.e164]);

  // Stable target for the God Eye globe (only changes when the number does)
  const godEyeTarget = useMemo(
    () =>
      phoneResult.isValid
        ? { lat: phoneResult.coordinates.lat, lng: phoneResult.coordinates.lng, label: phoneResult.coordinates.displayName || phoneResult.e164 || '' }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phoneResult.e164, phoneResult.isValid],
  );

  // Save valid lookups to the user's history once typing settles
  const lastSavedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!user) return; // history is per-account; logged-out lookups are not saved
    if (lookupBlocked && !hasPaid) return;
    if (!phoneResult.isValid || !phoneResult.e164) return;
    if (lastSavedRef.current === phoneResult.e164) return;
    const timer = setTimeout(() => {
      lastSavedRef.current = phoneResult.e164 ?? null;
      addHistory(phoneResult).catch((err) => console.warn('[history] save failed:', err));
    }, 1500);
    return () => clearTimeout(timer);
  }, [phoneResult, user, lookupBlocked, hasPaid]);

  // Handle URL query params for shareable live tracking links
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const target = params.get('track_target');
      const mode = params.get('mode');
      if (target) {
        setInputNumber(target);
      }
      if (mode === 'live_gps') {
        setActiveTab('live_gps');
      }
    }
  }, []);

  const handleSelectBatchNumber = (num: string) => {
    setInputNumber(num);
    setActiveTab('lookup');
  };

  const openSignIn = () => setActiveTab('signin');

  // Logged-out visitors get the public marketing page and the sign-in screen.
  if (!user && activeTab === 'home') {
    return (
      <LandingPage
        onSignIn={openSignIn}
        onGetStarted={openSignIn}
        onOpenTool={(tab) => setActiveTab(tab)}
      />
    );
  }
  if (!user && activeTab === 'signin') {
    return <LoginPage onBack={() => setActiveTab('home')} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 text-emerald-300/90 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Public metadata &amp; consent-based location
          </span>
          <span className="hidden sm:inline text-slate-700" aria-hidden="true">
            ·
          </span>
          <span className="inline-flex items-start gap-1.5 leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" aria-hidden="true" />
            Carrier / MCC-MNC and OpenCelliD-style tower data are not live handset tracking. Location maps require the
            person&apos;s agreement.
          </span>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <TermsGate />

        {activeTab === 'lookup' && (
          <div className="space-y-4">
            <UsageMeter feature="phone_lookup" hasPaid={hasPaid} refreshKey={usageTick} />
            {lookupBlocked && !hasPaid && (
              <div
                role="status"
                className="rounded-xl border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100 space-y-2"
              >
                <p>{usageLimitMessage('phone_lookup')}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab(user ? 'plan' : 'signin')}
                  className="h-9 px-3 text-xs font-semibold rounded-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                >
                  {user ? 'See paid plan' : 'Sign in to upgrade'}
                </button>
              </div>
            )}
            <PhoneLookupView
              inputNumber={inputNumber}
              setInputNumber={setInputNumber}
              result={phoneResult}
              enrichmentAllowed={hasPaid || !lookupBlocked}
              onSwitchTab={setActiveTab}
              onOpenGodEye={(target) => {
                setGlobeOverride(target);
                setActiveTab('god_eye');
              }}
            />
          </div>
        )}

        {activeTab === 'live_gps' &&
          (hasPaid ? (
            <LiveHandsetTrackerView currentNumber={inputNumber} />
          ) : (
            <LockedFeature
              title="Live GPS and towers are part of paid access"
              description="Send a consent link to see where a person is when they agree to share, with live updates and their last known position. Also includes the cell tower map and triangulation via OpenCelliD / BeaconDB."
              onSignIn={openSignIn}
            />
          ))}

        {activeTab === 'batch' && <BatchTrackerView onSelectNumber={handleSelectBatchNumber} />}

        {activeTab === 'ip' && (
          <IpNetworkView
            onOpenGodEye={(target) => {
              setGlobeOverride(target);
              setActiveTab('god_eye');
            }}
            onUsageChange={() => setUsageTick((n) => n + 1)}
            usageTick={usageTick}
            onRequestUpgrade={() => setActiveTab(user ? 'plan' : 'signin')}
          />
        )}

        {activeTab === 'god_eye' &&
          (hasPaid ? (
            <Suspense
              fallback={
                <div role="status" className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
                  Loading globe…
                </div>
              }
            >
              <GodEyeView target={globeOverride ?? godEyeTarget} />
            </Suspense>
          ) : (
            <LockedFeature
              title="The God Eye globe is part of paid access"
              description="A 3D satellite globe that flies to the places you look up, with terrain, labels and orbit."
              onSignIn={openSignIn}
            />
          ))}

        {activeTab === 'history' && <HistoryView onSelectNumber={handleSelectBatchNumber} />}

        {activeTab === 'investigations' &&
          (hasPaid ? (
            <InvestigationCenter />
          ) : (
            <LockedFeature
              title="Investigations and monitoring are part of paid access"
              description="Track public domain and IP records over time and keep a clear history of what changed, with automatic rechecks."
              onSignIn={openSignIn}
            />
          ))}

        {activeTab === 'public_osint' && <PublicSourceOsintView />}

        {activeTab === 'resource_hub' && <PublicResourceHub />}

        {activeTab === 'campaigns' &&
          (hasPaid ? (
            <CampaignCenter />
          ) : (
            <LockedFeature
              title="Campaigns and SMS are part of paid access"
              description="Create expiring short links and send them to your own verified numbers by SMS. Sending messages uses a paid provider."
              onSignIn={openSignIn}
            />
          ))}

        {activeTab === 'plan' && !isAdmin && <PlanView />}

        {activeTab === 'admin' && isAdmin && <AdminView />}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-400">GeoPhone Intelligence</span>
            <span aria-hidden="true">·</span>
            <span>Maps © OpenStreetMap contributors</span>
            <span aria-hidden="true">·</span>
            <span>Towers via OpenCelliD / BeaconDB when configured</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/terms" className="hover:text-slate-300 transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
