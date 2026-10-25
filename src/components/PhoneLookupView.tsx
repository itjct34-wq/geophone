import React, { useEffect, useState, useRef } from 'react';
import {
  Clock,
  Compass,
  Copy,
  Globe,
  MapPin,
  Phone,
  Radio,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Check,
  CheckCircle2,
  AlertCircle,
  Key,
  RefreshCw,
  ExternalLink,
  Play,
  Pause,
  Download,
  Flame,
  HelpCircle,
  Info,
  Crosshair,
  Share2,
  LocateFixed,
  Smartphone
} from 'lucide-react';
import { PhoneLookupResult, PresetNumber } from '../types/phone';
import { PRESET_NUMBERS } from '../data/phoneData';
import { FoliumMapView } from './FoliumMapView';
import {
  geocodeWithOpenCage,
  reverseGeocodeWithOpenCage,
  USER_DEFAULT_OPENCAGE_KEY,
  OpenCageResult
} from '../services/openCageService';
import { LiveTrackingShareModal } from './LiveTrackingShareModal';
import { LastKnownLocationCard } from './LastKnownLocationCard';
import { NumberActivityCard } from './NumberActivityCard';
import {
  getLastKnownLocation,
  savePastedLocation,
  timeAgo,
  type LastKnownLocation,
} from '../services/lastLocationService';
import { parseSharedLocation } from '../services/locationParser';
import { resolvePlusCode, isPlusCode, ResolvedPlusCode } from '../services/plusCodeService';

interface PhoneLookupViewProps {
  inputNumber: string;
  setInputNumber: (num: string) => void;
  result: PhoneLookupResult;
  onExportHtml: () => void;
  onSwitchTab?: (tab: 'lookup' | 'live_gps' | 'batch' | 'python' | 'guide') => void;
  onOpenGodEye?: (target: { lat: number; lng: number; label: string }) => void;
}

interface PipelineStep {
  id: number;
  label: string;
  codeSnippet: string;
  output: string;
  status: 'pending' | 'running' | 'completed';
}

