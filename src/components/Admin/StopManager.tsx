import React, { useState } from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { ProcessionStop, Coordinates } from '../../types/procession';
import { formatDate } from '../../utils/formatting';
import { resolveGoogleMapsUrl, parseCoordinatesFromText } from '../../utils/mapsUrlParser';
import { 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  MapPin, 
  Sparkles, 
  Wand2, 
  Calendar, 
  Crosshair, 
  CheckCircle2, 
  Link as LinkIcon,
  Loader2,
  Users
} from 'lucide-react';

interface StopManagerProps {
  onStartPickLocation: (callback: (coords: Coordinates) => void) => void;
}

export const StopManager: React.FC<StopManagerProps> = ({ onStartPickLocation }) => {
  const {
    data,
    addStop,
    updateStop,
    deleteStop,
    reorderStops,
    autoGenerateRoute,
    setMapCenterTarget
  } = useProcession();

  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Partial<ProcessionStop> | null>(null);
  const [mapsInput, setMapsInput] = useState('');
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const [resolvedStatus, setResolvedStatus] = useState<string | null>(null);
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [routeMessage, setRouteMessage] = useState<string | null>(null);

  if (!data) return null;

  // Open Add Stop Modal
  const handleOpenAddModal = () => {
    const nextOrder = data.stops.length + 1;
    const lastStop = data.stops[data.stops.length - 1];
    const defaultCoords = lastStop
      ? { lat: lastStop.coordinates.lat + 0.001, lng: lastStop.coordinates.lng + 0.001 }
      : { lat: 8.595090, lng: 76.954867 };

    setEditingStop({
      order: nextOrder,
      familyName: '',
      bccUnit: lastStop?.bccUnit || 'BCC Unit 1',
      date: lastStop?.date || new Date().toISOString().split('T')[0],
      coordinates: defaultCoords,
    });
    setMapsInput('');
    setResolvedStatus(null);
    setIsEditingModalOpen(true);
  };

  // Open Edit Stop Modal
  const handleOpenEditModal = (stop: ProcessionStop) => {
    setEditingStop({ ...stop });
    setMapsInput(stop.coordinates ? `${stop.coordinates.lat.toFixed(6)}, ${stop.coordinates.lng.toFixed(6)}` : '');
    setResolvedStatus('✓ Coordinates active');
    setIsEditingModalOpen(true);
  };

  // Handle Google Maps Link or Coordinate Input Change
  const handleMapsInputChange = async (value: string) => {
    setMapsInput(value);
    setResolvedStatus(null);
    if (!value.trim()) return;

    // 1. Check if direct coordinates or expanded Google Maps URL
    const coords = parseCoordinatesFromText(value);
    if (coords) {
      setEditingStop(prev => prev ? { ...prev, coordinates: coords } : null);
      setResolvedStatus(`✓ Extracted: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      return;
    }

    // 2. If it's a short URL (maps.app.goo.gl), resolve it
    if (value.includes('goo.gl') || value.includes('maps.app')) {
      setIsResolvingLink(true);
      try {
        const resolved = await resolveGoogleMapsUrl(value);
        if (resolved) {
          setEditingStop(prev => prev ? { ...prev, coordinates: resolved } : null);
          setResolvedStatus(`✓ Resolved: ${resolved.lat.toFixed(6)}, ${resolved.lng.toFixed(6)}`);
        } else {
          setResolvedStatus('Could not auto-extract. You can also paste coordinates (e.g. 8.595090, 76.954867) or tap Pick on Map.');
        }
      } finally {
        setIsResolvingLink(false);
      }
    }
  };

  // Save Stop
  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStop || !editingStop.familyName?.trim() || !editingStop.coordinates) {
      alert('Please enter Family Name and set a location via Google Maps link or map.');
      return;
    }

    const payload: Partial<ProcessionStop> = {
      order: Number(editingStop.order) || data.stops.length + 1,
      familyName: editingStop.familyName.trim(),
      bccUnit: editingStop.bccUnit?.trim() || 'BCC Unit',
      date: editingStop.date || new Date().toISOString().split('T')[0],
      coordinates: editingStop.coordinates,
    };

    if (editingStop.id) {
      await updateStop(editingStop.id, payload);
    } else {
      await addStop(payload);
    }

    setIsEditingModalOpen(false);
    setEditingStop(null);
  };

  // Sequence Reordering
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newStops = [...data.stops];
    const temp = newStops[index];
    newStops[index] = newStops[index - 1];
    newStops[index - 1] = temp;
    await reorderStops(newStops.map(s => s.id));
  };

  const handleMoveDown = async (index: number) => {
    if (index >= data.stops.length - 1) return;
    const newStops = [...data.stops];
    const temp = newStops[index];
    newStops[index] = newStops[index + 1];
    newStops[index + 1] = temp;
    await reorderStops(newStops.map(s => s.id));
  };

  const handleDeleteStop = async (id: string, name: string) => {
    if (window.confirm(`Remove "${name}" from the procession itinerary?`)) {
      await deleteStop(id);
    }
  };

  const handleAutoGenerate = async () => {
    setIsGeneratingRoute(true);
    setRouteMessage(null);
    try {
      const res = await autoGenerateRoute();
      if (res.success) {
        setRouteMessage(`Route generated smoothly with ${res.count || 'multiple'} path points!`);
      } else {
        setRouteMessage(`Note: ${res.error}`);
      }
    } finally {
      setIsGeneratingRoute(false);
    }
  };

  const handlePickOnMap = () => {
    onStartPickLocation((coords) => {
      setEditingStop(prev => prev ? { ...prev, coordinates: coords } : null);
      setMapsInput(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      setResolvedStatus(`✓ Selected from map: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      setIsEditingModalOpen(true);
    });
    setIsEditingModalOpen(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not available on this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setEditingStop(prev => prev ? { ...prev, coordinates: coords } : null);
        setMapsInput(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        setResolvedStatus(`✓ Phone GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      },
      (err) => alert(`Could not get location: ${err.message}`)
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Header & Quick Actions */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <span>Procession Houses</span>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-sky-400 font-semibold font-mono">
              {data.stops.length}
            </span>
          </h3>
          <p className="text-[11px] text-slate-400">Order, Family Name, BCC Unit & Date</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoGenerate}
            disabled={isGeneratingRoute || data.stops.length < 2}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition active:scale-95 disabled:opacity-40"
            title="Auto-Generate Pathway between all houses"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isGeneratingRoute ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isGeneratingRoute ? 'Routing...' : 'Auto Pathway'}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add House</span>
          </button>
        </div>
      </div>

      {routeMessage && (
        <div className="p-3 rounded-xl bg-sky-950/60 border border-sky-800/60 text-sky-200 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{routeMessage}</span>
        </div>
      )}

      {/* Minimal, Intuitive House List */}
      <div className="space-y-2.5">
        {data.stops.map((stop, index) => (
          <div
            key={stop.id}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition gap-3"
          >
            {/* Order Number & Reorder Up/Down */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="w-7 h-7 rounded-xl bg-sky-600/20 text-sky-400 text-xs font-bold flex items-center justify-center border border-sky-500/30 font-mono">
                #{stop.order}
              </span>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  title="Move Up"
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700 rounded transition"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === data.stops.length - 1}
                  title="Move Down"
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700 rounded transition"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Core Info: Family Name, BCC Unit, Date */}
            <div 
              onClick={() => setMapCenterTarget({ ...stop.coordinates })}
              className="flex-1 min-w-0 cursor-pointer"
            >
              <h4 className="font-bold text-slate-100 text-sm truncate hover:text-sky-300">
                {stop.familyName}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-1 truncate">
                <span className="inline-flex items-center gap-1 text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-800/40 text-[11px] font-medium">
                  <Users className="w-3 h-3" />
                  {stop.bccUnit || 'BCC Unit'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {formatDate(stop.date)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setMapCenterTarget({ ...stop.coordinates })}
                title="Locate on Map"
                className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-sky-400 transition"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleOpenEditModal(stop)}
                title="Edit House"
                className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDeleteStop(stop.id, stop.familyName)}
                title="Delete House"
                className="p-2 rounded-xl bg-slate-700/60 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Minimal & Intuitive Add / Edit House Modal */}
      {isEditingModalOpen && editingStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {editingStop.id ? `Edit House #${editingStop.order}` : 'Add House Stop'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Minimal details: Order, Family Name, BCC Unit, Date & Location
              </p>
            </div>

            <form onSubmit={handleSaveStop} className="space-y-4">
              {/* Field 1: Order Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Order Number (Procession Sequence) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editingStop.order || 1}
                  onChange={e => setEditingStop({ ...editingStop, order: parseInt(e.target.value) || 1 })}
                  className="w-full h-10 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Field 2: Family Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Family Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Fernandes Family"
                  value={editingStop.familyName || ''}
                  onChange={e => setEditingStop({ ...editingStop, familyName: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Field 3: Basic Christian Community Unit (BCC Unit) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Basic Christian Community Unit (BCC Unit) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BCC Unit 1 - St. Anne"
                  value={editingStop.bccUnit || ''}
                  onChange={e => setEditingStop({ ...editingStop, bccUnit: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Field 4: Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Procession Date *
                </label>
                <input
                  type="date"
                  required
                  value={editingStop.date || ''}
                  onChange={e => setEditingStop({ ...editingStop, date: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Field 5: Location via Google Maps Link or Pick on Map */}
              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Google Maps Link or Coordinates</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePickOnMap}
                      className="px-2.5 py-1 rounded-lg bg-sky-600/30 text-sky-300 text-[11px] font-semibold hover:bg-sky-600/50 transition flex items-center gap-1"
                    >
                      <Crosshair className="w-3 h-3" /> Pick on Map
                    </button>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="px-2 py-1 rounded-lg bg-slate-700 text-slate-300 text-[11px] font-medium hover:bg-slate-600 transition"
                    >
                      My GPS
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Paste link: https://maps.app.goo.gl/... or 8.595090, 76.954867"
                    value={mapsInput}
                    onChange={e => handleMapsInputChange(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  {isResolvingLink && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                    </div>
                  )}
                </div>

                {resolvedStatus && (
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{resolvedStatus}</span>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition active:scale-95"
                >
                  Save House
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
