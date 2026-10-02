import React from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { formatDate, getStatusBadge, calculateDistance, formatTime } from '../../utils/formatting';
import { X, MapPin, Calendar, Navigation, Users, Map as MapIcon, Home, Clock } from 'lucide-react';

export const StopDetailModal: React.FC = () => {
  const { data, selectedStopId, setSelectedStopId, setMapCenterTarget, setFollowLiveStatue } = useProcession();

  if (!selectedStopId || !data) return null;

  const stop = data.stops.find(s => s.id === selectedStopId);
  if (!stop) return null;

  const badge = getStatusBadge(stop.status);

  const handleClose = () => {
    setSelectedStopId(null);
  };

  const handleCenterOnMap = () => {
    setFollowLiveStatue(false);
    setMapCenterTarget({ ...stop.coordinates });
  };

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.lat},${stop.coordinates.lng}`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${stop.coordinates.lat},${stop.coordinates.lng}`;

  const liveCoords = data.currentLocation?.coordinates;
  const dist = liveCoords ? calculateDistance(liveCoords.lat, liveCoords.lng, stop.coordinates.lat, stop.coordinates.lng) : null;
  const etaMinutes = dist ? Math.ceil(dist.meters / 80) : null; // approx 4.8 km/h walking speed

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl pb-safe animate-in slide-in-from-bottom duration-200 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* House Photo Placeholder (Gradient) */}
        <div className="relative h-36 bg-gradient-to-br from-blue-900/80 to-slate-800 flex items-center justify-center p-4">
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-slate-900/50 text-slate-200 hover:text-white hover:bg-slate-800 transition backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex flex-col items-center justify-center text-blue-200/40">
            <Home className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-xl font-bold opacity-75 font-mono">
              {stop.houseNumber ? `House ${stop.houseNumber}` : `Stop #${stop.order}`}
            </span>
          </div>
          
          {/* Status Badge floating on bottom-left of the image area */}
          <div className="absolute bottom-3 left-4">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badge.bg} ${badge.text} ${badge.border} shadow-sm backdrop-blur-md`}>
              {badge.label}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Header Info */}
          <div>
            <h3 className="text-xl font-bold text-slate-100 mb-1.5">
              {stop.familyName}
            </h3>
            {stop.address && (
              <div className="flex items-start gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
                <span>{stop.address}</span>
              </div>
            )}
          </div>

          {/* ETA / Distance */}
          {dist && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-sm text-slate-200">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase font-medium">Estimated Time & Distance</span>
                <span>
                  <span className="font-semibold text-white">{etaMinutes} min</span> walk 
                  <span className="text-slate-400 ml-1">({dist.text})</span>
                </span>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* BCC Unit */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5">
              <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">BCC Unit</span>
                <span className="font-semibold text-slate-200 truncate block">{stop.bccUnit || 'BCC Unit'}</span>
              </div>
            </div>

            {/* Date */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Date</span>
                <span className="font-semibold text-slate-200 truncate block">{formatDate(stop.date)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex flex-col gap-2.5">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              <span>Get Directions</span>
            </a>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleCenterOnMap}
                className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 border border-slate-700"
              >
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="truncate">View on Map</span>
              </button>
              <a
                href={appleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 border border-slate-700"
              >
                <MapIcon className="w-4 h-4 text-slate-400" />
                <span className="truncate">Apple Maps</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
