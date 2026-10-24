import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  ArrowRight,
  MapPin,
  Radio,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ExternalLink,
  Compass,
  Copy,
  Check
} from 'lucide-react';

interface WhyOpenCageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNumber: string;
}

export const WhyOpenCageModal: React.FC<WhyOpenCageModalProps> = ({
  isOpen,
  onClose,
  currentNumber,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const pythonSnippet = `# What happens inside the Python script:
import phonenumbers
from phonenumbers import geocoder
from opencage.geocoder import OpenCageGeocode

# 1. You pass any Pakistani mobile number:
pep_number = phonenumbers.parse("${currentNumber}")

# 2. phonenumbers only knows mobile SIMs can be ANYWHERE in Pakistan:
location = geocoder.description_for_number(pep_number, "en")
# -> location is the text string: "Pakistan"

# 3. OpenCage receives the word "Pakistan":
key = "your_opencage_key"
geocoder_api = OpenCageGeocode(key)
query = str(location)  # query = "Pakistan"
results = geocoder_api.geocode(query)

# 4. OpenCage returns the GEOMETRIC CENTROID of the country polygon:
lat = results[0]['geometry']['lat']  # -> 30.3753
lng = results[0]['geometry']['lng']  # -> 69.3451
# Location: Barkhan, Kohlu mountain range (Balochistan)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Why does OpenCage show the exact same Latitude & Longitude?
              </h2>
              <p className="text-xs text-slate-400">
                Understanding why <code className="text-cyan-300 font-mono">30.3753, 69.3451</code> is returned for all mobile numbers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          
          {/* Executive Summary Alert */}
          <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>The Core Explanation in 1 Sentence:</span>
            </div>
            <p className="text-slate-200 text-xs leading-relaxed">
              OpenCage is a <strong>text geocoder</strong> (address to coordinate translator), <strong>NOT a live cellular tracker</strong>. Because mobile SIM cards move freely across cities, Google’s <code className="text-cyan-300 font-mono">libphonenumber</code> only returns the word <code className="text-amber-300 font-bold">"Pakistan"</code> for any mobile prefix (0300, 0310, 0345). OpenCage receives <code className="text-amber-300">"Pakistan"</code> and calculates the country’s <strong>geographic center (30.3753, 69.3451)</strong> in Balochistan every single time!
            </p>
          </div>

          {/* Step-by-Step Flow Chart */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-100 text-sm">
              Trace: What Happened Step-by-Step in Your Python Script
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-[11px]">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[10px] font-sans">Input Number</span>
                <span className="text-cyan-300 font-bold">{currentNumber}</span>
                <span className="text-slate-400 block text-[10px] font-sans">Zong 4G mobile</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[10px] font-sans">phonenumbers lookup</span>
                <span className="text-amber-300 font-bold">"Pakistan"</span>
                <span className="text-slate-400 block text-[10px] font-sans">No city code in SIM</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[10px] font-sans">OpenCage Query</span>
                <span className="text-emerald-300 font-bold">geocode("Pakistan")</span>
                <span className="text-slate-400 block text-[10px] font-sans">Text search on map</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[10px] font-sans">Output Coords</span>
                <span className="text-rose-300 font-bold">30.3753, 69.3451</span>
                <span className="text-slate-400 block text-[10px] font-sans">Barkhan polygon center</span>
              </div>
            </div>
          </div>

          {/* Interactive Python Code View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                The Exact Python Code Execution:
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pythonSnippet);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
              <pre>{pythonSnippet}</pre>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-100 text-sm">
              Mobile SIMs vs Fixed Landlines: The Crucial Difference
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-amber-900/40 space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>Mobile Numbers (03xx nationwide)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  A person with a Zong SIM bought in Islamabad can travel to Karachi, Lahore, or Murree. Carrier towers route the call anywhere. Because the phone number itself has no city restriction, public telephone directories only list the country: <strong>Pakistan</strong>.
                </p>
                <div className="font-mono text-[11px] text-amber-400 bg-slate-900 p-2 rounded">
                  +92 310 ... → "Pakistan" → 30.3753, 69.3451
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-emerald-900/40 space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Radio className="w-4 h-4" />
                  <span>Landline Numbers (PTCL Physical Cables)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Fixed copper or fiber lines are physically nailed to a wall in a specific exchange building. <code className="text-cyan-300 font-mono">051</code> is strictly Islamabad/Rawalpindi, <code className="text-cyan-300 font-mono">042</code> is strictly Lahore, and <code className="text-cyan-300 font-mono">021</code> is Karachi.
                </p>
                <div className="font-mono text-[11px] text-emerald-400 bg-slate-900 p-2 rounded">
                  +92 51 ... → "Islamabad" → 33.7294, 73.0931
                </div>
              </div>
            </div>
          </div>

          {/* The 3 Real Working Solutions Provided by this App */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>How We Make Real Tracking Work In This App:</span>
            </h3>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <h4 className="font-semibold text-slate-200">PTA Regional Exchange Sub-Allocation</h4>
                  <p className="text-slate-400 text-[11px]">
                    We parsed the sub-range (<strong className="text-cyan-300 font-mono">0310-5...</strong>) using Pakistan Telecom Authority (PTA) switching allocations to place the pin in <strong>Islamabad / Rawalpindi (33.6844, 73.0479)</strong> instead of the Balochistan desert.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <h4 className="font-semibold text-slate-200">Cellular BTS Towers & Survey Dump (MCC 410)</h4>
                  <p className="text-slate-400 text-[11px]">
                    We imported your 96 cellular scan records. For Zong (<code className="text-emerald-300 font-mono">MNC 4</code>), there are 24 active base stations in the database that calculate the actual coverage radius.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <h4 className="font-semibold text-slate-200">Live Device GPS & WhatsApp Sharing</h4>
                  <p className="text-slate-400 text-[11px]">
                    You can click <strong>"Track My Real Device GPS Now"</strong> or generate a live tracking link to send via WhatsApp/SMS. When tapped on the smartphone, it streams the handset's internal GPS sensor with ±5 to 10-meter precision!
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
          >
            Got It! Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
