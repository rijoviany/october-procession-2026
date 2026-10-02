import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useProcession } from '../../context/ProcessionContext';
import { ProcessionStop, Coordinates } from '../../types/procession';
import { formatDate, formatTime, getStatusBadge } from '../../utils/formatting';
import { Layers, Crosshair, Navigation, Sparkles, MapPin, Check, X } from 'lucide-react';

interface ProcessionMapProps {
  isAdminMode?: boolean;
  onMapClick?: (coords: Coordinates) => void;
  isPickingLocation?: boolean;
  onCancelPick?: () => void;
}

export const ProcessionMap: React.FC<ProcessionMapProps> = ({
  isAdminMode = false,
  onMapClick,
  isPickingLocation = false,
  onCancelPick,
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

  const [activeTileType, setActiveTileType] = useState<'streets' | 'satellite' | 'osm'>('streets');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [pendingPickCoords, setPendingPickCoords] = useState<Coordinates | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const previewMarkerRef = useRef<L.Marker | null>(null);

  // 100% Free, high-resolution, watermark-free global tile providers
  const tileLayers = {
    streets: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
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

    // Initial tile layer - crisp, watermark-free Esri Street Map
    const tileLayer = L.tileLayer(tileLayers.streets, {
      maxZoom: 19,
      attribution: '&copy; Esri &copy; OpenStreetMap'
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;
    setIsMapReady(true);

    // Initial fit bounds so all landmarks and stops are immediately in view
    if (data?.stops && data.stops.length > 0) {
      const bounds = L.latLngBounds(data.stops.map(s => [s.coordinates.lat, s.coordinates.lng]));
      if (data.currentLocation) {
        bounds.extend([data.currentLocation.coordinates.lat, data.currentLocation.coordinates.lng]);
      }
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    }

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
      setIsMapReady(false);
    };
  }, []);

  // Update Tile Layer when user switches
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(tileLayers[activeTileType], {
      maxZoom: 19,
      attribution: activeTileType === 'satellite' ? '&copy; Esri World Imagery' : '&copy; Esri & OpenStreetMap'
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [activeTileType]);

  // Handle map clicks — two-step: first click places a draggable preview marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (!isPickingLocation || !onMapClick) return;

      const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPendingPickCoords(coords);

      // Place or move the preview marker
      if (previewMarkerRef.current) {
        previewMarkerRef.current.setLatLng([coords.lat, coords.lng]);
      } else {
        const previewIcon = L.divIcon({
          html: `<div class="flex flex-col items-center">
            <div class="w-10 h-10 rounded-full bg-amber-500 border-4 border-white shadow-2xl flex items-center justify-center text-slate-950 font-bold text-lg animate-bounce">📍</div>
            <div class="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-amber-500 -mt-0.5"></div>
          </div>`,
          className: 'preview-pick-marker',
          iconSize: [40, 52],
          iconAnchor: [20, 52],
        });

        const marker = L.marker([coords.lat, coords.lng], {
          icon: previewIcon,
          draggable: true,
          zIndexOffset: 2000,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setPendingPickCoords({ lat: pos.lat, lng: pos.lng });
        });

        previewMarkerRef.current = marker;
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [isPickingLocation, onMapClick]);

  // Clean up preview marker when picking ends
  useEffect(() => {
    if (!isPickingLocation) {
      if (previewMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(previewMarkerRef.current);
        previewMarkerRef.current = null;
      }
      setPendingPickCoords(null);
    }
  }, [isPickingLocation]);

  // Confirm the picked location
  const handleConfirmPick = () => {
    if (pendingPickCoords && onMapClick) {
      onMapClick(pendingPickCoords);
      // cleanup handled by the isPickingLocation effect above
    }
  };

  // Cancel the pick
  const handleCancelPick = () => {
    if (previewMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(previewMarkerRef.current);
      previewMarkerRef.current = null;
    }
    setPendingPickCoords(null);
    onCancelPick?.();
  };

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
        color: '#2563eb', // Bright blue matching reference
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
        dashArray: '12 6'
      }).addTo(map);

      routePolylineRef.current = polyline;
    }
  }, [data?.customRouteCoordinates, isMapReady]);

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
      // Check if stop is church or house
      const isChurch = stop.order === 1 || stop.familyName.toLowerCase().includes('church');
      const pinColor = isCurrent ? '#10b981' : isVisited ? '#64748b' : '#0284c7';
      const pinBorder = isCurrent ? '#34d399' : isVisited ? '#94a3b8' : '#38bdf8';

      // House / Church marker matching reference design with visible house icon & label card
      const iconHtml = `
        <div style="display: flex; align-items: center; gap: 6px; pointer-events: auto; transform: translate(0, 0); white-space: nowrap;">
          <!-- Round Badge with Icon -->
          <div style="width: 32px; height: 32px; border-radius: 9999px; background-color: ${pinColor}; border: 2.5px solid ${pinBorder}; display: flex; align-items: center; justify-content: center; color: #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.6); flex-shrink: 0;">
            ${isChurch ? `
              <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24"><path d="M12 2v3m-2-2h4M12 6l-5 4v11h10V10l-5-4zm-1 9v4h2v-4h-2z"/></svg>
            ` : `
              <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
            `}
          </div>
          
          <!-- Stop Name Label Badge -->
          <div style="background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(71, 85, 105, 0.8); border-radius: 8px; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #f8fafc; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px;">
            <span>${stop.familyName}</span>
            ${isVisited ? '<span style="color: #34d399; font-size: 10px;">✓</span>' : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-stop-marker',
        iconSize: [160, 34],
        iconAnchor: [16, 17],
        popupAnchor: [16, -18],
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
          ${stop.bccUnit ? `<p class="text-xs font-medium text-emerald-400 mt-1">${stop.bccUnit}</p>` : ''}
          
          <div class="my-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div>
              <span class="text-slate-400 block text-[10px]">Date</span>
              <span class="font-medium">${formatDate(stop.date)}</span>
            </div>
            <div class="text-right">
              <span class="text-slate-400 block text-[10px]">Order No.</span>
              <span class="font-bold text-sky-400">#${stop.order}</span>
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

    // Auto-frame map to encompass all stops & statue
    if (data.stops.length > 0) {
      const bounds = L.latLngBounds(data.stops.map(s => [s.coordinates.lat, s.coordinates.lng]));
      if (data.currentLocation) {
        bounds.extend([data.currentLocation.coordinates.lat, data.currentLocation.coordinates.lng]);
      }
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 17 });
    }
  }, [data?.stops, setSelectedStopId, isMapReady]);

  // Render & Update Radiant Live Statue Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !data?.currentLocation) return;

    const loc = data.currentLocation.coordinates;

    const statueIconHtml = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; pointer-events: auto;">
        <div class="statue-halo-pulse"></div>
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <!-- Glowing circular portrait badge -->
          <div style="width: 54px; height: 54px; border-radius: 9999px; background: #0f172a; border: 2.5px solid #fbbf24; box-shadow: 0 0 20px rgba(245, 158, 11, 0.7); display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 2px;">
            <img src="/mother-mary-statue.png" alt="Mother Mary Procession" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));" />
          </div>
          <!-- Red location indicator pin dot -->
          <span style="position: absolute; bottom: -3px; width: 12px; height: 12px; border-radius: 9999px; background-color: #e11d48; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.6);"></span>
        </div>
        <div style="margin-top: 5px; padding: 2px 8px; border-radius: 9999px; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(251, 191, 36, 0.8); box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span style="width: 6px; height: 6px; border-radius: 9999px; background-color: #34d399;"></span>
          <span style="font-size: 9px; font-weight: 800; color: #fde047; text-transform: uppercase; letter-spacing: 0.05em;">Live Statue</span>
        </div>
      </div>
    `;

    const statueIcon = L.divIcon({
      html: statueIconHtml,
      className: 'custom-statue-marker',
      iconSize: [64, 76],
      iconAnchor: [32, 45],
      popupAnchor: [0, -48],
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
  }, [data?.currentLocation, followLiveStatue, isAdminMode, updateLiveLocation, isMapReady]);

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

      {/* Location Picker UI — Two-step: tap to place marker, then confirm */}
      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          {!pendingPickCoords ? (
            /* Step 1: Instruction banner */
            <div className="bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2 animate-bounce">
              <MapPin className="w-4 h-4" />
              Tap on the map to place the house location
            </div>
          ) : (
            /* Step 2: Confirm / Cancel with coordinates */
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-4 flex flex-col items-center gap-3 min-w-[280px]">
              <div className="flex items-center gap-2 text-amber-400">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Location Selected</span>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                {pendingPickCoords.lat.toFixed(6)}, {pendingPickCoords.lng.toFixed(6)}
              </p>
              <p className="text-[11px] text-slate-500">Drag the marker to adjust, then confirm</p>
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={handleCancelPick}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 border border-slate-700"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPick}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-lg"
                >
                  <Check className="w-4 h-4" />
                  Confirm Location
                </button>
              </div>
            </div>
          )}
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
                onClick={() => { setActiveTileType('osm'); setShowLayerMenu(false); }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTileType === 'osm' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                🌍 OpenStreetMap
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
