"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/src/supabase/client";
import { ItineraryDay } from "@/src/supabase/types";
import ItineraryCard from "@/src/components/user_home/ItineraryCard";
import Link from "next/link";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SortIcon from "@mui/icons-material/Sort";

// ── Sort options ───────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "date_asc", label: "Day date (earliest)" },
  { value: "date_desc", label: "Day date (latest)" },
  { value: "name_asc", label: "Name (A→Z)" },
  { value: "name_desc", label: "Name (Z→A)" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

// ── Category filter chips ─────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  cultural: "Cultural",
  outdoors: "Outdoors",
  food_and_drink: "Food & Drink",
  nature: "Nature",
  adventure: "Adventure",
  urban: "Urban",
  beach: "Beach",
  history: "History",
  art: "Art",
  nightlife: "Nightlife",
};

// ── Skeleton ───────────────────────────────────────────────────────────────
function DraftCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-amber-100 overflow-hidden">
      <div className="h-32 bg-amber-50" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-amber-100 rounded w-3/4" />
        <div className="h-3 bg-amber-50 rounded w-1/2" />
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyDrafts({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 col-span-full text-center">
      <span className="text-6xl opacity-20">📝</span>
      <p className="text-gray-500 font-medium">
        {hasFilter ? "No drafts match your search." : "You have no drafts yet."}
      </p>
      {!hasFilter && (
        <Link
          href="/create_new_plan"
          className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition"
        >
          <AddIcon sx={{ fontSize: 16 }} />
          Create a day plan
        </Link>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function MyDraftsPage() {
  const supabase = createClient();

  const [drafts, setDrafts] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

      const { data, error } = await supabase
        .from("itinerary_days")
        .select("*")
        .eq("created_by", user.id)
        .eq("visibility", "private")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load drafts:", error);
      } else {
        setDrafts((data as ItineraryDay[]) ?? []);
      }
      setLoading(false);
    }

    load();
  }, [supabase]);

  // ── Unique categories across all drafts ───────────────────────────────
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    drafts.forEach((d) => {
      (d.category_type ?? []).forEach((c) => cats.add(c));
    });
    return Array.from(cats).sort();
  }, [drafts]);

  // ── Filter + sort ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = drafts.filter((d) => {
      if (activeCategory && !(d.category_type ?? []).includes(activeCategory))
        return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (
          !d.title?.toLowerCase().includes(q) &&
          !d.city?.toLowerCase().includes(q) &&
          !d.country?.toLowerCase().includes(q) &&
          !d.description?.toLowerCase().includes(q)
        )
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
        case "updated":
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        case "date_asc": {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        case "date_desc": {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
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
  }, [drafts, query, sortOption, activeCategory]);

  const hasFilter = query.trim() !== "" || activeCategory !== null;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
              <EditNoteIcon sx={{ fontSize: 22, color: "#fff" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Drafts</h1>
              {!loading && (
                <p className="text-sm text-gray-500">
                  {drafts.length} draft{drafts.length !== 1 ? "s" : ""} •
                  private until published
                </p>
              )}
            </div>
          </div>
          <Link
            href="/create_new_plan"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition shadow-sm"
          >
            <AddIcon sx={{ fontSize: 16 }} />
            New Plan
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
              placeholder="Search by title, city, or country…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 shadow-sm"
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
          <div className="flex items-center gap-2">
            <SortIcon sx={{ fontSize: 18, color: "#9ca3af" }} />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:border-amber-400 shadow-sm cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category filter chips */}
        {!loading && allCategories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                activeCategory === null
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategory(activeCategory === cat ? null : cat)
                }
                className={`px-3 py-1 rounded-full text-xs font-semibold transition capitalize ${
                  activeCategory === cat
                    ? "bg-amber-500 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ")}
              </button>
            ))}
            {hasFilter && (
              <button
                onClick={() => {
                  setQuery("");
                  setActiveCategory(null);
                }}
                className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition"
              >
                <ClearIcon sx={{ fontSize: 13 }} />
                Clear
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        {!loading && filtered.length > 0 && (
          <p className="text-xs text-gray-400 mb-3">
            Showing {filtered.length} of {drafts.length} draft
            {drafts.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <DraftCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 ? (
              <EmptyDrafts hasFilter={hasFilter} />
            ) : (
              filtered.map((plan) => (
                <ItineraryCard key={plan.id} trip={plan} />
              ))
            )}
          </div>
        )}

        {loading && (
          <div className="flex justify-center mt-10">
            <CircularProgress size={28} sx={{ color: "#f59e0b" }} />
          </div>
        )}
      </div>
    </div>
  );
}
