import React, { useState } from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { ProcessionStop, Coordinates } from '../../types/procession';
import { formatDate, formatTime } from '../../utils/formatting';
import { Plus, ArrowUp, ArrowDown, Edit3, Trash2, MapPin, Sparkles, Wand2, Calendar, Clock, Crosshair } from 'lucide-react';

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
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [routeMessage, setRouteMessage] = useState<string | null>(null);

  if (!data) return null;

  // Open Add Stop Modal
  const handleOpenAddModal = () => {
    const nextOrder = data.stops.length + 1;
    // default coords near last stop or village center
    const lastStop = data.stops[data.stops.length - 1];
    const defaultCoords = lastStop
      ? { lat: lastStop.coordinates.lat + 0.001, lng: lastStop.coordinates.lng + 0.001 }
      : { lat: 15.2848, lng: 73.9862 };

    setEditingStop({
      order: nextOrder,
      familyName: '',
      houseNumber: `House #${nextOrder}`,
      address: '',
      date: lastStop?.date || new Date().toISOString().split('T')[0],
      scheduledArrival: '18:00',
      scheduledDeparture: '18:30',
      coordinates: defaultCoords,
      notes: '',
      contactNumber: '',
    });
    setIsEditingModalOpen(true);
  };

  // Open Edit Stop Modal
  const handleOpenEditModal = (stop: ProcessionStop) => {
    setEditingStop({ ...stop });
    setIsEditingModalOpen(true);
  };

  // Save Stop
  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStop || !editingStop.familyName || !editingStop.coordinates) {
      alert('Please fill in the Family Name and location coordinates.');
      return;
    }

    if (editingStop.id) {
      await updateStop(editingStop.id, editingStop);
    } else {
      await addStop(editingStop);
    }

    setIsEditingModalOpen(false);
    setEditingStop(null);
  };

  // Move Stop Up in sequence
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newStops = [...data.stops];
    const temp = newStops[index];
    newStops[index] = newStops[index - 1];
    newStops[index - 1] = temp;
    await reorderStops(newStops.map(s => s.id));
  };

  // Move Stop Down in sequence
  const handleMoveDown = async (index: number) => {
    if (index >= data.stops.length - 1) return;
    const newStops = [...data.stops];
    const temp = newStops[index];
    newStops[index] = newStops[index + 1];
    newStops[index + 1] = temp;
    await reorderStops(newStops.map(s => s.id));
  };

  // Delete Stop confirmation
  const handleDeleteStop = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the procession itinerary?`)) {
      await deleteStop(id);
    }
  };

  // Auto Generate Pathway along roads
  const handleAutoGenerate = async () => {
    setIsGeneratingRoute(true);
    setRouteMessage(null);
    try {
      const res = await autoGenerateRoute();
      if (res.success) {
        setRouteMessage(`Route generated smoothly with ${res.count || 'multiple'} path points!`);
      } else {
        setRouteMessage(`Auto-route note: ${res.error}`);
      }
    } finally {
      setIsGeneratingRoute(false);
    }
  };

  // Pick location on map trigger
  const handlePickOnMap = () => {
    onStartPickLocation((coords) => {
      setEditingStop(prev => prev ? { ...prev, coordinates: coords } : null);
      setIsEditingModalOpen(true);
    });
    setIsEditingModalOpen(false); // hide modal temporarily so user sees full map
  };

  // Use current GPS location trigger
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not available on this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditingStop(prev => prev ? {
          ...prev,
          coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        } : null);
      },
      (err) => alert(`Could not get location: ${err.message}`)
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <span>Procession Stops Itinerary</span>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-sky-400 font-normal">
              {data.stops.length} Houses
            </span>
          </h3>
          <p className="text-[11px] text-slate-400">Add, edit, reorder sequence, and auto-route paths</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto Route Button */}
          <button
            onClick={handleAutoGenerate}
            disabled={isGeneratingRoute || data.stops.length < 2}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition active:scale-95 disabled:opacity-40"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isGeneratingRoute ? 'animate-spin' : ''}`} />
            <span>{isGeneratingRoute ? 'Routing...' : 'Auto-Generate Route'}</span>
          </button>

          {/* Add Stop Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add House</span>
          </button>
        </div>
      </div>

      {routeMessage && (
        <div className="p-2.5 rounded-xl bg-sky-950/60 border border-sky-800/60 text-sky-200 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{routeMessage}</span>
        </div>
      )}

      {/* Stops List */}
      <div className="space-y-2">
        {data.stops.map((stop, index) => (
          <div
            key={stop.id}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition gap-2"
          >
            {/* Sequence number & move buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="w-6 h-6 rounded-lg bg-sky-600/20 text-sky-400 text-xs font-bold flex items-center justify-center border border-sky-500/30">
                {stop.order}
              </span>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  title="Move Up"
                  className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700 rounded transition"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === data.stops.length - 1}
                  title="Move Down"
                  className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700 rounded transition"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Stop info */}
            <div 
              onClick={() => setMapCenterTarget({ ...stop.coordinates })}
              className="flex-1 min-w-0 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-slate-200 text-xs sm:text-sm truncate hover:text-sky-300">
                  {stop.familyName}
                </h4>
                <span className="text-[10px] text-slate-400 truncate">
                  ({stop.houseNumber})
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 truncate">
                <span>{formatDate(stop.date)}</span>
                <span>•</span>
                <span className="text-amber-400">{formatTime(stop.scheduledArrival)}</span>
                {stop.address && (
                  <>
                    <span>•</span>
                    <span className="truncate">{stop.address}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions: Edit / Delete / View on Map */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setMapCenterTarget({ ...stop.coordinates })}
                title="Locate on Map"
                className="p-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-sky-400 transition"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleOpenEditModal(stop)}
                title="Edit Stop"
                className="p-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDeleteStop(stop.id, stop.familyName)}
                title="Delete Stop"
                className="p-2 rounded-lg bg-slate-700/60 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Stop Modal */}
      {isEditingModalOpen && editingStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-100 mb-1">
              {editingStop.id ? `Edit Stop #${editingStop.order}` : 'Add New House Stop'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the parishioners' details, schedule, and mark location coordinates.
            </p>

            <form onSubmit={handleSaveStop} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Family / Altar Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Fernandes Family"
                    value={editingStop.familyName || ''}
                    onChange={e => setEditingStop({ ...editingStop, familyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    House # / Station Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. House #104 / Ward 2"
                    value={editingStop.houseNumber || ''}
                    onChange={e => setEditingStop({ ...editingStop, houseNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Street Address / Village Ward
                </label>
                <input
                  type="text"
                  placeholder="e.g. St. Anne Cross Road, Ward 1"
                  value={editingStop.address || ''}
                  onChange={e => setEditingStop({ ...editingStop, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Procession Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingStop.date || ''}
                    onChange={e => setEditingStop({ ...editingStop, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Scheduled Arrival
                  </label>
                  <input
                    type="time"
                    value={editingStop.scheduledArrival || ''}
                    onChange={e => setEditingStop({ ...editingStop, scheduledArrival: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Scheduled Departure
                  </label>
                  <input
                    type="time"
                    value={editingStop.scheduledDeparture || ''}
                    onChange={e => setEditingStop({ ...editingStop, scheduledDeparture: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Coordinates Section */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" /> Map Coordinates (Lat, Lng)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePickOnMap}
                      className="px-2 py-1 rounded bg-sky-600/30 text-sky-300 text-[11px] font-medium hover:bg-sky-600/50 transition flex items-center gap-1"
                    >
                      <Crosshair className="w-3 h-3" /> Pick on Map
                    </button>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-[11px] font-medium hover:bg-slate-600 transition"
                    >
                      Use Phone GPS
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={editingStop.coordinates?.lat || ''}
                      onChange={e => setEditingStop({
                        ...editingStop,
                        coordinates: {
                          lat: parseFloat(e.target.value) || 0,
                          lng: editingStop.coordinates?.lng || 0,
                        }
                      })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={editingStop.coordinates?.lng || ''}
                      onChange={e => setEditingStop({
                        ...editingStop,
                        coordinates: {
                          lat: editingStop.coordinates?.lat || 0,
                          lng: parseFloat(e.target.value) || 0,
                        }
                      })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Notes / Prayer Intentions */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Prayer Notes / Program Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Decade 1 of Rosary & Litany chanting, sick elder blessing..."
                  value={editingStop.notes || ''}
                  onChange={e => setEditingStop({ ...editingStop, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Contact number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contact Phone (Coordinator reference)
                </label>
                <input
                  type="text"
                  placeholder="+91 98221 00000"
                  value={editingStop.contactNumber || ''}
                  onChange={e => setEditingStop({ ...editingStop, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition active:scale-95"
                >
                  Save House Stop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
