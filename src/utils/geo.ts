/**
 * Converts PostGIS GEOGRAPHY/GEOMETRY(POINT, 4326) to { lat, lng }.
 * Accepts GeoJSON Point: { type: 'Point', coordinates: [lng, lat] }
 * or already-parsed { lat, lng } format.
 */
export function parsePoint(
  point: unknown,
): { lat: number; lng: number } | null {
  if (!point || typeof point !== "object") return null;

  const p = point as Record<string, unknown>;

  // GeoJSON Point: { type: 'Point', coordinates: [lng, lat] }
  if (
    p.type === "Point" &&
    Array.isArray(p.coordinates) &&
    p.coordinates.length >= 2
  ) {
    const [lng, lat] = p.coordinates as number[];
    if (typeof lng === "number" && typeof lat === "number") {
      return { lat, lng };
    }
  }

  // Already in { lat, lng } format
  if (typeof p.lat === "number" && typeof p.lng === "number") {
    return { lat: p.lat, lng: p.lng };
  }

  return null;
}

/**
 * Converts { lat, lng } back to GeoJSON Point for PostGIS writes.
 * Returns null if input is null/undefined.
 */
export function toGeoPoint(
  coords: { lat: number; lng: number } | null | undefined,
): { type: "Point"; coordinates: [number, number] } | null {
  if (!coords) return null;
  return { type: "Point", coordinates: [coords.lng, coords.lat] };
}
