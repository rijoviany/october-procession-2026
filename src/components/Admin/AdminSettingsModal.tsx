import React, { useState } from 'react';
import { useProcession } from '../../context/ProcessionContext';
import { Settings, Save, RotateCcw, X, Key, Check } from 'lucide-react';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({ isOpen, onClose }) => {
  const { data, updateSettings, resetToDefault } = useProcession();

  const [title, setTitle] = useState(data?.title || '');
  const [villageName, setVillageName] = useState(data?.villageName || '');
  const [bannerMessage, setBannerMessage] = useState(data?.bannerMessage || '');
  const [adminPin, setAdminPin] = useState(data?.adminPin || '1234');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState(data?.googleMapsApiKey || '');
  const [mapProvider, setMapProvider] = useState<'leaflet' | 'google'>(data?.mapProvider || 'leaflet');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      title,
      villageName,
      bannerMessage,
      adminPin,
      googleMapsApiKey,
      mapProvider,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleReset = async () => {
    if (window.confirm('Reset all procession stops and route back to default village sample data? This will clear recent custom changes.')) {
      await resetToDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Procession Settings</h3>
              <p className="text-[11px] text-slate-400">Configure event details and map preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Event / Feast Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Feast of Our Lady of the Rosary"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Village / Parish Name
            </label>
            <input
              type="text"
              value={villageName}
              onChange={e => setVillageName(e.target.value)}
              placeholder="e.g. St. Xavier's Village Parish"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Live Banner Announcement / Rosary Reminder
            </label>
            <textarea
              rows={2}
              value={bannerMessage}
              onChange={e => setBannerMessage(e.target.value)}
              placeholder="e.g. Procession is currently at The Fernandes Family residence. Rosary prayer in progress."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Security PIN
              </label>
              <input
                type="text"
                value={adminPin}
                onChange={e => setAdminPin(e.target.value)}
                placeholder="1234"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono tracking-widest focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Map Tile Engine
              </label>
              <select
                value={mapProvider}
                onChange={e => setMapProvider(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="leaflet">OpenStreetMap / High-Res (Free & Ready)</option>
                <option value="google">Google Maps JS API</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Google Maps API Key (Optional)
            </label>
            <input
              type="password"
              value={googleMapsApiKey}
              onChange={e => setGoogleMapsApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Leave blank to continue using the built-in Leaflet + CartoDB/Esri satellite tile system without needing any API keys.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-900/50 text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg transition active:scale-95"
              >
                {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                <span>{isSaved ? 'Saved!' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
