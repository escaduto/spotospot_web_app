"use client";

import { useState, useEffect, useRef, useCallback, JSX } from "react";
import { useParams, useRouter } from "next/navigation";
import Avatar from "@/src/components/avatar/Avatar";
import {
  defaultAvatarConfig,
  AvatarConfig,
} from "@/src/components/avatar/avatarTypes";
import { createClient } from "@/src/supabase/client";
import { useAuth } from "@/src/hooks/useAuth";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import TwitterIcon from "@mui/icons-material/Twitter";
import YouTubeIcon from "@mui/icons-material/YouTube";
import InstagramIcon from "@mui/icons-material/Instagram";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string;
  bio: string | null;
  avatar_config: Partial<AvatarConfig> | null;
  social_links: unknown;
  created_at: string;
  is_verified: boolean | null;
}

type FriendStatus =
  | { type: "none" }
  | { type: "friends" }
  | { type: "pending_sent"; requestId: string }
  | { type: "pending_received"; requestId: string }
  | { type: "blocked" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSocialLinks(raw: unknown): Record<string, string> {
  if (!raw) return {};
  // Handle double-encoded strings (stored as JSON string-of-string in JSONB)
  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw);
      if (typeof once === "string") {
        try {
          return JSON.parse(once) as Record<string, string>;
        } catch {
          return {};
        }
      }
      return once as Record<string, string>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, string>;
  return {};
}

// ─── Friend Action Bar ────────────────────────────────────────────────────────

