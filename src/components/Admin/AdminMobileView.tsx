import React, { useState } from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { ProcessionMap } from '../Map/ProcessionMap';
import { StopManager } from './StopManager';
import { Coordinates } from '../../types/procession';
import { formatTime } from '../../utils/formatting';
import { 
  Radio, 
  Navigation, 
  ArrowRight, 
  Smartphone, 
  Map as MapIcon, 
  ListOrdered, 
  Settings, 
  ArrowLeft 
} from 'lucide-react';

interface AdminMobileViewProps {
  onStartPickLocation: (callback: (coords: Coordinates) => void) => void;
  isPickingLocation: boolean;
  onMapClick: (coords: Coordinates) => void;
  onOpenSettings: () => void;
  onSwitchToPublic: () => void;
}

export const AdminMobileView: React.FC<AdminMobileViewProps> = ({
  onStartPickLocation,
  isPickingLocation,
  onMapClick,
  onOpenSettings,
  onSwitchToPublic,
}) => {
  const {
    data,
    setActiveStop,
    departCurrentStop,
    updateLiveLocation,
    broadcastLocationViaSocket
  } = useProcession();

  const [activeTab, setActiveTab] = useState<'map' | 'stops'>('map');
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!data) return null;

  const currentStop = data.stops.find(s => s.id === data.currentStopId);
  const nextStop = data.stops.find(s => s.id === data.nextStopId);

  // Toggle Live Phone GPS Broadcast
  const handleToggleGps = () => {
    if (isBroadcastingGps) {
      setIsBroadcastingGps(false);
    } else {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported on this browser.');
        return;
      }
      setIsBroadcastingGps(true);
      navigator.geolocation.watchPosition(
        (pos) => {
          const payload = {
            coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            source: 'gps' as const,
            accuracy: Math.round(pos.coords.accuracy),
          };
          broadcastLocationViaSocket(payload);
          updateLiveLocation(payload);
        },
        (err) => {
          alert(`GPS error: ${err.message}`);
          setIsBroadcastingGps(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      );
    }
  };

  const handleArriveNext = async () => {
    if (!nextStop) return;
    setActionLoading(true);
    try {
      await setActiveStop(nextStop.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDepartCurrent = async () => {
    setActionLoading(true);
    try {
      await departCurrentStop();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative bg-slate-950 overflow-hidden lg:hidden">
      {/* Top Mobile Admin Header */}
      <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
            Coordinator Mobile
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-sky-400" />
          </button>
          <button
            onClick={onSwitchToPublic}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-semibold shadow"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {activeTab === 'map' ? (
          /* Map View + Floating Controls */
          <div className="w-full h-full relative">
            <ProcessionMap
              isAdminMode={true}
              isPickingLocation={isPickingLocation}
              onMapClick={onMapClick}
            />

            {/* Pinned Mobile Controller at Bottom */}
            <div className="absolute inset-x-0 bottom-16 z-20 px-3 pb-2 pointer-events-none">
              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl space-y-2 pointer-events-auto">
                {/* Status Row */}
                <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse flex-shrink-0" />
                    <span className="text-slate-300 font-medium truncate">
                      {currentStop ? `${currentStop.familyName} (#${currentStop.order})` : 'In Transit'}
                    </span>
                  </div>
                  <span className="text-amber-400 font-bold flex-shrink-0">
                    {nextStop ? `Next: #${nextStop.order}` : 'End'}
                  </span>
                </div>

                {/* Big Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleArriveNext}
                    disabled={!nextStop || actionLoading}
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 active:scale-95 disabled:opacity-40 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Arrived Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleDepartCurrent}
                    disabled={!currentStop || actionLoading}
                    className="py-3 px-3 rounded-xl bg-slate-800 active:scale-95 disabled:opacity-40 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Depart House</span>
                    <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  </button>
                </div>

                {/* Live GPS Broadcast Button */}
                <button
                  onClick={handleToggleGps}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow ${
                    isBroadcastingGps
                      ? 'bg-rose-600 text-white ring-2 ring-rose-400/50'
                      : 'bg-sky-600/30 text-sky-300 border border-sky-500/40'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{isBroadcastingGps ? '🔴 Transmitting Phone GPS (Active)' : '📡 Start Phone GPS Broadcast'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Stops Itinerary List */
          <div className="w-full h-full overflow-y-auto p-3.5 pb-20 space-y-3">
            <StopManager onStartPickLocation={(callback) => {
              setActiveTab('map'); // switch to map so admin can tap location
              onStartPickLocation(callback);
            }} />
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar for Mobile Admin */}
      <div className="h-14 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 z-30 flex-shrink-0 pb-safe">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center rounded-xl text-[11px] font-semibold transition ${
            activeTab === 'map' ? 'text-sky-400 font-bold' : 'text-slate-400'
          }`}
        >
          <MapIcon className="w-5 h-5 mb-0.5" />
          <span>Live Map & GPS</span>
        </button>

        <button
          onClick={() => setActiveTab('stops')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center rounded-xl text-[11px] font-semibold transition ${
            activeTab === 'stops' ? 'text-sky-400 font-bold' : 'text-slate-400'
          }`}
        >
          <ListOrdered className="w-5 h-5 mb-0.5" />
          <span>Stops ({data.stops.length})</span>
        </button>
      </div>
    </div>
  );
};
