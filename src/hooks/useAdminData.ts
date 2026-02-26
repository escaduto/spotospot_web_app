"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/src/supabase/client";
import type { ItineraryDay, ItineraryItem } from "@/src/supabase/types";
import type { Filters } from "@/src/app/admin/page";
import { toGeoPoint } from "@/src/utils/geo";

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
  const [allDays, setAllDays] = useState<ItineraryDay[]>([]);
  const [allItems, setAllItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: daysData }, { data: itemsData }] = await Promise.all([
      supabase
        .from("itinerary_days")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("itinerary_items")
        .select("*, location_coords::text")
        .order("order_index", { ascending: true }),
    ]);
    setAllDays((daysData as ItineraryDay[]) ?? []);
    setAllItems((itemsData as ItineraryItem[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats: AdminStats = useMemo(() => {
    const pending = allDays.filter((d) => d.visibility === "private");
    const approved = allDays.filter((d) => d.visibility === "public");
    const rejected = allDays.filter((d) => d.visibility === "private");
    const withImage = allDays.filter((d) => !!d.image_url);
    const cities = new Set(allDays.map((d) => d.city).filter(Boolean));
    const countries = new Set(allDays.map((d) => d.country).filter(Boolean));
    const matchedLocations = allItems.filter((i) => !!i.place_source_id).length;

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

  // Always retrieve all plans from itinerary_days, filter only for display
  const days = useMemo(() => {
    return allDays.filter((d) => {
      // Only filter by status if not 'all'
      if (filters.status !== "all" && d.visibility !== filters.status)
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
    return allItems.filter((i) => dayIds.has(i.itinerary_day_id));
  }, [allItems, days]);

  /** Convert any { lat, lng } point fields to GeoJSON before sending to DB */
  const prepareDayPayload = (updates: Partial<ItineraryDay>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = { ...updates };
    if ("rep_point" in payload) {
      payload.rep_point = toGeoPoint(payload.rep_point);
    }
    return payload;
  };

  const prepareItemPayload = (updates: Partial<ItineraryItem>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = { ...updates };
    if ("coords" in payload) {
      payload.coords = toGeoPoint(payload.coords);
    }
    return payload;
  };

  const approveDay = async (dayId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("itinerary_days")
      .update({
        approval_status: "approved",
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", dayId);
    if (error) {
      console.error("approveDay error:", error);
      throw error;
    }
  };

  const rejectDay = async (dayId: string) => {
    const { error } = await supabase
      .from("itinerary_days")
      .update({ visibility: "private" })
      .eq("id", dayId);
    if (error) {
      console.error("rejectDay error:", error);
      throw error;
    }
  };

  const updateDay = async (dayId: string, updates: Partial<ItineraryDay>) => {
    const { error } = await supabase
      .from("itinerary_days")
      .update(prepareDayPayload(updates))
      .eq("id", dayId);
    if (error) {
      console.error("updateDay error:", error);
      throw error;
    }
  };

  const updateItem = async (
    itemId: string,
    updates: Partial<ItineraryItem>,
  ) => {
    const { error } = await supabase
      .from("itinerary_items")
      .update(prepareItemPayload(updates))
      .eq("id", itemId);
    if (error) {
      console.error("updateItem error:", error);
      throw error;
    }
  };

  const addItem = async (item: Omit<ItineraryItem, "id">) => {
    const { error } = await supabase
      .from("itinerary_items")
      .insert(prepareItemPayload(item));
    if (error) {
      console.error("addItem error:", error);
      throw error;
    }
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from("itinerary_items")
      .delete()
      .eq("id", itemId);
    if (error) {
      console.error("deleteItem error:", error);
      throw error;
    }
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
