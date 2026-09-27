import React, { useState, useMemo } from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { formatDate, formatTime, getStatusBadge } from '../../utils/formatting';
import { Search, Calendar, ChevronDown, ChevronUp, MapPin, CheckCircle2, Clock, Users } from 'lucide-react';

interface ScheduleDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ScheduleDrawer: React.FC<ScheduleDrawerProps> = ({ isOpen, onToggle }) => {
  const { data, selectedStopId, setSelectedStopId, setMapCenterTarget, setFollowLiveStatue } = useProcession();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'visited'>('all');

  // Extract unique dates from stops
  const availableDates = useMemo(() => {
    if (!data?.stops) return [];
    const dates = Array.from(new Set(data.stops.map(s => s.date).filter(Boolean)));
    return dates.sort();
  }, [data?.stops]);

  // Filtered stops
  const filteredStops = useMemo(() => {
    if (!data?.stops) return [];

    return data.stops.filter(stop => {
      // Date filter
      if (selectedDate !== 'all' && stop.date !== selectedDate) return false;

      // Status filter
      if (statusFilter === 'pending' && stop.status === 'visited') return false;
      if (statusFilter === 'visited' && stop.status !== 'visited') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = stop.familyName.toLowerCase().includes(q);
        const matchesBcc = !!stop.bccUnit?.toLowerCase().includes(q);
        const matchesHouse = !!stop.houseNumber?.toLowerCase().includes(q);
        const matchesAddress = !!stop.address?.toLowerCase().includes(q);
        const matchesNotes = !!stop.notes?.toLowerCase().includes(q);
        return matchesName || matchesBcc || matchesHouse || matchesAddress || matchesNotes;
      }

      return true;
    });
  }, [data?.stops, selectedDate, statusFilter, searchQuery]);

  const handleStopClick = (stop: any) => {
    setSelectedStopId(stop.id);
    setFollowLiveStatue(false);
    setMapCenterTarget({ ...stop.coordinates });
  };

  return (
    <div className={`transition-all duration-300 ease-in-out bg-slate-900/95 backdrop-blur-md border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col ${
      isOpen ? 'h-[50vh] lg:h-full lg:w-96' : 'h-14 lg:h-full lg:w-16'
    }`}>
      {/* Drawer Header adhering to 8pt grid (h-14 / 56px) */}
      <div 
        onClick={onToggle}
        className="px-4 h-14 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition select-none flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span className={`font-bold text-sm text-slate-100 ${!isOpen ? 'lg:hidden' : ''}`}>
            House Schedule ({data?.stops.length || 0})
          </span>
        </div>

        <button className="text-slate-300 hover:text-white p-1">
          {isOpen ? <ChevronDown className="w-5 h-5 lg:rotate-90" /> : <ChevronUp className="w-5 h-5 lg:-rotate-90" />}
        </button>
      </div>

      {/* Drawer Content */}
      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4 overflow-hidden">
          {/* Search Box - 40px height */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search family, house, or road..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-8 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Filter Tabs */}
          {availableDates.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
              <button
                onClick={() => setSelectedDate('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                  selectedDate === 'all'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                All Dates
              </button>
              {availableDates.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                    selectedDate === date
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {formatDate(date)}
                </button>
              ))}
            </div>
          )}

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                statusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Stops
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                statusFilter === 'pending' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setStatusFilter('visited')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                statusFilter === 'visited' ? 'bg-slate-700/50 text-slate-300 border border-slate-600' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Visited
            </button>
          </div>

          {/* Stops List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredStops.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No house stops found matching your criteria.
              </div>
            ) : (
              filteredStops.map((stop) => {
                const isSelected = stop.id === selectedStopId;
                const isCurrent = stop.status === 'current';
                const isVisited = stop.status === 'visited';
                const badge = getStatusBadge(stop.status);

                return (
                  <div
                    key={stop.id}
                    onClick={() => handleStopClick(stop)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-500 ring-1 ring-sky-500/50'
                        : isCurrent
                        ? 'bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-500/80'
                        : isVisited
                        ? 'bg-slate-800/40 border-slate-800 hover:border-slate-700 opacity-80'
                        : 'bg-slate-800/70 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                          isCurrent ? 'bg-emerald-500' : isVisited ? 'bg-slate-600' : 'bg-sky-600'
                        }`}>
                          {isVisited ? '✓' : stop.order}
                        </span>
                        <h4 className="font-semibold text-slate-100 text-xs sm:text-sm truncate">
                          {stop.familyName}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border} flex-shrink-0`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5 text-sky-400 font-medium">
                        <Users className="w-3.5 h-3.5" />
                        <span className="truncate">{stop.bccUnit || 'BCC Unit'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(stop.date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
