export interface Coordinates {
  lat: number;
  lng: number;
}

export type StopStatus = 'pending' | 'current' | 'visited' | 'skipped';

export interface ProcessionStop {
  id: string;
  order: number;
  familyName: string;
  houseNumber: string;
  address: string;
  date: string;              // YYYY-MM-DD
  scheduledArrival: string;  // HH:MM
  scheduledDeparture: string;// HH:MM
  actualArrival?: string;
  actualDeparture?: string;
  status: StopStatus;
  coordinates: Coordinates;
  contactNumber?: string;
  notes?: string;
  photoUrl?: string;
}

export type ProcessionStatus = 'not_started' | 'live' | 'paused' | 'completed';

export interface LiveLocation {
  coordinates: Coordinates;
  updatedAt: string;
  source: 'gps' | 'manual' | 'stop_anchor';
  accuracy?: number; // meters
  heading?: number;
  speed?: number;
}

export interface ProcessionData {
  title: string;
  subtitle: string;
  villageName: string;
  status: ProcessionStatus;
  currentLocation: LiveLocation;
  currentStopId: string | null;
  nextStopId: string | null;
  customRouteCoordinates: Coordinates[];
  stops: ProcessionStop[];
  mapProvider: 'leaflet' | 'google';
  googleMapsApiKey?: string;
  adminPin: string;
  bannerMessage?: string;
  lastUpdated: string;
}

export interface UpdateLocationPayload {
  coordinates: Coordinates;
  source?: 'gps' | 'manual' | 'stop_anchor';
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface RouteGenerationOptions {
  profile?: 'walking' | 'driving';
}
