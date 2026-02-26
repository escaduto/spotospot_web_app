//** Supabase DB Schema */

// AUTH
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  social_links: Record<string, string> | null; // e.g. { twitter: "https://twitter.com/username" }
  is_verified: boolean;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

//SOCIAL
export interface Friends {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

type FriendStatus = "pending" | "accepted" | "rejected";
export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

// TRIPS
type TripVisibility = "public" | "private" | "friends_only";
type TripStatus = "planning" | "active" | "completed" | "cancelled";

export interface Trip {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  destination: string | null;
  destination_coords: string | null; // PostGIS geometry string (hex WKB or WKT)
  image_url: string | null;
  image_blurhash: string | null;
  image_properties: Record<string, string> | null; // e.g. { photographer: "John Doe", photographer_url: "", alt_text: "" }
  start_date: string | null;
  end_date: string | null;
  visibility: TripVisibility;
  status: TripStatus;
  budget_estimate: number | null;
  currency: string | null; // ISO 4217 code (e.g. "USD")
  created_at: string;
  updated_at: string;
}

type CollaboratorRole = "owner" | "editor" | "viewer";

export interface TripCollaborator {
  id: string;
  trip_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_by: string; // user_id of the inviter
  accepted: boolean;
  created_at: string; // ISO 8601 string (e.g., 2026-02-06T09:27:00Z)
  updated_at: string;
}

export interface TripDocuments {
  id: string;
  trip_id: string;
  itinerary_day_id: string | null;
  itinerary_item_id: string | null;
  name: string;
  description: string | null;
  document_type: string; // e.g. 'image/jpeg', 'application/pdf'
  document_url: string;
  file_size: number; // in bytes
  is_private: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// ITINERARY
type ItineraryVisibility = "public" | "private" | "trip";
type GenerationStatus = "not_started" | "in_progress" | "completed" | "failed";

export interface ItineraryDay {
  id: string;
  trip_id: string;
  created_by: string;
  city: string | null;
  country: string | null;
  rep_point: string | null; // PostGIS geometry string (hex WKB or WKT)
  description: string | null;

  category_type: string[] | null; // e.g. ["cultural", "outdoors", "food_and_drink"]
  destination_key: string | null; // e.g. "from top destinations

  image_url: string | null;
  image_blurhash: string | null;
  image_properties: Record<string, string> | null; // e.g. { photographer: "John Doe", photographer_url: "", alt_text: "" }
  title: string | null;
  visibility: ItineraryVisibility;
  generation_status: GenerationStatus;
  source_itinerary_id: string | null; // draft_id when changing visbility
  date: string | null; // ISO 8601 date string (e.g., "2026-02-06")
  notes: string | null;
  created_at: string;
  updated_at: string;

