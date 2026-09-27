import React, { useState, useMemo } from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { formatDate, formatTime, getStatusBadge } from '../../utils/formatting';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Radio, 
  MapPin, 
  Calendar, 
  Clock, 
  Crosshair, 
  ArrowRight,
  List
} from 'lucide-react';

export const MobileBottomSheet: React.FC = () => {
  const { 
    data, 
    selectedStopId, 
    setSelectedStopId, 
    setMapCenterTarget, 
    setFollowLiveStatue 
  } = useProcession();

  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'visited'>('all');

  if (!data) return null;

  const currentStop = data.stops.find(s => s.id === data.currentStopId);
  const nextStop = data.stops.find(s => s.id === data.nextStopId);

  // Extract dates
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(data.stops.map(s => s.date).filter(Boolean)));
    return dates.sort();
  }, [data.stops]);

  // Filtered stops
  const filteredStops = useMemo(() => {
    return data.stops.filter(stop => {
      if (selectedDate !== 'all' && stop.date !== selectedDate) return false;
      if (statusFilter === 'pending' && stop.status === 'visited') return false;
      if (statusFilter === 'visited' && stop.status !== 'visited') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          stop.familyName.toLowerCase().includes(q) ||
          stop.houseNumber.toLowerCase().includes(q) ||
          stop.address.toLowerCase().includes(q) ||
          stop.notes?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data.stops, selectedDate, statusFilter, searchQuery]);

  const handleStopClick = (stop: any) => {
    setSelectedStopId(stop.id);
    setFollowLiveStatue(false);
    setMapCenterTarget({ ...stop.coordinates });
    // Collapse on mobile so user sees the focused map
    setIsExpanded(false);
  };

  const handleCenterOnStatue = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.currentLocation) {
      setFollowLiveStatue(true);
      setMapCenterTarget({ ...data.currentLocation.coordinates });
    }
  };

  return (
    <>
      {/* Floating Quick Action Buttons on Map for Mobile (Above Bottom Bar) */}
      {!isExpanded && (
        <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-2.5 lg:hidden">
          {/* Quick Focus on Live Statue */}
          <button
            onClick={handleCenterOnStatue}
            className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex flex-col items-center justify-center shadow-2xl active:scale-95 transition border-2 border-amber-300"
            title="Focus Statue"
          >
            <Crosshair className="w-5 h-5 animate-pulse" />
            <span className="text-[8px] font-black uppercase mt-0.5">Statue</span>
          </button>

          {/* Quick Open Schedule Drawer */}
          <button
            onClick={() => setIsExpanded(true)}
            className="w-12 h-12 rounded-2xl bg-slate-900/90 backdrop-blur border border-slate-700 text-sky-400 flex flex-col items-center justify-center shadow-xl active:scale-95 transition"
            title="Open Schedule"
          >
            <List className="w-5 h-5" />
            <span className="text-[8px] font-bold text-slate-300 mt-0.5">Stops</span>
          </button>
        </div>
      )}

      {/* Backdrop overlay when expanded on mobile */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Floating Bottom Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 lg:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800 rounded-t-3xl shadow-2xl transition-all duration-300 ease-out flex flex-col ${
          isExpanded ? 'h-[82dvh] pb-safe' : 'h-20 pb-safe cursor-pointer'
        }`}
        onClick={() => {
          if (!isExpanded) setIsExpanded(true);
        }}
      >
        {/* Drag Handle Bar */}
        <div className="pt-2.5 pb-1 flex flex-col items-center flex-shrink-0">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        {/* Collapsed Peek Header */}
        {!isExpanded && (
          <div className="px-4 py-1.5 flex items-center justify-between gap-2 h-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">
                    {currentStop ? `Stop #${currentStop.order}` : 'In Transit'}
                  </span>
                  <span className="text-[10px] text-slate-500">•</span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {data.stops.filter(s => s.status === 'visited').length}/{data.stops.length} Visited
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 truncate">
                  {currentStop ? currentStop.familyName : 'Procession on Road'}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {nextStop && (
                <div className="text-right hidden xs:block">
                  <span className="text-[9px] text-sky-400 uppercase font-bold block">Next</span>
                  <span className="text-[11px] font-semibold text-slate-200">
                    {formatTime(nextStop.scheduledArrival)}
                  </span>
                </div>
              )}
              <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <ChevronUp className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* Expanded Full Drawer */}
        {isExpanded && (
          <div className="flex-1 flex flex-col min-h-0 px-4 pt-1 pb-4">
            {/* Header with Close */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Village House Schedule
                </h3>
                <p className="text-[11px] text-slate-400">
                  {data.stops.length} Stations • Tap to locate on map
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative my-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search family name, house, or road..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Date Filters */}
            {availableDates.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
                <button
                  onClick={() => setSelectedDate('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    selectedDate === 'all'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  All Dates
                </button>
                {availableDates.map(date => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      selectedDate === date
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {formatDate(date)}
                  </button>
                ))}
              </div>
            )}

            {/* Status Filters */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  statusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 bg-slate-800/60'
                }`}
              >
                All ({data.stops.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  statusFilter === 'pending'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 bg-slate-800/60'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setStatusFilter('visited')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  statusFilter === 'visited'
                    ? 'bg-slate-700 text-slate-200 border border-slate-600'
                    : 'text-slate-400 bg-slate-800/60'
                }`}
              >
                Visited
              </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredStops.map(stop => {
                const isSelected = stop.id === selectedStopId;
                const isCurrent = stop.status === 'current';
                const isVisited = stop.status === 'visited';
                const badge = getStatusBadge(stop.status);

                return (
                  <div
                    key={stop.id}
                    onClick={() => handleStopClick(stop)}
                    className={`p-3.5 rounded-2xl border transition active:scale-[0.99] text-left ${
                      isSelected
                        ? 'bg-sky-950/70 border-sky-500 ring-1 ring-sky-500'
                        : isCurrent
                        ? 'bg-emerald-950/40 border-emerald-500/50'
                        : isVisited
                        ? 'bg-slate-800/30 border-slate-800/80 opacity-75'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                          isCurrent ? 'bg-emerald-500' : isVisited ? 'bg-slate-600' : 'bg-sky-600'
                        }`}>
                          {isVisited ? '✓' : stop.order}
                        </span>
                        <h4 className="font-bold text-slate-100 text-sm truncate">
                          {stop.familyName}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border} flex-shrink-0`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 pl-8 mb-2 truncate">
                      {stop.houseNumber} {stop.address ? `• ${stop.address}` : ''}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800/80 pl-8">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        <span>{formatDate(stop.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(stop.scheduledArrival)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
