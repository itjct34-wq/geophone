import React, { useState } from 'react';
import { Download, Play, RefreshCw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { parsePhoneNumber } from '../services/phoneParser';
import { PhoneLookupResult } from '../types/phone';

const DEFAULT_BATCH_TEXT = '';

interface BatchTrackerViewProps {
  onSelectNumber: (num: string) => void;
}

export const BatchTrackerView: React.FC<BatchTrackerViewProps> = ({ onSelectNumber }) => {
  const [inputText, setInputText] = useState(DEFAULT_BATCH_TEXT);
  const [results, setResults] = useState<PhoneLookupResult[]>(() => {
    return DEFAULT_BATCH_TEXT.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => parsePhoneNumber(line));
  });

  const handleProcessBatch = () => {
    const lines = inputText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((num) => parsePhoneNumber(num));
    setResults(parsed);
  };

  const handleExportCsv = () => {
    const headers = [
      'Raw Input',
      'Valid',
      'International',
      'National',
      'E.164',
      'Country',
      'Region',
      'Carrier',
      'Line Type',
      'Latitude',
      'Longitude',
      'Timezone',
    ];

    const rows = results.map((r) => [
      `"${r.rawInput}"`,
      r.isValid ? 'Yes' : 'No',
      `"${r.international || ''}"`,
      `"${r.national || ''}"`,
      `"${r.e164 || ''}"`,
      `"${r.countryName}"`,
      `"${r.regionOrCity}"`,
      `"${r.carrier}"`,
      `"${r.lineType}"`,
      r.coordinates.lat.toFixed(6),
      r.coordinates.lng.toFixed(6),
      `"${r.timezones.join(';')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phone_batch_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Batch Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Batch Phone Number Geolocation Analyzer
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Analyze hundreds of phone numbers simultaneously. Resolves E.164 international standard, cellular carriers, and centroid coordinates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleProcessBatch}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Process Batch</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={results.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300">
            Phone Numbers (One per line with country code prefix):
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
            placeholder="+1 415 555 2671&#10;+44 7911 123456"
          />
        </div>
      </div>

      {/* High-density Data Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">Parsed Records:</span>
            <span className="font-mono tabular-nums text-cyan-400">{results.length} entries</span>
            <span aria-hidden="true">·</span>
            <span>
              {results.filter((r) => r.isValid).length} Valid
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Phone Number</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Region / Area</th>
                <th className="px-4 py-3">Carrier / Network</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Latitude</th>
                <th className="px-4 py-3 text-right">Longitude</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {results.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  onClick={() => onSelectNumber(item.e164 || item.rawInput)}
                >
                  <td className="px-4 py-3 font-mono font-medium text-slate-100 whitespace-nowrap">
                    {item.international || item.rawInput}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {item.isValid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Valid</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Unverified</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-200">
                    {item.countryName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                    {item.regionOrCity}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400 max-w-[200px] truncate">
                    {item.carrier}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                    {item.lineType}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-300">
                    {item.coordinates.lat.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-300">
                    {item.coordinates.lng.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNumber(item.e164 || item.rawInput);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-800/50 rounded transition-colors"
                    >
                      View on Map
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
