import { Router, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { store } from './db.js';
import { Coordinates, ProcessionStop, UpdateLocationPayload } from '../src/types/procession.js';

export function createApiRouter(io: SocketIOServer): Router {
  const router = Router();

  // GET full procession state
  router.get('/procession', (req: Request, res: Response) => {
    res.json(store.getData());
  });

  // Verify Admin PIN
  router.post('/admin/verify-pin', (req: Request, res: Response) => {
    const { pin } = req.body;
    const currentPin = store.getData().adminPin || '1234';
    if (pin === currentPin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid Admin PIN' });
    }
  });

  // Update Settings / Meta
  router.put('/procession/settings', (req: Request, res: Response) => {
    const data = store.getData();
    const { title, subtitle, villageName, bannerMessage, adminPin, mapProvider, googleMapsApiKey, status } = req.body;
    
    if (title !== undefined) data.title = title;
    if (subtitle !== undefined) data.subtitle = subtitle;
    if (villageName !== undefined) data.villageName = villageName;
    if (bannerMessage !== undefined) data.bannerMessage = bannerMessage;
    if (adminPin !== undefined && adminPin.trim()) data.adminPin = adminPin.trim();
    if (mapProvider !== undefined) data.mapProvider = mapProvider;
    if (googleMapsApiKey !== undefined) data.googleMapsApiKey = googleMapsApiKey.trim();
    if (status !== undefined) data.status = status;

    store.saveData();
    io.emit('procession:updated', data);
    res.json(data);
  });

  // Update Live Location
  router.post('/procession/location', (req: Request, res: Response) => {
    const payload: UpdateLocationPayload = req.body;
    if (!payload.coordinates || typeof payload.coordinates.lat !== 'number' || typeof payload.coordinates.lng !== 'number') {
      res.status(400).json({ error: 'Valid lat & lng coordinates are required' });
      return;
    }

    const data = store.getData();
    data.currentLocation = {
      coordinates: payload.coordinates,
      updatedAt: new Date().toISOString(),
      source: payload.source || 'manual',
      accuracy: payload.accuracy,
      heading: payload.heading,
      speed: payload.speed,
    };

    store.saveData();
    // Broadcast live location event to all connected clients
    io.emit('location:updated', data.currentLocation);
    res.json({ success: true, currentLocation: data.currentLocation });
  });

  // Advance Procession / Set active stop
  router.post('/procession/set-active-stop', (req: Request, res: Response) => {
    const { stopId } = req.body;
    const data = store.getData();
    const stopIndex = data.stops.findIndex(s => s.id === stopId);

    if (stopIndex === -1) {
      res.status(404).json({ error: 'Stop not found' });
      return;
    }

    // Mark previous stops as visited
    data.stops = data.stops.map((s, idx) => {
      if (idx < stopIndex) {
        return {
          ...s,
          status: s.status === 'pending' || s.status === 'current' ? 'visited' : s.status,
          actualArrival: s.actualArrival || s.scheduledArrival,
          actualDeparture: s.actualDeparture || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        };
      }
      if (idx === stopIndex) {
        return {
          ...s,
          status: 'current',
          actualArrival: s.actualArrival || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        };
      }
      return {
        ...s,
        status: 'pending'
      };
    });

    data.currentStopId = stopId;
    data.nextStopId = stopIndex < data.stops.length - 1 ? data.stops[stopIndex + 1].id : null;
    
    // Also anchor current location to this stop's coordinates
    const targetStop = data.stops[stopIndex];
    data.currentLocation = {
      coordinates: { ...targetStop.coordinates },
      updatedAt: new Date().toISOString(),
      source: 'stop_anchor',
    };
    data.status = 'live';
    data.bannerMessage = `Mother Mary's statue has arrived at ${targetStop.familyName} (${targetStop.houseNumber}).`;

    store.saveData();
    io.emit('procession:updated', data);
    res.json(data);
  });

  // Depart current stop (In-Transit towards next stop)
  router.post('/procession/depart-current-stop', (req: Request, res: Response) => {
    const data = store.getData();
    if (!data.currentStopId) {
      res.status(400).json({ error: 'No active stop to depart from' });
      return;
    }

    const currentIdx = data.stops.findIndex(s => s.id === data.currentStopId);
    if (currentIdx !== -1) {
      data.stops[currentIdx].status = 'visited';
      data.stops[currentIdx].actualDeparture = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    const nextStop = data.nextStopId ? data.stops.find(s => s.id === data.nextStopId) : null;
    data.bannerMessage = nextStop 
      ? `Procession is in transit towards ${nextStop.familyName} (${nextStop.houseNumber}).`
      : `Procession is moving towards the final culmination point.`;

    data.currentStopId = null; // currently between stops
    store.saveData();
    io.emit('procession:updated', data);
    res.json(data);
  });

  // Add a new stop
  router.post('/procession/stops', (req: Request, res: Response) => {
    const stopData = req.body;
    if (!stopData.familyName || !stopData.coordinates) {
      res.status(400).json({ error: 'Family name and coordinates are required' });
      return;
    }

    const data = store.getData();
    const newOrder = data.stops.length + 1;
    const newStop: ProcessionStop = {
      id: `stop-${Date.now()}`,
      order: newOrder,
      familyName: stopData.familyName.trim(),
      houseNumber: stopData.houseNumber?.trim() || `Stop #${newOrder}`,
      address: stopData.address?.trim() || '',
      date: stopData.date || new Date().toISOString().split('T')[0],
      scheduledArrival: stopData.scheduledArrival || '18:00',
      scheduledDeparture: stopData.scheduledDeparture || '18:30',
      status: 'pending',
      coordinates: stopData.coordinates,
      contactNumber: stopData.contactNumber?.trim() || '',
      notes: stopData.notes?.trim() || '',
    };

    data.stops.push(newStop);
    store.saveData();
    io.emit('procession:updated', data);
    res.status(201).json(newStop);
  });

  // Update a stop
  router.put('/procession/stops/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const data = store.getData();
    const index = data.stops.findIndex(s => s.id === id);

    if (index === -1) {
      res.status(404).json({ error: 'Stop not found' });
      return;
    }

    data.stops[index] = {
      ...data.stops[index],
      ...updates,
      id // preserve ID
    };

    store.saveData();
    io.emit('procession:updated', data);
    res.json(data.stops[index]);
  });

  // Delete a stop
  router.delete('/procession/stops/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const data = store.getData();
    const index = data.stops.findIndex(s => s.id === id);

    if (index === -1) {
      res.status(404).json({ error: 'Stop not found' });
      return;
    }

    data.stops.splice(index, 1);
    // Re-index orders
    data.stops.forEach((s, idx) => {
      s.order = idx + 1;
    });

    if (data.currentStopId === id) data.currentStopId = null;
    if (data.nextStopId === id) data.nextStopId = null;

    store.saveData();
    io.emit('procession:updated', data);
    res.json({ success: true });
  });

  // Reorder stops
  router.put('/procession/reorder-stops', (req: Request, res: Response) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required' });
      return;
    }

    const data = store.getData();
    const stopMap = new Map(data.stops.map(s => [s.id, s]));
    const reordered: ProcessionStop[] = [];

    orderedIds.forEach((id, idx) => {
      const stop = stopMap.get(id);
      if (stop) {
        stop.order = idx + 1;
        reordered.push(stop);
        stopMap.delete(id);
      }
    });

    // append any missing
    stopMap.forEach(s => {
      s.order = reordered.length + 1;
      reordered.push(s);
    });

    data.stops = reordered;
    store.saveData();
    io.emit('procession:updated', data);
    res.json(data.stops);
  });

  // Update Route Polyline manually
  router.put('/procession/route', (req: Request, res: Response) => {
    const { coordinates } = req.body;
    if (!Array.isArray(coordinates)) {
      res.status(400).json({ error: 'Array of coordinates required' });
      return;
    }

    const data = store.getData();
    data.customRouteCoordinates = coordinates;
    store.saveData();
    io.emit('procession:updated', data);
    res.json({ success: true, customRouteCoordinates: data.customRouteCoordinates });
  });

  // Auto-generate road route between stops using OSRM
  router.post('/procession/route/auto-generate', async (req: Request, res: Response) => {
    const data = store.getData();
    if (data.stops.length < 2) {
      res.status(400).json({ error: 'At least 2 stops are required to calculate a route' });
      return;
    }

    try {
      // Build coordinates string for OSRM: lng,lat;lng,lat...
      // OSRM expects: longitude,latitude
      const coordsString = data.stops
        .map(s => `${s.coordinates.lng},${s.coordinates.lat}`)
        .join(';');

      const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${coordsString}?overview=full&geometries=geojson`;
      
      const response = await fetch(osrmUrl, {
        headers: { 'User-Agent': 'MotherMaryProcessionApp/1.0' }
      });

      if (!response.ok) {
        throw new Error(`OSRM API responded with status ${response.status}`);
      }

      const result = await response.json();
      if (result.code === 'Ok' && result.routes && result.routes[0]) {
        const geojsonCoordinates = result.routes[0].geometry.coordinates as [number, number][];
        // Convert [lng, lat] to { lat, lng }
        const generatedPath: Coordinates[] = geojsonCoordinates.map(([lng, lat]) => ({
          lat,
          lng
        }));

        data.customRouteCoordinates = generatedPath;
        store.saveData();
        io.emit('procession:updated', data);
        res.json({ success: true, count: generatedPath.length, customRouteCoordinates: generatedPath });
        return;
      } else {
        throw new Error(result.message || 'Routing failed');
      }
    } catch (err: any) {
      console.warn('OSRM route generation fallback to direct stop connections:', err.message);
      // Fallback: connect stops directly
      const directPath: Coordinates[] = data.stops.map(s => ({
        lat: s.coordinates.lat,
        lng: s.coordinates.lng
      }));
      data.customRouteCoordinates = directPath;
      store.saveData();
      io.emit('procession:updated', data);
      res.json({ success: true, isFallback: true, count: directPath.length, customRouteCoordinates: directPath });
    }
  });

  // Reset to default sample data
  router.post('/procession/reset', (req: Request, res: Response) => {
    const data = store.resetToDefault();
    io.emit('procession:updated', data);
    res.json({ success: true, data });
  });

  return router;
}
