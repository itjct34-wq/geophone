import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Play,
  Terminal,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  ExternalLink,
  Lock
} from 'lucide-react';
import { PhoneLookupResult } from '../types/phone';
import {
  generateExactUserScript,
  generatePythonScript,
  generateStandalonePythonScript,
} from '../services/pythonScriptGenerator';
import { USER_DEFAULT_OPENCAGE_KEY } from '../services/openCageService';

interface PythonScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: PhoneLookupResult;
}

export const PythonScriptModal: React.FC<PythonScriptModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  const [apiKey, setApiKey] = useState(USER_DEFAULT_OPENCAGE_KEY);
  const [isKeyMasked, setIsKeyMasked] = useState(true);
  const [activeTab, setActiveTab] = useState<'userscript' | 'opencage' | 'nominatim' | 'simulation'>('userscript');
  const [copiedPip, setCopiedPip] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simOutput, setSimOutput] = useState<string[]>([]);

  if (!isOpen) return null;

  const pipCommand = 'pip install phonenumbers folium geocoder opencage';
  const targetNumberDigits = (result.e164 || result.rawInput || '').replace(/[^\d+]/g, '');
  const userExactScript = generateExactUserScript(targetNumberDigits, apiKey, isKeyMasked);
  const pythonScript = generatePythonScript(result, apiKey, isKeyMasked);
  const standaloneScript = generateStandalonePythonScript(result);

  const getActiveCode = (): string => {
    switch (activeTab) {
      case 'userscript': return userExactScript;
      case 'nominatim': return standaloneScript;
      case 'opencage':
      default: return pythonScript;
    }
  };

  const handleCopyPip = () => {
    navigator.clipboard.writeText(pipCommand);
    setCopiedPip(true);
    setTimeout(() => setCopiedPip(false), 2000);
  };

  const handleCopyScript = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadPy = () => {
    const code = getActiveCode();
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'userscript' ? 'my_phone_tracker.py' : 'phone_tracker.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRunSimulation = () => {
    setSimulating(true);
    setSimOutput([
      `$ pip install phonenumbers folium geocoder opencage`,
      `Requirement already satisfied: phonenumbers (8.13.35)`,
      `Requirement already satisfied: folium (0.16.0)`,
      `Requirement already satisfied: geocoder (1.38.1)`,
      `Requirement already satisfied: opencage (2.4.0)`,
      `$ python my_phone_tracker.py`,
      `[>] Input prompt: ${targetNumberDigits}: `,
      `[+] Parsing E.164 telecommunications sequence for ${targetNumberDigits}...`,
    ]);

    setTimeout(() => {
      setSimOutput((prev) => [
        ...prev,
        `[+] Location: ${result.regionOrCity}`,
        `[+] Carrier:  ${result.carrier}`,
        `[+] OpenCage Geocoding with key: [HIDDEN & ENCRYPTED]`,
        `[+] Query: '${result.regionOrCity}'`,
      ]);
    }, 450);

    setTimeout(() => {
      setSimOutput((prev) => [
        ...prev,
        `[+] Coordinates: ${result.coordinates.lat.toFixed(6)}, ${result.coordinates.lng.toFixed(6)}`,
        `[+] folium.Map created with CartoDB / OpenStreetMap tiles`,
        `[+] Marker added at [${result.coordinates.lat.toFixed(4)}, ${result.coordinates.lng.toFixed(4)}]`,
        `[✓] my_map.save("location.html")`,
        `[✓] location tracking completed`,
        `[✓] Thank you`,
      ]);
      setSimulating(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Python Script Exporter & Runner
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>phonenumbers</span>
                <span aria-hidden="true">·</span>
                <span>folium</span>
                <span aria-hidden="true">·</span>
                <span>geocoder</span>
                <span aria-hidden="true">·</span>
                <span>opencage</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pip Install Notification Bar */}
        <div className="px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Install command:</span>
            <code className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-cyan-300 font-mono">
              {pipCommand}
            </code>
          </div>
          <button
            onClick={handleCopyPip}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
          >
            {copiedPip ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPip ? 'Copied Command' : 'Copy pip Command'}</span>
          </button>
        </div>

        {/* Tab Controls & Settings */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Segmented Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('userscript')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'userscript'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Your Python Script
            </button>
            <button
              onClick={() => setActiveTab('opencage')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'opencage'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Advanced Folium Script
            </button>
            <button
              onClick={() => setActiveTab('nominatim')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'nominatim'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Zero-Key / Free Nominatim
            </button>
            <button
              onClick={() => {
                setActiveTab('simulation');
                if (simOutput.length === 0) handleRunSimulation();
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'simulation'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Virtual Python Terminal
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyScript(getActiveCode())}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Copied' : 'Copy Python Code'}</span>
            </button>
            <button
              onClick={handleDownloadPy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .py</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Key Privacy Protection Bar */}
          {(activeTab === 'userscript' || activeTab === 'opencage') && (
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">OpenCage API Key Protection:</span>
                <span className="text-slate-400">
                  {isKeyMasked ? 'Hidden & Secured via Environment Variable' : 'Visible in Raw Code'}
                </span>
              </div>

              <button
                onClick={() => setIsKeyMasked(!isKeyMasked)}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors shrink-0"
              >
                {isKeyMasked ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show Key</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide Key</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'userscript' && (
            <div className="space-y-3">
              <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed max-h-[420px]">
                <pre>{userExactScript}</pre>
              </div>
            </div>
          )}

          {activeTab === 'opencage' && (
            <div className="space-y-3">
              <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed max-h-[420px]">
                <pre>{pythonScript}</pre>
              </div>
            </div>
          )}

          {activeTab === 'nominatim' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                This alternative script uses <strong className="text-slate-200">geopy (Nominatim)</strong> so you can run the code immediately without creating an OpenCage API account.
              </div>
              <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed max-h-[420px]">
                <pre>{standaloneScript}</pre>
              </div>
            </div>
          )}

          {activeTab === 'simulation' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Simulating Python 3 execution for {targetNumberDigits}:
                </span>
                <button
                  onClick={handleRunSimulation}
                  disabled={simulating}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs rounded transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{simulating ? 'Executing...' : 'Re-run Simulation'}</span>
                </button>
              </div>

              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300 space-y-1.5 min-h-[300px]">
                {simOutput.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.startsWith('[✓]')
                        ? 'text-emerald-400 font-semibold'
                        : line.startsWith('[+]')
                        ? 'text-cyan-300'
                        : line.startsWith('$')
                        ? 'text-amber-300 font-medium'
                        : 'text-slate-400'
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <div>Python packages: phonenumbers · folium · geocoder · opencage</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
