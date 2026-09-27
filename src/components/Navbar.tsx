import React from 'react';
import { useProcession } from '../context/ProcessionContext';
import { Shield, Map, Radio, Bell, RefreshCw } from 'lucide-react';

interface NavbarProps {
  currentTab: 'public' | 'admin';
  setCurrentTab: (tab: 'public' | 'admin') => void;
  onOpenAdminAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAdminAuth,
}) => {
  const { data, isConnected, isAdmin, refreshData } = useProcession();

  const handleAdminClick = () => {
    if (isAdmin) {
      setCurrentTab('admin');
    } else {
      onOpenAdminAuth();
    }
  };

  const isLive = data?.status === 'live';

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Branding & Village Name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-marian-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
              <img src="/statue-icon.svg" alt="Marian Icon" className="w-7 h-7" />
            </div>
            {isLive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
                {data?.title || 'Mother Mary Village Procession'}
              </h1>
              {isLive ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE NOW
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  SCHEDULED
                </span>
              )}
            </div>
            <p className="text-[11px] text-sky-400/90 truncate">
              {data?.villageName || 'Parish Community Village'}
            </p>
          </div>
        </div>

        {/* Right: View Switcher & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Connection status indicator */}
          <div 
            title={isConnected ? 'Connected to Live Server' : 'Connecting to Server...'}
            className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 px-2 py-1 rounded bg-slate-900 border border-slate-800"
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
            <span>{isConnected ? 'Sync Active' : 'Connecting'}</span>
          </div>

          {/* Navigation Mode Pill */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setCurrentTab('public')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'public'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Public View</span>
            </button>

            <button
              onClick={handleAdminClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'admin'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin {isAdmin ? '✓' : ''}</span>
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => refreshData()}
            title="Refresh Data"
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition active:rotate-180 duration-300"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