function FriendActionBar({ targetId }: { targetId: string }) {
  const supabase = createClient();
  const [status, setStatus] = useState<FriendStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadStatus = useCallback(async () => {
    const [friendRes, reqRes, blockRes] = await Promise.all([
      supabase
        .from("friends")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .eq("friend_id", targetId)
        .maybeSingle(),
      supabase
        .from("friend_requests")
        .select("id, sender_id, receiver_id")
        .or(
          `and(sender_id.eq.${(await supabase.auth.getUser()).data.user?.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${(await supabase.auth.getUser()).data.user?.id})`,
        )
        .eq("status", "pending")
        .maybeSingle(),
      supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .eq("blocked_id", targetId)
        .maybeSingle(),
    ]);

    const uid = (await supabase.auth.getUser()).data.user?.id ?? "";

    if (blockRes.data) {
      setStatus({ type: "blocked" });
    } else if (friendRes.data) {
      setStatus({ type: "friends" });
    } else if (reqRes.data) {
      const req = reqRes.data as {
        id: string;
        sender_id: string;
        receiver_id: string;
      };
      if (req.sender_id === uid) {
        setStatus({ type: "pending_sent", requestId: req.id });
      } else {
        setStatus({ type: "pending_received", requestId: req.id });
      }
    } else {
      setStatus({ type: "none" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirm(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function doAction(action: string) {
    setLoading(true);
    setOpen(false);
    setConfirm(null);
    try {
      switch (action) {
        case "add":
          await supabase.rpc("send_friend_request", {
            p_receiver_id: targetId,
          });
          break;
        case "cancel":
          if (status?.type === "pending_sent")
            await supabase.rpc("decline_friend_request", {
              p_request_id: status.requestId,
            });
          break;
        case "accept":
          if (status?.type === "pending_received")
            await supabase.rpc("accept_friend_request", {
              p_request_id: status.requestId,
            });
          break;
        case "decline":
          if (status?.type === "pending_received")
            await supabase.rpc("decline_friend_request", {
              p_request_id: status.requestId,
            });
          break;
        case "remove":
          await supabase.rpc("remove_friend", { p_friend_id: targetId });
          break;
        case "block":
          await supabase.rpc("block_user", { p_blocked_id: targetId });
          break;
        case "unblock":
          await supabase.rpc("remove_block", { p_blocked_id: targetId });
          break;
      }
      await loadStatus();
    } finally {
      setLoading(false);
    }
  }

  if (!status) return null;

  const hasDropdown =
    status.type === "friends" ||
    status.type === "pending_sent" ||
    status.type === "pending_received";

  return (
    <div className="flex items-center gap-2" ref={menuRef}>
      {/* ── none: Add + Block ──────────────────────────────────────────────── */}
      {status.type === "none" && (
        <>
          <button
            onClick={() => doAction("add")}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition disabled:opacity-50 shadow"
          >
            <PersonAddRoundedIcon fontSize="small" />
            Add Friend
          </button>
          <button
            onClick={() => doAction("block")}
            disabled={loading}
            title="Block user"
            className="p-2 text-gray-300 hover:text-red-400 transition disabled:opacity-50"
          >
            <BlockRoundedIcon />
          </button>
        </>
      )}

      {/* ── blocked: Unblock ──────────────────────────────────────────────── */}
      {status.type === "blocked" && (
        <button
          onClick={() => doAction("unblock")}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
        >
          <BlockRoundedIcon fontSize="small" />
          Unblock
        </button>
      )}

      {/* ── dropdown statuses ─────────────────────────────────────────────── */}
      {hasDropdown && (
        <div className="relative">
          <button
            onClick={() => {
              setOpen((o) => !o);
              setConfirm(null);
            }}
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50 shadow ${
              status.type === "friends"
                ? "bg-teal-50 text-teal-600 hover:bg-teal-100"
                : status.type === "pending_sent"
                  ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            {status.type === "friends" && (
              <PeopleRoundedIcon fontSize="small" />
            )}
            {status.type === "pending_sent" && (
              <HourglassTopRoundedIcon fontSize="small" />
            )}
            {status.type === "pending_received" && (
              <PersonAddRoundedIcon fontSize="small" />
            )}
            {status.type === "friends"
              ? "Friends"
              : status.type === "pending_sent"
                ? "Request Sent"
                : "Respond"}
            <KeyboardArrowDownRoundedIcon
              fontSize="small"
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              {confirm ? (
                <div className="p-3">
                  <p className="text-xs text-gray-600 mb-3 leading-snug">
                    {confirm === "remove"
                      ? "Remove this person from your friends?"
                      : "Decline this friend request?"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => doAction(confirm)}
                      className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirm(null)}
                      className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {status.type === "friends" && (
                    <ActionItem
                      icon={<PeopleRoundedIcon fontSize="small" />}
                      label="Remove Friend"
                      danger
                      onClick={() => setConfirm("remove")}
                    />
                  )}
                  {status.type === "pending_sent" && (
                    <ActionItem
                      icon={<CloseRoundedIcon fontSize="small" />}
                      label="Cancel Request"
                      danger
                      onClick={() => doAction("cancel")}
                    />
                  )}
                  {status.type === "pending_received" && (
                    <>
                      <ActionItem
                        icon={<CheckRoundedIcon fontSize="small" />}
                        label="Accept Request"
                        onClick={() => doAction("accept")}
                      />
                      <ActionItem
                        icon={<CloseRoundedIcon fontSize="small" />}
                        label="Decline Request"
                        danger
                        onClick={() => setConfirm("decline")}
                      />
                    </>
                  )}
                  <div className="border-t border-gray-50" />
                  <ActionItem
                    icon={<BlockRoundedIcon fontSize="small" />}
                    label="Block User"
                    danger
                    onClick={() => doAction("block")}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition hover:bg-gray-50 ${
        danger ? "text-red-500" : "text-gray-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Social link icons ────────────────────────────────────────────────────────

const SOCIAL_URLS: Record<string, (h: string) => string> = {
  twitter: (h) => `https://twitter.com/${h}`,
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  website: (h) => (h.startsWith("http") ? h : `https://${h}`),
};

const SOCIAL_PLATFORM_ICONS: Record<string, JSX.Element> = {
  twitter: <TwitterIcon fontSize="small" />,
  instagram: <InstagramIcon fontSize="small" />,
  tiktok: <MusicNoteRoundedIcon fontSize="small" />,
  youtube: <YouTubeIcon fontSize="small" />,
  website: <LanguageRoundedIcon fontSize="small" />,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, bio, avatar_config, social_links, created_at, is_verified",
      )
      .eq("id", params.id)
      .maybeSingle()
      .then(({ data }: { data: ProfileData | null }) => {
        if (!data) setNotFound(true);
        else setProfile(data as ProfileData);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <span className="text-5xl">😶</span>
        <h1 className="text-xl font-bold text-gray-800">User not found</h1>
        <button
          onClick={() => router.back()}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="w-9 h-9 border-4 border-teal-400 border-t-transparent rounded-full animate-spin block" />
      </div>
    );
  }

  const socialLinks = parseSocialLinks(profile.social_links);
  const socialEntries = Object.entries(socialLinks).filter(([, v]) => v);
  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 transition p-1 -ml-1"
            aria-label="Go back"
          >
            <ArrowBackRoundedIcon />
          </button>
          <span className="text-base font-semibold text-gray-800 truncate">
            {profile.full_name || "Profile"}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="rounded-full overflow-hidden ring-4 ring-gray-100 shadow">
                <Avatar
                  config={profile.avatar_config ?? defaultAvatarConfig}
                  size={100}
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                    {profile.full_name || "User"}
                  </h1>
                </div>
                {/* Friend action (only when viewing other's profile and logged in) */}
                {!isOwnProfile && user && (
                  <FriendActionBar targetId={profile.id} />
                )}
                {isOwnProfile && (
                  <button
                    onClick={() => router.push("/settings")}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium px-3 py-1.5 rounded-full border border-teal-200 hover:bg-teal-50 transition"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                {profile.is_verified && (
                  <span className="inline-flex items-center gap-1 text-teal-600">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified
                  </span>
                )}
                <span>
                  Joined{" "}
                  {new Date(profile.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              About
            </h2>
            <p
              className="text-sm text-gray-700 leading-relaxed"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {profile.bio}
            </p>
          </div>
        )}

        {/* Social handles */}
        {socialEntries.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Socials
            </h2>
            <div className="flex flex-wrap gap-3">
              {socialEntries.map(([platform, handle]) => {
                const h = (handle as string).replace(/^@/, "");
                const url = SOCIAL_URLS[platform]?.(h);
                if (!url) return null;
                const Icon = SOCIAL_PLATFORM_ICONS[platform];
                const label =
                  platform.charAt(0).toUpperCase() + platform.slice(1);
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition"
                  >
                    {Icon}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
