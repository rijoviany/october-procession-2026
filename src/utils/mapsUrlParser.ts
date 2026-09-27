import { Coordinates } from '../types/procession';

/**
 * Extracts latitude and longitude from various Google Maps links and coordinate formats:
 * - https://maps.app.goo.gl/oeNY6GcjJtBD3VzLA (resolved)
 * - https://www.google.com/maps/search/8.595090,+76.954867...
 * - https://www.google.com/maps?q=15.2848,73.9862
 * - https://maps.google.com/?q=15.2848,73.9862
 * - https://www.google.com/maps/@15.2848,73.9862,17z
 * - https://www.google.com/maps/place/.../@15.2848,73.9862,17z
 * - Raw coordinates: "8.595090, 76.954867" or "8.595090 76.954867"
 */
export function parseCoordinatesFromText(input: string): Coordinates | null {
  if (!input || typeof input !== 'string') return null;
  const text = decodeURIComponent(input.trim());

  // 1. Raw coordinates pattern: "8.595090, 76.954867" or "8.595090 76.954867"
  const rawCoordMatch = text.match(/^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/);
  if (rawCoordMatch) {
    const lat = parseFloat(rawCoordMatch[1]);
    const lng = parseFloat(rawCoordMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 2. /search/lat,+lng or /search/lat,lng
  const searchMatch = text.match(/\/search\/(-?\d{1,2}\.\d+)[,+%20\s]+(-?\d{1,3}\.\d+)/i);
  if (searchMatch) {
    const lat = parseFloat(searchMatch[1]);
    const lng = parseFloat(searchMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 3. Query param ?q=lat,lng or ?query=lat,lng or &ll=lat,lng
  const qParamMatch = text.match(/[?&](?:q|query|ll)=(-?\d{1,2}\.\d+)[,%2C\s+]+(-?\d{1,3}\.\d+)/i);
  if (qParamMatch) {
    const lat = parseFloat(qParamMatch[1]);
    const lng = parseFloat(qParamMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 4. /@lat,lng pattern (standard Google Maps URL path)
  const atMatch = text.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 5. !3dlat!4dlng (Google Maps protobuf parameter format)
  const protoMatch = text.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (protoMatch) {
    const lat = parseFloat(protoMatch[1]);
    const lng = parseFloat(protoMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 6. General fallback: find any pair of decimal numbers that look like coordinates
  const generalMatch = text.match(/(-?\d{1,2}\.\d{4,})[,+%20\s]+(-?\d{1,3}\.\d{4,})/);
  if (generalMatch) {
    const lat = parseFloat(generalMatch[1]);
    const lng = parseFloat(generalMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Resolves short Google Maps URLs (e.g. https://maps.app.goo.gl/... or https://goo.gl/maps/...)
 * by calling backend resolver or fallback proxy.
 */
export async function resolveGoogleMapsUrl(input: string): Promise<Coordinates | null> {
  const cleanInput = input.trim();

  // 1. Direct local parse first
  const localParsed = parseCoordinatesFromText(cleanInput);
  if (localParsed) return localParsed;

  // 2. If short link, resolve redirect
  if (cleanInput.includes('goo.gl') || cleanInput.includes('maps.app.goo.gl')) {
    // Attempt local API resolver
    try {
      const res = await fetch('/api/resolve-maps-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanInput }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.coordinates) return data.coordinates;
      }
    } catch {
      // Local API unavailable, try edge resolver
    }

    // Attempt edge proxy resolution
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanInput)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const text = await res.text();
        // The response html usually contains the meta tag: content="https://www.google.com/maps/place/... or coordinates
        const m = text.match(/(-?\d{1,2}\.\d{4,})[,+%20\s]+(-?\d{1,3}\.\d{4,})/);
        if (m) {
          const lat = parseFloat(m[1]);
          const lng = parseFloat(m[2]);
          if (isValidLatLng(lat, lng)) return { lat, lng };
        }
      }
    } catch {
      // Proxy failed
    }
  }

  return null;
}
