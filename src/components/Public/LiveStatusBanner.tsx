import React from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { formatTime, formatDate, calculateDistance } from '../../utils/formatting';
import { Radio, ArrowRight, MapPin, Sparkles, Navigation2, Users, Church, Clock, Route } from 'lucide-react';

export const LiveStatusBanner: React.FC = () => {
  const { data, setMapCenterTarget, setFollowLiveStatue } = useProcession();

  if (!data) return null;

  const currentStop = data.stops.find(s => s.id === data.currentStopId);
  
  const upcomingStops = data.stops.filter(s => s.status === 'pending').slice(0, 5);
  
  const visitedCount = data.stops.filter(s => s.status === 'visited').length;
  const totalCount = data.stops.length;
  const progressPercent = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

  const handleCenterOnStatue = () => {
    if (data.currentLocation) {
      setFollowLiveStatue(true);
      setMapCenterTarget({ ...data.currentLocation.coordinates });
    }
  };

  const handleCenterOnStop = (coordinates: { lat: number, lng: number }) => {
    setFollowLiveStatue(false);
    setMapCenterTarget({ ...coordinates });
  };

  // Helper for ETA and distance
  const getDistanceAndEta = (stopLat: number, stopLng: number) => {
    if (!data.currentLocation) return { text: '', minutes: 0 };
    const { text, meters } = calculateDistance(
      data.currentLocation.coordinates.lat, 
      data.currentLocation.coordinates.lng,
      stopLat,
      stopLng
    );
    const minutes = Math.round((meters / 1000) * 15); // 15 mins per km
    return { text, minutes };
  };

  // Stats calculation
  const totalMeters = data.stops.reduce((acc, stop, idx) => {
    if (idx === 0) return 0;
    const prev = data.stops[idx - 1];
    return acc + calculateDistance(prev.coordinates.lat, prev.coordinates.lng, stop.coordinates.lat, stop.coordinates.lng).meters;
  }, 0);
  const totalKm = (totalMeters / 1000).toFixed(1);
  const totalMins = Math.round((totalMeters / 1000) * 15);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  
  return (
    <div className="w-full lg:w-80 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col h-auto lg:h-full overflow-hidden shadow-2xl relative z-10">
      
      <div className="flex-1 overflow-y-auto">
        {/* Hero Section matching reference */}
        <div className="bg-gradient-to-b from-sky-950/80 via-slate-900 to-slate-950 p-5 relative overflow-hidden border-b border-slate-800">
          <div className="flex items-center gap-4 relative z-10">
            {/* Round Mary Portrait with Halo & Crown */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-sky-900/40 border-2 border-amber-400/80 shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center justify-center p-1 overflow-hidden backdrop-blur-sm">
                <img src="/mother-mary-statue.png" alt="Mother Mary" className="w-full h-full object-contain filter drop-shadow" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-[9px] font-bold text-slate-950 flex items-center justify-center shadow">
                ✝
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-slate-100 tracking-tight leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Mother Mary Procession
              </h1>
              <p className="text-xs text-sky-400 font-medium italic mt-0.5">
                Walking Together in Faith
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  <Church className="w-2.5 h-2.5" />
                  St. Joseph's
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {data.stops.length} Houses
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* LIVE Badge Banner Card */}
          <div 
            onClick={handleCenterOnStatue}
            className="rounded-2xl bg-slate-800/80 border border-emerald-500/30 p-3.5 cursor-pointer hover:border-emerald-500/60 transition group shadow-lg"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span className="text-[11px] font-extrabold text-rose-400 tracking-wider">LIVE</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '6:52 PM'}</span>
              </div>
            </div>
            
            <div className="text-[11px] text-slate-400 font-medium">Currently at</div>
            <h3 className="font-bold text-slate-100 text-base group-hover:text-emerald-400 transition truncate mt-0.5">
              {currentStop ? currentStop.familyName : 'Varghese House'}
            </h3>
          </div>

          {/* Banner message if present */}
          {data.bannerMessage && (
            <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse mt-0.5" />
              <p className="text-xs text-sky-200">{data.bannerMessage}</p>
            </div>
          )}

          {/* Upcoming Houses (Next Stops) List matching reference */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 px-0.5 flex items-center justify-between">
              <span>Upcoming Houses (Next Stops)</span>
            </h4>
            <div className="space-y-1.5">
              {upcomingStops.length > 0 ? upcomingStops.map((stop, idx) => {
                const { text: distText, minutes } = getDistanceAndEta(stop.coordinates.lat, stop.coordinates.lng);
                const isFirstUpcoming = idx === 0;

                return (
                  <div 
                    key={stop.id}
                    onClick={() => handleCenterOnStop(stop.coordinates)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition group ${
                      isFirstUpcoming 
                        ? 'bg-sky-950/40 border-sky-500/40 hover:bg-sky-900/30' 
                        : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/80 hover:border-slate-600'
                    }`}
                  >
                    {/* Number Badge */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isFirstUpcoming ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'bg-slate-700/80 text-slate-300'
                    }`}>
                      {stop.order}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-semibold text-slate-200 truncate group-hover:text-sky-300 transition">
                        {stop.familyName}
                      </h5>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{minutes > 0 ? `${minutes} min` : '2 min'}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span>{distText || '150 m'}</span>
                      </div>
                    </div>

                    <ArrowRight className={`w-3.5 h-3.5 transition ${
                      isFirstUpcoming ? 'text-sky-400 group-hover:translate-x-1' : 'text-slate-500 group-hover:text-slate-300'
                    }`} />
                  </div>
                );
              }) : (
                <div className="text-xs text-slate-500 italic p-3 text-center bg-slate-800/30 rounded-xl">
                  No upcoming stops
                </div>
              )}
            </div>
          </div>

          {/* View Full Route Button */}
          <button 
            onClick={() => {
              if (data.stops.length > 0) {
                handleCenterOnStop(data.stops[0].coordinates);
              }
            }}
            className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 active:scale-98"
          >
            <Route className="w-4 h-4" />
            <span>View Full Route</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-slate-950 border-t border-slate-800 p-4 shrink-0">
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Total Distance</div>
            <div className="text-sm font-medium text-slate-200">{totalKm} km</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Est. Duration</div>
            <div className="text-sm font-medium text-slate-200">{hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Total Houses</div>
            <div className="text-sm font-medium text-slate-200">{totalCount}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Started</div>
            <div className="text-sm font-medium text-slate-200">{data.stops[0]?.scheduledArrival ? formatTime(data.stops[0].scheduledArrival) : '--:--'}</div>
          </div>
        </div>
        
        {/* Progress Bar inside Stats */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Progress</span>
            <span className="text-sky-400 font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-sky-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

    </div>
  );
};
