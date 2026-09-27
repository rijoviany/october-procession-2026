import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useProcession } from '../../context/ProcessionContext';
import { ProcessionStop, Coordinates } from '../../types/procession';
import { formatDate, formatTime, getStatusBadge } from '../../utils/formatting';
import { Layers, Crosshair, Navigation, Sparkles, MapPin } from 'lucide-react';

interface ProcessionMapProps {
  isAdminMode?: boolean;
  onMapClick?: (coords: Coordinates) => void;
  isPickingLocation?: boolean;
}

export const ProcessionMap: React.FC<ProcessionMapProps> = ({
  isAdminMode = false,
  onMapClick,
  isPickingLocation = false,
}) => {
  const {
    data,
    selectedStopId,
    setSelectedStopId,
    mapCenterTarget,
    setMapCenterTarget,
    followLiveStatue,
    setFollowLiveStatue,
    updateLiveLocation
  } = useProcession();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const statueMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeTileType, setActiveTileType] = useState<'streets' | 'satellite' | 'dark'>('streets');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Tile layer URLs - High performance & 100% free tier CDN
  const tileLayers = {
    streets: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = data?.currentLocation?.coordinates?.lat || 15.2848;
    const initialLng = data?.currentLocation?.coordinates?.lng || 73.9862;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control at bottom right (hidden on mobile to prevent bottom sheet overlap)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layer
    const tileLayer = L.tileLayer(tileLayers.streets, {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; CARTO &copy; OpenStreetMap'
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Architectural guideline: Resilient canvas sizing on all screen widths
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when user switches
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const subdomains = activeTileType === 'satellite' ? [] : ['a', 'b', 'c', 'd'];
    const newLayer = L.tileLayer(tileLayers[activeTileType], {
      maxZoom: 19,
      subdomains: subdomains,
      attribution: activeTileType === 'satellite' ? '&copy; Esri World Imagery' : '&copy; CARTO'
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [activeTileType]);

  // Handle map clicks (e.g. Admin adding a stop or repositioning statue)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (isPickingLocation && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [isPickingLocation, onMapClick]);

  // Draw or update the Custom Procession Pathway Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !data) return;

    const coords = data.customRouteCoordinates;
    if (!coords || coords.length === 0) {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      return;
    }

    const latLngs: L.LatLngExpression[] = coords.map(c => [c.lat, c.lng]);

    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs(latLngs);
    } else {
      // Create glowing procession pathway line
      const polyline = L.polyline(latLngs, {
        color: '#0284c7', // Marian blue
        weight: 6,
        opacity: 0.85,
        lineJoin: 'round',
        lineCap: 'round',
        dashArray: undefined
      }).addTo(map);

      routePolylineRef.current = polyline;
    }
  }, [data?.customRouteCoordinates]);

  // Render & Update Stop Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !data?.stops) return;

    const currentMarkers = stopMarkersRef.current;
    const activeStopIds = new Set(data.stops.map(s => s.id));

    // Remove obsolete markers
    currentMarkers.forEach((marker, id) => {
      if (!activeStopIds.has(id)) {
        map.removeLayer(marker);
        currentMarkers.delete(id);
      }
    });

    // Add or update markers
    data.stops.forEach((stop) => {
      const isCurrent = stop.status === 'current';
      const isVisited = stop.status === 'visited';

      const pinBg = isCurrent ? '#10b981' : isVisited ? '#64748b' : '#0284c7';
      const pinBorder = isCurrent ? '#059669' : isVisited ? '#475569' : '#0369a1';

      // SVG custom icon for house stop with order number
      const iconHtml = `
        <div class="relative group cursor-pointer transition-transform duration-200 hover:scale-110">
          <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow-lg text-sm border-2" 
               style="background-color: ${pinBg}; border-color: ${pinBorder}; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
            ${isVisited ? '✓' : stop.order}
          </div>
          ${isCurrent ? '<div class="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping opacity-75"></div>' : ''}
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-slate-900/90 text-[10px] font-medium text-white rounded whitespace-nowrap border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            ${stop.familyName}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-stop-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });

      const popupHtml = `
        <div class="p-3.5 max-w-[260px] font-sans">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span class="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isCurrent ? 'bg-emerald-500/20 text-emerald-400' : isVisited ? 'bg-slate-700 text-slate-300' : 'bg-sky-500/20 text-sky-400'
            }">
              Stop #${stop.order} • ${isCurrent ? 'Statue Here Now' : isVisited ? 'Completed' : 'Upcoming'}
            </span>
          </div>
          <h4 class="font-bold text-slate-100 text-base leading-tight">${stop.familyName}</h4>
          <p class="text-xs text-slate-400 mt-0.5">${stop.houseNumber} ${stop.address ? `• ${stop.address}` : ''}</p>
          
          <div class="my-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div>
              <span class="text-slate-400 block text-[10px]">Date</span>
              <span class="font-medium">${formatDate(stop.date)}</span>
            </div>
            <div class="text-right">
              <span class="text-slate-400 block text-[10px]">Arrival Time</span>
              <span class="font-medium text-amber-400">${formatTime(stop.scheduledArrival)}</span>
            </div>
          </div>

          ${stop.notes ? `
            <div class="bg-slate-800/80 p-2 rounded text-[11px] text-slate-300 mb-2 italic">
              "${stop.notes}"
            </div>
          ` : ''}

          <div class="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.lat},${stop.coordinates.lng}" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1">
              📍 Open in Google Maps ↗
            </a>
          </div>
        </div>
      `;

      let marker = currentMarkers.get(stop.id);
      if (marker) {
        marker.setLatLng([stop.coordinates.lat, stop.coordinates.lng]);
        marker.setIcon(customIcon);
        marker.getPopup()?.setContent(popupHtml);
      } else {
        const newMarker = L.marker([stop.coordinates.lat, stop.coordinates.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupHtml);

        newMarker.on('click', () => {
          setSelectedStopId(stop.id);
          // On mobile, close popup and let StopDetailModal show
          if (window.innerWidth < 1024) {
            newMarker.closePopup();
          }
        });

        currentMarkers.set(stop.id, newMarker);
      }
    });
  }, [data?.stops, setSelectedStopId]);

  // Render & Update Radiant Live Statue Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !data?.currentLocation) return;

    const loc = data.currentLocation.coordinates;

    const statueIconHtml = `
      <div class="relative cursor-pointer">
        <div class="statue-halo-pulse"></div>
        <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-sky-500 to-indigo-600 p-0.5 shadow-2xl animate-subtle-float flex items-center justify-center border-2 border-amber-300">
          <img src="/statue-icon.svg" alt="Mother Mary Statue" class="w-8 h-8 drop-shadow-md" />
        </div>
        <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow tracking-wider uppercase whitespace-nowrap">
          LIVE STATUE
        </div>
      </div>
    `;

    const statueIcon = L.divIcon({
      html: statueIconHtml,
      className: 'custom-statue-marker',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -28],
    });

    const statuePopupHtml = `
      <div class="p-3 max-w-[240px] text-center font-sans">
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs uppercase tracking-wide mb-1.5 border border-amber-500/40">
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          Mother Mary Statue
        </div>
        <h4 class="font-bold text-slate-100 text-sm">Live Current Position</h4>
        <p class="text-xs text-slate-400 mt-1">
          Source: ${data.currentLocation.source === 'gps' ? 'Live GPS Broadcast' : 'Station Check-In'}
        </p>
        <p class="text-[10px] text-slate-400 mt-1">
          Updated: ${new Date(data.currentLocation.updatedAt).toLocaleTimeString()}
        </p>
      </div>
    `;

    if (statueMarkerRef.current) {
      statueMarkerRef.current.setLatLng([loc.lat, loc.lng]);
      statueMarkerRef.current.setIcon(statueIcon);
      statueMarkerRef.current.getPopup()?.setContent(statuePopupHtml);
    } else {
      const marker = L.marker([loc.lat, loc.lng], {
        icon: statueIcon,
        zIndexOffset: 1000,
        draggable: isAdminMode, // allow dragging in admin mode to reposition statue manually
      })
        .addTo(map)
        .bindPopup(statuePopupHtml);

      // Handle drag end in admin mode
      marker.on('dragend', () => {
        const newPos = marker.getLatLng();
        updateLiveLocation({
          coordinates: { lat: newPos.lat, lng: newPos.lng },
          source: 'manual'
        });
      });

      statueMarkerRef.current = marker;
    }

    // Follow live statue if enabled
    if (followLiveStatue && !mapCenterTarget) {
      map.panTo([loc.lat, loc.lng], { animate: true, duration: 1 });
    }
  }, [data?.currentLocation, followLiveStatue, isAdminMode, updateLiveLocation]);

  // Center on target stop when requested
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapCenterTarget) return;

    map.flyTo([mapCenterTarget.lat, mapCenterTarget.lng], 17, {
      animate: true,
      duration: 1.2
    });

    // Reset after centering so user can pan freely
    setMapCenterTarget(null);
  }, [mapCenterTarget, setMapCenterTarget]);

  // Center on Statue Button Handler
  const handleCenterOnStatue = () => {
    if (!mapInstanceRef.current || !data?.currentLocation) return;
    setFollowLiveStatue(true);
    mapInstanceRef.current.flyTo(
      [data.currentLocation.coordinates.lat, data.currentLocation.coordinates.lng],
      17,
      { animate: true, duration: 1 }
    );
  };

  // Fit all stops bounds
  const handleFitRouteBounds = () => {
    if (!mapInstanceRef.current || !data?.stops || data.stops.length === 0) return;
    const bounds = L.latLngBounds(data.stops.map(s => [s.coordinates.lat, s.coordinates.lng]));
    if (data.currentLocation) {
      bounds.extend([data.currentLocation.coordinates.lat, data.currentLocation.coordinates.lng]);
    }
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
    setFollowLiveStatue(false);
  };

  return (
    <div className="relative w-full h-full min-h-0 bg-slate-950 overflow-hidden select-none">
      {/* Map DOM node */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Picking Location Banner in Admin Mode */}
      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-slate-950 px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <MapPin className="w-4 h-4" />
          Click anywhere on the map to set the house location
        </div>
      )}

      {/* Floating Map Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Layer Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(prev => !prev)}
            title="Map Style"
            className="w-10 h-10 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-200 flex items-center justify-center shadow-lg hover:bg-slate-800 transition active:scale-95"
          >
            <Layers className="w-5 h-5 text-sky-400" />
          </button>
          
          {showLayerMenu && (
            <div className="absolute right-0 mt-2 w-36 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-30">
              <button
                onClick={() => { setActiveTileType('streets'); setShowLayerMenu(false); }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTileType === 'streets' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                🗺️ Street Map
              </button>
              <button
                onClick={() => { setActiveTileType('satellite'); setShowLayerMenu(false); }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTileType === 'satellite' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                🛰️ Satellite
              </button>
              <button
                onClick={() => { setActiveTileType('dark'); setShowLayerMenu(false); }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTileType === 'dark' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                🌌 Clean Light/Dark
              </button>
            </div>
          )}
        </div>

        {/* Center on Statue */}
        <button
          onClick={handleCenterOnStatue}
          title="Center on Mother Mary Statue"
          className={`w-10 h-10 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-700 flex items-center justify-center shadow-lg hover:bg-slate-800 transition active:scale-95 ${
            followLiveStatue ? 'text-amber-400 ring-2 ring-amber-400/50' : 'text-slate-300'
          }`}
        >
          <Crosshair className="w-5 h-5" />
        </button>

        {/* Fit Entire Route Bounds */}
        <button
          onClick={handleFitRouteBounds}
          title="View Full Procession Route"
          className="w-10 h-10 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-300 flex items-center justify-center shadow-lg hover:bg-slate-800 transition active:scale-95"
        >
          <Navigation className="w-5 h-5 text-sky-400" />
        </button>
      </div>

      {/* Map Legend (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-950/85 backdrop-blur border border-slate-800 text-[11px] text-slate-300 shadow-xl">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-400/30"></div>
          <span>Statue Position</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span>Current Stop</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-sky-500"></div>
          <span>Upcoming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-600"></div>
          <span>Visited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-1 bg-sky-500 rounded-full"></div>
          <span>Pathway</span>
        </div>
      </div>
    </div>
  );
};
