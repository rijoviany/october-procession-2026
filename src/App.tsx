import React, { useState } from 'react';
import { ProcessionProvider, useProcession } from './context/ProcessionContext';
import { Navbar } from './components/Navbar';
import { ProcessionMap } from './components/Map/ProcessionMap';
import { LiveStatusBanner } from './components/Public/LiveStatusBanner';
import { ScheduleDrawer } from './components/Public/ScheduleDrawer';
import { AdminAuthModal } from './components/Admin/AdminAuthModal';
import { LiveTrackerController } from './components/Admin/LiveTrackerController';
import { StopManager } from './components/Admin/StopManager';
import { AdminSettingsModal } from './components/Admin/AdminSettingsModal';
import { Coordinates } from './types/procession';
import { Settings, Shield, Map as MapIcon, ArrowLeft, Loader2 } from 'lucide-react';

const ProcessionApp: React.FC = () => {
  const { data, isLoading, error, isAdmin } = useProcession();
  const [currentTab, setCurrentTab] = useState<'public' | 'admin'>('public');
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(true);

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
        <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-4" />
        <h2 className="text-base font-semibold">Connecting to Procession Map...</h2>
        <p className="text-xs text-slate-500 mt-1">Loading route waypoints and live statue coordinates</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAdminAuth={() => setIsAdminAuthOpen(true)}
      />

      {/* Main View Area */}
      {currentTab === 'public' ? (
        /* PUBLIC VIEW */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Live Status and Next Stop Banner */}
          <LiveStatusBanner />

          {/* Map + Schedule Drawer Layout */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden">
            {/* Interactive Map */}
            <div className="flex-1 h-full min-h-[300px] relative">
              <ProcessionMap isAdminMode={false} />
            </div>

            {/* Side / Bottom Schedule Drawer */}
            <ScheduleDrawer
              isOpen={isScheduleDrawerOpen}
              onToggle={() => setIsScheduleDrawerOpen(prev => !prev)}
            />
          </div>
        </div>
      ) : (
        /* ADMIN VIEW */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Admin Subheader Bar */}
          <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
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
                <Settings className="w-3.5 h-3.5 text-sky-400" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => setCurrentTab('public')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>View Public Map</span>
              </button>
            </div>
          </div>

          {/* Admin Split View: Controls on Left/Top, Interactive Map on Right/Bottom */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
            {/* Left Column: Live Controller & Stops Itinerary */}
            <div className="lg:col-span-5 xl:col-span-5 h-full overflow-y-auto p-4 space-y-4 border-r border-slate-800 bg-slate-950/60">
              <LiveTrackerController />
              <StopManager onStartPickLocation={handleStartPickLocation} />
            </div>

            {/* Right Column: Live Interactive Map with Drag and Pick Support */}
            <div className="lg:col-span-7 xl:col-span-7 h-full min-h-[400px] relative">
              <ProcessionMap
                isAdminMode={true}
                isPickingLocation={isPickingLocation}
                onMapClick={handleMapClick}
              />
            </div>
          </div>
        </div>
      )}

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

export function App() {
  return (
    <ProcessionProvider>
      <ProcessionApp />
    </ProcessionProvider>
  );
}

export default App;
