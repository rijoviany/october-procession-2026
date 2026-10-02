import React, { useState } from 'react';
import { useProcession } from '../context/ProcessionContext';
import { Shield, Map as MapIcon, Radio, RefreshCw, MapPin, Info, Clock } from 'lucide-react';

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
  const { data, isConnected, isOfflineMode, isAdmin, refreshData } = useProcession();
  const [activeSection, setActiveSection] = useState<'map' | 'houses' | 'schedule' | 'about'>('map');

  const handleAdminClick = () => {
    if (isAdmin) {
      setCurrentTab(currentTab === 'admin' ? 'public' : 'admin');
    } else {
      onOpenAdminAuth();
    }
  };

  const isLive = data?.status === 'live';

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3 md:gap-4 md:h-16 relative">
          
          {/* Left: Branding & Village Name */}
          <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-amber-400/90 shadow-md flex items-center justify-center p-0.5 overflow-hidden">
                  <img src="/mother-mary-statue.png" alt="Mother Mary" className="w-full h-full object-contain filter drop-shadow" />
                </div>
                {isLive && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-white truncate" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {data?.title || 'Mother Mary Procession'}
                  </h1>
                  {isLive ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      SCHEDULED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium truncate">
                  {data?.villageName || "St. Joseph's Church, Vattappara"}
                </p>
              </div>
            </div>

            {/* Mobile Actions: Admin & Refresh */}
            <div className="flex md:hidden items-center gap-2 flex-shrink-0">
              <button
                onClick={() => refreshData()}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 active:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleAdminClick}
                className={`p-2 rounded-lg transition-all ${currentTab === 'admin' ? 'bg-marian-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
              >
                <Shield className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center: Navigation Pills */}
          {currentTab === 'public' && (
            <div className="flex items-center overflow-x-auto no-scrollbar pb-1 md:pb-0 gap-2 w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2">
              <NavPill 
                active={activeSection === 'map'} 
                onClick={() => setActiveSection('map')}
                icon={<MapIcon className="w-3.5 h-3.5" />}
                label="Live Map"
              />
              <NavPill 
                active={activeSection === 'houses'} 
                onClick={() => setActiveSection('houses')}
                icon={<MapPin className="w-3.5 h-3.5" />}
                label="Houses"
              />
              <NavPill 
                active={activeSection === 'schedule'} 
                onClick={() => setActiveSection('schedule')}
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Schedule"
              />
              <NavPill 
                active={activeSection === 'about'} 
                onClick={() => setActiveSection('about')}
                icon={<Info className="w-3.5 h-3.5" />}
                label="About"
              />
            </div>
          )}

          {/* Right: Info & Actions */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            {/* Date Display */}
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-200" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {(() => {
                  const dateStr = data?.stops?.[0]?.date;
                  if (!dateStr) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const [y, m, d] = dateStr.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                })()}
              </span>
              <span className="text-[11px] text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800 mx-1"></div>

            {/* Connection status indicator */}
            <div 
              title={isConnected ? 'Connected to live server' : isOfflineMode ? 'Running seamlessly with local cached data' : 'Connecting to server...'}
              className="flex items-center gap-1.5 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
            >
              <span className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : isOfflineMode ? 'bg-sky-400' : 'bg-amber-400 animate-pulse'
              }`}></span>
            </div>

            {/* Admin Switcher */}
            <button
              onClick={handleAdminClick}
              title="Admin Panel"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                currentTab === 'admin'
                  ? 'bg-marian-600 border-marian-500 text-white shadow-lg shadow-marian-900/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin{isAdmin ? ' ✓' : ''}</span>
            </button>

            {/* Refresh button */}
            <button
              onClick={() => refreshData()}
              title="Refresh Data"
              className="w-9 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition active:rotate-180 duration-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

const NavPill = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
      active 
      ? 'bg-marian-600 text-white shadow-md' 
      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);
