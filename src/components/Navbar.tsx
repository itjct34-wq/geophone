import React from 'react';
import { Radio, Download, Terminal, Crosshair, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export type TabId = 'lookup' | 'live_gps' | 'batch' | 'history' | 'python' | 'guide';

interface NavbarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onOpenPythonModal: () => void;
  onExportHtml: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenPythonModal,
}) => {
  const { user, signOut } = useAuth();
  return (
    <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
    <header className="flex items-center justify-between gap-4 lg:gap-8 px-4 sm:px-6 py-3 lg:py-4">
      {/* Zone 1: Single text element wordmark */}
      <div 
        onClick={() => setActiveTab('lookup')}
        className="flex items-center gap-2 cursor-pointer select-none shrink-0"
      >
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Radio className="w-4 h-4" />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          GeoPhone Intelligence
        </span>
      </div>

      {/* Zone 2: 4â€“5 clean single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('lookup')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'lookup'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Single Lookup
        </button>
        <button
          onClick={() => setActiveTab('live_gps')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'live_gps'
              ? 'text-emerald-400 border-emerald-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Live GPS & Towers
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'batch'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Batch Analysis
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'history'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('python')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'python'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Python Code & Pip Stack
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'guide'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          OpenCage & Folium Docs
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenPythonModal}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Get Python Script</span>
          <span className="sm:hidden">Script</span>
        </button>
        <button
          onClick={signOut}
          title={`Signed in as ${user?.email}`}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-100 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>

    {/* Mobile navigation (the desktop links above are hidden below md) */}
    <nav
      aria-label="Sections"
      className="lg:hidden flex items-center gap-5 px-4 sm:px-6 overflow-x-auto text-sm font-medium text-slate-400 border-t border-slate-800/60"
    >
      {([
        ['lookup', 'Single Lookup'],
        ['live_gps', 'Live GPS & Towers'],
        ['batch', 'Batch Analysis'],
        ['history', 'History'],
        ['python', 'Python Stack'],
        ['guide', 'Docs'],
      ] as const).map(([tab, label]) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          aria-current={activeTab === tab ? 'page' : undefined}
          className={`py-2.5 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
            activeTab === tab
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
    </div>
  );
};

