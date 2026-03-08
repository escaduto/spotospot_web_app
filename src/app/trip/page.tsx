"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/src/supabase/client";
import { Trip } from "@/src/supabase/types";
import type { TripWithDayPlans } from "@/src/components/user_home/TripCard";
import TripCard from "@/src/components/user_home/TripCard";
import Link from "next/link";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import ClearIcon from "@mui/icons-material/Clear";
import type { AvatarConfig } from "@/src/components/avatar/avatarTypes";

// ── Status filter config ───────────────────────────────────────────────────
const STATUS_FILTERS = [
  {
    value: "all",
    label: "All",
    color: "bg-gray-100 text-gray-700",
    active: "bg-gray-800 text-white",
  },
  {
    value: "planning",
    label: "Planning",
    color: "bg-blue-50 text-blue-700",
    active: "bg-blue-500 text-white",
  },
  {
    value: "active",
    label: "Active",
    color: "bg-teal-50 text-teal-700",
    active: "bg-teal-500 text-white",
  },
  {
    value: "completed",
    label: "Completed",
    color: "bg-gray-100 text-gray-600",
    active: "bg-gray-500 text-white",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    color: "bg-amber-50 text-amber-700",
    active: "bg-amber-500 text-white",
  },
] as const;

type StatusFilter = "all" | "planning" | "active" | "completed" | "cancelled";

// ── Role filter config ─────────────────────────────────────────────────────
const ROLE_FILTERS = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Owner" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
] as const;

type RoleFilter = "all" | "admin" | "editor" | "viewer";

// ── Sort config ────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "start_date_asc", label: "Upcoming first" },
  { value: "start_date_desc", label: "Latest start" },
  { value: "name_asc", label: "Name (A→Z)" },
  { value: "name_desc", label: "Name (Z→A)" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

// ── Skeleton ───────────────────────────────────────────────────────────────
function TripCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="h-36 bg-gray-200" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex gap-1 mt-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 w-3 rounded-full bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyTrips({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 col-span-full text-center">
      <span className="text-6xl opacity-20">✈️</span>
      <p className="text-gray-500 font-medium">
        {hasFilter ? "No trips match your search." : "You have no trips yet."}
      </p>
      {!hasFilter && (
        <Link
          href="/create_new_plan"
          className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition"
        >
          <AddIcon sx={{ fontSize: 16 }} />
          Create your first trip
        </Link>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function AllTripsPage() {
  const supabase = createClient();

  const [trips, setTrips] = useState<TripWithDayPlans[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  // ── Fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch all collaborator rows for current user, joining trip data + day plans + other collabs
      const { data, error } = await supabase
        .from("trip_collaborators")
        .select(
          `
          role,
          accepted,
          trips (
            *,
            itinerary_days (id, title, date, city),
            trip_collaborators (
              user_id, role, accepted,
              profiles!trip_collaborators_user_id_fkey (full_name, avatar_config)
            )
          )
        `,
        )
        .eq("user_id", user.id)
        .eq("accepted", true);

      if (error) {
        console.error("Failed to load trips:", error);
        setLoading(false);
        return;
      }

      type RawRow = {
        role: string;
        accepted: boolean;
        trips:
          | (Trip & {
              itinerary_days: {
                id: string;
                title: string | null;
                date: string | null;
                city: string | null;
              }[];
              trip_collaborators: {
                user_id: string;
                role: string;
                accepted: boolean;
                profiles: {
                  full_name?: string;
                  avatar_config?: AvatarConfig | null;
                } | null;
              }[];
            })
          | null;
      };

      const mapped: TripWithDayPlans[] = ((data as unknown as RawRow[]) ?? [])
        .filter((row) => row.trips !== null)
        .map((row) => {
          const t = row.trips!;
          return {
            ...t,
            day_plans:
              t.itinerary_days?.map((d) => ({
                id: d.id,
                title: d.title,
                date: d.date,
                city: d.city,
              })) ?? [],
            collaborator_role: row.role,
            collaborators:
              t.trip_collaborators?.map((c) => ({
                user_id: c.user_id,
                role: c.role,
                full_name: c.profiles?.full_name ?? null,
                avatar_config: c.profiles?.avatar_config ?? null,
              })) ?? [],
          };
        });

      setTrips(mapped);
      setLoading(false);
    }

    load();
  }, [supabase]);

  // ── Filter + sort ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = trips.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (roleFilter !== "all" && t.collaborator_role !== roleFilter)
        return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const matchesTitle = t.title?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesDest = t.destination?.toLowerCase().includes(q);
        const matchesCity = t.day_plans?.some((d) =>
          d.city?.toLowerCase().includes(q),
        );
        if (!matchesTitle && !matchesDesc && !matchesDest && !matchesCity)
          return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "start_date_asc": {
          if (!a.start_date && !b.start_date) return 0;
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return (
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          );
        }
        case "start_date_desc": {
          if (!a.start_date && !b.start_date) return 0;
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return (
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
          );
        }
        case "name_asc":
          return (a.title ?? "").localeCompare(b.title ?? "");
        case "name_desc":
          return (b.title ?? "").localeCompare(a.title ?? "");
        default: // newest
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return result;
  }, [trips, query, statusFilter, roleFilter, sortOption]);

  const hasFilter =
    query.trim() !== "" || statusFilter !== "all" || roleFilter !== "all";

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <FlightTakeoffIcon sx={{ fontSize: 20, color: "#fff" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
              {!loading && (
                <p className="text-sm text-gray-500">
                  {trips.length} trip{trips.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/create_new_plan"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition shadow-sm"
          >
            <AddIcon sx={{ fontSize: 16 }} />
            New Trip
          </Link>
        </div>

        {/* Search + sort bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <SearchIcon
              sx={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, destination, or city…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 shadow-sm"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <ClearIcon sx={{ fontSize: 16 }} />
              </button>
            )}
          </div>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:border-teal-400 shadow-sm cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter chips */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value as StatusFilter)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                statusFilter === f.value ? f.active : f.color
              }`}
            >
              {f.label}
              {f.value !== "all" && !loading && (
                <span className="ml-1 opacity-60">
                  ({trips.filter((t) => t.status === f.value).length})
                </span>
              )}
              {f.value === "all" && !loading && (
                <span className="ml-1 opacity-60">({trips.length})</span>
              )}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              {ROLE_FILTERS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {hasFilter && (
              <button
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setRoleFilter("all");
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition"
              >
                <ClearIcon sx={{ fontSize: 13 }} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <TripCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {filtered.length > 0 && (
              <p className="text-xs text-gray-400 mb-3">
                Showing {filtered.length} of {trips.length} trip
                {trips.length !== 1 ? "s" : ""}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.length === 0 ? (
                <EmptyTrips hasFilter={hasFilter} />
              ) : (
                filtered.map((trip) => <TripCard key={trip.id} trip={trip} />)
              )}
            </div>
          </>
        )}

        {/* Loading spinner fallback */}
        {loading && (
          <div className="flex justify-center mt-10">
            <CircularProgress size={28} sx={{ color: "#0d9488" }} />
          </div>
        )}
      </div>
    </div>
  );
}
