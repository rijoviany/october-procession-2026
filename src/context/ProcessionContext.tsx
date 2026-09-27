import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  ProcessionData, 
  ProcessionStop, 
  Coordinates, 
  LiveLocation,
  UpdateLocationPayload 
} from '../types/procession';

interface ProcessionContextType {
  data: ProcessionData | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
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
  // Socket transmitter for continuous live GPS broadcast
  broadcastLocationViaSocket: (payload: UpdateLocationPayload) => void;
}

const ProcessionContext = createContext<ProcessionContextType | undefined>(undefined);

export const ProcessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<ProcessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [mapCenterTarget, setMapCenterTarget] = useState<Coordinates | null>(null);
  const [followLiveStatue, setFollowLiveStatue] = useState<boolean>(true);

  const socketRef = useRef<Socket | null>(null);

  // Fetch complete data via REST API
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/procession');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json: ProcessionData = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Failed to load procession data:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup Socket.IO connection
  useEffect(() => {
    // Initial fetch
    refreshData();

    // Connect to WebSocket server
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🔗 Connected to Live Procession Sync Server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('⚠️ Disconnected from Sync Server');
    });

    socket.on('procession:init', (initialData: ProcessionData) => {
      setData(initialData);
      setIsLoading(false);
    });

    socket.on('procession:updated', (updatedData: ProcessionData) => {
      setData(updatedData);
    });

    socket.on('location:updated', (newLocation: LiveLocation) => {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentLocation: newLocation,
          lastUpdated: new Date().toISOString(),
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [refreshData]);

  // Transmit location over socket for lower latency during walking GPS broadcast
  const broadcastLocationViaSocket = useCallback((payload: UpdateLocationPayload) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('location:broadcast', payload);
    }
  }, [isConnected]);

  // API Actions
  const updateSettings = async (settings: Partial<ProcessionData>): Promise<boolean> => {
    try {
      const res = await fetch('/api/procession/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update settings:', err);
      return false;
    }
  };

  const updateLiveLocation = async (payload: UpdateLocationPayload): Promise<boolean> => {
    try {
      const res = await fetch('/api/procession/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to update location:', err);
      return false;
    }
  };

  const setActiveStop = async (stopId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/procession/set-active-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to set active stop:', err);
      return false;
    }
  };

  const departCurrentStop = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/procession/depart-current-stop', {
        method: 'POST',
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to depart stop:', err);
      return false;
    }
  };

  const addStop = async (stop: Partial<ProcessionStop>): Promise<boolean> => {
    try {
      const res = await fetch('/api/procession/stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stop),
      });
      if (res.ok) {
        await refreshData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to add stop:', err);
      return false;
    }
  };

  const updateStop = async (id: string, updates: Partial<ProcessionStop>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/procession/stops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to update stop:', err);
      return false;
    }
  };

  const deleteStop = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/procession/stops/${id}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to delete stop:', err);
      return false;
    }
  };

  const reorderStops = async (orderedIds: string[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/procession/reorder-stops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to reorder stops:', err);
      return false;
    }
  };

  const autoGenerateRoute = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      const res = await fetch('/api/procession/route/auto-generate', {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, count: json.count };
      }
      return { success: false, error: json.error || 'Failed to generate route' };
    } catch (err: any) {
      console.error('Auto route failed:', err);
      return { success: false, error: err.message };
    }
  };

  const updateCustomRoute = async (coordinates: Coordinates[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/procession/route', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates }),
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to update route:', err);
      return false;
    }
  };

  const resetToDefault = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/procession/reset', {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to reset data:', err);
      return false;
    }
  };

  return (
    <ProcessionContext.Provider
      value={{
        data,
        isLoading,
        error,
        isConnected,
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
