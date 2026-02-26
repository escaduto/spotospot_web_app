import { createClient } from "./client";
import { getPOIConfig } from "../map/scripts/poi-config";

// -------------------------------------------------
// WKB coordinate parser (PostGIS EWKB hex → {lat, lng})
// -------------------------------------------------

/**
 * Parse a PostGIS EWKB hex string (as stored in Supabase geometry columns)
 * and return lat/lng without requiring a server-side RPC.
 */
export function parseWKBCoords(
  hex: string | null,
): { lat: number; lng: number } | null {
  if (!hex || hex.length < 42) return null;
  try {
    const bytes = new Uint8Array(
      (hex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)),
    );
    const view = new DataView(bytes.buffer);
    const le = view.getUint8(0) === 1; // 1 = little-endian
    const wkbType = view.getUint32(1, le);
    const hasSRID = (wkbType & 0x20000000) !== 0;
    const offset = 5 + (hasSRID ? 4 : 0);
    const x = view.getFloat64(offset, le); // longitude
    const y = view.getFloat64(offset + 8, le); // latitude
    if (!isFinite(x) || !isFinite(y)) return null;
    return { lng: x, lat: y };
  } catch {
    return null;
  }
}

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
  place_source_id: string;
  place_table: string;
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

// Category groups that have polygon coverage in landuse_features
const LANDUSE_CATEGORY_GROUPS = new Set(["parks_and_nature"]);

/**
 * Normalise a landuse_features or building_features row into a PlacePointResult.
 * Coordinates come from the `label_point` geometry column.
 * Both tables now share the same unified column schema as `places`.
 */
/**
 * Normalise a raw RPC row (from `search_places`) into a PlacePointResult.
 * The RPC returns coords as lat/lng directly — no WKB parsing needed.
 */
function rpcRowToPlace(r: Record<string, unknown>): PlacePointResult {
  return {
    id: (r.place_source_id as string) ?? (r.source_id as string) ?? "",
    place_source_id: (r.place_source_id as string) ?? "",
    place_table: (r.place_table as string) ?? "places",
    name_default: (r.name_default as string) ?? "",
    name_en: (r.name_en as string) ?? null,
    category: (r.category as string) ?? null,
    categories: (r.categories as string[]) ?? null,
    category_group: (r.category_group as string) ?? null,
    address: (r.address as string) ?? null,
    city: (r.city as string) ?? null,
    region: (r.region as string) ?? null,
    country: (r.country as string) ?? null,
    postal_code: (r.postal_code as string) ?? null,
    lat: r.lat as number,
    lng: r.lng as number,
    website_url: (r.website_url as string) ?? null,
    phone_number: (r.phone_number as string) ?? null,
    popularity_score: (r.importance_score as number) ?? null,
    is_top_destination: (r.is_top_destination as boolean) ?? null,
    metadata: (r.metadata as Record<string, string | number>) ?? null,
  };
}

/**
 * Autocomplete search — delegates to the `search_places` RPC which queries
 * all source tables (places, landuse_features, building_features) uniformly.
 * Falls back to a direct `places` table ilike query if the RPC is unavailable.
 */
