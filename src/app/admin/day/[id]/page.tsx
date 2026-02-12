"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/src/supabase/client";
import type {
  SeedItineraryDays,
  SeedItineraryItems,
  itinerary_item_routes,
} from "@/src/supabase/types";
import DayDetailsView from "@/src/components/admin_dashboard/DayDetailsView";

export default function AdminDayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const dayId = params.id as string;

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<SeedItineraryDays | null>(null);
  const [items, setItems] = useState<SeedItineraryItems[]>([]);
  const [routes, setRoutes] = useState<itinerary_item_routes[]>([]);

  useEffect(() => {
    (async () => {
      // Check admin auth
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      const role = user.user_metadata?.role ?? user.app_metadata?.role;
      if (role !== "admin") {
        router.replace("/");
        return;
      }
      setIsAdmin(true);

      // Fetch day and items
      await fetchData();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId]);

  const fetchData = async () => {
    const [dayRes, itemsRes, routesRes] = await Promise.all([
      supabase
        .from("seed_itinerary_days")
        .select("*, rep_point::text")
        .eq("id", dayId)
        .single(),
      supabase
        .from("seed_itinerary_items")
        .select("*, coords::text")
        .eq("seed_itinerary_day_id", dayId)
        .order("order_index", { ascending: true }),
      supabase
        .from("itinerary_item_routes")
        .select(
          "id, seed_itinerary_day_id, from_item_id, to_item_id, transportation_type, geometry_geojson::text, distance_m, duration_s",
        )
        .eq("seed_itinerary_day_id", dayId),
    ]);

    if (dayRes.data) {
      setDay(dayRes.data);
    }
    if (itemsRes.data) {
      setItems(itemsRes.data);
    }
    if (routesRes.data) {
      setRoutes(routesRes.data);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin || !day) return null;

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
