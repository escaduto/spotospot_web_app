"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import MapIcon from "@mui/icons-material/Map";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddIcon from "@mui/icons-material/Add";
import { createClient } from "@/src/supabase/client";
import type { ItineraryDay } from "@/src/supabase/types";

interface Props {
  tripId: string;
  existingDayIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddDayModal({
  tripId,
  existingDayIds,
  onClose,
  onAdded,
}: Props) {
  const [tab, setTab] = useState<"mine" | "public">("mine");
  const [query, setQuery] = useState("");
  const [myDays, setMyDays] = useState<ItineraryDay[]>([]);
  const [publicDays, setPublicDays] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const supabase = createClient();

  const fetchMine = useCallback(
    async (q: string) => {
      setLoading(true);
      let builder = supabase
        .from("itinerary_days")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(30);
      if (q.trim()) builder = builder.ilike("title", `%${q.trim()}%`);
      const { data } = await builder;
      setMyDays(
        ((data ?? []) as ItineraryDay[]).filter(
          (d) => !existingDayIds.includes(d.id),
        ),
      );
      setLoading(false);
    },
    [supabase, existingDayIds],
  );

  const fetchPublic = useCallback(
    async (q: string) => {
      setLoading(true);
      let builder = supabase
        .from("itinerary_days")
        .select("*")
        .eq("visibility", "public")
        .order("updated_at", { ascending: false })
        .limit(30);
      if (q.trim()) builder = builder.ilike("title", `%${q.trim()}%`);
      const { data } = await builder;
      setPublicDays(
        ((data ?? []) as ItineraryDay[]).filter(
          (d) => !existingDayIds.includes(d.id),
        ),
      );
      setLoading(false);
    },
    [supabase, existingDayIds],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab === "mine") fetchMine(query);
      else fetchPublic(query);
    }, 250);
    return () => clearTimeout(t);
  }, [tab, query, fetchMine, fetchPublic]);

  const handleAdd = async (day: ItineraryDay) => {
    setAdding(day.id);
    await supabase
      .from("itinerary_days")
      .update({ trip_id: tripId })
      .eq("id", day.id);
    setAdding(null);
    onAdded();
    onClose();
  };

  const days = tab === "mine" ? myDays : publicDays;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Add a day plan</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
          >
            <CloseIcon style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-4 pt-1">
          {(
            [
              {
                key: "mine",
                label: "My Plans",
                icon: <LockIcon style={{ fontSize: 14 }} />,
              },
              {
                key: "public",
                label: "Public Plans",
                icon: <PublicIcon style={{ fontSize: 14 }} />,
              },
            ] as const
          ).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === key
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <SearchIcon
              style={{ fontSize: 16 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder={`Search ${tab === "mine" ? "your" : "public"} plans…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 transition"
            />
          </div>
        </div>

        {/* Public CTA */}
        {tab === "public" && (
          <div className="px-4 pb-2">
            <Link
              href="/discover"
              target="_blank"
              className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-xl transition"
            >
              <MapIcon style={{ fontSize: 14 }} />
              Browse full Discover map
              <OpenInNewIcon style={{ fontSize: 12 }} />
            </Link>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {loading ? (
            <div className="flex flex-col gap-2 pt-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="flex items-center gap-3 p-3 animate-pulse"
                >
                  <div className="w-14 h-14 bg-gray-200 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : days.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="text-4xl opacity-30">🗺️</span>
              <p className="text-sm text-gray-400">
                {query
                  ? "No plans match your search."
                  : tab === "mine"
                    ? "You have no unassigned day plans."
                    : "No public plans found."}
              </p>
              {tab === "mine" && !query && (
                <Link
                  href="/create_new_plan"
                  target="_blank"
                  className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1"
                >
                  Create a new day plan
                  <OpenInNewIcon style={{ fontSize: 12 }} />
                </Link>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5 pt-1">
              {days.map((day) => (
                <li
                  key={day.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition group"
                >
                  {/* Thumbnail */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                    {day.image_url ? (
                      <Image
                        src={day.image_url}
                        alt={day.title ?? "Day"}
                        fill
                        className="object-cover"
                        sizes="56px"
                        placeholder={day.image_blurhash ? "blur" : undefined}
                        blurDataURL={
                          day.image_blurhash
                            ? `data:image/jpeg;base64,${day.image_blurhash}`
                            : undefined
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        🗺️
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {day.title ?? "Untitled"}
                    </p>
                    {(day.city || day.country) && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {[day.city, day.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {day.date && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>

                  {/* Add button */}
                  <button
                    onClick={() => handleAdd(day)}
                    disabled={adding === day.id}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    {adding === day.id ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <AddIcon style={{ fontSize: 13 }} />
                    )}
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
