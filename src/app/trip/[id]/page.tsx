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

// MUI icons
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LinkIcon from "@mui/icons-material/Link";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import MapIcon from "@mui/icons-material/Map";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CircularProgress from "@mui/material/CircularProgress";

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
  const [activeTab, setActiveTab] = useState<
    "days" | "collaborators" | "documents"
  >("days");

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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <CircularProgress />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 text-gray-600">
        <p className="text-lg font-semibold">Trip not found.</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-indigo-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const isOwner = trip.owner_id === currentUserId;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="relative h-60 w-full bg-gray-300 overflow-hidden">
        {trip.image_url && (
          <Image
            src={trip.image_url}
            alt={trip.title}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-1 text-white/90 hover:text-white text-sm font-medium"
        >
          <ArrowBackIcon style={{ fontSize: 16 }} />
          Back
        </button>

        {/* Trip title + description over image */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white font-bold text-xl leading-tight">
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
          {(trip.destination || isOwner) && (
            <p className="text-white/70 text-sm mt-0.5">
              {isOwner ? (
                <InlineEdit
                  value={trip.destination}
                  onSave={(v) => saveField("destination", v)}
                  label="destination"
                  className="text-white/70"
                />
              ) : (
                trip.destination
              )}
            </p>
          )}
        </div>
      </div>

      {/* ── Meta row ─────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white shadow-sm">
        {/* Dates */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarTodayIcon style={{ fontSize: 15 }} />
          {editingDates ? (
            <span className="flex items-center gap-2">
              <input
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:border-indigo-400"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:border-indigo-400"
              />
              <button
                onClick={saveDates}
                disabled={datesSaving}
                className="text-green-600 hover:text-green-800 disabled:opacity-40"
              >
                {datesSaving ? (
                  <CircularProgress size={13} />
                ) : (
                  <CheckIcon style={{ fontSize: 16 }} />
                )}
              </button>
              <button
                onClick={() => setEditingDates(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseIcon style={{ fontSize: 16 }} />
              </button>
            </span>
          ) : (
            <span
              className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 transition group"
              onClick={isOwner ? openDateEdit : undefined}
            >
              {trip.start_date || trip.end_date ? (
                <>
                  {formatDate(trip.start_date)}
                  {trip.end_date && ` → ${formatDate(trip.end_date)}`}
                </>
              ) : (
                <span className="text-gray-400 italic">Add dates</span>
              )}
              {isOwner && (
                <EditIcon
                  style={{ fontSize: 12 }}
                  className="opacity-0 group-hover:opacity-60 transition"
                />
              )}
            </span>
          )}
        </div>

        {/* Status badge */}
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            trip.status === "active"
              ? "bg-green-100 text-green-700"
              : trip.status === "planning"
                ? "bg-amber-100 text-amber-700"
                : trip.status === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
          }`}
        >
          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
        </span>

        {/* Visibility badge */}
        <span className="text-[11px] text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
          {trip.visibility}
        </span>
      </div>

      {/* ── Description ────────────────────────────────────────────────────── */}
      {(trip.description || isOwner) && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            {isOwner ? (
              <InlineEdit
                value={trip.description}
                onSave={(v) => saveField("description", v)}
                label="description"
                multiline
              />
            ) : (
              trip.description
            )}
          </p>
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex gap-0 border-b border-gray-200">
          {(
            [
              { key: "days", label: "Days", Icon: MapIcon },
              {
                key: "collaborators",
                label: "Collaborators",
                Icon: PeopleIcon,
              },
              {
                key: "documents",
                label: "Documents",
                Icon: InsertDriveFileIcon,
              },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === key
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon style={{ fontSize: 16 }} />
              {label}
              {key === "collaborators" && collaborators.length > 0 && (
                <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 font-semibold">
                  {collaborators.length}
                </span>
              )}
              {key === "documents" && documents.length > 0 && (
                <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 font-semibold">
                  {documents.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* ── Days tab ─────────────────────────────────────────────────── */}
        {activeTab === "days" && (
          <div className="flex flex-col gap-3">
            {days.length === 0 && (
              <p className="text-sm text-gray-400 italic py-4 text-center">
                No days added to this trip yet.
              </p>
            )}
            {days.map((day, idx) => (
              <div
                key={day.id}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {/* Thumbnail */}
                <div className="relative w-20 h-20 shrink-0 bg-gray-100">
                  {day.image_url ? (
                    <Image
                      src={day.image_url}
                      alt={day.title ?? `Day ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300">
                      <MapIcon style={{ fontSize: 28 }} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Day {idx + 1}
                    {day.date && (
                      <span className="ml-2 font-normal normal-case">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </p>
                  <p className="font-semibold text-sm text-gray-900 truncate mt-0.5">
                    {day.title ?? "Untitled day"}
                  </p>
                  {(day.city || day.country) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[day.city, day.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {day.category_type && day.category_type.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {day.category_type.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="text-[10px] bg-blue-50 text-blue-600 rounded-full px-1.5 py-0.5 font-medium capitalize"
                        >
                          {c.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-1.5 px-3 py-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      day.visibility === "public"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {day.visibility === "public" ? "Public" : "Draft"}
                  </span>
                  <Link
                    href={`/day/${day.id}`}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    View <OpenInNewIcon style={{ fontSize: 12 }} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Collaborators tab ──────────────────────────────────────── */}
        {activeTab === "collaborators" && (
          <div className="flex flex-col gap-4">
            {/* Invite form (owner only) */}
            {isOwner && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <PersonAddIcon style={{ fontSize: 16 }} />
                  Invite collaborator
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    className="flex-1 text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-indigo-400"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "editor" | "viewer")
                    }
                    className="text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={handleInvite}
                    disabled={inviteLoading || !inviteEmail.trim()}
                    className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-4 py-1.5 rounded font-medium hover:bg-indigo-700 transition disabled:opacity-40"
                  >
                    {inviteLoading ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <AddIcon style={{ fontSize: 14 }} />
                    )}
                    Invite
                  </button>
                </div>
                {inviteError && (
                  <p className="text-xs text-red-500 mt-2">{inviteError}</p>
                )}
              </div>
            )}

            {/* Collaborator list */}
            <div className="flex flex-col gap-2">
              {collaborators.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4">
                  No collaborators yet.
                </p>
              ) : (
                collaborators.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3"
                  >
                    {/* Avatar placeholder */}
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                      {(c.full_name ?? c.email ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {c.full_name ?? c.email ?? c.user_id}
                      </p>
                      {c.email && c.full_name && (
                        <p className="text-xs text-gray-400 truncate">
                          {c.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          c.role === "owner"
                            ? "bg-purple-100 text-purple-700"
                            : c.role === "editor"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {c.role}
                      </span>
                      {!c.accepted && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                      {isOwner && c.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveCollaborator(c.id)}
                          className="text-gray-300 hover:text-red-500 transition"
                          title="Remove collaborator"
                        >
                          <DeleteIcon style={{ fontSize: 15 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Documents tab ──────────────────────────────────────────── */}
        {activeTab === "documents" && (
          <div className="flex flex-col gap-4">
            {/* Upload area */}
            <div
              className="bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 transition p-6 cursor-pointer text-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx"
                className="hidden"
                onChange={handleUpload}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <CircularProgress size={24} />
                  <p className="text-sm text-gray-500">Uploading…</p>
                </div>
              ) : (
                <>
                  <UploadFileIcon
                    style={{ fontSize: 32 }}
                    className="text-gray-300"
                  />
                  <p className="text-sm font-medium text-gray-600 mt-2">
                    Click to upload a document
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    PDF, Word, Excel, images up to 50 MB
                  </p>
                </>
              )}
            </div>
            {uploadError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">
                {uploadError}
              </p>
            )}

            {/* Document list */}
            {documents.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">
                No documents uploaded yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3"
                  >
                    <InsertDriveFileIcon
                      style={{ fontSize: 22 }}
                      className="text-indigo-300 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {doc.document_type} · {formatBytes(doc.file_size)} ·{" "}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={doc.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 transition"
                        title="Open document"
                      >
                        <LinkIcon style={{ fontSize: 16 }} />
                      </a>
                      {(doc.owner_id === currentUserId || isOwner) && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-gray-300 hover:text-red-500 transition"
                          title="Delete document"
                        >
                          <DeleteIcon style={{ fontSize: 16 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
