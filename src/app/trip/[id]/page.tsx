"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { use } from "react";
import { createClient } from "@/src/supabase/client";
import type {
  Trip,
  TripCollaborator,
  TripDocuments,
  ItineraryDay,
} from "@/src/supabase/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AddDayModal from "@/src/components/trip/AddDayModal";

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
    (TripCollaborator & { email?: string; full_name?: string })[]
  >([]);
  const [documents, setDocuments] = useState<TripDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [addDayOpen, setAddDayOpen] = useState(false);

  // Section refs for anchor scroll
  const daysRef = useRef<HTMLElement>(null);
  const travellersRef = useRef<HTMLElement>(null);
  const docsRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLElement>(null);

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

    const [tripRes, daysRes, collabRes, docsRes] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase
        .from("itinerary_days")
        .select("*")
        .eq("trip_id", tripId)
        .order("date", { ascending: true }),
      supabase
        .from("trip_collaborators")
        .select("*, profiles(email, full_name)")
        .eq("trip_id", tripId),
      supabase
        .from("trip_documents")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false }),
    ]);

    if (tripRes.data) setTrip(tripRes.data as Trip);
    if (daysRes.data) setDays(daysRes.data as ItineraryDay[]);
    if (collabRes.data) {
      setCollaborators(
        (
          collabRes.data as (TripCollaborator & {
            profiles?: { email?: string; full_name?: string } | null;
          })[]
        ).map((c) => ({
          ...c,
          email: c.profiles?.email,
          full_name: c.profiles?.full_name,
        })),
      );
    }
    if (docsRes.data) setDocuments(docsRes.data as TripDocuments[]);
    setLoading(false);
  }, [supabase, tripId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  // ── Collaborator invite ────────────────────────────────────────────────────

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      // Look up user by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail.trim().toLowerCase())
        .single();
      if (!profile) {
        setInviteError("No user found with that email.");
        return;
      }
      const { error } = await supabase.from("trip_collaborators").insert({
        trip_id: tripId,
        user_id: profile.id,
        role: inviteRole,
        invited_by: currentUserId!,
        accepted: false,
      });
      if (error) throw error;
      setInviteEmail("");
      fetchAll();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collabId: string) => {
    if (!confirm("Remove this collaborator?")) return;
    await supabase.from("trip_collaborators").delete().eq("id", collabId);
    fetchAll();
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
  const heroBlur = Math.min(scrollY / 60, 10);
  const heroScale = 1 + scrollY * 0.0003;
  const showNav = scrollY > 320;

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative h-[75vh] w-full overflow-hidden bg-gray-900">
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
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-gray-950 via-gray-950/50 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-gray-950/40 via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-5 left-5 flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full transition"
        >
          <ArrowBackIcon style={{ fontSize: 15 }} />
          Back
        </button>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 max-w-5xl">
          {/* Status + visibility badges */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                trip.status === "active"
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : trip.status === "planning"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : trip.status === "completed"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
              }`}
            >
              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
            </span>
            <span className="text-[11px] text-white/40 border border-white/10 px-2 py-0.5 rounded-full">
              {trip.visibility}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-2">
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
          <div className="flex items-center gap-1.5 text-white/60 text-sm mb-2">
            <LocationOnIcon style={{ fontSize: 15 }} />
            {isOwner ? (
              <InlineEdit
                value={trip.destination}
                onSave={(v) => saveField("destination", v)}
                label="destination"
                className="text-white/60"
              />
            ) : (
              (trip.destination ?? (
                <span className="italic">No destination set</span>
              ))
            )}
          </div>

          {/* Description */}
          <p className="text-white/60 text-sm max-w-xl leading-relaxed mb-4">
            {isOwner ? (
              <InlineEdit
                value={trip.description}
                onSave={(v) => saveField("description", v)}
                label="description"
                multiline
                className="text-white/60"
              />
            ) : (
              trip.description
            )}
          </p>

          {/* Dates */}
          <div className="flex items-center gap-2 text-sm text-white/50 mb-5">
            <CalendarTodayIcon style={{ fontSize: 14 }} />
            {editingDates ? (
              <span className="flex items-center gap-2">
                <input
                  type="date"
                  value={draftStart}
                  onChange={(e) => setDraftStart(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white text-sm rounded px-2 py-0.5 focus:outline-none focus:border-teal-400"
                />
                <span className="text-white/30">→</span>
                <input
                  type="date"
                  value={draftEnd}
                  onChange={(e) => setDraftEnd(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white text-sm rounded px-2 py-0.5 focus:outline-none focus:border-teal-400"
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
                className="flex items-center gap-1 cursor-pointer hover:text-white/80 group transition"
                onClick={isOwner ? openDateEdit : undefined}
              >
                {trip.start_date || trip.end_date ? (
                  <>
                    {formatDate(trip.start_date)}
                    {trip.end_date && ` → ${formatDate(trip.end_date)}`}
                  </>
                ) : (
                  <span className="italic text-white/30">Add dates</span>
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

          {/* Collaborator avatars */}
          {collaborators.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2">
                {collaborators.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    title={c.full_name ?? c.email ?? ""}
                    className="w-8 h-8 rounded-full border-2 border-gray-950 bg-teal-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0"
                  >
                    {(c.full_name ?? c.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              {collaborators.length > 5 && (
                <span className="text-xs text-white/40 ml-1">
                  +{collaborators.length - 5} more
                </span>
              )}
              <span className="text-xs text-white/40 ml-1">
                {collaborators.length} traveller
                {collaborators.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
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
                label: "Days",
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
              {
                label: "Map",
                ref: mapRef,
                icon: <LocationOnIcon style={{ fontSize: 15 }} />,
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

      <div className="max-w-5xl mx-auto px-5 pb-32">
        {/* ── Days ──────────────────────────────────────────────────────── */}
        <section ref={daysRef} className="pt-14 scroll-mt-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Days</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {days.length} day{days.length !== 1 ? "s" : ""} planned
              </p>
            </div>
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {days.map((day, idx) => (
                <Link
                  key={day.id}
                  href={`/day/${day.id}`}
                  className="group relative rounded-2xl overflow-hidden bg-gray-900 border border-white/5 hover:border-teal-500/40 shadow-lg hover:shadow-teal-900/30 transition-all duration-300 aspect-4/3 block"
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
                        c.role === "owner"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : c.role === "editor"
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                            : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {c.role}
                    </span>
                    {!c.accepted && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
                {isOwner && c.role !== "owner" && (
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

          {/* Invite form (owner only) */}
          {isOwner && (
            <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <PeopleIcon
                  style={{ fontSize: 16 }}
                  className="text-teal-400"
                />
                Invite someone
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  className="flex-1 text-sm bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 transition"
                />
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "editor" | "viewer")
                  }
                  className="text-sm bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="flex items-center gap-1.5 text-sm bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl font-semibold transition disabled:opacity-40"
                >
                  {inviteLoading ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <AddIcon style={{ fontSize: 15 }} />
                  )}
                  Invite
                </button>
              </div>
              {inviteError && (
                <p className="text-xs text-red-400 mt-2">{inviteError}</p>
              )}
            </div>
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

        {/* ── Map ───────────────────────────────────────────────────────── */}
        {days.length > 0 && (
          <section ref={mapRef} className="pt-16 scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Trip Map</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                All {days.length} day{days.length !== 1 ? "s" : ""} on the map
              </p>
            </div>
            <div
              className="rounded-2xl overflow-hidden border border-white/5 shadow-xl"
              style={{ height: 480 }}
            >
              <TripMiniMap days={days} tripId={tripId} />
            </div>
          </section>
        )}
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
