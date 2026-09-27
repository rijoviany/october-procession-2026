import React from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { formatTime, formatDate } from '../../utils/formatting';
import { Radio, ArrowRight, MapPin, Sparkles, Navigation2 } from 'lucide-react';

export const LiveStatusBanner: React.FC = () => {
  const { data, setMapCenterTarget, setFollowLiveStatue } = useProcession();

  if (!data) return null;

  const currentStop = data.stops.find(s => s.id === data.currentStopId);
  const nextStop = data.stops.find(s => s.id === data.nextStopId);
  
  // Calculate completion percentage
  const visitedCount = data.stops.filter(s => s.status === 'visited').length;
  const totalCount = data.stops.length;
  const progressPercent = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

  const handleCenterOnStatue = () => {
    if (data.currentLocation) {
      setFollowLiveStatue(true);
      setMapCenterTarget({ ...data.currentLocation.coordinates });
    }
  };

  const handleCenterOnNext = () => {
    if (nextStop) {
      setFollowLiveStatue(false);
      setMapCenterTarget({ ...nextStop.coordinates });
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800 shadow-md backdrop-blur">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
        {/* Banner announcement if present */}
        {data.bannerMessage && (
          <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-sky-950/60 border border-sky-800/40 text-sky-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
              <span className="truncate">{data.bannerMessage}</span>
            </div>
            <span className="text-[10px] text-slate-400 flex-shrink-0">
              Updated {new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Current & Next Stop cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          {/* Card 1: Currently At */}
          <div 
            onClick={handleCenterOnStatue}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 border border-emerald-500/30 hover:border-emerald-500/60 transition cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Currently At {currentStop ? `• Stop #${currentStop.order}` : '• In Transit'}
                </span>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base truncate group-hover:text-emerald-300 transition">
                  {currentStop ? currentStop.familyName : 'Moving between stations'}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {currentStop ? `${currentStop.houseNumber}, ${currentStop.address}` : 'Statue in procession on road'}
                </p>
              </div>
            </div>

            <button 
              title="Focus on Statue"
              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition flex-shrink-0"
            >
              <Navigation2 className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Up Next */}
          <div 
            onClick={handleCenterOnNext}
            className={`flex items-center justify-between p-3 rounded-xl bg-slate-800/70 border transition shadow-sm ${
              nextStop 
                ? 'border-sky-500/30 hover:border-sky-500/60 cursor-pointer group' 
                : 'border-slate-800 opacity-70'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                  Up Next {nextStop ? `• Stop #${nextStop.order}` : ''}
                </span>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base truncate group-hover:text-sky-300 transition">
                  {nextStop ? nextStop.familyName : 'Final Culmination Reached'}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {nextStop 
                    ? `${nextStop.houseNumber} • ETA ${formatTime(nextStop.scheduledArrival)} (${formatDate(nextStop.date)})` 
                    : 'Procession completed for this feast'}
                </p>
              </div>
            </div>

            {nextStop && (
              <button 
                title="Focus on Next Stop"
                className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 transition flex-shrink-0"
              >
                <MapPin className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar & Summary */}
        <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Procession Progress:</span>
            <span className="font-semibold text-slate-200">{visitedCount} of {totalCount} Houses Visited</span>
          </div>
          <div className="w-32 sm:w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
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
