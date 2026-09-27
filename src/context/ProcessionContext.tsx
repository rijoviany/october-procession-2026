import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  ProcessionData, 
  ProcessionStop, 
  Coordinates, 
  LiveLocation,
  UpdateLocationPayload 
} from '../types/procession';
import { initialProcessionData } from '../data/defaultData';

interface ProcessionContextType {
  data: ProcessionData;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  isOfflineMode: boolean;
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  // Selection & navigation state
  selectedStopId: string | null;
  setSelectedStopId: (id: string | null) => void;
  mapCenterTarget: Coordinates | null;
  setMapCenterTarget: (coords: Coordinates | null) => void;
  followLiveStatue: boolean;
  setFollowLiveStatue: (val: boolean) => void;
  // Actions
  refreshData: () => Promise<void>;
  updateSettings: (settings: Partial<ProcessionData>) => Promise<boolean>;
  updateLiveLocation: (payload: UpdateLocationPayload) => Promise<boolean>;
  setActiveStop: (stopId: string) => Promise<boolean>;
  departCurrentStop: () => Promise<boolean>;
  addStop: (stop: Partial<ProcessionStop>) => Promise<boolean>;
  updateStop: (id: string, updates: Partial<ProcessionStop>) => Promise<boolean>;
  deleteStop: (id: string) => Promise<boolean>;
  reorderStops: (orderedIds: string[]) => Promise<boolean>;
  autoGenerateRoute: () => Promise<{ success: boolean; count?: number; error?: string }>;
  updateCustomRoute: (coords: Coordinates[]) => Promise<boolean>;
  resetToDefault: () => Promise<boolean>;
  broadcastLocationViaSocket: (payload: UpdateLocationPayload) => void;
}

const LOCAL_STORAGE_KEY = 'marian_procession_cache_v1';

function getInitialCachedData(): ProcessionData {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.stops) && parsed.stops.length > 0) {
        return { ...initialProcessionData, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Could not read cached procession data:', e);
  }
  return initialProcessionData;
}

function saveToLocalCache(data: ProcessionData) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not persist procession data to local cache:', e);
  }
}

const ProcessionContext = createContext<ProcessionContextType | undefined>(undefined);

