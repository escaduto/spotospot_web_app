import { createClient } from "./client";
import { getPOIConfig } from "../map/scripts/poi-config";

// -------------------------------------------------
// Types
// -------------------------------------------------

export interface PlaceBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Flat row returned by the RPC functions (coords already extracted) */
export interface PlacePointResult {
  id: string;
  source: string;
  source_id: string;
  name_default: string;
  name_en: string | null;
  category: string | null;
  categories: string[] | null;
  category_group: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  lat: number;
  lng: number;
  website_url: string | null;
  phone_number: string | null;
  popularity_score: number | null;
  is_top_destination: boolean | null;
  metadata: Record<string, string | number> | null;
}

// -------------------------------------------------
// Data fetching
// -------------------------------------------------

/**
 * Autocomplete search – matches against name, address, city.
 * If mapCenter is provided, results are sorted by distance from that point and limited to closest results.
 */
export async function searchPlaces(
  query: string,
  limit: number = 100,
  mapCenter?: { lng: number; lat: number },
): Promise<PlacePointResult[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("search_places", {
    search_query: query,
    lim: limit,
  });

  if (error) {
    console.error("Error searching places:", error);
    return [];
  }

  const places = (data as PlacePointResult[]) ?? [];

  // If map center provided, sort by distance and limit to reasonable radius
  if (mapCenter && places.length > 0) {
    // Calculate distances and sort
    const placesWithDistance = places.map((place) => ({
      place,
      distance: getDistance(mapCenter.lat, mapCenter.lng, place.lat, place.lng),
    }));

    placesWithDistance.sort((a, b) => a.distance - b.distance);

    // For "show all", limit to places within 50km or top 50 results, whichever is smaller
    const maxDistance = 50; // km
    const maxResults = 50;

    const filtered = placesWithDistance
      .filter((item) => item.distance <= maxDistance)
      .slice(0, maxResults)
      .map((item) => item.place);

    return filtered.length > 0
      ? filtered
      : placesWithDistance.slice(0, 20).map((item) => item.place);
  }

  return places.slice(0, 20);
}

/**
 * Calculate distance between two points using Haversine formula (in km)
 */
function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Fetch the complete polygon geometry for a landuse or building feature
 * directly from Supabase, bypassing tile-edge clipping.
 *
 * Supabase / PostgREST automatically serialises PostGIS geometry columns as
 * GeoJSON objects in the JSON response, so no custom RPC is required.
 */
export async function getPolygonGeometry(
  sourceTable: "landuse_features" | "building_features",
  sourceId: string,
): Promise<GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null> {
  const supabase = createClient();

  // PostgREST returns PostGIS geometry as WKB hex by default.
  // Selecting `geometry->ST_AsGeoJSON` is not supported via the REST API;
  // instead we call a lightweight RPC wrapper.
  const { data, error } = await supabase
    .rpc("get_polygon_geojson", {
      p_table: sourceTable,
      p_id: sourceId,
    })
    .maybeSingle();

  if (error || !data) {
    console.error(
      `getPolygonGeometry: failed for ${sourceTable}/${sourceId}:`,
      error,
    );
    return null;
  }

  const row = data as {
    id: string;
    name: string | null;
    category: string | null;
    category_group: string | null;
    importance_score: number | null;
    geojson: string; // ST_AsGeoJSON() text
  };

  let geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  try {
    geometry = JSON.parse(row.geojson) as
      | GeoJSON.Polygon
      | GeoJSON.MultiPolygon;
  } catch {
    console.error("getPolygonGeometry: failed to parse geojson", row.geojson);
    return null;
  }

  return {
    type: "Feature",
    id: row.id,
    geometry,
    properties: {
      id: row.id,
      name: row.name ?? "",
      category: row.category ?? "",
      category_group: row.category_group ?? "",
      importance_score: row.importance_score ?? 0,
      source_table: sourceTable,
    },
  };
}

/**
 * Get full place + detail rows for a single place.
 */
export async function getPlaceDetails(placeId: string) {
  const supabase = createClient();

  const [placeRes, detailsRes] = await Promise.all([
    supabase.from("places").select("*").eq("id", placeId).maybeSingle(),
    supabase
      .from("places_details")
      .select("*")
      .eq("place_id", placeId)
      .maybeSingle(),
  ]);

  if (placeRes.error) {
    console.error("Error fetching place:", placeRes.error);
    return null;
  }

  if (!placeRes.data) return null;

  return { place: placeRes.data, details: detailsRes.data };
}

// -------------------------------------------------
// GeoJSON conversion
// -------------------------------------------------

/**
 * Convert an array of `PlacePointResult` into a GeoJSON FeatureCollection
 * ready to be set on a MapLibre GeoJSON source.
 */
export function placesToGeoJSON(
  places: PlacePointResult[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: places
      .map((p, idx) => {
        if (p.lat == null || p.lng == null) return null;
        const cfg = getPOIConfig(p.category);
        return {
          type: "Feature" as const,
          id: idx, // numeric ID required for feature-state
          geometry: {
            type: "Point" as const,
            coordinates: [p.lng, p.lat] as [number, number],
          },
          properties: {
            _placeId: p.id,
            name: p.name_en || p.name_default,
            name_default: p.name_default,
            category: p.category,
            category_group: p.category_group || "other",
            color: cfg.color,
            bgColor: cfg.bgColor,
            icon: cfg.icon,
            categoryLabel: cfg.label,
            address: p.address,
            city: p.city,
            region: p.region,
            country: p.country,
            popularity_score: p.popularity_score ?? 0,
            is_top_destination: p.is_top_destination ?? false,
            website_url: p.website_url,
            phone_number: p.phone_number,
            // symbol-sort-key: lower = rendered on top
            sort_key: 100 - (p.popularity_score ?? 0),
          },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null),
  };
}
