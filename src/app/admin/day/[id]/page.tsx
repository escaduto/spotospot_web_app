"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/src/supabase/client";
import { useAuth } from "@/src/hooks/useAuth";
import type {
  ItineraryDay,
  ItineraryItem,
  itinerary_item_routes,
} from "@/src/supabase/types";
import DayDetailsView from "@/src/components/admin_dashboard/DayDetailsView";

export default function AdminDayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const dayId = params.id as string;

  const [dataLoading, setDataLoading] = useState(true);
  const [day, setDay] = useState<ItineraryDay | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [routes, setRoutes] = useState<itinerary_item_routes[]>([]);

  const fetchData = useCallback(async () => {
    const [dayRes, itemsRes, routesRes] = await Promise.all([
      supabase
        .from("itinerary_days")
        .select("*, rep_point::text")
        .eq("id", dayId)
        .single(),
      supabase
        .from("itinerary_items")
        .select("*, location_coords::text")
        .eq("itinerary_day_id", dayId)
        .order("order_index", { ascending: true }),
      supabase
        .from("itinerary_item_routes")
        .select(
          "id, itinerary_day_id, from_item_id, to_item_id, transportation_type, geometry_geojson::text, distance_m, duration_s",
        )
        .eq("itinerary_day_id", dayId),
    ]);

    if (dayRes.data) setDay(dayRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
    if (routesRes.data) setRoutes(routesRes.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId]);

  // Redirect once auth resolves; fetch data only when confirmed admin
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const role = user.user_metadata?.role ?? user.app_metadata?.role;
    if (role !== "admin") {
      router.replace("/");
      return;
    }

    fetchData().finally(() => setDataLoading(false));
  }, [authLoading, user, router, fetchData]);

  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const role = user?.user_metadata?.role ?? user?.app_metadata?.role;
  if (!user || role !== "admin" || !day) return null;

  return (
    <DayDetailsView
      day={day}
      items={items}
      routes={routes}
      onBack={() => router.push("/admin")}
      refetch={fetchData}
    />
  );
}
