/**
 * Converts PostGIS GEOGRAPHY/GEOMETRY(POINT, 4326) to { lat, lng }.
 * Accepts:
 * - Hex-encoded WKB/EWKB Point (PostGIS default output)
 * - GeoJSON Point: { type: 'Point', coordinates: [lng, lat] }
 * - WKT string: "POINT(lng lat)"
 * - Already-parsed: { lat, lng }
 * - [lng, lat] array
 */

/** Read a little-endian float64 from a hex string at a given hex-char offset */
function readDoubleLE(hex: string, offset: number): number {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(hex.slice(offset + i * 2, offset + i * 2 + 2), 16);
  }
  return new DataView(bytes.buffer).getFloat64(0, true);
}

export function parsePoint(
  point: unknown,
): { lat: number; lng: number } | null {
  if (!point) return null;

  if (typeof point === "string") {
    // Hex-encoded EWKB Point with SRID (50 hex chars)
    // e.g. 0101000020E6100000[X 16 hex][Y 16 hex]
    if (/^0101000020/i.test(point) && point.length === 50) {
      const lng = readDoubleLE(point, 18);
      const lat = readDoubleLE(point, 34);
      if (!isNaN(lng) && !isNaN(lat)) return { lat, lng };
    }

    // Hex-encoded WKB Point without SRID (42 hex chars)
    // e.g. 0101000000[X 16 hex][Y 16 hex]
    if (/^0101000000/i.test(point) && point.length === 42) {
      const lng = readDoubleLE(point, 10);
      const lat = readDoubleLE(point, 26);
      if (!isNaN(lng) && !isNaN(lat)) return { lat, lng };
    }

    // WKT: "POINT(lng lat)"
    const match = point.match(/POINT\s*\(\s*([0-9.-]+)\s+([0-9.-]+)\s*\)/i);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lng) && !isNaN(lat)) return { lat, lng };
    }

    return null;
  }

  // Handle [lng, lat] array
  if (Array.isArray(point) && point.length >= 2) {
    const [lng, lat] = point;
    if (typeof lng === "number" && typeof lat === "number") {
      return { lat, lng };
    }
  }

  if (typeof point !== "object") return null;

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
