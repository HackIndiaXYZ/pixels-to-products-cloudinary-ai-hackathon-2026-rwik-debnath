/**
 * Smart Map URL & Coordinates Parser for PressWire
 * Extracts latitude and longitude from Google Maps, Apple Maps, OpenStreetMap URLs or raw strings.
 */

export interface ParsedCoordinates {
  lat: number;
  lng: number;
  source: 'google' | 'apple' | 'osm' | 'raw';
}

export function parseMapUrlOrCoords(input: string): ParsedCoordinates | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Google Maps /place/.../@lat,lng,zoom or /@lat,lng
  const googleAtMatch = trimmed.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (googleAtMatch) {
    const lat = parseFloat(googleAtMatch[1]);
    const lng = parseFloat(googleAtMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { lat, lng, source: 'google' };
    }
  }

  // 2. Query param: ?q=lat,lng or &q=lat,lng or ?ll=lat,lng or ?daddr=lat,lng
  const queryMatch = trimmed.match(/[?&](?:q|ll|loc|daddr|saddr)=(-?\d{1,2}\.\d+)[,+](-?\d{1,3}\.\d+)/i);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidLatLng(lat, lng)) {
      const isApple = trimmed.includes('maps.apple.com');
      return { lat, lng, source: isApple ? 'apple' : 'google' };
    }
  }

  // 3. OpenStreetMap: #map=zoom/lat/lng
  const osmMatch = trimmed.match(/#map=\d+\/(-?\d{1,2}\.\d+)\/(-?\d{1,3}\.\d+)/);
  if (osmMatch) {
    const lat = parseFloat(osmMatch[1]);
    const lng = parseFloat(osmMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { lat, lng, source: 'osm' };
    }
  }

  // 4. Raw coordinate string: e.g. "37.7749, -122.4194" or "37.7749 -122.4194" or "37.7749° N, 122.4194° W"
  const rawDmsMatch = trimmed.match(/^(-?\d{1,2}(?:\.\d+)?)[°\s]*([NSns])?[,\s]+(-?\d{1,3}(?:\.\d+)?)[°\s]*([EWew])?$/);
  if (rawDmsMatch) {
    let lat = parseFloat(rawDmsMatch[1]);
    const latDir = (rawDmsMatch[2] || '').toUpperCase();
    let lng = parseFloat(rawDmsMatch[3]);
    const lngDir = (rawDmsMatch[4] || '').toUpperCase();

    if (latDir === 'S') lat = -Math.abs(lat);
    if (lngDir === 'W') lng = -Math.abs(lng);

    if (isValidLatLng(lat, lng)) {
      return { lat, lng, source: 'raw' };
    }
  }

  return null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
