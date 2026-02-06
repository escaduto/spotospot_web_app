/** Minimal type definitions for the Supabase public schema.
 *  Extend these as the schema evolves. */

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: "draft" | "active" | "completed" | "archived";
  is_public: boolean;
  cover_image_url: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string | null;
  title: string | null;
  created_at: string;
}

export interface ItineraryItem {
  id: string;
  day_id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  start_time: string | null;
  end_time: string | null;
  order_index: number;
  created_at: string;
}
