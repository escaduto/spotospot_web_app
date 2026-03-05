import { createClient } from "./client";
import { parsePoint } from "@/src/utils/geo";

// ── Types ─────────────────────────────────────────────────────────────────────

/** A public day-plan returned by the `get_nearby_trips` RPC */
export interface NearbyPlan {
  id: string;
  title: string | null;
  city: string | null;
  country: string | null;
  image_url: string | null;
  image_blurhash: string | null;
  category_type: string[] | null;
  destination_key: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
}

/** A top-destination returned by `get_top_destinations` + group metadata */
export interface TopDestination {
  id: string;
  label: string;
  destination_value: string;
  rep_point: string | null;
  image_url: string | null;
  bbox: number[] | null; // [minLng, minLat, maxLng, maxLat]
  group_key: string | null;
  group_label: string | null;
}

/** Autocomplete result that can be either a plan or a destination */
export type PlanOrDestResult =
  | {
      kind: "plan";
      id: string;
      title: string;
      city: string | null;
      country: string | null;
    }
  | {
      kind: "destination";
      id: string;
      label: string;
      destination_value: string;
      rep_point: string | null;
      bbox: number[] | null;
    };

// ── Nearby public plans ───────────────────────────────────────────────────────

/**
 * Calls the `get_nearby_trips(lat, lng, radius_km, ...)` RPC which returns
 * public itinerary_days ordered by distance.
 *
 * The SQL function must include `rep_point TEXT` in its RETURNS TABLE and
 * `ST_AsText(d.rep_point) AS rep_point` (or `d.rep_point::text`) in the SELECT
 * so we can resolve lat/lng on the client.
 *
 * Updated SQL (add to the RETURNS TABLE block and SELECT):
 *   rep_point  TEXT   — add after image_blurhash in RETURNS TABLE
 *   ST_AsText(d.rep_point) AS rep_point   — add to SELECT list
 */
export async function getNearbyPublicPlans(
  p_lat: number,
  p_lng: number,
  radiusKm = 50,
  limit = 60,
  categories?: string[],
  destinationKey?: string,
): Promise<NearbyPlan[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_nearby_trips", {
    p_lat,
    p_lng,
    radius_km: radiusKm,
    p_categories: categories && categories.length > 0 ? categories : null,
    p_destination_key: destinationKey ?? null,
  });

  if (error) {
    console.error("get_nearby_trips error:", error);
    // Graceful fallback — fetch public plans without spatial filter
    const { data: fallback } = await supabase
      .from("itinerary_days")
      .select(
        "id, title, city, country, image_url, image_blurhash, category_type, destination_key, description, rep_point",
      )
      .eq("visibility", "public")
      .order("updated_at", { ascending: false })
      .limit(limit);

    return ((fallback ?? []) as Record<string, unknown>[]).map((row) => {
      return {
        id: row.id as string,
        title: (row.title as string) ?? null,
        city: (row.city as string) ?? null,
        country: (row.country as string) ?? null,
        image_url: (row.image_url as string) ?? null,
        image_blurhash: (row.image_blurhash as string) ?? null,
        category_type: (row.category_type as string[]) ?? null,
        destination_key: (row.destination_key as string) ?? null,
        description: (row.description as string) ?? null,
        lat: row.lat as number | null,
        lng: row.lng as number | null,
        distance_km: null,
      } as NearbyPlan;
    });
  }

  return ((data ?? []) as Record<string, unknown>[])
    .slice(0, limit)
    .map((row) => {
      return {
        id: (row.day_id ?? row.id) as string,
        title: (row.title as string) ?? null,
        city: (row.city as string) ?? null,
        country: (row.country as string) ?? null,
        image_url: (row.image_url as string) ?? null,
        image_blurhash: (row.image_blurhash as string) ?? null,
        category_type: (row.category_type as string[]) ?? null,
        destination_key: (row.destination_key as string) ?? null,
        description: (row.description as string) ?? null,
        lat: row.lat as number | null,
        lng: row.lng as number | null,
        distance_km: (row.distance_km as number) ?? null,
      } as NearbyPlan;
    });
}

// ── Top destinations ──────────────────────────────────────────────────────────

