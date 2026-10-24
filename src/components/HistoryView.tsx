import React, { useCallback, useEffect, useState } from 'react';
import { History, Trash2, Loader2 } from 'lucide-react';
import { clearHistory, deleteHistory, listHistory, type HistoryEntry } from '../services/dataService';

interface HistoryViewProps {
  onSelectNumber: (num: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onSelectNumber }) => {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setEntries(await listHistory());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load history.');
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    setEntries((prev) => prev?.filter((e) => e.id !== id) ?? null);
    try {
      await deleteHistory(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete entry.');
      load();
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Delete your entire lookup history?')) return;
    try {
      await clearHistory();
      setEntries([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear history.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100">Lookup History</h2>
          {entries && <span className="text-xs text-slate-500 font-mono">{entries.length}</span>}
        </div>
        <button
          onClick={handleClear}
          disabled={!entries || entries.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear all</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="px-6 py-3 text-xs text-rose-400">
          {error}
        </p>
      )}

      {entries === null ? (
        <div className="p-10 flex justify-center text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="p-10 text-center text-xs text-slate-400">
          No lookups saved yet. Valid numbers you look up are saved here automatically.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800/60">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-slate-800/40 transition-colors">
              <button
                onClick={() => onSelectNumber(e.e164 || e.raw_input)}
                className="flex-1 min-w-0 text-left"
              >
                <span className="block font-mono text-sm text-slate-100 truncate">{e.e164 || e.raw_input}</span>
                <span className="block text-xs text-slate-400 truncate">
                  {[e.region, e.carrier].filter(Boolean).join(' · ')}
                </span>
              </button>
              <span className="hidden sm:block text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                {new Date(e.created_at).toLocaleString()}
              </span>
              <button
                onClick={() => handleDelete(e.id)}
                aria-label={`Delete ${e.e164 || e.raw_input} from history`}
                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