export async function searchPlaces(
  query: string,
  limit: number = 50,
  mapCenter?: { lng: number; lat: number },
): Promise<PlacePointResult[]> {
  const supabase = createClient();
  const q = query.trim();
  if (q.length < 2) return [];

  // ── Try the canonical RPC signature ─────────────────────────────────
  const rpcArgs: Record<string, unknown> = { search_query: q, lim: limit };
  if (mapCenter) {
    rpcArgs.center_lat = mapCenter.lat;
    rpcArgs.center_lng = mapCenter.lng;
  }
  const { data, error } = await supabase.rpc("search_places", rpcArgs);

  if (!error && data && (data as unknown[]).length > 0) {
    return (data as Record<string, unknown>[]).map(rpcRowToPlace);
  }

  // ── Direct places table fallback (coords as WKB) ──────────────────────
  const colSelect =
    "id, name_default, name_en, category, categories, category_group, " +
    "address, city, region, country, postal_code, coords, website_url, phone_number, " +
    "popularity_score, is_top_destination, metadata";
  const { data: fallback } = await supabase
    .from("places")
    .select(colSelect)
    .or(`name_default.ilike.%${q}%,name_en.ilike.%${q}%,address.ilike.%${q}%`)
    .order("popularity_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  return ((fallback ?? []) as unknown as Record<string, unknown>[])
    .map((p) => {
      const coords = parseWKBCoords(p.coords as string | null);
      if (!coords) return null;
      return {
        id: p.id as string,
        place_source_id: p.id as string,
        place_table: "places",
        name_default: (p.name_default as string) ?? "",
        name_en: (p.name_en as string) ?? null,
        category: (p.category as string) ?? null,
        categories: (p.categories as string[]) ?? null,
        category_group: (p.category_group as string) ?? null,
        address: (p.address as string) ?? null,
        city: (p.city as string) ?? null,
        region: (p.region as string) ?? null,
        country: (p.country as string) ?? null,
        postal_code: (p.postal_code as string) ?? null,
        lat: coords.lat,
        lng: coords.lng,
        website_url: (p.website_url as string) ?? null,
        phone_number: (p.phone_number as string) ?? null,
        popularity_score: (p.popularity_score as number) ?? null,
        is_top_destination: (p.is_top_destination as boolean) ?? null,
        metadata: (p.metadata as Record<string, string | number>) ?? null,
      } as PlacePointResult;
    })
    .filter(Boolean) as PlacePointResult[];
}

/**
 * Filter-based POI search — used by MapPOIFilter to fetch POIs by category
 * group/subcategory within the current viewport.  Delegates to `search_places`
 * RPC which covers all source tables.
 */
export async function searchPlacesByFilter(
  filterCategoryGroups: string[],
  filterCategories: string[],
  mapCenter?: { lat: number; lng: number },
  limit = 150,
): Promise<PlacePointResult[]> {
  const supabase = createClient();

  const rpcArgs: Record<string, unknown> = { search_query: "", lim: limit };
  if (mapCenter) {
    rpcArgs.center_lat = mapCenter.lat;
    rpcArgs.center_lng = mapCenter.lng;
  }
  if (filterCategoryGroups.length > 0)
    rpcArgs.filter_category_groups = filterCategoryGroups;
  if (filterCategories.length > 0) rpcArgs.filter_categories = filterCategories;

  const { data, error } = await supabase.rpc("search_places", rpcArgs);

  if (error) {
    console.error("searchPlacesByFilter error:", error);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map(rpcRowToPlace);
}

/**
 * Fetch all places + landuse label points within a viewport bounds, sorted by
 * proximity to the map centre.  Category filtering is left to the caller so the
 * same pool can be reused for different filter combinations.
 *
 * Query strategy (in order of preference):
 *  1. PostgREST spatial `&&` bounding-box operator on the `coords` geometry column
 *  2. Supabase RPC `get_places_in_bounds` (if present in the DB)
 *  3. Large-pool popularity-sorted fallback with client-side bounds check
 */
export async function fetchPOIsInBounds(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  mapCenter: { lng: number; lat: number },
  limit = 400,
): Promise<PlacePointResult[]> {
  const supabase = createClient();
  const colSelect =
    "id, source, source_id, name_default, name_en, category, categories, category_group, " +
    "address, city, region, country, postal_code, coords, website_url, phone_number, " +
    "popularity_score, is_top_destination, metadata";

  const bbox = `SRID=4326;POLYGON((${bounds.minLng} ${bounds.minLat},${bounds.maxLng} ${bounds.minLat},${bounds.maxLng} ${bounds.maxLat},${bounds.minLng} ${bounds.maxLat},${bounds.minLng} ${bounds.minLat}))`;

  let rawData: Record<string, unknown>[] | null = null;

  // ── 1. Try PostgREST spatial filter ─────────────────────────────────
  try {
    const { data, error } = await supabase
      .from("places")
      .select(colSelect)
      .filter("coords", "&&", bbox)
      .order("popularity_score", { ascending: false, nullsFirst: false })
      .limit(limit * 3);
    if (!error && data && data.length > 0) {
      rawData = data as unknown as Record<string, unknown>[];
    }
  } catch {
    // spatial operator not supported — fall through
  }

  // ── 2. Try RPC ───────────────────────────────────────────────────────
  if (!rawData) {
    try {
      const { data, error } = await supabase.rpc("get_places_in_bounds", {
        min_lng: bounds.minLng,
        min_lat: bounds.minLat,
        max_lng: bounds.maxLng,
        max_lat: bounds.maxLat,
        center_lng: mapCenter.lng,
        center_lat: mapCenter.lat,
        p_limit: limit * 3,
      });
      if (!error && data && (data as unknown[]).length > 0) {
        rawData = data as unknown as Record<string, unknown>[];
      }
    } catch {
      // RPC doesn't exist — fall through
    }
  }

  // ── 3. Large-pool fallback (no spatial filter at DB level) ───────────
  if (!rawData) {
    const { data } = await supabase
      .from("places")
      .select(colSelect)
      .order("popularity_score", { ascending: false, nullsFirst: false })
      .limit(limit * 5);
    rawData = (data ?? []) as unknown as Record<string, unknown>[];
  }

  // ── Parse WKB coords ────────────────────────────────────────────────
  let places = rawData
    .map((p) => {
      const coords = parseWKBCoords(p.coords as string | null);
      if (!coords) return null;
      return {
        ...(p as unknown as Omit<
          PlacePointResult,
          "lat" | "lng" | "place_source_id" | "place_table"
        >),
        place_source_id: p.id as string,
        place_table: "places",
        lat: coords.lat,
        lng: coords.lng,
      } as PlacePointResult;
    })
    .filter(Boolean) as PlacePointResult[];

  // ── Client-side bounds filter ────────────────────────────────────────
  places = places.filter(
    (p) =>
      p.lng >= bounds.minLng &&
      p.lng <= bounds.maxLng &&
      p.lat >= bounds.minLat &&
      p.lat <= bounds.maxLat,
  );

  // ── Sort by proximity × popularity ──────────────────────────────────
  places.sort((a, b) => {
    const dA = getDistance(mapCenter.lat, mapCenter.lng, a.lat, a.lng);
    const dB = getDistance(mapCenter.lat, mapCenter.lng, b.lat, b.lng);
    const sA =
      Math.max(0, 1 - dA / 50) * 0.5 + ((a.popularity_score ?? 0) / 100) * 0.5;
    const sB =
      Math.max(0, 1 - dB / 50) * 0.5 + ((b.popularity_score ?? 0) / 100) * 0.5;
    return sB - sA;
  });

  return places.slice(0, limit);
}

/**
 * Fetch places (and optionally landuse features) by category/category_group.
 *
 * Fetches a larger pool from the DB, then client-side filters to `bounds` so
 * results are always within the current viewport.  For groups flagged as
 * area-based (parks_and_nature) landuse_features are merged in as well.
 */
export async function fetchPlacesByCategory(
  categoryGroups: string[],
  categories: string[],
  limit: number = 200,
  mapCenter?: { lng: number; lat: number },
  bounds?: { minLng: number; minLat: number; maxLng: number; maxLat: number },
): Promise<PlacePointResult[]> {
  if (!categoryGroups.length && !categories.length) return [];

  const supabase = createClient();
  const colSelect =
    "id, source, source_id, name_default, name_en, category, categories, category_group, " +
    "address, city, region, country, postal_code, coords, website_url, phone_number, " +
    "popularity_score, is_top_destination, metadata";

  // Fetch a generous pool so client-side bounds filter has enough to work with
  const fetchLimit = Math.max(limit * 3, 600);

  let q = supabase.from("places").select(colSelect);
  if (categories.length > 0) {
    q = q.in("category", categories);
  } else {
    q = q.in("category_group", categoryGroups);
  }
  const { data, error } = await q
    .order("popularity_score", { ascending: false, nullsFirst: false })
    .limit(fetchLimit);

  if (error) console.error("fetchPlacesByCategory error:", error);

  let places = ((data ?? []) as unknown as Record<string, unknown>[])
    .map((p) => {
      const coords = parseWKBCoords(p.coords as string | null);
      if (!coords) return null;
      return {
        ...(p as unknown as Omit<
          PlacePointResult,
          "lat" | "lng" | "place_source_id" | "place_table"
        >),
        place_source_id: p.id as string,
        place_table: "places",
        lat: coords.lat,
        lng: coords.lng,
      } as PlacePointResult;
    })
    .filter(Boolean) as PlacePointResult[];

  // ── Merge area-type places (parks, landuse, etc.) via search_places RPC ──
  const groupsNeedingLanduse = categoryGroups.filter((g) =>
    LANDUSE_CATEGORY_GROUPS.has(g),
  );
  const catsNeedingLanduse =
    categories.length > 0 &&
    categoryGroups.some((g) => LANDUSE_CATEGORY_GROUPS.has(g))
      ? categories
      : [];
  if (groupsNeedingLanduse.length > 0 || catsNeedingLanduse.length > 0) {
    const landuse = await searchPlacesByFilter(
      groupsNeedingLanduse,
      catsNeedingLanduse,
      mapCenter ?? undefined,
      fetchLimit,
    );
    const seenIds = new Set(places.map((p) => p.id));
    places = [...places, ...landuse.filter((l) => !seenIds.has(l.id))];
  }

  // ── Client-side bounds filter ────────────────────────────────────────
  if (bounds) {
    places = places.filter(
      (p) =>
        p.lng >= bounds.minLng &&
        p.lng <= bounds.maxLng &&
        p.lat >= bounds.minLat &&
        p.lat <= bounds.maxLat,
    );
  }

  // ── Sort by proximity × popularity ───────────────────────────────────
  if (mapCenter && places.length > 0) {
    places.sort((a, b) => {
      const dA = getDistance(mapCenter.lat, mapCenter.lng, a.lat, a.lng);
      const dB = getDistance(mapCenter.lat, mapCenter.lng, b.lat, b.lng);
      const sA =
        Math.max(0, 1 - dA / 50) * 0.5 +
        ((a.popularity_score ?? 0) / 100) * 0.5;
      const sB =
        Math.max(0, 1 - dB / 50) * 0.5 +
        ((b.popularity_score ?? 0) / 100) * 0.5;
      return sB - sA;
    });
  }

  return places.slice(0, limit);
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