/** Fetch all top destinations (with group metadata) */
export async function getTopDestinations(): Promise<TopDestination[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_top_destinations");

  if (error) {
    console.error("get_top_destinations error:", error);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map(
    (row) =>
      ({
        id: row.id as string,
        label: (row.label as string) ?? "",
        destination_value: (row.destination_value as string) ?? "",
        rep_point: (row.rep_point as string) ?? null,
        image_url: (row.image_url as string) ?? null,
        bbox: (row.bbox as number[]) ?? null,
        group_key: (row.group_key as string) ?? null,
        group_label: (row.group_label as string) ?? null,
      }) as TopDestination,
  );
}

/** A single activity item from a public day plan */
export interface DayItem {
  id: string;
  title: string;
  item_type: string;
  order_index: number;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  /** Already-resolved lat from location_coords */
  lat: number | null;
  lng: number | null;
}

/** A route segment between two items */
export interface DayRoute {
  from_item_id: string | null;
  to_item_id: string;
  geometry_geojson: string | null; // GeoJSON LineString as text
  transportation_type: string[];
  distance_m: number | null;
  duration_s: number | null;
}

/** Fetch all items + routes for a given public day plan */
export async function getDayItems(
  dayId: string,
): Promise<{ items: DayItem[]; routes: DayRoute[] }> {
  const supabase = createClient();

  const [itemsRes, routesRes] = await Promise.all([
    supabase
      .from("itinerary_items")
      .select(
        "id, title, item_type, order_index, start_time, end_time, location_name, location_coords::text",
      )
      .eq("itinerary_day_id", dayId)
      .order("order_index"),
    supabase
      .from("itinerary_item_routes")
      .select(
        "from_item_id, to_item_id, geometry_geojson::text, transportation_type, distance_m, duration_s",
      )
      .eq("itinerary_day_id", dayId),
  ]);

  const items: DayItem[] = (
    (itemsRes.data ?? []) as Record<string, unknown>[]
  ).map((row) => {
    const coords = parsePoint(row.location_coords);
    return {
      id: row.id as string,
      title: (row.title as string) ?? "",
      item_type: (row.item_type as string) ?? "activity",
      order_index: (row.order_index as number) ?? 0,
      start_time: (row.start_time as string) ?? null,
      end_time: (row.end_time as string) ?? null,
      location_name: (row.location_name as string) ?? null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    };
  });

  const routes: DayRoute[] = (
    (routesRes.data ?? []) as Record<string, unknown>[]
  ).map((row) => ({
    from_item_id: (row.from_item_id as string) ?? null,
    to_item_id: row.to_item_id as string,
    geometry_geojson: (row.geometry_geojson as string) ?? null,
    transportation_type: (row.transportation_type as string[]) ?? [],
    distance_m: (row.distance_m as number) ?? null,
    duration_s: (row.duration_s as number) ?? null,
  }));

  return { items, routes };
}

export async function searchPublicPlanNames(
  query: string,
  limit = 8,
): Promise<
  { id: string; title: string; city: string | null; country: string | null }[]
> {
  if (query.trim().length < 2) return [];
  const supabase = createClient();

  const { data } = await supabase
    .from("itinerary_days")
    .select("id, title, city, country")
    .eq("visibility", "public")
    .ilike("title", `%${query.trim()}%`)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (
    (data ?? []) as {
      id: string;
      title: string | null;
      city: string | null;
      country: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    title: r.title ?? "",
    city: r.city ?? null,
    country: r.country ?? null,
  }));
}

// ── Copy public content to user's account ────────────────────────────────────

/** Copy an entire public day plan into the authenticated user's account */
export async function copyPublicDayToTrip(
  sourceDayId: string,
): Promise<{ new_day_id: string } | null> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "copy_public_day_to_trip",
    {
      p_source_day_id: sourceDayId,
    },
  );
  if (error) {
    console.error("copy_public_day_to_trip error:", error);
    return null;
  }
  return data as { new_day_id: string };
}

/** Copy a single public activity item into one of the user's existing day plans */
export async function copyPublicItemToDay(
  sourceItemId: string,
  targetDayId: string,
): Promise<boolean> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("copy_public_item_to_day", {
    p_source_item_id: sourceItemId,
    p_target_day_id: targetDayId,
  });
  if (error) {
    console.error("copy_public_item_to_day error:", error);
    return false;
  }
  return true;
}

/** Fetch the authenticated user's own day plans (for the copy-item picker) */
export async function getUserDayPlans(): Promise<
  { id: string; title: string; city: string | null }[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("itinerary_days")
    .select("id, title, city")
    .order("updated_at", { ascending: false })
    .limit(40);
  if (error) return [];
  return (
    (data ?? []) as { id: string; title: string | null; city: string | null }[]
  ).map((r) => ({ id: r.id, title: r.title ?? "Untitled", city: r.city }));
}

/** Autocomplete matching top-destination labels */
export async function searchTopDestinationNames(
  query: string,
  limit = 5,
): Promise<
  {
    id: string;
    label: string;
    destination_value: string;
    rep_point: string | null;
    bbox: number[] | null;
  }[]
> {
  if (query.trim().length < 2) return [];
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).rpc("search_top_destinations", {
    search_query: query.trim(),
  });

  return ((data ?? []) as Record<string, unknown>[])
    .slice(0, limit)
    .map((row) => ({
      id: row.id as string,
      label: (row.label as string) ?? "",
      destination_value: (row.destination_value as string) ?? "",
      rep_point: (row.rep_point as string) ?? null,
      bbox: (row.bbox as number[]) ?? null,
    }));
}
