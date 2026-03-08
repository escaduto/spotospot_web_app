"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/src/supabase/client";
import { useAuth } from "@/src/hooks/useAuth";
import Image from "next/image";
import CircularProgress from "@mui/material/CircularProgress";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AirplaneTicketIcon from "@mui/icons-material/AirplaneTicket";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import LocationOnIcon from "@mui/icons-material/LocationOn";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Matches the shape emitted by pending_invitations_json in get_dashboard RPC */
export interface PendingInvite {
  collaborator_id: string;
  role: "viewer" | "editor" | "admin";
  invited_by: string | null; // full_name of the inviter
  created_at: string;
  trip: {
    id: string;
    title: string;
    description: string | null;
    destination: string | null;
    image_url: string | null;
    image_blurhash: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
  } | null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PendingTripInvites({
  onCountChange,
  initialInvites,
}: {
  onCountChange?: (n: number) => void;
  initialInvites?: PendingInvite[];
}) {
  const { user } = useAuth();
  const supabase = createClient();

  const [invites, setInvites] = useState<PendingInvite[]>(initialInvites ?? []);
  const [loading, setLoading] = useState(initialInvites == null);
  const [collapsed, setCollapsed] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync when parent provides/updates data
  useEffect(() => {
    if (initialInvites == null) return;
    setInvites(initialInvites);
    setLoading(false);
    onCountChange?.(initialInvites.length);
  }, [initialInvites, onCountChange]);

  const fetchInvites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("trip_collaborators")
      .select(
        `id, role, created_at,
         trips!trip_collaborators_trip_id_fkey(id, title, description, destination, image_url, image_blurhash, start_date, end_date, status),
         profiles!trip_collaborators_invited_by_fkey(full_name, email)`,
      )
      .eq("user_id", user.id)
      .eq("accepted", false)
      .order("created_at", { ascending: false });

    type RawRow = {
      id: string;
      role: "viewer" | "editor" | "admin";
      created_at: string;
      trips: PendingInvite["trip"];
      profiles: { full_name?: string | null; email?: string } | null;
    };

    const parsed: PendingInvite[] = ((data ?? []) as unknown as RawRow[]).map(
      (r) => ({
        collaborator_id: r.id,
        role: r.role,
        invited_by: r.profiles?.full_name ?? r.profiles?.email ?? null,
        created_at: r.created_at,
        trip: r.trips ?? null,
      }),
    );

    setInvites(parsed);
    onCountChange?.(parsed.length);
    setLoading(false);
  }, [user, supabase, onCountChange]);

  useEffect(() => {
    if (initialInvites != null) return; // data provided by parent, skip fetch
    fetchInvites();
  }, [fetchInvites, initialInvites]);

  const respond = async (
    invite: PendingInvite,
    action: "accept" | "decline",
  ) => {
    setResponding(invite.collaborator_id);
    setErrors((prev) => ({ ...prev, [invite.collaborator_id]: "" }));
    try {
      const rpcName =
        action === "accept"
          ? "accept_trip_invitation"
          : "decline_trip_invitation";
      const { error } = await supabase.rpc(rpcName, {
        p_collaborator_id: invite.collaborator_id,
      });
      if (error) throw error;
      setInvites((prev) =>
        prev.filter((i) => i.collaborator_id !== invite.collaborator_id),
      );
      onCountChange?.(invites.length - 1);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [invite.collaborator_id]: err instanceof Error ? err.message : "Error",
      }));
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <CircularProgress size={14} style={{ color: "#0d9488" }} />
        <span>Loading invites…</span>
      </div>
    );
  }

  //   if (invites.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Header bar */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/60 transition"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <AirplaneTicketIcon sx={{ fontSize: 17, color: "#d97706" }} />
          <span className="text-sm font-semibold text-amber-800">
            {invites.length} pending trip invite
            {invites.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full">
            {invites.length}
          </span>
        </div>
        {collapsed ? (
          <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "#92400e" }} />
        ) : (
          <KeyboardArrowUpIcon sx={{ fontSize: 18, color: "#92400e" }} />
        )}
      </button>

      {/* Horizontal scroll row */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {invites.map((invite) => (
              <InviteCard
                key={invite.collaborator_id}
                invite={invite}
                responding={responding === invite.collaborator_id}
                error={errors[invite.collaborator_id]}
                onAccept={() => respond(invite, "accept")}
                onDecline={() => respond(invite, "decline")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Individual invite card ────────────────────────────────────────────────────

function InviteCard({
  invite,
  responding,
  error,
  onAccept,
  onDecline,
}: {
  invite: PendingInvite;
  responding: boolean;
  error?: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const trip = invite.trip;

  return (
    <div className="shrink-0 w-72 rounded-xl bg-white border border-amber-100 shadow-sm flex items-center gap-3 px-3 py-2.5">
      {/* Thumbnail */}
      <div className="relative w-11 h-11 rounded-lg bg-linear-to-br from-teal-50 to-cyan-50 shrink-0 overflow-hidden">
        {trip?.image_url ? (
          <Image
            src={trip.image_url}
            alt={trip.title ?? "Trip"}
            fill
            className="object-cover"
            sizes="44px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-lg opacity-30">
            🗺️
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
          {trip?.title ?? "Trip invitation"}
        </p>
        {trip?.destination && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <LocationOnIcon sx={{ fontSize: 10, color: "#0d9488" }} />
            <span className="text-[11px] text-gray-400 truncate">
              {trip.destination}
            </span>
          </div>
        )}
        {invite.invited_by && (
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            from{" "}
            <span className="font-medium text-gray-500">
              {invite.invited_by}
            </span>
          </p>
        )}
        {error && (
          <p className="text-[10px] text-red-500 mt-0.5 truncate">{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onDecline}
          disabled={responding}
          title="Decline"
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 flex items-center justify-center transition disabled:opacity-40"
        >
          {responding ? (
            <CircularProgress size={11} color="inherit" />
          ) : (
            <CloseIcon style={{ fontSize: 13 }} />
          )}
        </button>
        <button
          onClick={onAccept}
          disabled={responding}
          title="Accept"
          className="w-7 h-7 rounded-full bg-teal-500 hover:bg-teal-400 text-white flex items-center justify-center transition disabled:opacity-40"
        >
          {responding ? (
            <CircularProgress size={11} color="inherit" />
          ) : (
            <CheckIcon style={{ fontSize: 13 }} />
          )}
        </button>
      </div>
    </div>
  );
}
