import React from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { formatDate, getStatusBadge } from '../../utils/formatting';
import { X, MapPin, Calendar, Navigation, Users } from 'lucide-react';

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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="w-full sm:max-w-md bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 pb-safe animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Handle for mobile */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

        {/* Minimal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-sky-600/20 text-sky-400 font-bold text-sm flex items-center justify-center border border-sky-500/30 font-mono flex-shrink-0">
              #{stop.order}
            </span>
            <div className="min-w-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border} inline-block mb-1`}>
                {badge.label}
              </span>
              <h3 className="text-base font-bold text-slate-100 truncate">
                {stop.familyName}
              </h3>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Minimal 2 Key Details: BCC Unit and Date */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* BCC Unit */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5">
            <Users className="w-4 h-4 text-sky-400 flex-shrink-0" />
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
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleCenterOnMap}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <MapPin className="w-4 h-4 text-sky-400" />
            <span>Center on Map</span>
          </button>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg transition active:scale-95"
          >
            <Navigation className="w-4 h-4" />
            <span>Open in Google Maps ↗</span>
          </a>
        </div>
      </div>
    </div>
  );
};
