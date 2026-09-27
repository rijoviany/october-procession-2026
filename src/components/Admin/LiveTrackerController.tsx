import React, { useState, useEffect, useRef } from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { formatTime } from '../../utils/formatting';
import { Radio, Navigation, CheckCircle, ArrowRight, Play, Pause, AlertTriangle, Smartphone } from 'lucide-react';

export const LiveTrackerController: React.FC = () => {
  const {
    data,
    setActiveStop,
    departCurrentStop,
    updateLiveLocation,
    broadcastLocationViaSocket
  } = useProcession();

  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<number | null>(null);

  // Toggle Live Phone GPS Broadcast
  const handleToggleGps = () => {
    if (isBroadcastingGps) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsBroadcastingGps(false);
      setGpsError(null);
    } else {
      if (!navigator.geolocation) {
        setGpsError('Geolocation is not supported by your browser.');
        return;
      }

      setGpsError(null);
      setIsBroadcastingGps(true);

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          const payload = {
            coordinates: coords,
            source: 'gps' as const,
            accuracy: Math.round(pos.coords.accuracy),
            speed: pos.coords.speed || undefined,
            heading: pos.coords.heading || undefined,
          };

          // Broadcast via socket for real-time responsiveness
          broadcastLocationViaSocket(payload);
          // Also persist periodically
          updateLiveLocation(payload);
        },
        (err) => {
          console.error('GPS Watch error:', err);
          setGpsError(err.message || 'Failed to acquire GPS position');
          setIsBroadcastingGps(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000,
        }
      );

      watchIdRef.current = watchId;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simIntervalRef.current !== null) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  if (!data) return null;

  const currentStop = data.stops.find(s => s.id === data.currentStopId);
  const nextStop = data.stops.find(s => s.id === data.nextStopId);
  const currentIndex = data.stops.findIndex(s => s.id === data.currentStopId);

  // Advance to next stop handler
  const handleArriveNextStop = async () => {
    if (!nextStop) return;
    setActionLoading(true);
    try {
      await setActiveStop(nextStop.id);
    } finally {
      setActionLoading(false);
    }
  };

  // Depart current stop handler
  const handleDepartCurrentStop = async () => {
    setActionLoading(true);
    try {
      await departCurrentStop();
    } finally {
      setActionLoading(false);
    }
  };

  // Smooth Simulation along Route Coordinates (Great for testing without walking)
  const toggleSimulation = () => {
    if (isSimulating) {
      if (simIntervalRef.current !== null) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setIsSimulating(false);
    } else {
      if (!data.customRouteCoordinates || data.customRouteCoordinates.length === 0) {
        alert('Please generate route coordinates first to run simulation.');
        return;
      }

      setIsSimulating(true);
      let stepIndex = 0;
      const coords = data.customRouteCoordinates;

      simIntervalRef.current = window.setInterval(() => {
        if (stepIndex >= coords.length) {
          stepIndex = 0;
        }
        const currentCoord = coords[stepIndex];
        stepIndex++;

        broadcastLocationViaSocket({
          coordinates: currentCoord,
          source: 'manual',
        });
      }, 1500);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">Live Procession Controller</h3>
            <p className="text-[11px] text-slate-400">Manage real-time statue progress & coordinates</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 block">Current Status</span>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
            {currentStop ? `At Stop #${currentStop.order}` : 'In Transit'}
          </span>
        </div>
      </div>

      {/* Main Procession Step Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Button 1: Arrive at Next Stop */}
        <button
          onClick={handleArriveNextStop}
          disabled={!nextStop || actionLoading}
          className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg transition active:scale-95 text-left"
        >
          <div>
            <span className="block text-[10px] uppercase font-semibold text-emerald-100">
              Advance Procession
            </span>
            <span className="text-sm truncate block">
              {nextStop ? `Arrived at Stop #${nextStop.order}: ${nextStop.familyName}` : 'All Stops Reached'}
            </span>
          </div>
          <ArrowRight className="w-5 h-5 flex-shrink-0" />
        </button>

        {/* Button 2: Depart Current Stop / In Transit */}
        <button
          onClick={handleDepartCurrentStop}
          disabled={!currentStop || actionLoading}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs border border-slate-700 shadow-md transition active:scale-95 text-left"
        >
          <div>
            <span className="block text-[10px] uppercase font-semibold text-sky-400">
              Depart House
            </span>
            <span className="text-sm truncate block">
              {currentStop ? `Leave ${currentStop.familyName} (In Transit)` : 'Already in Transit'}
            </span>
          </div>
          <Navigation className="w-5 h-5 flex-shrink-0 text-sky-400" />
        </button>
      </div>

      {/* Broadcast Phone GPS Mode */}
      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isBroadcastingGps ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40' : 'bg-slate-700 text-slate-400'
          }`}>
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Transmit Phone Live GPS</h4>
            <p className="text-[11px] text-slate-400">
              {isBroadcastingGps 
                ? '📡 Broadcasting continuous live GPS coordinates to parishioners...' 
                : 'Turn ON if you are walking with the Mother Mary statue'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleGps}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow ${
            isBroadcastingGps
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-sky-600 hover:bg-sky-500 text-white'
          }`}
        >
          {isBroadcastingGps ? 'Stop GPS Broadcast' : 'Start Live GPS Broadcast'}
        </button>
      </div>

      {gpsError && (
        <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Simulator / Test Stepper */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px]">Testing / Demo Tool:</span>
        <button
          onClick={toggleSimulation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-medium transition"
        >
          {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isSimulating ? 'Pause Route Simulation' : 'Simulate Walking Route'}</span>
        </button>
      </div>
    </div>
  );
};
