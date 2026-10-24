import React from 'react';
import { BookOpen, Check, Code, ExternalLink, HelpCircle, Key, Layers, Terminal } from 'lucide-react';

export const OpenCageGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">
            The 4-Package Python Geotracking Architecture
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Understanding how <code className="text-cyan-300 font-mono">phonenumbers</code>,{' '}
          <code className="text-cyan-300 font-mono">geocoder</code>,{' '}
          <code className="text-cyan-300 font-mono">opencage</code>, and{' '}
          <code className="text-cyan-300 font-mono">folium</code> work together in modern telecom intelligence and geographic information systems (GIS).
        </p>
      </div>

      {/* Package Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Package 1: phonenumbers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-400 font-mono">1. phonenumbers</h3>
            <span className="text-xs text-slate-500">Google libphonenumber</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Python port of Google’s C++/Java library. Validates format compliance, normalizes to E.164, identifies carrier names, and retrieves human-readable regional descriptions (e.g., "California", "Lahore, Punjab").
          </p>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] font-mono text-slate-400">
            geocoder.description_for_number(parsed, "en")<br/>
            carrier.name_for_number(parsed, "en")
          </div>
        </div>

        {/* Package 2: opencage */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-400 font-mono">2. opencage & geocoder</h3>
            <span className="text-xs text-slate-500">Geocoding API</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Translates the textual region or state string returned by phonenumbers into exact GPS latitude and longitude coordinates, along with administrative boundaries and bounding boxes.
          </p>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] font-mono text-slate-400">
            geocoder = OpenCageGeocode(API_KEY)<br/>
            results = geocoder.geocode(location_string)
          </div>
        </div>

        {/* Package 3: folium */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-400 font-mono">3. folium</h3>
            <span className="text-xs text-slate-500">Leaflet.js Map Generator</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Folium compiles Python code into interactive Leaflet.js HTML files. It places interactive markers, popups, and radius circles centered on the geocoded coordinates.
          </p>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] font-mono text-slate-400">
            phone_map = folium.Map(location=[lat, lng])<br/>
            phone_map.save("location.html")
          </div>
        </div>

        {/* Package 4: OpenCage API Setup */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-400 font-mono">4. Free API Key Setup</h3>
            <span className="text-xs text-slate-500">OpenCage Portal</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            OpenCage provides a generous free tier of 2,500 geocoding requests per day for developers, researchers, and students without requiring credit card registration.
          </p>
          <a
            href="https://opencagedata.com/users/sign_up"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            <span>Register for Free OpenCage Key</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Complete Step-by-Step Execution Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-100">
          How to Run the Code in Your Local Environment
        </h3>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              1
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-100">Install Required Dependencies:</span>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-cyan-300">
                pip install phonenumbers folium geocoder opencage
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              2
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-100">Save the Python Script:</span>
              <p className="text-slate-400">
                Create a file named <code className="text-slate-200">tracker.py</code> and paste the exported Python code into it.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              3
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-100">Execute Script:</span>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-cyan-300">
                python tracker.py
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              4
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-100">Open Interactive Folium Map:</span>
              <p className="text-slate-400">
                Double-click or open the generated <code className="text-slate-200">location.html</code> in Chrome, Firefox, Safari, or Edge to explore the interactive Leaflet map!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
