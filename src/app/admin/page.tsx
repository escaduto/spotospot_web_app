"use client";

import AdminStats from "@/src/components/admin_dashboard/AdminStats";
import FilterBar from "@/src/components/admin_dashboard/FilterBar";
import ListView from "@/src/components/admin_dashboard/ListView";
import MapView from "@/src/components/admin_dashboard/MapView";
import { useAdminData } from "@/src/hooks/useAdminData";
import { useAuth } from "@/src/hooks/useAuth";
import type { ItineraryDay } from "@/src/supabase/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type Filters = {
  status: "private" | "public" | "all";
  city: string;
  country: string;
  search: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [view, setView] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<Filters>({
    status: "private",
    city: "",
    country: "",
    search: "",
  });
  const { days, items, stats, locations } = useAdminData(filters);

  // Redirect once auth is resolved
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const role = user.user_metadata?.role ?? user.app_metadata?.role;
    if (role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  const handleSelectDay = (day: ItineraryDay) => {
    router.push(`/admin/day/${day.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const role = user?.user_metadata?.role ?? user?.app_metadata?.role;
  if (!user || role !== "admin") return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b px-6 py-4">
        <div className="max-w-400 mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin — Seed Itineraries
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView("list")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                view === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setView("map")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                view === "map"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              Map View
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-400 mx-auto p-6 space-y-6">
        <AdminStats stats={stats} />
        <FilterBar
          filters={filters}
          onChange={setFilters}
          locations={locations}
        />

        {view === "list" ? (
          <ListView days={days} onSelect={handleSelectDay} />
        ) : (
          <MapView days={days} items={items} onSelectDay={handleSelectDay} />
        )}
      </main>
    </div>
  );
}
