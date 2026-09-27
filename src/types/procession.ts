export interface Coordinates {
  lat: number;
  lng: number;
}

export type StopStatus = 'pending' | 'current' | 'visited' | 'skipped';

export interface ProcessionStop {
  id: string;
  order: number;
  familyName: string;
  bccUnit: string;           // Basic Christian Community Unit (BCC Unit)
  date: string;              // YYYY-MM-DD
  status: StopStatus;
  coordinates: Coordinates;
  houseNumber?: string;      // Optional house number
  address?: string;          // Optional address details
  scheduledArrival?: string; // Optional arrival time
  scheduledDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  contactNumber?: string;
  notes?: string;            // Optional short note
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
  cartoApiKey?: string;
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
