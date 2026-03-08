"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { use } from "react";
import { createClient } from "@/src/supabase/client";
import type {
  Trip,
  TripCollaborator,
  TripDocuments,
  ItineraryDay,
  ItineraryItem,
  AvatarConfig,
} from "@/src/supabase/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import AddDayModal from "@/src/components/trip/AddDayModal";
import CollaboratorAvatarGroup from "@/src/components/trip/CollaboratorAvatarGroup";
import TripInviteSearch from "@/src/components/trip/TripInviteSearch";

const TripMiniMap = dynamic(() => import("@/src/components/trip/TripMiniMap"), {
  ssr: false,
});

// MUI icons
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import MapIcon from "@mui/icons-material/Map";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CircularProgress from "@mui/material/CircularProgress";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PeopleIcon from "@mui/icons-material/People";
import DescriptionIcon from "@mui/icons-material/Description";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import CalendarViewDayIcon from "@mui/icons-material/CalendarViewDay";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Section components ────────────────────────────────────────────────────────

// Inline editable text field
function InlineEdit({
  value,
  onSave,
  label,
  multiline = false,
  className = "",
}: {
  value: string | null;
  onSave: (v: string) => Promise<void>;
  label: string;
  multiline?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className={`flex items-start gap-1 ${className}`}>
        {multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="text-sm border border-gray-300 rounded px-2 py-1 w-full resize-none focus:outline-none focus:border-indigo-400"
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:border-indigo-400"
          />
        )}
        <button
          onClick={save}
          disabled={saving}
          className="mt-0.5 text-green-600 hover:text-green-800 disabled:opacity-40"
        >
          {saving ? (
            <CircularProgress size={12} />
          ) : (
            <CheckIcon style={{ fontSize: 16 }} />
          )}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="mt-0.5 text-gray-400 hover:text-gray-600"
        >
          <CloseIcon style={{ fontSize: 16 }} />
        </button>
      </span>
    );
  }
  return (
    <span
      className={`group flex items-center gap-1 cursor-pointer ${className}`}
      onClick={() => setEditing(true)}
      title={`Edit ${label}`}
    >
      <span>
        {value || <span className="text-gray-400 italic">Add {label}</span>}
      </span>
      <EditIcon
        style={{ fontSize: 13 }}
        className="opacity-0 group-hover:opacity-60 text-gray-400 transition"
      />
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tripId } = use(params);
  const supabase = createClient();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [collaborators, setCollaborators] = useState<
    (TripCollaborator & {
      email?: string;
      full_name?: string;
      avatar_config?: AvatarConfig | null;
    })[]
  >([]);
  const [documents, setDocuments] = useState<TripDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [addDayOpen, setAddDayOpen] = useState(false);

  // ── Days view toggle ───────────────────────────────────────────────────────
  const [daysView, setDaysView] = useState<"card" | "calendar" | "map">("card");
  const [dayItems, setDayItems] = useState<Record<string, ItineraryItem[]>>({});
  const [loadingItems, setLoadingItems] = useState(false);

  // ── Invitation token from URL ──────────────────────────────────────────────
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");
  const [inviteBannerState, setInviteBannerState] = useState<
    "idle" | "resolving" | "accepted" | "declined"
  >("idle");
  const [inviteBannerError, setInviteBannerError] = useState<string | null>(
    null,
  );

  // My own pending collaborator row (accepted=false, for in-app invites)
  const [myPendingCollab, setMyPendingCollab] = useState<
    (TripCollaborator & { avatar_config?: AvatarConfig | null }) | null
  >(null);

  // Section refs for anchor scroll
  const daysRef = useRef<HTMLElement>(null);
  const travellersRef = useRef<HTMLElement>(null);
  const docsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Fetch everything ───────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    // For unauthenticated visitors with an invite token, load the trip via RPC
    // so RLS doesn't block them. Everything else (days, collabs, docs) requires
    // auth and will gracefully be empty for unauthed viewers.
    const isAuthed = !!user;
    const tokenForLoad =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("token")
        : null;

    const [tripRes, daysRes, collabRes, docsRes] = await Promise.all([
      isAuthed
        ? supabase.from("trips").select("*").eq("id", tripId).single()
        : tokenForLoad
          ? supabase
              .rpc("get_trip_by_invite_token", { p_invite_token: tokenForLoad })
              .single()
          : { data: null, error: new Error("Not authenticated") },
      supabase
        .from("itinerary_days")
        .select("*")
        .eq("trip_id", tripId)
        .order("date", { ascending: true }),
      supabase
        .from("trip_collaborators")
        .select(
          "id, trip_id, user_id, role, accepted, declined, invited_by, created_at, email, profiles!trip_collaborators_user_id_fkey(email, full_name, avatar_config)",
        )
        .eq("trip_id", tripId)
        .eq("declined", false),
      supabase
        .from("trip_documents")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false }),
    ]);

    console.log(collabRes.data);

    if (tripRes.data) setTrip(tripRes.data as Trip);
    if (daysRes.data) setDays(daysRes.data as ItineraryDay[]);
    if (collabRes.data) {
      type RawCollab = TripCollaborator & {
        email?: string | null; // direct column on trip_collaborators (email-only invites)
        profiles?: {
          email?: string;
          full_name?: string;
          avatar_config?: AvatarConfig | null;
        } | null;
      };
      const mapped = (collabRes.data as RawCollab[]).map((c) => ({
        ...c,
        // prefer profile email, fall back to the invite email stored on the collab row
        email: c.profiles?.email ?? c.email ?? undefined,
        full_name: c.profiles?.full_name,
        avatar_config: c.profiles?.avatar_config ?? null,
      }));
      setCollaborators(mapped);

      // Detect current user's own pending invitation (accepted=false, not owner)
      const uid = user?.id ?? null;
      if (uid) {
        const pending = mapped.find(
          (c) =>
            c.user_id === uid &&
            !c.accepted &&
            c.role !== "owner" &&
            c.role !== "admin",
        );
        setMyPendingCollab(pending ?? null);
      }
    }
    if (docsRes.data) setDocuments(docsRes.data as TripDocuments[]);
    setLoading(false);
  }, [supabase, tripId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Fetch itinerary items (for calendar view) ──────────────────────────────

  const fetchDayItems = useCallback(async () => {
    if (days.length === 0) return;
    setLoadingItems(true);
    const dayIds = days.map((d) => d.id);
    const { data } = await supabase
      .from("itinerary_items")
      .select("*")
      .in("itinerary_day_id", dayIds)
      .order("order_index", { ascending: true });
    if (data) {
      const grouped: Record<string, ItineraryItem[]> = {};
      (data as ItineraryItem[]).forEach((item) => {
        if (!grouped[item.itinerary_day_id])
          grouped[item.itinerary_day_id] = [];
        grouped[item.itinerary_day_id].push(item);
      });
      setDayItems(grouped);
    }
    setLoadingItems(false);
  }, [supabase, days]);

  // Fetch items when switching to calendar view
  useEffect(() => {
    if (daysView === "calendar" && Object.keys(dayItems).length === 0) {
      fetchDayItems();
    }
  }, [daysView, dayItems, fetchDayItems]);

  // ── Trip field save helpers ────────────────────────────────────────────────

  const saveField = async (field: keyof Trip, value: string | null) => {
    await supabase
      .from("trips")
      .update({ [field]: value })
      .eq("id", tripId);
    setTrip((t) => (t ? { ...t, [field]: value } : t));
  };

  // ── Date editing ───────────────────────────────────────────────────────────

  const [editingDates, setEditingDates] = useState(false);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [datesSaving, setDatesSaving] = useState(false);

  const openDateEdit = () => {
    setDraftStart(trip?.start_date?.slice(0, 10) ?? "");
    setDraftEnd(trip?.end_date?.slice(0, 10) ?? "");
    setEditingDates(true);
  };

  const saveDates = async () => {
    setDatesSaving(true);
    await supabase
      .from("trips")
      .update({ start_date: draftStart || null, end_date: draftEnd || null })
      .eq("id", tripId);
    setTrip((t) =>
      t
        ? {
            ...t,
            start_date: draftStart || null,
            end_date: draftEnd || null,
          }
        : t,
    );
    setDatesSaving(false);
    setEditingDates(false);
  };

  // ── Collaborator invite — handled by TripInviteSearch ─────────────────────

  const handleRemoveCollaborator = async (collabId: string) => {
    if (!confirm("Remove this collaborator?")) return;
    await supabase.from("trip_collaborators").delete().eq("id", collabId);
    fetchAll();
  };

  // ── Accept / Decline invitation ────────────────────────────────────────────

  const handleAcceptInvite = async (
    token?: string | null,
    collabId?: string | null,
  ) => {
    setInviteBannerState("resolving");
    setInviteBannerError(null);
    try {
      const { error } = await supabase.rpc("accept_trip_invitation", {
        ...(token ? { p_invite_token: token } : {}),
        ...(collabId ? { p_collaborator_id: collabId } : {}),
      });
      if (error) throw error;
      setInviteBannerState("accepted");
      setMyPendingCollab(null);
      fetchAll();
    } catch (err) {
      setInviteBannerError(
        err instanceof Error ? err.message : "Could not accept invitation",
      );
      setInviteBannerState("idle");
    }
  };

  const handleDeclineInvite = async (
    token?: string | null,
    collabId?: string | null,
  ) => {
    setInviteBannerState("resolving");
    setInviteBannerError(null);
    try {
      const { error } = await supabase.rpc("decline_trip_invitation", {
        ...(token ? { p_invite_token: token } : {}),
        ...(collabId ? { p_collaborator_id: collabId } : {}),
      });
      if (error) throw error;
      setInviteBannerState("declined");
      setMyPendingCollab(null);
      fetchAll();
    } catch (err) {
      setInviteBannerError(
        err instanceof Error ? err.message : "Could not decline invitation",
      );
      setInviteBannerState("idle");
    }
  };

  // ── Document upload ────────────────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const ext = file.name.split(".").pop();
      const path = `trip-docs/${tripId}/${Date.now()}.${ext}`;
      const { error: storageErr } = await supabase.storage
        .from("documents")
        .upload(path, file);
      if (storageErr) throw storageErr;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(path);

      await supabase.from("trip_documents").insert({
        trip_id: tripId,
        name: file.name,
        document_type: file.type,
        document_url: urlData.publicUrl,
        file_size: file.size,
        is_private: false,
        owner_id: currentUserId,
      });
      fetchAll();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    await supabase.from("trip_documents").delete().eq("id", docId);
    fetchAll();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <CircularProgress style={{ color: "#0d9488" }} />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-950 text-gray-400">
        <p className="text-lg font-semibold text-white">Trip not found.</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-teal-400 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const isOwner = trip.owner_id === currentUserId;
  const isEditor =
    isOwner ||
    collaborators.some(
      (c) =>
        c.user_id === currentUserId &&
        (c.role === "editor" || c.role === "owner" || c.role === "admin"),
    );
  const heroBlur = Math.min(scrollY / 60, 10);
  const heroScale = 1 + scrollY * 0.0003;
  const showNav = scrollY > 320;

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative h-[40vh] w-full overflow-hidden bg-gray-900">
        {/* Blurring / parallax image */}
        {trip.image_url && (
          <div
            className="absolute -inset-2"
            style={{
              transform: `scale(${heroScale})`,
              filter: `blur(${heroBlur}px)`,
              transition: "filter 0.05s linear",
            }}
          >
            <Image
              src={trip.image_url}
              alt={trip.title}
              fill
              className="object-cover"
              priority
              placeholder={trip.image_blurhash ? "blur" : undefined}
              blurDataURL={
                trip.image_blurhash
                  ? `data:image/jpeg;base64,${trip.image_blurhash}`
                  : undefined
              }
            />
          </div>
        )}
        {/* Gradient overlay — stronger for legibility */}
        <div className="absolute inset-0 bg-linear-to-t from-gray-950 via-gray-950/60 to-gray-950/10" />
        <div className="absolute inset-0 bg-linear-to-r from-gray-950/60 via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-5 left-5 flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full transition"
        >
          <ArrowBackIcon style={{ fontSize: 15 }} />
          Back
        </button>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 max-w-5xl">
          {/* Frosted glass panel for readability */}
          <div className="relative rounded-2xl p-5 bg-gray-950/50 backdrop-blur-sm border border-white/5 shadow-2xl">
            {/* Status + visibility badges */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  trip.status === "active"
                    ? "bg-green-500/25 text-green-300 border border-green-500/40"
                    : trip.status === "planning"
                      ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                      : trip.status === "completed"
                        ? "bg-sky-500/25 text-sky-300 border border-sky-500/40"
                        : "bg-gray-500/25 text-gray-400 border border-gray-500/40"
                }`}
              >
                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
              </span>
              <span className="text-[11px] text-white/50 border border-white/15 px-2 py-0.5 rounded-full">
                {trip.visibility}
              </span>
            </div>

            {/* Title */}
            <h1
              className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-2"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
            >
              {isOwner ? (
                <InlineEdit
                  value={trip.title}
                  onSave={(v) => saveField("title", v)}
                  label="title"
                  className="text-white"
                />
              ) : (
                trip.title
              )}
            </h1>

            {/* Destination */}
            <div className="flex items-center gap-1.5 text-white/75 text-sm mb-2">
              <LocationOnIcon
                style={{ fontSize: 15 }}
                className="text-teal-400 shrink-0"
              />
              {isOwner ? (
                <InlineEdit
                  value={trip.destination}
                  onSave={(v) => saveField("destination", v)}
                  label="destination"
                  className="text-white/75"
                />
              ) : (
                (trip.destination ?? (
                  <span className="italic text-white/40">
                    No destination set
                  </span>
                ))
              )}
            </div>

            {/* Description */}
            {(trip.description || isOwner) && (
              <p className="text-white/70 text-sm max-w-xl leading-relaxed mb-4">
                {isOwner ? (
                  <InlineEdit
                    value={trip.description}
                    onSave={(v) => saveField("description", v)}
                    label="description"
                    multiline
                    className="text-white/70"
                  />
                ) : (
                  trip.description
                )}
              </p>
            )}

            {/* Dates */}
            <div className="flex items-center gap-2 text-sm text-white/60 mb-5">
              <CalendarTodayIcon
                style={{ fontSize: 14 }}
                className="text-teal-400 shrink-0"
              />
              {editingDates ? (
                <span className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    value={draftStart}
                    onChange={(e) => setDraftStart(e.target.value)}
                    className="bg-white/10 border border-white/25 text-white text-sm rounded px-2 py-0.5 focus:outline-none focus:border-teal-400"
                  />
                  <span className="text-white/30">→</span>
                  <input
                    type="date"
                    value={draftEnd}
                    onChange={(e) => setDraftEnd(e.target.value)}
                    className="bg-white/10 border border-white/25 text-white text-sm rounded px-2 py-0.5 focus:outline-none focus:border-teal-400"
                  />
                  <button
                    onClick={saveDates}
                    disabled={datesSaving}
                    className="text-teal-400 hover:text-teal-300 disabled:opacity-40"
                  >
                    <CheckIcon style={{ fontSize: 16 }} />
                  </button>
                  <button
                    onClick={() => setEditingDates(false)}
                    className="text-white/40 hover:text-white/70"
                  >
                    <CloseIcon style={{ fontSize: 16 }} />
                  </button>
                </span>
              ) : (
                <span
                  className="flex items-center gap-1.5 cursor-pointer hover:text-white/90 group transition font-medium"
                  onClick={isOwner ? openDateEdit : undefined}
                >
                  {trip.start_date || trip.end_date ? (
                    <>
                      {formatDate(trip.start_date)}
                      {trip.end_date && (
                        <span className="text-white/40 mx-0.5">→</span>
                      )}
                      {trip.end_date && formatDate(trip.end_date)}
                    </>
                  ) : (
                    <span className="italic text-white/35">Add dates</span>
                  )}
                  {isOwner && (
                    <EditIcon
                      style={{ fontSize: 11 }}
                      className="opacity-0 group-hover:opacity-60 transition"
                    />
                  )}
                </span>
              )}
            </div>

            {/* Collaborator avatar group */}
            {collaborators.length > 0 && (
              <CollaboratorAvatarGroup
                collaborators={collaborators}
                max={4}
                size={34}
                ringClass="border-gray-950"
                showLabel
              />
            )}
          </div>
          {/* end frosted glass panel */}
        </div>
      </div>

      {/* ── Sticky nav ────────────────────────────────────────────────────── */}
      <nav
        className={`sticky top-0 z-40 transition-all duration-300 border-b ${
          showNav
            ? "bg-gray-950/90 backdrop-blur-md border-white/10 shadow-lg"
            : "bg-gray-950 border-gray-800"
        }`}
      >
        <div className="max-w-5xl mx-auto px-5 flex items-center gap-1 h-12 overflow-x-auto">
          {(
            [
              {
                label: "Trip Plan",
                ref: daysRef,
                icon: <MapIcon style={{ fontSize: 15 }} />,
              },
              {
                label: "Travellers",
                ref: travellersRef,
                icon: <PeopleIcon style={{ fontSize: 15 }} />,
              },
              {
                label: "Documents",
                ref: docsRef,
                icon: <DescriptionIcon style={{ fontSize: 15 }} />,
              },
            ] as const
          ).map(({ label, ref, icon }) => (
            <button
              key={label}
              onClick={() =>
                scrollTo(ref as React.RefObject<HTMLElement | null>)
              }
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition whitespace-nowrap"
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Invitation banner (token via URL or pending in-app invite) ──────── */}
      {(() => {
        const hasToken = !!inviteToken;
        const hasPending = !!myPendingCollab;
        if (!hasToken && !hasPending) return null;
        if (inviteBannerState === "accepted") {
          return (
            <div className="bg-teal-900/80 border-b border-teal-700 px-5 py-3 text-center text-sm text-teal-200 font-medium">
              ✓ You&apos;ve joined this trip!
            </div>
          );
        }
        if (inviteBannerState === "declined") {
          return (
            <div className="bg-gray-800/80 border-b border-gray-700 px-5 py-3 text-center text-sm text-gray-400">
              Invitation declined.
            </div>
          );
        }
        return (
          <div className="bg-indigo-950/90 border-b border-indigo-700/60 backdrop-blur-sm px-5 py-3.5">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  You&apos;ve been invited to join this trip
                  {myPendingCollab?.role && (
                    <span className="ml-1.5 text-indigo-300 font-normal">
                      as{" "}
                      <span className="font-semibold capitalize">
                        {myPendingCollab.role}
                      </span>
                    </span>
                  )}
                </p>
                {inviteBannerError && (
                  <p className="text-xs text-red-400 mt-0.5">
                    {inviteBannerError}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() =>
                    handleAcceptInvite(
                      hasToken ? inviteToken : null,
                      hasPending ? myPendingCollab!.id : null,
                    )
                  }
                  disabled={inviteBannerState === "resolving"}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition disabled:opacity-50"
                >
                  {inviteBannerState === "resolving" ? (
                    <CircularProgress size={12} color="inherit" />
                  ) : (
                    <CheckIcon style={{ fontSize: 14 }} />
                  )}
                  Accept
                </button>
                <button
                  onClick={() =>
                    handleDeclineInvite(
                      hasToken ? inviteToken : null,
                      hasPending ? myPendingCollab!.id : null,
                    )
                  }
                  disabled={inviteBannerState === "resolving"}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50"
                >
                  <CloseIcon style={{ fontSize: 14 }} />
                  Decline
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="max-w-5xl mx-auto px-5 pb-32">
        {/* ── Days ──────────────────────────────────────────────────────── */}
        <section ref={daysRef} className="pt-14 scroll-mt-20">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-white">Days</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {days.length} day{days.length !== 1 ? "s" : ""} planned
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              {days.length > 0 && (
                <div className="flex items-center bg-gray-900 border border-white/10 rounded-xl p-1 gap-0.5">
                  <button
                    onClick={() => setDaysView("card")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${daysView === "card" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white"}`}
                    title="Card view"
                  >
                    <ViewModuleIcon style={{ fontSize: 15 }} />
                    Cards
                  </button>
                  <button
                    onClick={() => setDaysView("calendar")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${daysView === "calendar" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white"}`}
                    title="Schedule view"
                  >
                    <CalendarViewDayIcon style={{ fontSize: 15 }} />
                    Schedule
                  </button>
                  <button
                    onClick={() => setDaysView("map")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${daysView === "map" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white"}`}
                    title="Map view"
                  >
                    <MapIcon style={{ fontSize: 15 }} />
                    Map
                  </button>
                </div>
              )}
              {isOwner && (
                <button
                  onClick={() => setAddDayOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition"
                >
                  <AddIcon style={{ fontSize: 16 }} />
                  Add Day
                </button>
              )}
            </div>
          </div>

          {days.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 border border-dashed border-gray-700 rounded-2xl text-center">
              <span className="text-5xl opacity-30">🗺️</span>
              <p className="text-gray-500 text-sm">No days added yet.</p>
              {isOwner && (
                <button
                  onClick={() => setAddDayOpen(true)}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-teal-700 hover:bg-teal-600 text-white rounded-xl transition"
                >
                  <AddIcon style={{ fontSize: 16 }} />
                  Add your first day
                </button>
              )}
            </div>
          ) : daysView === "card" ? (
            /* ── Card grid view ─────────────────────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {days.map((day, idx) => (
                <div
                  key={day.id}
                  className="group relative flex flex-col rounded-2xl overflow-hidden bg-gray-900 border border-white/5 hover:border-teal-500/40 shadow-lg hover:shadow-teal-900/30 transition-all duration-300"
                >
                  <Link
                    href={`/day/${day.id}`}
                    className="relative block aspect-4/3"
                  >
                    {/* Background image */}
                    {day.image_url ? (
                      <Image
                        src={day.image_url}
                        alt={day.title ?? `Day ${idx + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        placeholder={day.image_blurhash ? "blur" : undefined}
                        blurDataURL={
                          day.image_blurhash
                            ? `data:image/jpeg;base64,${day.image_blurhash}`
                            : undefined
                        }
                      />
                    ) : (
                      <div className="absolute inset-0 bg-linear-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <MapIcon
                          style={{ fontSize: 40 }}
                          className="text-gray-700"
                        />
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                    {/* Day badge */}
                    <div className="absolute top-3 left-3 bg-teal-600/90 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                      Day {idx + 1}
                    </div>
                    {/* Visibility */}
                    <div
                      className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        day.visibility === "public"
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {day.visibility === "public" ? "Public" : "Draft"}
                    </div>
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      {day.date && (
                        <p className="text-white/50 text-[11px] mb-0.5">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                      <p className="font-bold text-white text-sm leading-snug truncate">
                        {day.title ?? "Untitled day"}
                      </p>
                      {(day.city || day.country) && (
                        <p className="text-white/50 text-xs mt-0.5 truncate">
                          {[day.city, day.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {day.category_type && day.category_type.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {day.category_type.slice(0, 2).map((c) => (
                            <span
                              key={c}
                              className="text-[10px] bg-white/10 text-white/70 rounded-full px-1.5 py-0.5 capitalize"
                            >
                              {c.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                  {/* View full plan footer */}
                  <Link
                    href={`/day/${day.id}`}
                    className="flex items-center justify-center gap-1 py-2 text-xs font-semibold text-teal-400 hover:text-teal-300 hover:bg-teal-950/60 transition border-t border-white/5"
                  >
                    View full plan
                    <ArrowForwardIcon style={{ fontSize: 13 }} />
                  </Link>
                </div>
              ))}
              {/* Add day card */}
              {isOwner && (
                <button
                  onClick={() => setAddDayOpen(true)}
                  className="group rounded-2xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-teal-600 bg-gray-900/50 hover:bg-gray-800/50 aspect-4/3 flex flex-col items-center justify-center gap-3 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-full bg-teal-900/50 flex items-center justify-center group-hover:bg-teal-700/50 transition">
                    <AddIcon
                      style={{ fontSize: 22 }}
                      className="text-teal-400"
                    />
                  </div>
                  <span className="text-sm text-gray-500 group-hover:text-teal-400 font-medium transition">
                    Add day plan
                  </span>
                </button>
              )}
            </div>
          ) : daysView === "calendar" ? (
            /* ── Schedule / Calendar view ───────────────────────────────── */
            <div className="flex flex-col gap-4">
              {loadingItems ? (
                <div className="flex items-center justify-center py-12">
                  <CircularProgress size={28} sx={{ color: "#0d9488" }} />
                  <span className="ml-3 text-sm text-gray-500">
                    Loading schedule…
                  </span>
                </div>
              ) : (
                days.map((day, idx) => {
                  const items = dayItems[day.id] ?? [];
                  return (
                    <div
                      key={day.id}
                      className="rounded-2xl bg-gray-900 border border-white/5 overflow-hidden"
                    >
                      {/* Day header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-600/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm leading-tight">
                              {day.title ?? `Day ${idx + 1}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {day.date && (
                                <span className="text-[11px] text-gray-400">
                                  {new Date(day.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </span>
                              )}
                              {(day.city || day.country) && (
                                <span className="text-[11px] text-gray-500 truncate">
                                  📍{" "}
                                  {[day.city, day.country]
                                    .filter(Boolean)
                                    .join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/day/${day.id}`}
                          className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 font-medium transition shrink-0"
                        >
                          View full plan
                          <ArrowForwardIcon style={{ fontSize: 13 }} />
                        </Link>
                      </div>

                      {/* Activity list */}
                      {items.length === 0 ? (
                        <div className="px-4 py-5 text-sm text-gray-600 text-center">
                          No activities added yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-white/2 transition"
                            >
                              {/* Time column */}
                              <div className="w-16 shrink-0 text-right">
                                {item.start_time ? (
                                  <span className="text-[11px] text-teal-400 font-medium">
                                    {item.start_time.slice(0, 5)}
                                  </span>
                                ) : (
                                  <AccessTimeIcon
                                    style={{ fontSize: 13 }}
                                    className="text-gray-700 mt-0.5 ml-auto block"
                                  />
                                )}
                                {item.end_time && (
                                  <span className="text-[10px] text-gray-600 block">
                                    – {item.end_time.slice(0, 5)}
                                  </span>
                                )}
                              </div>
                              {/* Dot connector */}
                              <div className="flex flex-col items-center mt-1 shrink-0">
                                <div className="w-2 h-2 rounded-full bg-teal-500" />
                                <div className="w-px flex-1 bg-teal-900/60 min-h-4" />
                              </div>
                              {/* Item content */}
                              <div className="flex-1 min-w-0 pb-1">
                                <p className="text-sm font-semibold text-white leading-snug">
                                  {item.title}
                                </p>
                                {item.location_name && (
                                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    📍 {item.location_name}
                                  </p>
                                )}
                                {item.description && (
                                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                                {item.duration_minutes && (
                                  <span className="inline-block mt-1 text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded-full">
                                    {item.duration_minutes < 60
                                      ? `${item.duration_minutes}min`
                                      : `${Math.floor(item.duration_minutes / 60)}h${item.duration_minutes % 60 ? ` ${item.duration_minutes % 60}m` : ""}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ── Map view ───────────────────────────────────────────────── */
            <div
              className="rounded-2xl overflow-hidden border border-white/5 shadow-lg"
              style={{ height: 480 }}
            >
              <TripMiniMap days={days} tripId={tripId} />
            </div>
          )}
        </section>

        {/* ── Travellers ────────────────────────────────────────────────── */}
        <section ref={travellersRef} className="pt-16 scroll-mt-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Travellers</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {collaborators.length} member
                {collaborators.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Collaborator grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
            {collaborators.map((c) => (
              <div
                key={c.id}
                className="flex flex-col items-center gap-2 bg-gray-900 border border-white/5 rounded-2xl py-5 px-3 text-center relative group hover:border-teal-500/30 transition"
              >
                <div className="w-12 h-12 rounded-full bg-teal-800 border-2 border-teal-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {(c.full_name ?? c.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-sm font-semibold text-white truncate">
                    {c.full_name ?? c.email ?? c.user_id}
                  </p>
                  {c.email && c.full_name && (
                    <p className="text-[11px] text-gray-500 truncate">
                      {c.email}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.role === "owner" || c.role === "admin"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : c.role === "editor"
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                            : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {c.role === "admin" ? "owner" : c.role}
                    </span>
                    {!c.accepted && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
                {isOwner && c.role !== "owner" && c.role !== "admin" && (
                  <button
                    onClick={() => handleRemoveCollaborator(c.id)}
                    className="absolute top-2 right-2 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                  >
                    <CloseIcon style={{ fontSize: 14 }} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Invite search (owner or editor) */}
          {isEditor && currentUserId && (
            <TripInviteSearch
              tripId={tripId}
              currentUserId={currentUserId}
              excludeIds={collaborators.map((c) => c.user_id)}
              existingMembers={collaborators.map((c) => ({
                id: c.user_id,
                full_name: c.full_name ?? null,
                email: c.email ?? null,
                avatar_config: c.avatar_config ?? null,
                role: c.role,
                accepted: c.accepted,
              }))}
              onInvited={fetchAll}
            />
          )}
        </section>

        {/* ── Documents ─────────────────────────────────────────────────── */}
        <section ref={docsRef} className="pt-16 scroll-mt-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Documents</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {documents.length} file{documents.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-xl transition"
            >
              <UploadFileIcon style={{ fontSize: 15 }} />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx"
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          {uploadError && (
            <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 px-3 py-2 rounded-xl mb-3">
              {uploadError}
            </p>
          )}
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <CircularProgress size={14} style={{ color: "#0d9488" }} />
              Uploading…
            </div>
          )}

          {documents.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 py-12 border-2 border-dashed border-gray-700 hover:border-teal-600 rounded-2xl text-center cursor-pointer group transition"
            >
              <UploadFileIcon
                style={{ fontSize: 36 }}
                className="text-gray-700 group-hover:text-teal-600 transition"
              />
              <p className="text-gray-500 text-sm">Click to upload documents</p>
              <p className="text-gray-600 text-xs">
                PDF, Word, Excel, images up to 50 MB
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 bg-gray-900 border border-white/5 hover:border-teal-500/20 rounded-xl px-4 py-3 transition group"
                >
                  <InsertDriveFileIcon
                    style={{ fontSize: 22 }}
                    className="text-teal-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {doc.name}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {doc.document_type.split("/").pop()?.toUpperCase()} ·{" "}
                      {formatBytes(doc.file_size)} ·{" "}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-teal-400 transition"
                      title="Open"
                    >
                      <OpenInNewIcon style={{ fontSize: 15 }} />
                    </a>
                    <a
                      href={doc.document_url}
                      download
                      className="text-gray-600 hover:text-teal-400 transition"
                      title="Download"
                    >
                      <LinkIcon style={{ fontSize: 15 }} />
                    </a>
                    {(doc.owner_id === currentUserId || isOwner) && (
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-gray-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                      >
                        <DeleteIcon style={{ fontSize: 15 }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {/* Upload more */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-700 hover:border-teal-600 rounded-xl py-4 text-gray-600 hover:text-teal-400 text-sm transition group"
              >
                <AddIcon style={{ fontSize: 18 }} />
                Add document
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── Add Day Modal ────────────────────────────────────────────────── */}
      {addDayOpen && (
        <AddDayModal
          tripId={tripId}
          existingDayIds={days.map((d) => d.id)}
          onClose={() => setAddDayOpen(false)}
          onAdded={fetchAll}
        />
      )}
    </div>
  );
}
