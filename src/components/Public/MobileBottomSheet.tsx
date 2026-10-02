import React, { useState, useMemo } from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { formatDate, formatTime, getStatusBadge, calculateDistance } from '../../utils/formatting';
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
  List,
  Users
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

  let nextStopDistance = '';
  if (nextStop && data.currentLocation) {
    const dist = calculateDistance(
      data.currentLocation.coordinates.lat,
      data.currentLocation.coordinates.lng,
      nextStop.coordinates.lat,
      nextStop.coordinates.lng
    );
    nextStopDistance = dist.text;
  }

  // Calculate estimated time to next stop (rough estimate: 1 min per 50m)
  let nextStopTimeEst = '? min';
  if (nextStop && data.currentLocation) {
    const dist = calculateDistance(
      data.currentLocation.coordinates.lat,
      data.currentLocation.coordinates.lng,
      nextStop.coordinates.lat,
      nextStop.coordinates.lng
    );
    const mins = Math.ceil(dist.meters / 50);
    nextStopTimeEst = `${mins} min`;
  }

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
          (stop.bccUnit && stop.bccUnit.toLowerCase().includes(q)) ||
          (stop.houseNumber && stop.houseNumber.toLowerCase().includes(q)) ||
          (stop.address && stop.address.toLowerCase().includes(q)) ||
          (stop.notes && stop.notes.toLowerCase().includes(q))
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
        <div className="absolute bottom-[200px] right-4 z-20 flex flex-col gap-2.5 lg:hidden">
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
        className={`fixed inset-x-0 bottom-0 z-40 lg:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 rounded-t-3xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out flex flex-col ${
          isExpanded ? 'h-[85dvh] pb-safe' : 'pb-safe'
        }`}
      >
        {/* Drag Handle Bar */}
        <div 
          className="pt-3 pb-2 flex flex-col items-center flex-shrink-0 cursor-pointer w-full"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        {/* Collapsed Peek Content */}
        {!isExpanded && (
          <div className="px-4 pb-4 pt-1 flex flex-col gap-2.5">
            {/* Currently At */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-rose-500/80 p-0.5 overflow-hidden flex items-center justify-center flex-shrink-0 shadow">
                  <img src="/mother-mary-statue.png" alt="Currently At" className="w-full h-full object-contain filter drop-shadow" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Currently at
                  </div>
                  <div className="text-sm font-bold text-slate-100">
                    {currentStop ? currentStop.familyName : 'Varghese House'}
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '6:52 PM'}
                </span>
              </div>
            </div>

            {/* Next Stop */}
            {nextStop && (
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-600/20 border border-sky-500/40 text-sky-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wide">
                      Next Stop
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      {nextStop.familyName}
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-300">
                    {nextStopTimeEst} • {nextStopDistance}
                  </span>
                  <ArrowRight className="w-4 h-4 text-sky-400" />
                </div>
              </div>
            )}

            {/* View Button */}
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 rounded-xl mt-1 transition shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 active:scale-98"
            >
              <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M9 18h6a3 3 0 0 0 3-3V9"/></svg>
              <span>View Upcoming Houses</span>
            </button>
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
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-300'
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
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/80 border border-slate-700 text-slate-300'
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 bg-slate-800/60 border border-slate-700/50'
                }`}
              >
                All ({data.stops.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'pending'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 bg-slate-800/60 border border-slate-700/50'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setStatusFilter('visited')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'visited'
                    ? 'bg-slate-700 text-slate-200 border border-slate-600'
                    : 'text-slate-400 bg-slate-800/60 border border-slate-700/50'
                }`}
              >
                Visited
              </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 pb-4">
              {filteredStops.map(stop => {
                const isSelected = stop.id === selectedStopId;
                const isCurrent = stop.status === 'current';
                const isVisited = stop.status === 'visited';
                const badge = getStatusBadge(stop.status);
                
                let distText = '';
                let timeEst = '';
                if (!isVisited && data.currentLocation) {
                  const dist = calculateDistance(
                    data.currentLocation.coordinates.lat,
                    data.currentLocation.coordinates.lng,
                    stop.coordinates.lat,
                    stop.coordinates.lng
                  );
                  distText = dist.text;
                  const mins = Math.ceil(dist.meters / 50);
                  timeEst = `${mins}m`;
                }

                return (
                  <div
                    key={stop.id}
                    onClick={() => handleStopClick(stop)}
                    className={`p-3.5 rounded-2xl border transition active:scale-[0.99] text-left cursor-pointer ${
                      isSelected
                        ? 'bg-sky-900/40 border-sky-500 ring-1 ring-sky-500'
                        : isCurrent
                        ? 'bg-emerald-900/20 border-emerald-500/30'
                        : isVisited
                        ? 'bg-slate-800/40 border-slate-700/50 opacity-75'
                        : 'bg-slate-800/80 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                          isCurrent ? 'bg-emerald-600' : isVisited ? 'bg-slate-600' : 'bg-blue-600'
                        }`}>
                          {isVisited ? '✓' : stop.order}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-100 text-sm truncate">
                            {stop.familyName}
                          </h4>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {stop.houseNumber ? `${stop.houseNumber}, ` : ''}{stop.address || stop.bccUnit}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end flex-shrink-0 gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                        {!isVisited && distText && (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-700">
                            {distText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300 pt-2.5 mt-1 border-t border-slate-700/50 pl-11">
                      <div className="flex items-center gap-1.5 text-sky-400/90 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{stop.scheduledArrival ? formatTime(stop.scheduledArrival) : 'Time TBD'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(stop.date)}</span>
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

