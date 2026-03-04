"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/src/supabase/client";
import type { ItineraryDay } from "@/src/supabase/types";
import { useRouter } from "next/navigation";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PublicIcon from "@mui/icons-material/Public";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SyncIcon from "@mui/icons-material/Sync";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  day: ItineraryDay;
  onRefetch: () => void;
}

type ActionResult = {
  action: "publish" | "new_trip" | "add_to_trip";
  source_day_id: string;
  public_day_id?: string;
  trip_id?: string;
  trip_day_id?: string;
  day_number?: number;
};

interface TripOption {
  id: string;
  title: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlanActionsMenu({ day, onRefetch }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Publish state ──────────────────────────────────────────────────────────
  const [publishedDayId, setPublishedDayId] = useState<string | null>(null);
  const [publishExpanded, setPublishExpanded] = useState(false);

  // ── Trip state ─────────────────────────────────────────────────────────────
  const [tripExpanded, setTripExpanded] = useState(false);
  const [tripView, setTripView] = useState<"menu" | "new" | "add">("menu");
  const [newTripTitle, setNewTripTitle] = useState("");
  const [newTripDescription, setNewTripDescription] = useState("");
  const [availableTrips, setAvailableTrips] = useState<TripOption[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripsLoading, setTripsLoading] = useState(false);

  // ── Action result banner ───────────────────────────────────────────────────
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  // ── On mount: check if day already has a public copy ──────────────────────
  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("itinerary_days")
        .select("id")
        .eq("source_itinerary_id", day.id)
        .eq("visibility", "public")
        .eq("created_by", user.id)
        .maybeSingle();
      if (data?.id) setPublishedDayId(data.id);
    };
    check();
  }, [day.id, supabase]);

  // ── Fetch trips the current user can edit ─────────────────────────────────
  const fetchAvailableTrips = async () => {
    setTripsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("trip_collaborators")
        .select("trip_id, trips(id, title)")
        .eq("user_id", user.id)
        .in("role", ["editor", "admin"])
        .eq("accepted", true);
      const trips: TripOption[] = (data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) => row.trips)
        .filter(Boolean)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => ({ id: t.id, title: t.title }));
      setAvailableTrips(trips);
    } catch (err) {
      console.error("fetchAvailableTrips:", err);
    } finally {
      setTripsLoading(false);
    }
  };

  // ── RPC helpers ───────────────────────────────────────────────────────────

  const callRPC = async (params: Record<string, unknown>) => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc(
        "update_plan_visibility" as string,
        params,
      );
      if (rpcErr) throw rpcErr;
      return data as ActionResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    const result = await callRPC({ p_day_id: day.id, p_action: "publish" });
    if (!result) return;
    setPublishedDayId(result.public_day_id ?? null);
    setActionResult(result);
    setPublishExpanded(false);
    onRefetch();
  };

  const handleNewTrip = async () => {
    if (!newTripTitle.trim()) return;
    const result = await callRPC({
      p_day_id: day.id,
      p_action: "new_trip",
      p_trip_title: newTripTitle.trim(),
      p_trip_description: newTripDescription.trim() || null,
    });
    if (!result) return;
    setActionResult(result);
    setTripExpanded(false);
    setTripView("menu");
    setNewTripTitle("");
    setNewTripDescription("");
  };

  const handleAddToTrip = async () => {
    if (!selectedTripId) return;
    const result = await callRPC({
      p_day_id: day.id,
      p_action: "add_to_trip",
      p_trip_id: selectedTripId,
    });
    if (!result) return;
    setActionResult(result);
    setTripExpanded(false);
    setTripView("menu");
    setSelectedTripId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // If this day is already public, it IS the public record — no publish/trip actions needed
  if (day.visibility === "public") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* ── Two main action buttons ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {/* Publish */}
        {publishedDayId ? (
          <button
            onClick={() => setPublishExpanded((p) => !p)}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
              publishExpanded
                ? "bg-green-700 text-white border-green-700 shadow-sm"
                : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            }`}
          >
            <CheckCircleIcon style={{ fontSize: 14 }} />
            Published ✓
          </button>
        ) : (
          <button
            onClick={handlePublish}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 transition shadow-sm disabled:opacity-40"
          >
            {loading ? (
              <CircularProgress size={12} color="inherit" />
            ) : (
              <PublicIcon style={{ fontSize: 14 }} />
            )}
            Make Public
          </button>
        )}

        {/* Trip */}
        <button
          onClick={() => {
            setTripExpanded((p) => !p);
            setTripView("menu");
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
            tripExpanded
              ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
              : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
          }`}
        >
          <TravelExploreIcon style={{ fontSize: 14 }} />
          Add to Trip
        </button>
      </div>

      {/* ── Publish expanded panel ───────────────────────────────────────── */}
      {publishExpanded && publishedDayId && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600">
              Published copy
            </p>
            <button
              onClick={() => setPublishExpanded(false)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <CloseIcon style={{ fontSize: 13 }} />
            </button>
          </div>
          <div className="p-1.5 flex flex-col gap-0.5">
            <button
              onClick={handlePublish}
              disabled={loading}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              {loading ? (
                <CircularProgress size={14} />
              ) : (
                <SyncIcon style={{ fontSize: 16 }} />
              )}
              Sync changes to public
            </button>
            <button
              onClick={() => router.push(`/day/${publishedDayId}`)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <OpenInNewIcon style={{ fontSize: 16 }} />
              View public page
            </button>
          </div>
        </div>
      )}

      {/* ── Trip expanded panel ──────────────────────────────────────────── */}
      {tripExpanded && (
        <div className="rounded-xl border border-indigo-100 bg-white overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
            {tripView !== "menu" && (
              <button
                onClick={() => setTripView("menu")}
                className="text-indigo-400 hover:text-indigo-700 -ml-0.5 transition"
              >
                <ArrowBackIosNewIcon style={{ fontSize: 11 }} />
              </button>
            )}
            <p className="text-xs font-semibold text-indigo-700 flex-1">
              {tripView === "menu"
                ? "Add to Trip"
                : tripView === "new"
                  ? "Create new trip"
                  : "Add to existing trip"}
            </p>
            <button
              onClick={() => setTripExpanded(false)}
              className="text-indigo-400 hover:text-indigo-700 transition"
            >
              <CloseIcon style={{ fontSize: 13 }} />
            </button>
          </div>

          {/* Menu view */}
          {tripView === "menu" && (
            <div className="p-1.5 flex flex-col gap-0.5">
              <button
                onClick={() => setTripView("new")}
                className="flex w-full items-center gap-3 px-3 py-3 rounded-lg hover:bg-indigo-50 transition group text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center shrink-0 transition">
                  <AddCircleOutlineIcon
                    style={{ fontSize: 17, color: "#4f46e5" }}
                  />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">
                    Create new trip
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Start a new trip from this day plan
                  </span>
                </span>
              </button>
              <button
                onClick={() => {
                  setTripView("add");
                  fetchAvailableTrips();
                }}
                className="flex w-full items-center gap-3 px-3 py-3 rounded-lg hover:bg-indigo-50 transition group text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center shrink-0 transition">
                  <PlaylistAddIcon style={{ fontSize: 17, color: "#4f46e5" }} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">
                    Add to existing trip
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Append to a trip you can edit
                  </span>
                </span>
              </button>
            </div>
          )}

          {/* New trip form */}
          {tripView === "new" && (
            <div className="p-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Trip title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tokyo Spring 2026"
                  value={newTripTitle}
                  onChange={(e) => setNewTripTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNewTrip()}
                  autoFocus
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  placeholder="Optional…"
                  value={newTripDescription}
                  onChange={(e) => setNewTripDescription(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
              <button
                onClick={handleNewTrip}
                disabled={loading || !newTripTitle.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-40 shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <AddCircleOutlineIcon style={{ fontSize: 16 }} />
                )}
                {loading ? "Creating…" : "Create trip"}
              </button>
            </div>
          )}

          {/* Add to existing trip */}
          {tripView === "add" && (
            <div className="flex flex-col">
              {tripsLoading ? (
                <div className="flex justify-center py-6">
                  <CircularProgress size={20} />
                </div>
              ) : availableTrips.length === 0 ? (
                <p className="text-xs text-gray-400 text-center px-4 py-5">
                  No editable trips found.
                </p>
              ) : (
                <>
                  <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
                    {availableTrips.map((t) => {
                      const sel = selectedTripId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTripId(sel ? null : t.id)}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition ${
                            sel
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <span className="flex-1 truncate">{t.title}</span>
                          {sel && (
                            <CheckCircleIcon
                              style={{
                                fontSize: 14,
                                color: "#4f46e5",
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button
                      onClick={handleAddToTrip}
                      disabled={!selectedTripId || loading}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-40 shadow-sm flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <PlaylistAddIcon style={{ fontSize: 16 }} />
                      )}
                      {loading ? "Adding…" : "Add to trip"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Action result banner ─────────────────────────────────────────── */}
      {actionResult && actionResult.action !== "publish" && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-xs">
          <CheckCircleIcon style={{ fontSize: 13 }} />
          <span className="font-medium">
            {actionResult.action === "new_trip"
              ? "Trip created!"
              : "Added to trip!"}
          </span>
          {actionResult.trip_id && (
            <button
              onClick={() => router.push(`/trip/${actionResult.trip_id}`)}
              className="ml-1 underline underline-offset-2 hover:text-green-900 font-semibold transition"
            >
              View trip →
            </button>
          )}
          <button
            onClick={() => setActionResult(null)}
            className="ml-auto opacity-60 hover:opacity-100"
          >
            <CloseIcon style={{ fontSize: 12 }} />
          </button>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto opacity-60 hover:opacity-100"
          >
            <CloseIcon style={{ fontSize: 12 }} />
          </button>
        </div>
      )}
    </div>
  );
}
