/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Navbar, type TabId } from './components/Navbar';
import { HistoryView } from './components/HistoryView';
import { addHistory } from './services/dataService';
import { PhoneLookupView } from './components/PhoneLookupView';
import { LiveHandsetTrackerView } from './components/LiveHandsetTrackerView';
import { BatchTrackerView } from './components/BatchTrackerView';
import { OpenCageGuide } from './components/OpenCageGuide';
import { OpenCageSkillsView } from './components/OpenCageSkillsView';
import { PythonScriptModal } from './components/PythonScriptModal';
const GodEyeView = lazy(() => import('./components/GodEyeView').then((m) => ({ default: m.GodEyeView })));
import { parsePhoneNumber } from './services/phoneParser';
import { generateFoliumHtml } from './services/pythonScriptGenerator';
import { Terminal, Download, Globe, Shield, Code, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('lookup');
  const [inputNumber, setInputNumber] = useState('');
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);

  // Compute parsed phone intelligence
  const phoneResult = useMemo(() => {
    return parsePhoneNumber(inputNumber);
  }, [inputNumber]);

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
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
        onExportHtml={handleExportHtml}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'lookup' && (
          <PhoneLookupView
            inputNumber={inputNumber}
            setInputNumber={setInputNumber}
            result={phoneResult}
            onOpenPythonModal={() => setIsPythonModalOpen(true)}
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

        {activeTab === 'god_eye' && (
          <Suspense fallback={<p className="text-xs text-slate-400 p-6">Loading globe...</p>}>
            <GodEyeView target={godEyeTarget} />
          </Suspense>
        )}

        {activeTab === 'history' && <HistoryView onSelectNumber={handleSelectBatchNumber} />}

        {activeTab === 'python' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    The 4-Package Python Geocoding & Folium Stack
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Everything you need to run the Python phone tracker script locally with <code className="text-cyan-300 font-mono">phonenumbers</code>, <code className="text-cyan-300 font-mono">folium</code>, <code className="text-cyan-300 font-mono">geocoder</code>, and <code className="text-cyan-300 font-mono">opencage</code>.
                  </p>
                </div>
                <button
                  onClick={() => setIsPythonModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Terminal className="w-4 h-4" />
                  <span>Launch Python Exporter & Runner</span>
                </button>
              </div>
            </div>

            <OpenCageGuide />
          </div>
        )}

        {activeTab === 'guide' && <OpenCageSkillsView />}
      </main>

      {/* Python Script Modal with interactive terminal & export */}
      <PythonScriptModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
        result={phoneResult}
      />

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
