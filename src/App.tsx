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
const GodEyeView = lazy(() => import('./components/GodEyeView').then((m) => ({ default: m.GodEyeView })));
import { parsePhoneNumber } from './services/phoneParser';
import { generateFoliumHtml } from './services/pythonScriptGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('lookup');
  const [inputNumber, setInputNumber] = useState('');

  // Compute parsed phone intelligence
  const phoneResult = useMemo(() => {
    return parsePhoneNumber(inputNumber);
  }, [inputNumber]);

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
    if (!phoneResult.isValid || !phoneResult.e164) return;
    if (lastSavedRef.current === phoneResult.e164) return;
    const timer = setTimeout(() => {
      lastSavedRef.current = phoneResult.e164 ?? null;
      addHistory(phoneResult).catch((err) => console.warn('[history] save failed:', err));
    }, 1500);
    return () => clearTimeout(timer);
  }, [phoneResult]);

  // Handle URL query params for shareable live tracking links
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const target = params.get('track_target');
      const mode = params.get('mode');
      if (target) {
        setInputNumber(decodeURIComponent(target));
      }
      if (mode === 'live_gps') {
        setActiveTab('live_gps');
      }
    }
  }, []);

  // Export standalone Folium HTML
  const handleExportHtml = () => {
    const html = generateFoliumHtml(phoneResult);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `location_${phoneResult.e164 || 'phone'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSelectBatchNumber = (num: string) => {
    setInputNumber(num);
    setActiveTab('lookup');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Navigation Header adhering to 3-zone contract */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'lookup' && (
          <PhoneLookupView
            inputNumber={inputNumber}
            setInputNumber={setInputNumber}
            result={phoneResult}
                onExportHtml={handleExportHtml}
            onSwitchTab={setActiveTab}
          />
        )}

        {activeTab === 'live_gps' && (
          <LiveHandsetTrackerView currentNumber={inputNumber} />
        )}

        {activeTab === 'batch' && (
          <BatchTrackerView onSelectNumber={handleSelectBatchNumber} />
        )}

        {activeTab === 'ip' && (
          <IpNetworkView
            onOpenGodEye={(target) => {
              setGlobeOverride(target);
              setActiveTab('god_eye');
            }}
          />
        )}

        {activeTab === 'god_eye' && (
          <Suspense fallback={<p className="text-xs text-slate-400 p-6">Loading globe...</p>}>
            <GodEyeView target={globeOverride ?? godEyeTarget} />
          </Suspense>
        )}

        {activeTab === 'history' && <HistoryView onSelectNumber={handleSelectBatchNumber} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">GeoPhone Intelligence</span>
            <span aria-hidden="true">·</span>
            <span>Maps © OpenStreetMap contributors</span>
          </div>

        </div>
      </footer>
    </div>
  );
}
