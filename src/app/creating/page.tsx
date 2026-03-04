"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/supabase/client";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY = "__creating_plan";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatePlanParams {
  destination_value: string;
  destination_label: string;
  destination_image_url: string | null;
  locality_names?: string[];
  categories?: string[];
  places?: { id: string; source_table: string }[];
}

interface CoverPhoto {
  imageURL: string;
  blur_hash: string | null;
  photographer: string | null;
  photographerUrl: string | null;
}

interface DayMeta {
  title: string;
  city: string;
  country: string;
  description: string | null;
  destination_label: string;
  locality_names: string[] | null;
  categories: string[] | null;
  rep_point: { lat: number; lng: number } | null;
}

interface PlaceMatch {
  place_source_id: string;
  place_table: string;
  name_default: string;
  lat: number;
  lng: number;
  category: string | null;
  match_tier: string | null;
}

interface StreamedActivity {
  index: number;
  id?: string; // assigned from "complete" event item_ids
  title: string;
  description: string | null;
  item_type: string;
  location_name: string | null;
  location_address: string | null;
  start_time: string | null;
  duration_minutes: number | null;
  cost_estimate: number | null;
  currency: string | null;
  lat: number | null;
  lng: number | null;
  // from place_match (more accurate matched place coords)
  place_source_id: string | null;
  place_table: string | null;
  match_tier: string | null;
}

interface StreamedRoute {
  from_item_id?: string;
  to_item_id?: string;
  order_index: number;
  transportation_type: string;
  distance_m: number | null;
  duration_s: number | null;
}

type StreamStatus = "idle" | "connecting" | "streaming" | "complete" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise the raw `activity` object from the SSE stream into StreamedActivity.
 *  If `placeMatch` is provided its lat/lng are preferred (more accurate matched coords). */
function normaliseActivity(
  index: number,
  raw: Record<string, unknown>,
  placeMatch?: PlaceMatch | null,
): StreamedActivity {
  return {
    index,
    title: String(
      raw.title ?? raw.name ?? raw.name_default ?? `Activity ${index + 1}`,
    ),
    description: raw.description != null ? String(raw.description) : null,
    item_type: String(raw.item_type ?? raw.type ?? "activity"),
    location_name: raw.location_name != null ? String(raw.location_name) : null,
    location_address:
      raw.location_address != null ? String(raw.location_address) : null,
    // backend sends "time" for start_time
    start_time:
      raw.start_time != null
        ? String(raw.start_time)
        : raw.time != null
          ? String(raw.time)
          : null,
    duration_minutes:
      raw.duration_minutes != null ? Number(raw.duration_minutes) : null,
    cost_estimate: raw.cost_estimate != null ? Number(raw.cost_estimate) : null,
    currency: raw.currency != null ? String(raw.currency) : null,
    // Prefer place_match coords (real matched place) over AI-generated lat/lng
    lat:
      placeMatch?.lat != null
        ? placeMatch.lat
        : raw.lat != null
          ? Number(raw.lat)
          : null,
    lng:
      placeMatch?.lng != null
        ? placeMatch.lng
        : raw.lng != null
          ? Number(raw.lng)
          : null,
    place_source_id: placeMatch?.place_source_id ?? null,
    place_table: placeMatch?.place_table ?? null,
    match_tier: placeMatch?.match_tier ?? null,
  };
}

const ITEM_TYPE_EMOJI: Record<string, string> = {
  meal: "🍽️",
  breakfast: "☕",
  lunch: "🥗",
  dinner: "🍴",
  food: "🍽️",
  food_and_drink: "🍽️",
  attraction: "🏛️",
  sightseeing: "🏛️",
  museum: "🖼️",
  activity: "⚡",
  outdoors: "🌿",
  nature: "🌿",
  hiking: "🥾",
  beach: "🏖️",
  shopping: "🛍️",
  accommodation: "🏨",
  hotel: "🏨",
  transport: "🚌",
  transit: "🚌",
  nightlife: "🌙",
  bar: "🍸",
  entertainment: "🎭",
  spa: "🧘",
  viewpoint: "📸",
};