export const ProcessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<ProcessionData>(getInitialCachedData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [mapCenterTarget, setMapCenterTarget] = useState<Coordinates | null>(null);
  const [followLiveStatue, setFollowLiveStatue] = useState<boolean>(true);

  const socketRef = useRef<Socket | null>(null);

  // Sync to state and persist
  const updateDataState = useCallback((updater: (prev: ProcessionData) => ProcessionData) => {
    setData(prev => {
      const next = updater(prev);
      saveToLocalCache(next);
      return next;
    });
  }, []);

  // Fetch complete data via REST API
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/procession');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json: ProcessionData = await res.json();
      if (json && Array.isArray(json.stops) && json.stops.length > 0) {
        setData(json);
        saveToLocalCache(json);
        setIsOfflineMode(false);
      }
    } catch (err: any) {
      console.warn('Server API not reachable, running gracefully on local dataset:', err.message);
      setIsOfflineMode(true);
      // Ensure data has the default stops if cache was empty
      setData(prev => {
        if (!prev.stops || prev.stops.length === 0) {
          saveToLocalCache(initialProcessionData);
          return initialProcessionData;
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup Socket.IO connection
  useEffect(() => {
    refreshData();

    // Connect to WebSocket server with fallback
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      timeout: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsOfflineMode(false);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      setIsOfflineMode(true);
    });

    socket.on('procession:init', (initialData: ProcessionData) => {
      if (initialData && Array.isArray(initialData.stops)) {
        setData(initialData);
        saveToLocalCache(initialData);
        setIsOfflineMode(false);
      }
    });

    socket.on('procession:updated', (updatedData: ProcessionData) => {
      if (updatedData && Array.isArray(updatedData.stops)) {
        setData(updatedData);
        saveToLocalCache(updatedData);
      }
    });

    socket.on('location:updated', (newLocation: LiveLocation) => {
      updateDataState(prev => ({
        ...prev,
        currentLocation: newLocation,
        lastUpdated: new Date().toISOString(),
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [refreshData, updateDataState]);

  // Transmit location over socket for lower latency during walking GPS broadcast
  const broadcastLocationViaSocket = useCallback((payload: UpdateLocationPayload) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('location:broadcast', payload);
    }
  }, [isConnected]);

  // API Actions with Optimistic Local Updates
  const updateSettings = async (settings: Partial<ProcessionData>): Promise<boolean> => {
    updateDataState(prev => ({
      ...prev,
      ...settings,
      lastUpdated: new Date().toISOString(),
    }));

    try {
      const res = await fetch('/api/procession/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      return res.ok;
    } catch {
      return true; // Optimistically successful locally
    }
  };

  const updateLiveLocation = async (payload: UpdateLocationPayload): Promise<boolean> => {
    updateDataState(prev => ({
      ...prev,
      currentLocation: {
        coordinates: payload.coordinates,
        updatedAt: new Date().toISOString(),
        source: payload.source || 'manual',
        accuracy: payload.accuracy,
        heading: payload.heading,
        speed: payload.speed,
      },
      lastUpdated: new Date().toISOString(),
    }));

    try {
      const res = await fetch('/api/procession/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return true;
    }
  };

  const setActiveStop = async (stopId: string): Promise<boolean> => {
    updateDataState(prev => {
      const stopIndex = prev.stops.findIndex(s => s.id === stopId);
      if (stopIndex === -1) return prev;

      const targetStop = prev.stops[stopIndex];
      const updatedStops = prev.stops.map((s, idx) => {
        if (idx < stopIndex) {
          return {
            ...s,
            status: 'visited' as const,
            actualArrival: s.actualArrival || s.scheduledArrival,
            actualDeparture: s.actualDeparture || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          };
        }
        if (idx === stopIndex) {
          return {
            ...s,
            status: 'current' as const,
            actualArrival: s.actualArrival || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          };
        }
        return { ...s, status: 'pending' as const };
      });

      return {
        ...prev,
        stops: updatedStops,
        currentStopId: stopId,
        nextStopId: stopIndex < updatedStops.length - 1 ? updatedStops[stopIndex + 1].id : null,
        currentLocation: {
          coordinates: { ...targetStop.coordinates },
          updatedAt: new Date().toISOString(),
          source: 'stop_anchor',
          accuracy: 5,
        },
        bannerMessage: `Mother Mary statue has arrived at ${targetStop.familyName}${targetStop.bccUnit ? ` (${targetStop.bccUnit})` : ''}.`,
        lastUpdated: new Date().toISOString(),
      };
    });

    try {
      await fetch('/api/procession/set-active-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopId }),
      });
    } catch (e) {
      console.warn('Optimistic local stop update applied.');
    }
    return true;
  };

  const departCurrentStop = async (): Promise<boolean> => {
    updateDataState(prev => {
      if (!prev.currentStopId) return prev;
      const currentIdx = prev.stops.findIndex(s => s.id === prev.currentStopId);
      const updatedStops = [...prev.stops];
      if (currentIdx !== -1) {
        updatedStops[currentIdx] = {
          ...updatedStops[currentIdx],
          status: 'visited',
          actualDeparture: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        };
      }

      const nextStop = prev.nextStopId ? updatedStops.find(s => s.id === prev.nextStopId) : null;

      return {
        ...prev,
        stops: updatedStops,
        currentStopId: null,
        bannerMessage: nextStop
          ? `Procession is in transit towards ${nextStop.familyName}${nextStop.bccUnit ? ` (${nextStop.bccUnit})` : ''}.`
          : `Procession is concluding at the final chapel.`,
        lastUpdated: new Date().toISOString(),
      };
    });

    try {
      await fetch('/api/procession/depart-current-stop', { method: 'POST' });
    } catch {}
    return true;
  };

  const addStop = async (stop: Partial<ProcessionStop>): Promise<boolean> => {
    const newStop: ProcessionStop = {
      id: `stop-${Date.now()}`,
      order: stop.order || data.stops.length + 1,
      familyName: stop.familyName || 'New Parishioner',
      bccUnit: stop.bccUnit || 'BCC Unit 1',
      houseNumber: stop.houseNumber || `House #${data.stops.length + 1}`,
      address: stop.address || '',
      date: stop.date || new Date().toISOString().split('T')[0],
      scheduledArrival: stop.scheduledArrival || '18:00',
      scheduledDeparture: stop.scheduledDeparture || '18:30',
      status: 'pending',
      coordinates: stop.coordinates || { lat: 8.595090, lng: 76.954867 },
      notes: stop.notes || '',
      contactNumber: stop.contactNumber || '',
    };

    updateDataState(prev => ({
      ...prev,
      stops: [...prev.stops, newStop],
      lastUpdated: new Date().toISOString(),
    }));

    try {
      await fetch('/api/procession/stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stop),
      });
    } catch {}
    return true;
  };

  const updateStop = async (id: string, updates: Partial<ProcessionStop>): Promise<boolean> => {
    updateDataState(prev => ({
      ...prev,
      stops: prev.stops.map(s => s.id === id ? { ...s, ...updates } : s),
      lastUpdated: new Date().toISOString(),
    }));

    try {
      await fetch(`/api/procession/stops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch {}
    return true;
  };

  const deleteStop = async (id: string): Promise<boolean> => {
    updateDataState(prev => {
      const filtered = prev.stops.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 }));
      return {
        ...prev,
        stops: filtered,
        currentStopId: prev.currentStopId === id ? null : prev.currentStopId,
        nextStopId: prev.nextStopId === id ? null : prev.nextStopId,
        lastUpdated: new Date().toISOString(),
      };
    });

    try {
      await fetch(`/api/procession/stops/${id}`, { method: 'DELETE' });
    } catch {}
    return true;
  };

  const reorderStops = async (orderedIds: string[]): Promise<boolean> => {
    updateDataState(prev => {
      const map = new Map(prev.stops.map(s => [s.id, s]));
      const reordered: ProcessionStop[] = [];
      orderedIds.forEach((id, idx) => {
        const item = map.get(id);
        if (item) {
          reordered.push({ ...item, order: idx + 1 });
        }
      });
      return {
        ...prev,
        stops: reordered,
        lastUpdated: new Date().toISOString(),
      };
    });

    try {
      await fetch('/api/procession/reorder-stops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
    } catch {}
    return true;
  };

  const autoGenerateRoute = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      const coordsString = data.stops
        .map(s => `${s.coordinates.lng},${s.coordinates.lat}`)
        .join(';');

      const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${coordsString}?overview=full&geometries=geojson`;
      const response = await fetch(osrmUrl);
      if (response.ok) {
        const result = await response.json();
        if (result.code === 'Ok' && result.routes && result.routes[0]) {
          const generatedPath: Coordinates[] = result.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({
            lat,
            lng
          }));
          updateDataState(prev => ({
            ...prev,
            customRouteCoordinates: generatedPath,
            lastUpdated: new Date().toISOString(),
          }));
          return { success: true, count: generatedPath.length };
        }
      }
    } catch (e: any) {
      console.warn('Direct fallback route applied');
    }

    // Direct fallback
    const directPath = data.stops.map(s => ({ ...s.coordinates }));
    updateDataState(prev => ({
      ...prev,
      customRouteCoordinates: directPath,
      lastUpdated: new Date().toISOString(),
    }));
    return { success: true, count: directPath.length };
  };

  const updateCustomRoute = async (coordinates: Coordinates[]): Promise<boolean> => {
    updateDataState(prev => ({
      ...prev,
      customRouteCoordinates: coordinates,
      lastUpdated: new Date().toISOString(),
    }));

    try {
      await fetch('/api/procession/route', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates }),
      });
    } catch {}
    return true;
  };

  const resetToDefault = async (): Promise<boolean> => {
    setData(initialProcessionData);
    saveToLocalCache(initialProcessionData);
    try {
      await fetch('/api/procession/reset', { method: 'POST' });
    } catch {}
    return true;
  };

  return (
    <ProcessionContext.Provider
      value={{
        data,
        isLoading,
        error,
        isConnected,
        isOfflineMode,
        isAdmin,
        setIsAdmin,
        selectedStopId,
        setSelectedStopId,
        mapCenterTarget,
        setMapCenterTarget,
        followLiveStatue,
        setFollowLiveStatue,
        refreshData,
        updateSettings,
        updateLiveLocation,
        setActiveStop,
        departCurrentStop,
        addStop,
        updateStop,
        deleteStop,
        reorderStops,
        autoGenerateRoute,
        updateCustomRoute,
        resetToDefault,
        broadcastLocationViaSocket,
      }}
    >
      {children}
    </ProcessionContext.Provider>
  );
};

export const useProcession = (): ProcessionContextType => {
  const context = useContext(ProcessionContext);
  if (!context) {
    throw new Error('useProcession must be used within a ProcessionProvider');
  }
  return context;
};
