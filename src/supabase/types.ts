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
  destination_coords: { lat: number; lng: number } | null;
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
  rep_point: { lat: number; lng: number } | null;
  description: string | null;
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
}

export interface ItineraryItem {
  id: string;
  itinerary_day_id: string;
  title: string;
  description: string | null;
  item_type: string;
  location_name: string | null;
  location_address: string | null;
  location_coords: { lat: number; lng: number } | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  cost_estimate: number | null;
  currency: string | null; // ISO 4217 code (e.g. "USD")
  booking_url: string | null;
  booking_confirmation: string | null;
  notes: string | null;
  order_index: number;
  is_confirmed: boolean;
  transportation_type: string | null; // e.g. "flight", "train", "car_rental"
  route_to_next_geometry: Record<string, string | number> | null; // e.g. GeoJSON LineString for route to next item
  route_to_next_distance_m: number | null; // in meters
  route_to_next_duration_s: number | null; // in seconds
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SavedPlaces {
  id: string;
  user_id: string;
  trip_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  coords: { lat: number; lng: number } | null;
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
type PlaceCategoryGroup =
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
  coords: { lat: number; lng: number } | null;
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

export interface PlacesDetails {
  id: string;
  place_id: string;
  provider: string; // e.g. "google", "foursquare"
  provider_place_id: string; // e.g. Google Place ID, Foursquare Venue ID
  rating: number | null; // 1-5
  rating_count: number | null;
  popularity: number | null; // e.g. 0-100 based on foot traffic or user ratings
  price_level: number | null; // 0-4
  opening_hours: Record<string, string> | null; // e.g. { "monday": "9:00-17:00", "tuesday": "9:00-17:00", ... }
  photos: Array<{
    url: string;
    width: number;
    height: number;
    blurhash: string | null;
    metadata: Record<string, string | number> | null; // e.g. { photographer: "John Doe", photographer_url: "", alt_text: "" }
  }> | null;
  tips: Record<string, string> | null; // e.g. { "en": ["Great place!", "Must visit!"], "fr": ["Endroit génial!", "À visiter absolument!"] }
  description: string | null;
  website_url: string | null;
  phone_number: string | null;
  social_media: Record<string, string> | null; // e.g. { twitter: "https://twitter.com/venue", instagram: "https://instagram.com/venue" }
  attributes: Record<string, string | number | boolean> | null; // e.g. { "wheelchair_accessible": true, "family_friendly": false }
  tastes: string[] | null; // e.g. ["vegan", "gluten-free", "spicy"]
  fetched_at: string; // ISO 8601 string of when the details were last fetched from the provider
  stale_after: string; // ISO 8601 string indicating when the details should be considered stale and refetched from the provider

  created_at: string;
  updated_at: string;
}

export interface SeedItineraryDays {
  id: string;

  // basic info
  title: string;
  city: string | null;
  country: string | null;
  description: string | null;
  rep_point: { lat: number; lng: number } | null;

  // images
  image_url: string | null;
  image_blurhash: string | null;
  image_properties: Record<string, string> | null; // e.g. { photographer: "John Doe", photographer_url: "", alt_text: "" }

  // categorzation
  category_type: string | null; // e.g. "sightseeing", "food_and_drink", "outdoors"
  destination_key: string | null; // e.g. "paris", "new_york", "tokyo"
  notes: string | null;

  approval_status: "approved" | "pending" | "rejected";
  approved_by: string | null; // user_id of approver
  approved_at: string | null;
  metadata: Record<string, string | number> | null; // e.g. { "mood": "relaxing", "energy_level": "high" }

  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SeedItineraryItems {
  id: string;
  seed_itinerary_day_id: string;

  title: string;
  item_type: string;
  description: string | null;

  location_name: string | null;
  location_address: string | null;
  coords: { lat: number; lng: number } | null;
  place_id: string | null; // e.g. Google Place ID, Foursquare Venue ID

  order_index: number;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;

  cost_estimate: number | null;
  currency: string | null; // ISO 4217 code (e.g. "USD")

  transportation_type: string | null; // e.g. "flight", "train", "car_rental"

  notes: string | null;

  is_confirmed: boolean;
}