export const PhoneLookupView: React.FC<PhoneLookupViewProps> = ({
  inputNumber,
  setInputNumber,
  result,
  onExportHtml,
  onSwitchTab,
  onOpenGodEye,
}) => {
  // Last position the person shared for this number through a consent link
  const [lastKnown, setLastKnown] = useState<LastKnownLocation | null>(null);
  const [lastKnownRefresh, setLastKnownRefresh] = useState(0);

  // Saves a location the user pasted (a WhatsApp or map link, coordinates or a Plus Code)
  const handleSavePasted = async (text: string): Promise<string | null> => {
    const parsed = parseSharedLocation(text);
    if ('error' in parsed) return parsed.error;
    if (!result.e164) return 'Enter a valid number first.';
    try {
      await savePastedLocation(result.e164, parsed.lat, parsed.lng);
      setLastKnownRefresh((n) => n + 1);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Could not save the location.';
    }
  };

  useEffect(() => {
    setLastKnown(null);
    const e164 = result.e164;
    if (!result.isValid || !e164) return;
    let cancelled = false;
    const load = () =>
      getLastKnownLocation(e164)
        .then((l) => !cancelled && setLastKnown(l))
        .catch(() => undefined);
    load();
    const id = setInterval(load, 10000); // keeps a live share moving
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [result.e164, result.isValid, lastKnownRefresh]);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [openCageKey] = useState<string>(USER_DEFAULT_OPENCAGE_KEY);
  const [openCageData, setOpenCageData] = useState<OpenCageResult | null>(null);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  // Known Pakistani cities, matched automatically against the number's region
  const KNOWN_CITIES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Faisalabad', 'Multan'];
  const cityOverride = React.useMemo(() => {
    if (result.countryCode !== 'PK') return null;
    const text = ` ${result.regionOrCity ?? ''}`.toLowerCase();
    return KNOWN_CITIES.find((c) => text.includes(c.toLowerCase())) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.countryCode, result.subAllocation, result.regionOrCity]);

  // Modals state for Why OpenCage and WhatsApp/SMS Live Tracking Share
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Google Plus Code location (user-entered; nothing is pre-filled)
  const [plusCodeInput, setPlusCodeInput] = useState<string>('');
  const [activePlusCodeFix, setActivePlusCodeFix] = useState<ResolvedPlusCode | null>(null);
  const [isPlusCodeActive, setIsPlusCodeActive] = useState<boolean>(false);
  const [plusCodeError, setPlusCodeError] = useState<string | null>(null);

  const handleApplyPlusCode = (customCode?: string) => {
    const target = (customCode || plusCodeInput).trim();
    setPlusCodeError(null);
    const resolved = resolvePlusCode(target);
    if (resolved) {
      setActivePlusCodeFix(resolved);
      setIsPlusCodeActive(true);
      setLiveGpsFix(null);
    } else {
      setPlusCodeError(`Could not decode Plus Code "${target}". Expected format: XXXX+XX City or a full code like 8FVC9G8F+6W`);
    }
  };

  // Real Device GPS State (Solves the "fake location" issue)
  const [liveGpsFix, setLiveGpsFix] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
    source: 'device_sensor';
  } | null>(null);
  const [isLocatingDevice, setIsLocatingDevice] = useState<boolean>(false);
  const [liveGpsError, setLiveGpsError] = useState<string | null>(null);

  // Automated Execution Pipeline State

  // Handler to fetch real physical GPS of current handset
  const handleGetRealGps = () => {
    if (!navigator.geolocation) {
      setLiveGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocatingDevice(true);
    setLiveGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);

        // Reverse geocode real coordinates using OpenCage
        const rev = await reverseGeocodeWithOpenCage(lat, lng, openCageKey);

        setLiveGpsFix({
          lat,
          lng,
          accuracy: acc,
          address: rev.formattedAddress,
          source: 'device_sensor',
        });
        setIsLocatingDevice(false);
      },
      (err) => {
        setIsLocatingDevice(false);
        setLiveGpsError(
          err.code === 1
            ? 'Location permission was denied. Please allow location access in your browser to test real GPS.'
            : 'Unable to retrieve device GPS fix. Please verify device location services are enabled.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Live OpenCage Geocode lookup when number or city override changes
  useEffect(() => {
    let isCancelled = false;
    const queryLocation = cityOverride ? `${cityOverride}, Pakistan` : (result.regionOrCity || result.countryName);
    setIsGeocoding(true);

    geocodeWithOpenCage(
      queryLocation,
      openCageKey,
      result.coordinates.lat,
      result.coordinates.lng
    ).then((res) => {
      if (!isCancelled) {
        setOpenCageData(res);
        setIsGeocoding(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [result.regionOrCity, result.countryName, openCageKey, result.coordinates.lat, result.coordinates.lng, cityOverride]);

  // True when the result is only the whole country (a mobile number with no city)
  const countryOnly =
    !liveGpsFix &&
    !(isPlusCodeActive && activePlusCodeFix) &&
    !cityOverride &&
    result.coordinates.isApproximate &&
    result.coordinates.accuracyKm >= 100;

  // Merge coordinates: Prioritize Real Live GPS Fix if active, then Verified Plus Code, then OpenCage city override, then numbering centroid
  const activeCoordinatesResult: PhoneLookupResult = React.useMemo(() => {
    if (liveGpsFix) {
      return {
        ...result,
        regionOrCity: liveGpsFix.address || 'Real Handset Location',
        coordinates: {
          lat: liveGpsFix.lat,
          lng: liveGpsFix.lng,
          displayName: `Live Device GPS: ${liveGpsFix.address || 'Exact Physical Fix'} (±${liveGpsFix.accuracy}m)`,
          accuracyKm: Math.max(0.01, liveGpsFix.accuracy / 1000),
          isApproximate: false,
        },
        confidence: 100,
      };
    }

    if (lastKnown) {
      const acc = Math.round(lastKnown.accuracy ?? 50);
      return {
        ...result,
        regionOrCity: `Last shared location (${timeAgo(lastKnown.at)})`,
        coordinates: {
          lat: lastKnown.lat,
          lng: lastKnown.lng,
          displayName: `Last shared location: ${timeAgo(lastKnown.at)} (±${acc}m)`,
          accuracyKm: Math.max(0.01, acc / 1000),
          isApproximate: false,
        },
        confidence: 100,
      };
    }

    if (isPlusCodeActive && activePlusCodeFix) {
      return {
        ...result,
        regionOrCity: activePlusCodeFix.displayName,
        coordinates: {
          lat: activePlusCodeFix.lat,
          lng: activePlusCodeFix.lng,
          displayName: `Verified Plus Code Location: ${activePlusCodeFix.displayName} (±${activePlusCodeFix.accuracyMeters}m)`,
          accuracyKm: activePlusCodeFix.accuracyMeters / 1000,
          isApproximate: false,
        },
        confidence: 100,
      };
    }

    if (!openCageData) return result;
    return {
      ...result,
      regionOrCity: cityOverride ? `${cityOverride}, Pakistan (Selected City)` : result.regionOrCity,
      coordinates: {
        ...result.coordinates,
        lat: openCageData.lat,
        lng: openCageData.lng,
        displayName: openCageData.formattedAddress || result.coordinates.displayName,
      },
      confidence: openCageData.source === 'opencage_api' ? 98 : result.confidence,
    };
  }, [result, openCageData, cityOverride, liveGpsFix, lastKnown, isPlusCodeActive, activePlusCodeFix]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar & Auto-Execution Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          {/* Input field with country code icon */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Phone className="w-4 h-4 text-cyan-400" />
            </div>
            <input
              type="text"
              value={inputNumber}
              onChange={(e) => setInputNumber(e.target.value)}
              aria-label="Phone number"
              inputMode="tel"
              autoComplete="off"
              placeholder="Enter phone number with or without + (e.g. +CC NNNNNNNNN)"
              className="w-full h-11 pl-10 pr-4 bg-slate-950 border border-slate-700 rounded-lg text-base sm:text-sm text-slate-100 placeholder:text-slate-400 font-mono focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCopy(result.e164 || inputNumber, 'e164_quick')}
              aria-label="Copy the number in international format"
              title="Copy the number in international format"
              className="h-11 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copiedField === 'e164_quick' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedField === 'e164_quick' ? 'Copied' : 'Copy'}</span>
            </button>

          </div>
        </div>

      </div>

      {result.isValid && result.e164 && (
        <LastKnownLocationCard
          number={result.e164}
          location={lastKnown}
          onAskToShare={() => setIsShareModalOpen(true)}
          onOpenGodEye={onOpenGodEye}
          onSavePasted={handleSavePasted}
        />
      )}

      {result.isValid && result.e164 && (
        <NumberActivityCard result={result} />
      )}

      {/* CRITICAL REALITY FIX: Real Handset GPS vs Public Centroid */}
      <div className={`rounded-xl p-5 shadow-lg space-y-4 border transition-all ${
        liveGpsFix
          ? 'bg-emerald-950/20 border-emerald-500/40'
          : 'bg-slate-900 border-amber-900/40'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
              liveGpsFix
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}>
              {liveGpsFix ? <Crosshair className="w-5 h-5 animate-pulse text-emerald-400" /> : <Info className="w-5 h-5 text-amber-400" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100">
                  {liveGpsFix
                    ? 'Device GPS active'
                    : lastKnown
                    ? 'Last shared location'
                    : (isPlusCodeActive && activePlusCodeFix)
                    ? `Plus Code location: ${activePlusCodeFix.shortCode}`
                    : result.subAllocation
                    ? `Regional exchange: ${result.regionOrCity}`
                    : 'Approximate location from the number prefix'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  liveGpsFix
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : (isPlusCodeActive && activePlusCodeFix)
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                    : result.subAllocation
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {liveGpsFix ? `±${liveGpsFix.accuracy}m GPS Accuracy` : lastKnown ? `±${Math.round(lastKnown.accuracy ?? 50)}m GPS` : (isPlusCodeActive && activePlusCodeFix) ? '±14m Plus Code Exact Fix' : result.subAllocation ? 'Regional exchange' : 'Approximate'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {liveGpsFix ? (
                  <span>
                    Your device's GPS reports <strong className="text-emerald-400 font-mono">{liveGpsFix.lat.toFixed(5)}, {liveGpsFix.lng.toFixed(5)}</strong>.
                  </span>
                ) : lastKnown ? (
                  <span>
                    The person shared their phone's GPS position {timeAgo(lastKnown.at)}. The map shows that position, not the number's registered area.
                  </span>
                ) : (isPlusCodeActive && activePlusCodeFix) ? (
                  <span>
                    Location from Plus Code: <strong className="text-cyan-200 font-mono">{activePlusCodeFix.shortCode}</strong> (Full global code: <code className="text-cyan-300 font-mono">{activePlusCodeFix.fullCode}</code>). The pin is dropped directly at <strong className="text-emerald-300 font-mono">{activePlusCodeFix.lat.toFixed(5)}, {activePlusCodeFix.lng.toFixed(5)}</strong> ({activePlusCodeFix.locality}) with building/street precision.
                  </span>
                ) : result.subAllocation ? (
                  <span>
                    <strong className="text-cyan-300 font-mono">{result.e164 || inputNumber}</strong> resolves to <strong className="text-emerald-300">{result.subAllocation}</strong> ({result.coordinates.lat.toFixed(4)}, {result.coordinates.lng.toFixed(4)}) on <strong className="text-slate-100">{result.carrier}</strong>. This is the area the number was issued in, not the handset's current position.
                  </span>
                ) : !inputNumber.trim() ? (
                  <span>
                    A phone number only reveals its carrier and country or region, not where the handset is. For the true position of a device, use its own GPS (Track Real GPS) or a tracking link the owner agrees to open.
                  </span>
                ) : (
                  <span>
                    Mobile numbers aren't tied to a place, so the map only marks the country. Send a consent link to get a real position, or use Track Real GPS for this device's own position.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons: Plus Code Pin, Real GPS, WhatsApp Link, or Return */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {liveGpsFix ? (
              <button
                onClick={() => setLiveGpsFix(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700 shadow-sm flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Return to Phone Prefix</span>
              </button>
            ) : (
              <>
                {activePlusCodeFix && (
                  <button
                    onClick={() => {
                      setIsPlusCodeActive(!isPlusCodeActive);
                      setLiveGpsFix(null);
                    }}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors border flex items-center gap-1.5 whitespace-nowrap shadow-sm ${
                      isPlusCodeActive
                        ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 border-cyan-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                    title="Toggle the entered Plus Code pin"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-300" />
                    <span>{isPlusCodeActive ? `✓ ${activePlusCodeFix.shortCode} Pinned` : `Pin ${activePlusCodeFix.shortCode}`}</span>
                  </button>
                )}

                <button
                  onClick={handleGetRealGps}
                  disabled={isLocatingDevice}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 text-sm font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {isLocatingDevice ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : (
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                  )}
                  <span>{isLocatingDevice ? 'Acquiring GPS...' : 'Track Real GPS'}</span>
                </button>

              </>
            )}
          </div>
        </div>

        {/* Plus Code Input & Verification Manager */}
        <details open={!!activePlusCodeFix} className="bg-slate-950 rounded-xl border border-slate-800">
          <summary className="cursor-pointer select-none px-3.5 py-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <MapPin className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span>Pin an exact spot with a Plus Code</span>
            {activePlusCodeFix && <span className="ml-auto text-xs font-mono text-cyan-200">{activePlusCodeFix.shortCode}</span>}
          </summary>
          <div className="px-3.5 pb-3.5 space-y-2.5">

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={plusCodeInput}
              onChange={(e) => setPlusCodeInput(e.target.value)}
              placeholder="Enter Plus Code (e.g. XXXX+XX City or a full global code)"
              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => handleApplyPlusCode()}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
            >
              Verify & Pin Code
            </button>
            <button
              onClick={() => {
                setPlusCodeInput('');
                setActivePlusCodeFix(null);
                setIsPlusCodeActive(false);
                setPlusCodeError(null);
              }}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg transition-colors whitespace-nowrap border border-slate-700"
            >
              Clear
            </button>
          </div>

          {plusCodeError && (
            <div className="text-[11px] text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{plusCodeError}</span>
            </div>
          )}

          {activePlusCodeFix && isPlusCodeActive && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono border-t border-slate-800/80">
              <div>
                <span className="text-slate-400 block font-sans text-[10px]">Full Global Plus Code:</span>
                <span className="text-cyan-300 font-bold">{activePlusCodeFix.fullCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[10px]">Exact Coordinates:</span>
                <span className="text-emerald-400 font-bold">{activePlusCodeFix.lat.toFixed(5)}, {activePlusCodeFix.lng.toFixed(5)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[10px]">Locality:</span>
                <span className="text-slate-200 font-sans truncate block">{activePlusCodeFix.locality}</span>
              </div>
            </div>
          )}
          </div>
        </details>

        {/* Survey Dump Link Badge */}
        {result.matchingSurveyCellsCount && !liveGpsFix && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Your cell survey file has <strong className="text-emerald-400 font-mono">{result.matchingSurveyCellsCount} {result.carrier.split(' ')[0]} towers</strong> ({result.mccMnc}). This is about the carrier's network, not where this number is.
              </span>
            </div>
            {onSwitchTab && (
              <button
                onClick={() => onSwitchTab('live_gps')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold text-xs transition-colors whitespace-nowrap shrink-0"
              >
                <span>View {result.matchingSurveyCellsCount} Towers & Triangulation</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Live GPS Error message if permission was denied */}
        {liveGpsError && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{liveGpsError}</span>
          </div>
        )}

        {/* Automatic area detection */}
        {inputNumber.trim() && !liveGpsFix && !(isPlusCodeActive && activePlusCodeFix) && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Area:{' '}
              <strong className="text-slate-200">
                {cityOverride ?? (result.regionOrCity || result.countryName)}
              </strong>{' '}
              {cityOverride ? '(detected from the number)' : '(a mobile number does not reveal a city)'}
            </span>
          </div>
        )}      </div>

      {!inputNumber.trim() ? (
        <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-10 text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Phone className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-100">Enter a phone number to begin</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Type a number in international format (for example +CC followed by the number) to see its carrier, region and map position. You can also use Track Real GPS above to locate this device.
          </p>
        </div>
      ) : (
        <>
      {/* Main 2-Column Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Telecom Details & Geolocation breakdown (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Card 1: Core Telecom & Carrier Resolution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Radio className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Carrier & Network Intelligence
                  </h3>
                </div>
              </div>

              {result.isValid ? (
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid Standard</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Unverified</span>
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Telecom Operator / Carrier:</span>
                <span className="text-slate-100 font-semibold text-sm">
                  {result.carrier}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 block mb-0.5">Line Category:</span>
                  <span className="text-slate-200 font-medium">
                    {result.lineType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">MCC / MNC Network:</span>
                  <span className="text-slate-200 font-medium font-mono">
                    {result.mccMnc || 'Standard Allocation'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-400 block mb-0.5">Country Calling Code:</span>
                  <span className="text-cyan-400 font-mono font-medium">
                    {result.countryCallingCode || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">ISO 3166-1 alpha-2:</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {result.countryCode || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: OpenCage Geocoding & Live API Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {countryOnly ? 'Location level' : 'Geocoded Location'}
                  </h3>
                </div>
              </div>

              {countryOnly ? (
                <div className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                  <span>Country only</span>
                </div>
              ) : openCageData?.source === 'opencage_api' ? (
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                  <span>Live OpenCage API</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                  <span>Regional Fallback</span>
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {countryOnly ? (
                <p className="text-slate-300 leading-relaxed">
                  <strong className="text-slate-100">{result.countryName}</strong>: this number identifies a carrier and
                  country, not a city or position. The dashed circle on the map marks the general area of the country, not a position. To find where
                  the phone actually is, use its GPS (Track Real GPS, or a tracking link the owner agrees to open).
                </p>
              ) : (
                <>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Address:</span>
                    <span className="text-slate-100 font-medium text-xs break-words">
                      {openCageData?.formattedAddress || result.regionOrCity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Latitude:</span>
                      <span className="text-cyan-400 font-mono tabular-nums font-semibold">
                        {activeCoordinatesResult.coordinates.lat.toFixed(6)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Longitude:</span>
                      <span className="text-cyan-400 font-mono tabular-nums font-semibold">
                        {activeCoordinatesResult.coordinates.lng.toFixed(6)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Card 3: International Standard Formats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Normalized Telecommunication Formats
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-500 block">E.164 Format:</span>
                  <span className="font-mono text-cyan-300">{result.e164 || 'N/A'}</span>
                </div>
                {result.e164 && (
                  <button
                    onClick={() => handleCopy(result.e164!, 'e164')}
                    className="p-1 text-slate-400 hover:text-slate-200"
                  >
                    {copiedField === 'e164' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-500 block">International Format:</span>
                  <span className="font-mono text-slate-200">{result.international || 'N/A'}</span>
                </div>
                {result.international && (
                  <button
                    onClick={() => handleCopy(result.international!, 'intl')}
                    className="p-1 text-slate-400 hover:text-slate-200"
                  >
                    {copiedField === 'intl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-500 block">National Format:</span>
                  <span className="font-mono text-slate-300">{result.national || 'N/A'}</span>
                </div>
                {result.national && (
                  <button
                    onClick={() => handleCopy(result.national!, 'nat')}
                    className="p-1 text-slate-400 hover:text-slate-200"
                  >
                    {copiedField === 'nat' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Timezone & Clock */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Local Time:</span>
              </div>
              <span className="font-mono tabular-nums text-slate-200 font-medium">
                {result.localTime} ({result.timezones[0] || 'UTC'})
              </span>
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Folium Leaflet Map (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <FoliumMapView result={activeCoordinatesResult} onExportHtml={onExportHtml} />
        </div>

      </div>
        </>
      )}

      {/* Interactive Modals */}
      <LiveTrackingShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        targetNumber={inputNumber}
      />
    </div>
  );
};
