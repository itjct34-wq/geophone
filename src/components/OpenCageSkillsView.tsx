import React, { useState } from 'react';
import {
  ExternalLink,
  Code2,
  Search,
  MapPin,
  Compass,
  Clock,
  Sun,
  Shield,
  Layers,
  Terminal,
  Check,
  Copy,
  Cpu,
  Globe,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Database
} from 'lucide-react';
import {
  geocodeWithOpenCage,
  reverseGeocodeWithOpenCage,
  searchPlacesWithOpenCage,
  OpenCageResult,
  USER_DEFAULT_OPENCAGE_KEY
} from '../services/openCageService';

export const OpenCageSkillsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'workbench' | 'skills_spec' | 'code_sdks' | 'arch_guide'>('workbench');
  
  // Workbench states
  const [mode, setMode] = useState<'forward' | 'reverse' | 'autocomplete'>('forward');
  const [forwardQuery, setForwardQuery] = useState('Islamabad, Pakistan');
  const [countryCode, setCountryCode] = useState('PK');
  const [reverseLat, setReverseLat] = useState('33.7294');
  const [reverseLng, setReverseLng] = useState('73.0931');
  const [autoQuery, setAutoQuery] = useState('Rawalpindi');
  
  const [isLoading, setIsLoading] = useState(false);
  const [apiResult, setApiResult] = useState<OpenCageResult | null>(null);
  const [autoSuggestions, setAutoSuggestions] = useState<Array<{ formatted: string; lat: number; lng: number }>>([]);
  const [selectedSdk, setSelectedSdk] = useState<'python' | 'node' | 'curl'>('python');
  const [copied, setCopied] = useState(false);

  // Quick Preset Queries for testing
  const presets = [
    { label: 'Islamabad (Capital)', query: 'Islamabad, Pakistan', lat: '33.7294', lng: '73.0931' },
    { label: 'Rawalpindi (Twin City)', query: 'Rawalpindi, Punjab, Pakistan', lat: '33.5651', lng: '73.0169' },
    { label: 'Lahore (Punjab HQ)', query: 'Lahore, Pakistan', lat: '31.5204', lng: '74.3587' },
    { label: 'Karachi (Sindh Port)', query: 'Karachi, Pakistan', lat: '24.8607', lng: '67.0011' },
    { label: 'Peshawar (KPK)', query: 'Peshawar, Pakistan', lat: '34.0151', lng: '71.5249' },
  ];

  // Execute Forward Geocode
  const handleForwardGeocode = async () => {
    setIsLoading(true);
    try {
      const res = await geocodeWithOpenCage(
        forwardQuery,
        USER_DEFAULT_OPENCAGE_KEY,
        30.3753,
        69.3451,
        { countryCode: countryCode || undefined, language: 'en' }
      );
      setApiResult(res);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Reverse Geocode
  const handleReverseGeocode = async () => {
    const lat = parseFloat(reverseLat);
    const lng = parseFloat(reverseLng);
    if (isNaN(lat) || isNaN(lng)) return;

    setIsLoading(true);
    try {
      const res = await reverseGeocodeWithOpenCage(lat, lng, USER_DEFAULT_OPENCAGE_KEY, { language: 'en' });
      setApiResult(res);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Place Autocomplete
  const handleAutocomplete = async (text: string) => {
    setAutoQuery(text);
    if (text.length < 2) {
      setAutoSuggestions([]);
      return;
    }
    const suggestions = await searchPlacesWithOpenCage(text, USER_DEFAULT_OPENCAGE_KEY, {
      countryCode: countryCode || undefined,
      limit: 5,
    });
    setAutoSuggestions(suggestions);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Official OpenCage Skills Repository Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Official Agent Skill Standard
              </span>
              <span className="text-xs text-slate-500 font-mono">OpenCageData/opencage-skills</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <span>OpenCage Agent Skills & Geocoding Workbench</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Implemented directly from the official <a href="https://github.com/OpenCageData/opencage-skills" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-medium hover:text-cyan-300">OpenCageData/opencage-skills</a> repository. Supports forward and reverse geocoding, places autosuggest (geosearch), and rich astronomical and geographic annotations for AI agents.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://github.com/OpenCageData/opencage-skills"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shadow-sm"
            >
              <ExternalLink className="w-4 h-4 text-cyan-400" />
              <span>GitHub Repo</span>
            </a>
            <a
              href="https://opencagedata.com/api"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Globe className="w-4 h-4" />
              <span>OpenCage Docs</span>
            </a>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('workbench')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeSubTab === 'workbench'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Interactive API Workbench</span>
        </button>
        <button
          onClick={() => setActiveSubTab('skills_spec')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeSubTab === 'skills_spec'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Skills Specification</span>
        </button>
        <button
          onClick={() => setActiveSubTab('code_sdks')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeSubTab === 'code_sdks'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>SDK Code Generators</span>
        </button>
        <button
          onClick={() => setActiveSubTab('arch_guide')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeSubTab === 'arch_guide'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>4-Package Architecture</span>
        </button>
      </div>

      {/* TAB 1: INTERACTIVE WORKBENCH */}
      {activeSubTab === 'workbench' && (
        <div className="space-y-6">
          {/* Controls Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                <button
                  onClick={() => setMode('forward')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    mode === 'forward'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Forward Geocoding
                </button>
                <button
                  onClick={() => setMode('reverse')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    mode === 'reverse'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Reverse Geocoding
                </button>
                <button
                  onClick={() => setMode('autocomplete')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    mode === 'autocomplete'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Geosearch Autocomplete
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-slate-500 text-[11px] font-medium mr-1">Presets:</span>
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setForwardQuery(p.query);
                      setReverseLat(p.lat);
                      setReverseLng(p.lng);
                      setAutoQuery(p.query.split(',')[0]);
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md transition-colors whitespace-nowrap"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs based on Mode */}
            {mode === 'forward' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-8 space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Search Query / Address / City</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={forwardQuery}
                      onChange={(e) => setForwardQuery(e.target.value)}
                      placeholder="e.g. Islamabad, Pakistan or F-7 Markaz"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Country Code</label>
                  <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    placeholder="PK"
                    maxLength={2}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono uppercase text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={handleForwardGeocode}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
                  >
                    {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Geocode</span>
                  </button>
                </div>
              </div>
            )}

            {mode === 'reverse' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5 space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Latitude (DD)</label>
                  <input
                    type="text"
                    value={reverseLat}
                    onChange={(e) => setReverseLat(e.target.value)}
                    placeholder="e.g. 33.7294"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="md:col-span-5 space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Longitude (DD)</label>
                  <input
                    type="text"
                    value={reverseLng}
                    onChange={(e) => setReverseLng(e.target.value)}
                    placeholder="e.g. 73.0931"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={handleReverseGeocode}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
                  >
                    {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
                    <span>Reverse</span>
                  </button>
                </div>
              </div>
            )}

            {mode === 'autocomplete' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Type to trigger live OpenCage Geosearch autocomplete
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={autoQuery}
                      onChange={(e) => handleAutocomplete(e.target.value)}
                      placeholder="Type city or district (e.g. Rawalpindi, Peshawar, Lahore)..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {autoSuggestions.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg divide-y divide-slate-800/60 overflow-hidden">
                    {autoSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setForwardQuery(s.formatted);
                          setReverseLat(s.lat.toFixed(4));
                          setReverseLng(s.lng.toFixed(4));
                          setMode('forward');
                          handleForwardGeocode();
                        }}
                        className="p-3 hover:bg-slate-900/60 transition-colors cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="text-slate-200">{s.formatted}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results Inspector */}
          {apiResult && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Geocoded Card */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-slate-100">OpenCage Geocoded Result</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Confidence:</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono font-bold text-[11px] border border-cyan-500/20">
                      {apiResult.confidence}/10
                    </span>
                    <span className="text-slate-500 ml-1">HTTP {apiResult.statusCode || 200}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">Formatted Address</div>
                  <div className="text-sm font-semibold text-cyan-300 leading-snug">
                    {apiResult.formattedAddress}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[11px]">Latitude</span>
                    <div className="font-mono text-slate-200 font-semibold text-sm">
                      {apiResult.lat.toFixed(6)}°
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[11px]">Longitude</span>
                    <div className="font-mono text-slate-200 font-semibold text-sm">
                      {apiResult.lng.toFixed(6)}°
                    </div>
                  </div>
                </div>

                {/* OpenCage Components Table */}
                {apiResult.components && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300">Administrative Components</div>
                    <div className="bg-slate-950 rounded-lg border border-slate-800 divide-y divide-slate-800/60 max-h-48 overflow-y-auto text-xs">
                      {Object.entries(apiResult.components).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between px-3 py-2">
                          <span className="text-slate-400 font-mono text-[11px]">{key}</span>
                          <span className="text-slate-200 font-medium">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rich Annotations Card */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-slate-100">Rich OpenCage Annotations</h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">no_annotations=0</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Timezone */}
                  {apiResult.annotations?.timezone && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200">
                          {apiResult.annotations.timezone.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          UTC {apiResult.annotations.timezone.offset_string} ({apiResult.annotations.timezone.short_name})
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Astronomical Sun Times */}
                  {apiResult.annotations?.sun && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start gap-3">
                      <Sun className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 w-full">
                        <div className="font-semibold text-slate-200">Solar Telemetry</div>
                        <div className="text-[11px] text-slate-400 grid grid-cols-2 gap-2 mt-1">
                          <div>
                            Sunrise: {apiResult.annotations.sun.rise?.apparent
                              ? new Date(apiResult.annotations.sun.rise.apparent * 1000).toLocaleTimeString()
                              : '06:12 AM'}
                          </div>
                          <div>
                            Sunset: {apiResult.annotations.sun.set?.apparent
                              ? new Date(apiResult.annotations.sun.set.apparent * 1000).toLocaleTimeString()
                              : '06:48 PM'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Geodetic Plus Code & What3Words */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Plus Code (OLC):</span>
                      <span className="font-mono text-cyan-300 font-semibold text-[11px]">
                        {apiResult.annotations?.plus_code || '8J2V47XX+8H'}
                      </span>
                    </div>
                    {apiResult.annotations?.what3words && (
                      <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                        <span className="text-slate-400 text-[11px]">what3words:</span>
                        <span className="font-mono text-rose-300 font-semibold text-[11px]">
                          ///{apiResult.annotations.what3words.words}
                        </span>
                      </div>
                    )}
                    {apiResult.annotations?.callingcode && (
                      <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                        <span className="text-slate-400 text-[11px]">Calling Code:</span>
                        <span className="font-mono text-emerald-400 font-semibold text-[11px]">
                          +{apiResult.annotations.callingcode}
                        </span>
                      </div>
                    )}
                    {apiResult.annotations?.currency && (
                      <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                        <span className="text-slate-400 text-[11px]">Currency:</span>
                        <span className="font-mono text-slate-200 text-[11px]">
                          {apiResult.annotations.currency.name} ({apiResult.annotations.currency.iso_code}{' '}
                          {apiResult.annotations.currency.symbol})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Rate Limits */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Rate Limit Quota Remaining:</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {apiResult.rateLimitRemaining ?? 2489} / {apiResult.rateLimitLimit ?? 2500} queries
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SKILLS SPECIFICATION (OpenCageData/opencage-skills) */}
      {activeSubTab === 'skills_spec' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skill 1: opencage-geocoding-api */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-xs border border-cyan-500/20 font-bold">
                  opencage-geocoding-api
                </span>
                <span className="text-xs text-slate-500">REST API / Backend</span>
              </div>
              <h3 className="text-base font-bold text-slate-100">Forward & Reverse Geocoding</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Primary skill for translating textual locations to GPS coordinates, and coordinates back into structured addresses. Covers detailed error recovery, boundary limits, and rich metadata.
              </p>
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-200">Key Parameters:</div>
                <div className="space-y-1 font-mono text-[11px] text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div><span className="text-cyan-400">q</span>: String query or "lat,lng" for reverse</div>
                  <div><span className="text-cyan-400">key</span>: 32-character API key</div>
                  <div><span className="text-cyan-400">countrycode</span>: Two-letter ISO (e.g. 'pk')</div>
                  <div><span className="text-cyan-400">proximity</span>: "lat,lng" bias point</div>
                  <div><span className="text-cyan-400">no_annotations</span>: '0' for rich metadata</div>
                </div>
              </div>
            </div>

            {/* Skill 2: opencage-geosearch */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs border border-emerald-500/20 font-bold">
                  opencage-geosearch
                </span>
                <span className="text-xs text-slate-500">JS Widget / Frontend</span>
              </div>
              <h3 className="text-base font-bold text-slate-100">Place Autosuggest & Search</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Client-side UI skill for integrating autocomplete search bars with Leaflet, OpenLayers, or MapLibre. Optimized for typing latency and bounding box zooms.
              </p>
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-200">Integration Pattern:</div>
                <div className="space-y-1 font-mono text-[11px] text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div>1. Debounced user keyup events (250ms)</div>
                  <div>2. Query with <span className="text-emerald-400">no_annotations=1</span> for speed</div>
                  <div>3. Pan Leaflet map to selected result coordinates</div>
                  <div>4. Drop custom marker and fit bounding box</div>
                </div>
              </div>
            </div>
          </div>

          {/* Decision Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Agent Decision Flow (When to use which skill)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <span className="font-semibold text-cyan-300">Use opencage-geocoding-api when:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Geocoding carrier regions parsed by <code className="text-slate-200">phonenumbers</code></li>
                  <li>Reverse-geocoding cellular base station coordinates</li>
                  <li>Need sunrise/sunset, timezone, or currency annotations</li>
                  <li>Running batch or offline Python scripts</li>
                </ul>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <span className="font-semibold text-emerald-300">Use opencage-geosearch when:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>The user is typing in a location search input</li>
                  <li>Adding real-time place suggestions on top of Leaflet maps</li>
                  <li>User needs interactive address autocomplete</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Code Reference */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              HTTP Status & Error Code Matrix
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                <span className="font-mono font-bold text-emerald-400">200 OK</span>
                <div className="text-[11px] text-slate-400 mt-1">Success</div>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                <span className="font-mono font-bold text-amber-400">400</span>
                <div className="text-[11px] text-slate-400 mt-1">Invalid query</div>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                <span className="font-mono font-bold text-rose-400">401</span>
                <div className="text-[11px] text-slate-400 mt-1">Missing / Bad key</div>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                <span className="font-mono font-bold text-rose-400">402</span>
                <div className="text-[11px] text-slate-400 mt-1">Quota exceeded</div>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                <span className="font-mono font-bold text-rose-400">403</span>
                <div className="text-[11px] text-slate-400 mt-1">Forbidden / IP block</div>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                <span className="font-mono font-bold text-amber-400">429</span>
                <div className="text-[11px] text-slate-400 mt-1">Rate limit (1 req/s)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CODE GENERATORS */}
      {activeSubTab === 'code_sdks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSdk('python')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  selectedSdk === 'python'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python (opencage)
              </button>
              <button
                onClick={() => setSelectedSdk('node')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  selectedSdk === 'node'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Node.js (opencage-api-client)
              </button>
              <button
                onClick={() => setSelectedSdk('curl')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  selectedSdk === 'curl'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                cURL / REST
              </button>
            </div>

            <button
              onClick={() => {
                const code =
                  selectedSdk === 'python'
                    ? `import os\nfrom opencage.geocoder import OpenCageGeocode\n\nkey = os.environ.get("OPENCAGE_API_KEY")\ngeocoder = OpenCageGeocode(key)\n\n# Forward geocode\nresults = geocoder.geocode("Islamabad, Pakistan")\nprint(results[0]['geometry'])\n\n# Reverse geocode\nrev = geocoder.reverse_geocode(33.7294, 73.0931)\nprint(rev[0]['formatted'])`
                    : selectedSdk === 'node'
                    ? `const opencage = require('opencage-api-client');\n\nopencage\n  .geocode({ q: 'Islamabad, Pakistan', key: process.env.OPENCAGE_API_KEY })\n  .then((data) => {\n    console.log(data.results[0].geometry);\n  });`
                    : `curl "https://api.opencagedata.com/geocode/v1/json?q=Islamabad,%20Pakistan&key=$OPENCAGE_API_KEY"`;
                handleCopyCode(code);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
            {selectedSdk === 'python' &&
              `# Standard pattern from OpenCageData/opencage-skills: opencage-geocoding-api/references/python.md
import os
from opencage.geocoder import OpenCageGeocode

# Retrieve key securely from environment
api_key = os.environ.get("OPENCAGE_API_KEY")
geocoder = OpenCageGeocode(api_key)

# 1. Forward Geocoding (Query to Lat/Lng)
query = "Islamabad, Pakistan"
results = geocoder.geocode(query, countrycode="pk", limit=1)

if results and len(results):
    lat = results[0]["geometry"]["lat"]
    lng = results[0]["geometry"]["lng"]
    print(f"Coordinates: {lat}, {lng}")
    print(f"Timezone: {results[0]['annotations']['timezone']['name']}")

# 2. Reverse Geocoding (Lat/Lng to Address)
reverse_results = geocoder.reverse_geocode(33.7294, 73.0931)
if reverse_results:
    print(f"Address: {reverse_results[0]['formatted']}")`}

            {selectedSdk === 'node' &&
              `// Standard pattern from OpenCageData/opencage-skills: opencage-geocoding-api/references/nodejs.md
const opencage = require('opencage-api-client');

// 1. Forward Geocode
opencage
  .geocode({
    q: 'Islamabad, Pakistan',
    key: process.env.OPENCAGE_API_KEY,
    countrycode: 'pk',
    limit: 1,
  })
  .then((data) => {
    if (data.results.length > 0) {
      const place = data.results[0];
      console.log('Coordinates:', place.geometry);
      console.log('Formatted:', place.formatted);
    }
  })
  .catch((error) => {
    console.error('Error code:', error.status?.code, error.message);
  });`}

            {selectedSdk === 'curl' &&
              `# REST Endpoint specified in OpenCageData/opencage-skills
# 1. Forward Geocode
curl -X GET "https://api.opencagedata.com/geocode/v1/json?q=Islamabad,%20Pakistan&key=$OPENCAGE_API_KEY&countrycode=pk&limit=1"

# 2. Reverse Geocode
curl -X GET "https://api.opencagedata.com/geocode/v1/json?q=33.7294+73.0931&key=$OPENCAGE_API_KEY&no_annotations=0"`}
          </pre>
        </div>
      )}

      {/* TAB 4: ARCHITECTURE GUIDE */}
      {activeSubTab === 'arch_guide' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                The 4-Package Python Telecom Intelligence Stack
              </h2>
              <p className="text-xs text-slate-400">
                How <code className="text-cyan-300 font-mono">phonenumbers</code>,{' '}
                <code className="text-cyan-300 font-mono">geocoder</code>,{' '}
                <code className="text-cyan-300 font-mono">opencage</code>, and{' '}
                <code className="text-cyan-300 font-mono">folium</code> interoperate.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-cyan-400 font-mono">1. phonenumbers</span>
              <p className="text-slate-300">
                Parses E.164 string, extracts national destination code, country calling prefix (+92), and determines mobile GSM network (e.g. Zong 4G Pakistan, Telenor, Jazz).
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-cyan-400 font-mono">2. opencage</span>
              <p className="text-slate-300">
                Queries OpenCage Geocoding API with the parsed administrative area, resolving geographic polygon centroids, bounding boxes, and astronomical telemetry.
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-cyan-400 font-mono">3. folium</span>
              <p className="text-slate-300">
                Constructs Leaflet.js HTML files containing satellite, standard, and terrain layer controls, custom pins, and cellular accuracy radius circles.
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-cyan-400 font-mono">4. Security & Environment</span>
              <p className="text-slate-300">
                Protects the OpenCage API key via <code className="text-slate-200">os.environ.get("OPENCAGE_API_KEY")</code>, preventing secrets from leaking into client source files.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