const TRANSPORT_META: Record<string, { emoji: string; label: string }> = {
  walking: { emoji: "🚶", label: "Walk" },
  running: { emoji: "🏃", label: "Run" },
  hiking: { emoji: "🥾", label: "Hike" },
  cycling: { emoji: "🚲", label: "Cycle" },
  bikeshare: { emoji: "🚲", label: "Bike" },
  driving: { emoji: "🚗", label: "Drive" },
  car_rental: { emoji: "🚗", label: "Drive" },
  rideshare: { emoji: "🚕", label: "Rideshare" },
  bus: { emoji: "🚌", label: "Bus" },
  "muni/tram": { emoji: "🚋", label: "Tram" },
  train: { emoji: "🚆", label: "Train" },
  ferry: { emoji: "⛴️", label: "Ferry" },
  flight: { emoji: "✈️", label: "Flight" },
  other: { emoji: "📍", label: "Transit" },
};

function getItemEmoji(item_type: string): string {
  const lower = item_type.toLowerCase();
  for (const [key, emoji] of Object.entries(ITEM_TYPE_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return "📍";
}

function formatDuration(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** Parse SSE text buffer into discrete events.
 *
 * Handles two backend envelope styles:
 *   A) `event: name\ndata: {...}`          — standard SSE with named event
 *   B) `data: {type: "name", data: {...}}` — single data line, type inside JSON
 *
 * Returns { event, payload } where `payload` is always the *inner* data object
 * (i.e. envelope.data when style B, otherwise the raw parsed JSON).
 */
function parseSSeEvents(
  buffer: string,
): { event: string; payload: Record<string, unknown> }[] {
  const chunks = buffer.split(/\n\n+/);
  const out: { event: string; payload: Record<string, unknown> }[] = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const lines = chunk.split("\n");
    let eventName = "message";
    let dataStr = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) eventName = line.slice(7).trim();
      else if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
    }
    if (!dataStr) continue;
    try {
      const parsed = JSON.parse(dataStr) as Record<string, unknown>;
      // Resolve the event name
      const resolvedEvent =
        eventName !== "message"
          ? eventName
          : String(parsed?.event ?? parsed?.type ?? "message");
      // Unwrap {type, data} envelope if present (style B)
      const payload =
        resolvedEvent !== "message" &&
        parsed.data != null &&
        typeof parsed.data === "object" &&
        !Array.isArray(parsed.data)
          ? (parsed.data as Record<string, unknown>)
          : parsed;
      console.log("[SSE]", resolvedEvent, payload);
      out.push({ event: resolvedEvent, payload });
    } catch {
      console.warn("[SSE] malformed chunk:", dataStr.slice(0, 200));
    }
  }
  return out;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreatingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [params, setParams] = useState<CreatePlanParams | null>(null);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [coverPhoto, setCoverPhoto] = useState<CoverPhoto | null>(null);
  // Optional day metadata streamed before activities (city, title, etc.)
  const [dayMeta, setDayMeta] = useState<DayMeta | null>(null);
  const [activities, setActivities] = useState<StreamedActivity[]>([]);
  const [routes, setRoutes] = useState<StreamedRoute[]>([]);
  const [dayId, setDayId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleActivities, setVisibleActivities] = useState<Set<number>>(
    new Set(),
  );

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Load params from sessionStorage ────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        router.replace("/create_new_plan");
        return;
      }
      const p = JSON.parse(raw) as CreatePlanParams;
      if (!p.destination_value) {
        router.replace("/create_new_plan");
        return;
      }
      setParams(p);
    } catch {
      router.replace("/create_new_plan");
    }
  }, [router]);

  // ── Start streaming once params are available ───────────────────────────────

  const startStream = useCallback(
    async (p: CreatePlanParams) => {
      setStatus("connecting");
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("You must be signed in to create a plan.");
        setStatus("error");
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      let response: Response;
      try {
        response = await fetch("/api/create-plan", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            destination_value: p.destination_value,
            locality_names: p.locality_names,
            categories: p.categories,
            places: p.places,
          }),
        });
      } catch (err: unknown) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError("Connection failed — check your network and try again.");
        setStatus("error");
        return;
      }

      if (!response.ok) {
        const msg = await response.text().catch(() => "");
        setError(msg || `Server error ${response.status}`);
        setStatus("error");
        return;
      }

      setStatus("streaming");
      console.log("[creating] stream open, reading...");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      for (;;) {
        let done: boolean;
        let value: Uint8Array | undefined;
        try {
          ({ done, value } = await reader.read());
        } catch (readErr) {
          console.error("[creating] read error:", readErr);
          break;
        }
        if (done) {
          console.log("[creating] stream done");
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        buf += chunk;

        const events = parseSSeEvents(buf);
        // Keep only the partial last chunk in buffer
        const lastDouble = buf.lastIndexOf("\n\n");
        if (lastDouble !== -1) buf = buf.slice(lastDouble + 2);

        for (const { event, payload: d } of events) {
          if (event === "cover_photo") {
            setCoverPhoto({
              imageURL: String(d.imageURL ?? ""),
              blur_hash: d.blur_hash != null ? String(d.blur_hash) : null,
              photographer:
                d.photographer != null ? String(d.photographer) : null,
              photographerUrl:
                d.photographerUrl != null ? String(d.photographerUrl) : null,
            });
          } else if (event === "day_details" || event === "day") {
            // Optional early metadata: city, country, title, rep_point etc.
            const rp = d.rep_point as
              | { lat: number; lng: number }
              | null
              | undefined;
            setDayMeta({
              title: d.title != null ? String(d.title) : "",
              city: d.city != null ? String(d.city) : "",
              country: d.country != null ? String(d.country) : "",
              description: d.description != null ? String(d.description) : null,
              destination_label:
                d.destination_label != null ? String(d.destination_label) : "",
              locality_names: Array.isArray(d.locality_names)
                ? (d.locality_names as string[])
                : null,
              categories: Array.isArray(d.categories)
                ? (d.categories as string[])
                : null,
              rep_point:
                rp?.lat != null
                  ? { lat: Number(rp.lat), lng: Number(rp.lng) }
                  : null,
            });
          } else if (event === "activity") {
            // Backend sends { index, activity: {...}, place_match: {...}|null } or flat activity object
            const idx = Number(d.index ?? 0);
            const actRaw =
              d.activity != null ? (d.activity as Record<string, unknown>) : d;
            const pm =
              d.place_match != null ? (d.place_match as PlaceMatch) : null;
            const act = normaliseActivity(idx, actRaw, pm);
            console.log("[creating] activity", idx, act);
            setActivities((prev) => {
              const next = [...prev];
              next[idx] = act;
              return next;
            });
            // Stagger reveal by 120 ms per item
            setTimeout(() => {
              setVisibleActivities((prev) => new Set([...prev, idx]));
              // Auto-scroll to keep newest item visible
              requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: "smooth",
                });
              });
            }, 120 * idx);
          } else if (event === "route") {
            const route: StreamedRoute = {
              from_item_id:
                d.from_item_id != null ? String(d.from_item_id) : undefined,
              to_item_id:
                d.to_item_id != null ? String(d.to_item_id) : undefined,
              order_index: Number(d.order_index ?? 0),
              transportation_type: String(d.transportation_type ?? "other"),
              distance_m: d.distance_m != null ? Number(d.distance_m) : null,
              duration_s: d.duration_s != null ? Number(d.duration_s) : null,
            };
            setRoutes((prev) => {
              const next = [...prev];
              next[route.order_index] = route;
              return next;
            });
          } else if (event === "complete") {
            const rawId = d.day_id;
            const id = rawId != null && rawId !== "" ? String(rawId) : null;
            console.log("[creating] complete, day_id:", id, "raw:", rawId);
            if (!id) {
              console.error(
                "[creating] complete event missing day_id — not navigating",
              );
              setError(
                "Plan was created but we couldn't find the plan ID. Check your dashboard.",
              );
              setStatus("error");
              return;
            }
            setDayId(id);
            setStatus("complete");
            sessionStorage.removeItem(SESSION_KEY);
            setTimeout(() => router.push(`/day/${id}`), 2200);
          } else if (event === "error") {
            const msg = String(
              d.message ?? d.error ?? "An error occurred during generation.",
            );
            console.error("[creating] backend error event:", msg);
            setError(msg);
            setStatus("error");
            return;
          } else {
            console.log("[creating] unhandled event:", event, d);
          }
        }
      }

      // If stream ended without "complete", treat as done anyway
      setStatus((prev) => (prev === "streaming" ? "complete" : prev));
    },
    [router, supabase],
  );

  useEffect(() => {
    if (params) startStream(params);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const dest =
    dayMeta?.title ||
    dayMeta?.destination_label ||
    dayMeta?.city ||
    params?.destination_label ||
    "your destination";
  const isComplete = status === "complete";
  const isError = status === "error";
  const typicalDayLength = 7; // estimate for progress bar
  const progress = isComplete
    ? 100
    : Math.min(95, Math.round((activities.length / typicalDayLength) * 90));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-teal-950 flex flex-col">
      {/* ── Top bar ── */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <span className="text-sm font-bold bg-linear-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            SpotoSpot
          </span>
        </Link>
        {isComplete && dayId && (
          <a
            href={`/day/${dayId}`}
            className="px-4 py-1.5 rounded-full bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold transition-colors"
          >
            View Plan →
          </a>
        )}
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 overflow-hidden">
        <div className="w-full max-w-2xl flex flex-col gap-6">
          {/* ── Status header ── */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {isComplete ? (
                "Your day plan is ready! 🎉"
              ) : isError ? (
                "Something went wrong"
              ) : (
                <>
                  Building your plan
                  <span className="text-teal-400"> for {dest}</span>
                  <span className="animate-pulse">…</span>
                </>
              )}
            </h1>
            {!isComplete && !isError && (
              <p className="mt-1.5 text-sm text-slate-400">
                {status === "connecting"
                  ? "Connecting to AI planner…"
                  : `${activities.length} activit${activities.length !== 1 ? "ies" : "y"} planned so far`}
              </p>
            )}
          </div>

          {/* ── Progress bar ── */}
          {!isError && (
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-teal-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* ── Error state ── */}
          {isError && (
            <div className="rounded-2xl bg-red-950/50 border border-red-500/30 p-5 text-center">
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => params && startStream(params)}
                  className="px-5 py-2 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors"
                >
                  Try again
                </button>
                <Link
                  href="/create_new_plan"
                  className="px-5 py-2 rounded-full border border-white/20 text-white/70 hover:text-white text-sm transition-colors"
                >
                  Back to form
                </Link>
              </div>
            </div>
          )}

          {/* ── Plan card ── */}
          {!isError && (
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl">
              {/* Cover photo */}
              <div
                className={`relative w-full h-44 sm:h-56 bg-slate-800 overflow-hidden transition-all duration-1000 ${
                  coverPhoto ? "opacity-100" : "opacity-60"
                }`}
              >
                {coverPhoto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPhoto.imageURL}
                      alt={dest}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                    {coverPhoto.photographer && (
                      <p className="absolute bottom-2 right-3 text-[10px] text-white/50">
                        Photo:{" "}
                        {coverPhoto.photographerUrl ? (
                          <a
                            href={coverPhoto.photographerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white/80"
                          >
                            {coverPhoto.photographer}
                          </a>
                        ) : (
                          coverPhoto.photographer
                        )}
                      </p>
                    )}
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-bold text-lg leading-tight drop-shadow">
                        {dest}
                      </p>
                      {(dayMeta?.city || dayMeta?.country) && (
                        <p className="text-white/70 text-xs mt-0.5">
                          {[dayMeta.city, dayMeta.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {dayMeta?.description && (
                        <p className="text-white/60 text-xs mt-1 line-clamp-2 leading-relaxed drop-shadow">
                          {dayMeta.description}
                        </p>
                      )}
                      {/* Use enriched categories from day_details, fall back to user-selected */}
                      {(dayMeta?.categories ?? params?.categories ?? [])
                        .length > 0 && (
                        <p className="text-teal-300/80 text-[11px] mt-1">
                          {(dayMeta?.categories ?? params?.categories)!.join(
                            " · ",
                          )}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  // Skeleton / loading placeholder for cover
                  <div className="w-full h-full flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="text-4xl animate-bounce">🗺️</span>
                      <p className="text-slate-500 text-sm">{dest}</p>
                    </div>
                    {/* Shimmer bars */}
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
                  </div>
                )}
              </div>

              {/* Activities list */}
              <div
                ref={scrollRef}
                className="overflow-y-auto max-h-[55vh] divide-y divide-white/5"
              >
                {activities.length === 0 &&
                  status !== "complete" &&
                  // Skeleton placeholder cards while waiting for first activity
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-5 py-4 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 rounded bg-white/10 animate-pulse w-2/3" />
                        <div className="h-2.5 rounded bg-white/10 animate-pulse w-4/5" />
                        <div className="h-2.5 rounded bg-white/10 animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}

                {activities.map((act, i) => {
                  const visible = visibleActivities.has(i);
                  const route = routes[i]; // route AFTER this activity (to the next)
                  const emoji = getItemEmoji(act.item_type);

                  return (
                    <div key={i}>
                      {/* Activity card */}
                      <div
                        className={`px-5 py-4 flex items-start gap-3.5 transition-all duration-500 ${
                          visible
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-3"
                        }`}
                      >
                        {/* Emoji badge */}
                        <div className="shrink-0 w-9 h-9 rounded-full bg-linear-to-br from-teal-500/30 to-cyan-500/20 flex items-center justify-center text-base border border-teal-500/20">
                          {emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-white leading-snug">
                              {act.title}
                            </p>
                            {act.start_time && (
                              <span className="shrink-0 text-[11px] text-slate-400 font-mono">
                                {act.start_time}
                              </span>
                            )}
                          </div>

                          {act.description && (
                            <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">
                              {act.description}
                            </p>
                          )}

                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {act.location_name && (
                              <span className="text-[11px] text-slate-500">
                                📍 {act.location_name}
                              </span>
                            )}
                            {act.duration_minutes != null && (
                              <span className="text-[11px] text-slate-500">
                                ⏱ {act.duration_minutes} min
                              </span>
                            )}
                            {act.cost_estimate != null &&
                              act.cost_estimate > 0 && (
                                <span className="text-[11px] text-slate-500">
                                  💰 {act.cost_estimate.toLocaleString()}{" "}
                                  {act.currency ?? ""}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* Route connector to next activity */}
                      {route && i < activities.length - 1 && (
                        <div className="mx-5 py-1.5 flex items-center gap-2 text-slate-500">
                          <div className="flex-1 border-t border-dashed border-white/10" />
                          <span className="text-xs flex items-center gap-1.5 px-2">
                            <span>
                              {
                                (
                                  TRANSPORT_META[route.transportation_type] ??
                                  TRANSPORT_META.other
                                ).emoji
                              }
                            </span>
                            <span className="text-[11px]">
                              {
                                (
                                  TRANSPORT_META[route.transportation_type] ??
                                  TRANSPORT_META.other
                                ).label
                              }
                              {route.duration_s != null &&
                                ` · ${formatDuration(route.duration_s)}`}
                              {route.distance_m != null &&
                                ` · ${formatDistance(route.distance_m)}`}
                            </span>
                          </span>
                          <div className="flex-1 border-t border-dashed border-white/10" />
                        </div>
                      )}

                      {/* "Still writing..." indicator after last received + not complete */}
                      {i === activities.length - 1 &&
                        status === "streaming" && (
                          <div className="px-5 py-3 flex items-center gap-2 text-slate-500 text-xs">
                            <span className="inline-flex gap-0.5">
                              {[0, 1, 2].map((d) => (
                                <span
                                  key={d}
                                  className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce"
                                  style={{ animationDelay: `${d * 150}ms` }}
                                />
                              ))}
                            </span>
                            <span>Writing more activities…</span>
                          </div>
                        )}
                    </div>
                  );
                })}

                {/* Complete state footer */}
                {isComplete && (
                  <div className="px-5 py-5 text-center">
                    <div className="inline-flex items-center gap-2 text-teal-400 text-sm font-semibold">
                      <span className="text-xl">✅</span>
                      Plan complete — taking you there now…
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Connecting skeleton ── */}
          {status === "connecting" && activities.length === 0 && !isError && (
            <div className="text-center text-slate-500 text-sm animate-pulse">
              Establishing connection…
            </div>
          )}

          {/* ── Bottom hint ── */}
          {status === "streaming" && (
            <p className="text-center text-xs text-slate-600">
              This usually takes 15–30 seconds · sit tight ☕
            </p>
          )}
        </div>
      </main>

      {/* Keyframe for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