  metadata: Record<string, string | number> | null; // e.g. { "weather_forecast": "sunny", "local_events": 3 }
}

export type TransportationType =
  | "walking"
  | "running"
  | "hiking"
  | "driving"
  | "rideshare"
  | "car_rental"
  | "cycling"
  | "bikeshare"
  | "flight"
  | "ferry"
  | "train"
  | "bus"
  | "muni/tram"
  | "other";

export interface ItineraryItem {
  id: string;
  itinerary_day_id: string;
  /** Row id in the source table (places, landuse_features, building_features, etc.) */
  place_source_id: string | null;
  /** Which table the place belongs to */
  place_table: string | null;
  title: string;
  description: string | null;
  item_type: string;
  location_name: string | null;
  location_address: string | null;
  location_coords: string | null; // PostGIS geometry string (hex WKB or WKT)
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  cost_estimate: number | null;
  currency: string | null; // ISO 4217 code (e.g. "USD")
  booking_url: string | null;
  booking_confirmation: string | null;
  notes: string | null;
  order_index: number;
  route_to_next_geometry: Record<string, string | number> | null; // e.g. GeoJSON LineString for route to next item
  route_to_next_distance_m: number | null; // in meters
  route_to_next_duration_s: number | null; // in seconds
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type place_source_table = "itinerary_items" | "itinerary_days" | "trips";

export interface SavedPlaces {
  id: string;
  user_id: string;
  place_source_id: string;
  place_table: place_source_table;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  coords: string | null; // PostGIS geometry string (hex WKB or WKT)
  google_place_id: string | null;
  rating: number | null; // 1-5
  price_level: number | null;
  image_url: string | null;
  source_url: string | null;
  notes: string | null;
  created_at: string;
}

//SearchQueries
export interface SearchQuery {
  id: string;
  user_id: string;
  query: string;
  filters: Record<string, string | number> | null; // e.g. { destination: "Paris", trip_length: "3 days" }
  results_count: number | null;
  selected_results_id: string | null;
  created_at: string;
}

//Places

type PlaceSource = "overture" | "foursquare" | "google" | "manual";
export type PlaceCategoryGroup =
  | "food_and_drink"
  | "accommodation"
  | "tourism_and_attractions"
  | "arts_and_culture"
  | "parks_and_nature"
  | "shopping"
  | "nightlife_and_entertainment"
  | "sports_and_activities"
  | "transit"
  | "public_and_civic";
export interface Place {
  id: string;
  source: PlaceSource;
  source_id: string; // e.g. Google Place ID, Foursquare Venue ID
  name_default: string; // Original name from source
  name_en: string | null; // English name (if available)
  names_raw: Record<string, string> | null; // e.g. { "en": "Louvre Museum", "fr": "Musée du Louvre" }
  category: string | null;
  categories: string[] | null; // e.g. ["museum", "art_gallery"]
  category_group: PlaceCategoryGroup | null; // e.g. "cultural", "outdoors"
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  coords: string | null;
  bounding_box: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  } | null;
  website_url: string | null;
  phone_number: string | null;
  popularity_score: number | null; // e.g. 0-100 based on foot traffic or user ratings
  is_top_destination: boolean | null;
  metadata: Record<string, string | number> | null; // e.g. { "wheelchair_accessible": true, "family_friendly": false }
  created_at: string;
  updated_at: string;
}

// ── Unified shape for landuse_features and building_features ──────────────────
// Both tables now mirror the `places` table schema.

export interface LanduseFeaturesRow {
  id: string;
  name_default: string;
  name_en: string | null;
  category: string | null;
  categories: string[] | null;
  category_group: PlaceCategoryGroup | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  website_url: string | null;
  phone_number: string | null;
  importance_score: number | null;
  is_top_destination: boolean | null;
  metadata: Record<string, string | number> | null;
  geometry: string | null; // PostGIS polygon/multipolygon
  label_point: string | null; // PostGIS point for map label
  created_at: string;
  updated_at: string;
}

export interface BuildingFeaturesRow {
  id: string;
  name_default: string;
  name_en: string | null;
  category: string | null;
  categories: string[] | null;
  category_group: PlaceCategoryGroup | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  website_url: string | null;
  phone_number: string | null;
  importance_score: number | null;
  is_top_destination: boolean | null;
  metadata: Record<string, string | number> | null;
  geometry: string | null; // PostGIS polygon/multipolygon
  label_point: string | null; // PostGIS point for map label
  created_at: string;
  updated_at: string;
}

export interface itinerary_item_routes {
  id: string;
  itinerary_day_id?: string | null;
  from_item_id: string | null;
  to_item_id: string;
  transportation_type: TransportationType[]; // e.g. "walking", "driving", "flight"
  geometry_geojson: string; // GeoJSON LineString as text
  distance_m: number;
  duration_s: number;
}

type RecalcStatus = "pending" | "processing" | "completed" | "failed";

export interface RouteRecalculationQueue {
  id: string;
  itinerary_day_id: string | null;
  route_id: string;
  status: RecalcStatus;
  created_at: string;
  updated_at: string;
}
