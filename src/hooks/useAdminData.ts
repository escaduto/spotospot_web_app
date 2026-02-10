"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/src/supabase/client";
import type {
  SeedItineraryDays,
  SeedItineraryItems,
} from "@/src/supabase/types";
import type { Filters } from "@/src/app/admin/page";

export interface AdminStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  withImage: number;
  withoutImage: number;
  matchedLocations: number;
  uniqueCities: number;
  uniqueCountries: number;
}

export function useAdminData(filters: Filters) {
  const supabase = createClient();
  const [allDays, setAllDays] = useState<SeedItineraryDays[]>([]);
  const [allItems, setAllItems] = useState<SeedItineraryItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: daysData }, { data: itemsData }] = await Promise.all([
      supabase
        .from("seed_itinerary_days")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("seed_itinerary_items")
        .select("*")
        .order("order_index", { ascending: true }),
    ]);
    setAllDays((daysData as SeedItineraryDays[]) ?? []);
    setAllItems((itemsData as SeedItineraryItems[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats: AdminStats = useMemo(() => {
    const pending = allDays.filter((d) => d.approval_status === "pending");
    const approved = allDays.filter((d) => d.approval_status === "approved");
    const rejected = allDays.filter((d) => d.approval_status === "rejected");
    const withImage = allDays.filter((d) => !!d.image_url);
    const cities = new Set(allDays.map((d) => d.city).filter(Boolean));
    const countries = new Set(allDays.map((d) => d.country).filter(Boolean));
    const matchedLocations = allItems.filter((i) => !!i.place_id).length;

    return {
      total: allDays.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      withImage: withImage.length,
      withoutImage: allDays.length - withImage.length,
      matchedLocations,
      uniqueCities: cities.size,
      uniqueCountries: countries.size,
    };
  }, [allDays, allItems]);

  const locations = useMemo(() => {
    const cities = [
      ...new Set(allDays.map((d) => d.city).filter(Boolean)),
    ] as string[];
    const countries = [
      ...new Set(allDays.map((d) => d.country).filter(Boolean)),
    ] as string[];
    return { cities, countries };
  }, [allDays]);

  const days = useMemo(() => {
    return allDays.filter((d) => {
      if (filters.status !== "all" && d.approval_status !== filters.status)
        return false;
      if (filters.city && d.city !== filters.city) return false;
      if (filters.country && d.country !== filters.country) return false;
      if (
        filters.search &&
        !d.title?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !d.description?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !d.city?.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [allDays, filters]);

  const items = useMemo(() => {
    const dayIds = new Set(days.map((d) => d.id));
    return allItems.filter((i) => dayIds.has(i.seed_itinerary_day_id));
  }, [allItems, days]);

  const approveDay = async (dayId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("seed_itinerary_days")
      .update({
        approval_status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", dayId);
  };

  const rejectDay = async (dayId: string) => {
    await supabase
      .from("seed_itinerary_days")
      .update({ approval_status: "rejected" })
      .eq("id", dayId);
  };

  const updateDay = async (
    dayId: string,
    updates: Partial<SeedItineraryDays>,
  ) => {
    await supabase.from("seed_itinerary_days").update(updates).eq("id", dayId);
  };

  const updateItem = async (
    itemId: string,
    updates: Partial<SeedItineraryItems>,
  ) => {
    await supabase
      .from("seed_itinerary_items")
      .update(updates)
      .eq("id", itemId);
  };

  const addItem = async (item: Omit<SeedItineraryItems, "id">) => {
    await supabase.from("seed_itinerary_items").insert(item);
  };

  const deleteItem = async (itemId: string) => {
    await supabase.from("seed_itinerary_items").delete().eq("id", itemId);
  };

  return {
    days,
    items,
    allDays,
    allItems,
    stats,
    locations,
    loading,
    refetch: fetchData,
    approveDay,
    rejectDay,
    updateDay,
    updateItem,
    addItem,
    deleteItem,
  };
}
