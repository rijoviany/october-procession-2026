import React, { useState } from 'react';
import { ProcessionProvider, useProcession } from './context/ProcessionContext';
import { Navbar } from './components/Navbar';
import { ProcessionMap } from './components/Map/ProcessionMap';
import { LiveStatusBanner } from './components/Public/LiveStatusBanner';
import { MobileBottomSheet } from './components/Public/MobileBottomSheet';
import { StopDetailModal } from './components/Public/StopDetailModal';
import { AdminAuthModal } from './components/Admin/AdminAuthModal';
import { LiveTrackerController } from './components/Admin/LiveTrackerController';
import { StopManager } from './components/Admin/StopManager';
import { AdminMobileView } from './components/Admin/AdminMobileView';
import { AdminSettingsModal } from './components/Admin/AdminSettingsModal';
import { Coordinates } from './types/procession';
import { Settings, ArrowLeft, Loader2 } from 'lucide-react';

const ProcessionApp: React.FC = () => {
  const { data, isLoading, isAdmin } = useProcession();
  const [currentTab, setCurrentTab] = useState<'public' | 'admin'>('public');
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Map location picker state for admin adding stops
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [locationPickCallback, setLocationPickCallback] = useState<((coords: Coordinates) => void) | null>(null);

  const handleStartPickLocation = (callback: (coords: Coordinates) => void) => {
    setLocationPickCallback(() => callback);
    setIsPickingLocation(true);
  };

  const handleMapClick = (coords: Coordinates) => {
    if (isPickingLocation && locationPickCallback) {
      locationPickCallback(coords);
      setIsPickingLocation(false);
      setLocationPickCallback(null);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-10 h-10 text-marian-500 animate-spin mb-4" />
        <h2 className="text-base font-semibold font-['Outfit']">Connecting to Procession Map...</h2>
        <p className="text-xs text-slate-500 mt-1">Loading route waypoints and live statue coordinates</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[100dvh] flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAdminAuth={() => setIsAdminAuthOpen(true)}
      />

      {/* Main View Area */}
      {currentTab === 'public' ? (
        /* PUBLIC VIEW — New layout: Left Sidebar + Map */
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
          {/* Left Sidebar (Desktop/Tablet — LiveStatusBanner acts as sidebar) */}
          <div className="hidden lg:flex flex-shrink-0">
            <LiveStatusBanner />
          </div>

          {/* Map Area (fills remaining space) */}
          <div className="flex-1 h-full min-h-[320px] relative">
            <ProcessionMap isAdminMode={false} />

            {/* Next Stop Card Overlay on Map (Desktop) */}
            <NextStopMapOverlay />

            {/* Mobile Bottom Sheet */}
            <MobileBottomSheet />
          </div>
        </div>
      ) : (
        /* ADMIN VIEW */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Mobile Admin View */}
          <AdminMobileView
            onStartPickLocation={handleStartPickLocation}
            isPickingLocation={isPickingLocation}
            onMapClick={handleMapClick}
            onCancelPick={() => { setIsPickingLocation(false); setLocationPickCallback(null); }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSwitchToPublic={() => setCurrentTab('public')}
          />

          {/* Desktop Admin View */}
          <div className="hidden lg:flex flex-1 flex-col min-h-0 overflow-hidden">
            {/* Desktop Admin Subheader Bar */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Coordinator Control Center
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition"
                >
                  <Settings className="w-3.5 h-3.5 text-marian-400" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={() => setCurrentTab('public')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-marian-600 hover:bg-marian-500 text-white text-xs font-semibold shadow transition active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>View Public Map</span>
                </button>
              </div>
            </div>

            {/* Desktop Split View: Controls on Left, Map on Right */}
            <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
              <div className="col-span-5 h-full overflow-y-auto p-4 space-y-4 border-r border-slate-800 bg-slate-950/60">
                <LiveTrackerController />
                <StopManager onStartPickLocation={handleStartPickLocation} />
              </div>

              <div className="col-span-7 h-full min-h-[400px] relative">
                <ProcessionMap
                  isAdminMode={true}
                  isPickingLocation={isPickingLocation}
                  onMapClick={handleMapClick}
                  onCancelPick={() => { setIsPickingLocation(false); setLocationPickCallback(null); }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Stop Detail Modal */}
      <StopDetailModal />

      {/* Admin PIN Verification Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={() => setCurrentTab('admin')}
      />

      {/* Admin Settings Modal */}
      <AdminSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

/**
 * Floating "Next Stop" card overlayed on the map (desktop only).
 * Matches the reference design's map overlay card showing next stop info.
 */
const NextStopMapOverlay: React.FC = () => {
  const { data, setMapCenterTarget, setFollowLiveStatue } = useProcession();

  if (!data) return null;
  const nextStop = data.stops.find(s => s.id === data.nextStopId);
  if (!nextStop) return null;

  const handleClick = () => {
    setFollowLiveStatue(false);
    setMapCenterTarget({ ...nextStop.coordinates });
  };

  // ponytail: simple distance estimate, no OSRM call for a UI overlay
  let distanceText = '';
  if (data.currentLocation) {
    const R = 6371e3;
    const lat1 = data.currentLocation.coordinates.lat * Math.PI / 180;
    const lat2 = nextStop.coordinates.lat * Math.PI / 180;
    const dLat = (nextStop.coordinates.lat - data.currentLocation.coordinates.lat) * Math.PI / 180;
    const dLng = (nextStop.coordinates.lng - data.currentLocation.coordinates.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const meters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    distanceText = meters < 1000 ? `${meters} m away` : `${(meters / 1000).toFixed(1)} km away`;
  }

  // Estimate ETA (~4 min/km walking)
  const etaMinutes = data.currentLocation
    ? Math.max(1, Math.round(
        (() => {
          const R = 6371e3;
          const lat1 = data.currentLocation.coordinates.lat * Math.PI / 180;
          const lat2 = nextStop.coordinates.lat * Math.PI / 180;
          const dLat = (nextStop.coordinates.lat - data.currentLocation.coordinates.lat) * Math.PI / 180;
          const dLng = (nextStop.coordinates.lng - data.currentLocation.coordinates.lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        })() / 250 // 250m per minute walking
      ))
    : null;

  const now = new Date();
  const etaTime = etaMinutes
    ? new Date(now.getTime() + etaMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      onClick={handleClick}
      className="hidden lg:flex absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl cursor-pointer hover:border-sky-500/60 transition min-w-[240px] max-w-xs group active:scale-[0.99]"
    >
      <div className="flex items-center gap-3 w-full">
        <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-600/30">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Next Stop
          </div>
          <h4 className="font-bold text-white text-sm truncate group-hover:text-sky-300 transition">
            {nextStop.familyName}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
            <span>📍 {distanceText || '450 m away'}</span>
          </div>
          {etaTime && (
            <div className="text-[10px] text-sky-400 font-semibold mt-0.5">
              ETA: {etaMinutes} min ({etaTime})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ProcessionProvider>
      <ProcessionApp />
    </ProcessionProvider>
  );
}

export default App;
