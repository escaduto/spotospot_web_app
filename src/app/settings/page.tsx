"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useRouter } from "next/navigation";
import Avatar from "@/src/components/avatar/Avatar";
import AvatarPicker from "@/src/components/avatar/AvatarPicker";
import {
  AvatarConfig,
  defaultAvatarConfig,
} from "@/src/components/avatar/avatarTypes";
import { createClient } from "@/src/supabase/client";
import UserCard, {
  FriendStatus,
  CardUser,
} from "@/src/components/user/UserCard";

// ─── Module helpers ───────────────────────────────────────────────────────────

function parseSocialLinks(raw: unknown): Record<string, string> {
  if (!raw) return {};
  // Handle double-encoded strings (stored as JSON string-of-string in JSONB)
  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw);
      // If still a string, parse once more
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Section =
  | "profile"
  | "edit-profile"
  | "friends"
  | "account"
  | "preferences"
  | "resources";

// ─── Sidebar nav items ────────────────────────────────────────────────────────

const NAV_ITEMS: { section: Section; label: string; icon: string }[] = [
  { section: "profile", label: "View Profile", icon: "👤" },
  { section: "edit-profile", label: "Edit Profile", icon: "✏️" },
  { section: "friends", label: "Manage Friends", icon: "🤝" },
  { section: "account", label: "Account Settings", icon: "🔐" },
  { section: "preferences", label: "Preferences", icon: "⚙️" },
  { section: "resources", label: "Resources", icon: "📚" },
];

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full px-3 py-2.5 rounded-xl border text-sm transition ${
        readOnly
          ? "bg-gray-50 border-gray-100 text-gray-500 cursor-default"
          : "bg-white border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400"
      }`}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition"
    />
  );
}

function Snackbar({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-2xl shadow-xl">
        <span className="text-teal-400">✓</span>
        {message}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? "bg-teal-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Section Components ───────────────────────────────────────────────────────

function ViewProfileSection() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const [showPicker, setShowPicker] = useState(false);
  const avatarConfig: Partial<AvatarConfig> =
    profile?.avatar_config ?? defaultAvatarConfig;

  async function saveAvatar(cfg: AvatarConfig) {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_config: cfg, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) throw error;
    await refreshProfile();
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Profile">
        <div className="flex items-start gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full overflow-hidden ring-4 ring-gray-100 shadow">
              <Avatar config={avatarConfig} size={88} />
            </div>
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium transition"
            >
              Edit Avatar
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {profile?.full_name || "No name set"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
            {profile?.bio && (
              <p
                className="text-sm text-gray-600 mt-2 leading-relaxed"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {profile.bio}
              </p>
            )}
            {(() => {
              const links = parseSocialLinks(profile?.social_links);
              const entries = Object.entries(links).filter(([, v]) => v);
              return entries.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {entries.map(([platform, handle]) => {
                    const h = (handle as string).replace(/^@/, "");
                    const display = platform === "website" ? h : `@${h}`;
                    return (
                      <span
                        key={platform}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                      >
                        <span className="capitalize">{platform}:</span>
                        <span className="text-teal-600">{display}</span>
                      </span>
                    );
                  })}
                </div>
              ) : null;
            })()}
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
              {profile?.is_verified && (
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
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {showPicker && (
        <AvatarPicker
          initialConfig={avatarConfig}
          onSave={saveAvatar}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function EditProfileSection() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const [showPicker, setShowPicker] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [social, setSocial] = useState<Record<string, string>>(() => ({
    twitter: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    website: "",
    ...parseSocialLinks(profile?.social_links),
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const avatarConfig: Partial<AvatarConfig> =
    profile?.avatar_config ?? defaultAvatarConfig;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase.rpc("update_profile", {
        p_full_name: name,
        p_bio: bio,
        p_social_links: social,
      });
      if (error) throw error;
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function saveAvatar(cfg: AvatarConfig) {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_config: cfg, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) throw error;
    await refreshProfile();
  }

  function setSocialField(key: string, val: string) {
    setSocial((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className="space-y-5">
      {saved && (
        <Snackbar message="Profile saved!" onDone={() => setSaved(false)} />
      )}

      {/* Section header row with save button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Edit Profile</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-full bg-linear-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold shadow hover:brightness-110 transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Avatar */}
      <SectionCard title="Avatar">
        <div className="flex items-center gap-5">
          <div className="rounded-full overflow-hidden ring-4 ring-gray-100 shadow">
            <Avatar config={avatarConfig} size={80} />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Design a unique avatar using our avatar builder.
            </p>
            <button
              onClick={() => setShowPicker(true)}
              className="px-4 py-2 rounded-full bg-linear-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold shadow hover:brightness-110 transition"
            >
              🎨 Open Avatar Builder
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Basic info */}
      <SectionCard title="Basic Info">
        <FieldRow label="Display Name">
          <Input value={name} onChange={setName} placeholder="Your name" />
        </FieldRow>
        <FieldRow label="Bio">
          <Textarea
            value={bio}
            onChange={setBio}
            placeholder="Tell the world a little about yourself…"
            rows={3}
          />
          <p className="text-xs text-gray-400 mt-1">
            {bio.length}/200 characters
          </p>
        </FieldRow>
      </SectionCard>

      {/* Social handles */}
      <SectionCard title="Social Handles">
        <p className="text-xs text-gray-400 mb-4">
          Add your username (without @)
        </p>
        {(
          ["twitter", "instagram", "tiktok", "youtube", "website"] as const
        ).map((platform) => (
          <FieldRow
            key={platform}
            label={platform.charAt(0).toUpperCase() + platform.slice(1)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5 shrink-0">
                {platform === "website" ? "🔗" : "@"}
              </span>
              <input
                value={social[platform] ?? ""}
                onChange={(e) => setSocialField(platform, e.target.value)}
                placeholder={
                  platform === "website"
                    ? "https://yoursite.com"
                    : `${platform} username`
                }
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition"
              />
            </div>
          </FieldRow>
        ))}
      </SectionCard>

      {showPicker && (
        <AvatarPicker
          initialConfig={avatarConfig}
          onSave={saveAvatar}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function FriendsSection() {
  const { user } = useAuth();
  const supabase = createClient();

  const [friends, setFriends] = useState<CardUser[]>([]);
  const [incoming, setIncoming] = useState<
    { id: string; otherId: string; profile: CardUser }[]
  >([]);
  const [sent, setSent] = useState<
    { id: string; otherId: string; profile: CardUser }[]
  >([]);
  const [blocked, setBlocked] = useState<CardUser[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardUser[]>([]);
  const [searching, setSearching] = useState(false);

  // ── Load all social data ──────────────────────────────────────────────────
  const refetch = useCallback(async () => {
    if (!user) return;
    const [friendsRes, incomingRes, sentRes, blockedRes] = await Promise.all([
      supabase
        .from("friends")
        .select(
          "friend_id, profiles!friends_friend_id_fkey(id, full_name, email, avatar_config, created_at)",
        )
        .eq("user_id", user.id),
      supabase
        .from("friend_requests")
        .select(
          "id, sender_id, profiles!friend_requests_sender_id_fkey(id, full_name, email, avatar_config, created_at)",
        )
        .eq("receiver_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("friend_requests")
        .select(
          "id, receiver_id, profiles!friend_requests_receiver_id_fkey(id, full_name, email, avatar_config, created_at)",
        )
        .eq("sender_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("blocks")
        .select(
          "blocked_id, profiles!blocks_blocked_id_fkey(id, full_name, email, avatar_config, created_at)",
        )
        .eq("blocker_id", user.id),
    ]);
    type PR = CardUser;
    if (friendsRes.data)
      setFriends(
        (friendsRes.data as { profiles: PR }[]).map((d) => d.profiles),
      );
    if (incomingRes.data)
      setIncoming(
        (
          incomingRes.data as {
            id: string;
            sender_id: string;
            profiles: PR;
          }[]
        ).map((d) => ({ id: d.id, otherId: d.sender_id, profile: d.profiles })),
      );
    if (sentRes.data)
      setSent(
        (
          sentRes.data as {
            id: string;
            receiver_id: string;
            profiles: PR;
          }[]
        ).map((d) => ({
          id: d.id,
          otherId: d.receiver_id,
          profile: d.profiles,
        })),
      );
    if (blockedRes.data)
      setBlocked(
        (blockedRes.data as { blocked_id: string; profiles: PR }[]).map(
          (d) => d.profiles,
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // ── Status lookup ──────────────────────────────────────────────────────────
  function getStatus(targetId: string): FriendStatus {
    if (blocked.some((b) => b.id === targetId)) return { type: "blocked" };
    if (friends.some((f) => f.id === targetId)) return { type: "friends" };
    const inReq = incoming.find((r) => r.otherId === targetId);
    if (inReq) return { type: "pending_received", requestId: inReq.id };
    const sentReq = sent.find((r) => r.otherId === targetId);
    if (sentReq) return { type: "pending_sent", requestId: sentReq.id };
    return { type: "none" };
  }

  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_config, created_at")
        .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
        .neq("id", user?.id ?? "")
        .limit(8);
      setResults((data as CardUser[]) ?? []);
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-5">
      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <SectionCard title="Find Friends">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full px-3 py-2.5 pr-9 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin block" />
            </span>
          )}
        </div>
        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                status={getStatus(u.id)}
                onAction={refetch}
              />
            ))}
          </div>
        )}
        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="mt-2 text-xs text-gray-400 text-center py-2">
            No users found.
          </p>
        )}
      </SectionCard>

      {/* ── Incoming requests (hidden if empty) ─────────────────────────────── */}
      {incoming.length > 0 && (
        <SectionCard title={`Friend Requests (${incoming.length})`}>
          <div className="space-y-2">
            {incoming.map((r) => (
              <UserCard
                key={r.id}
                user={r.profile}
                status={{ type: "pending_received", requestId: r.id }}
                onAction={refetch}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Friends list ─────────────────────────────────────────────────────── */}
      <SectionCard title={`Friends (${friends.length})`}>
        {friends.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No friends yet. Search for someone above!
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <UserCard
                key={f.id}
                user={f}
                status={{ type: "friends" }}
                onAction={refetch}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Sent requests (hidden if empty) ──────────────────────────────────── */}
      {sent.length > 0 && (
        <SectionCard title={`Sent Requests (${sent.length})`}>
          <div className="space-y-2">
            {sent.map((r) => (
              <UserCard
                key={r.id}
                user={r.profile}
                status={{ type: "pending_sent", requestId: r.id }}
                onAction={refetch}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Blocked (hidden if empty) ─────────────────────────────────────────── */}
      {blocked.length > 0 && (
        <SectionCard title={`Blocked (${blocked.length})`}>
          <div className="space-y-2">
            {blocked.map((b) => (
              <UserCard
                key={b.id}
                user={b}
                status={{ type: "blocked" }}
                onAction={refetch}
              />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function AccountSection() {
  const { user } = useAuth();
  const supabase = createClient();
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function sendPasswordReset() {
    if (!user?.email) return;
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    setResetLoading(false);
    setResetSent(true);
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Account Info">
        <FieldRow label="User ID">
          <div className="relative">
            <Input value={user?.id ?? ""} readOnly />
            <button
              onClick={() => navigator.clipboard.writeText(user?.id ?? "")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 transition px-2 py-1 rounded"
              title="Copy"
            >
              📋
            </button>
          </div>
        </FieldRow>
        <FieldRow label="Email Address">
          <Input value={user?.email ?? ""} readOnly />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Password">
        <p className="text-sm text-gray-500 mb-4">
          We&apos;ll send a password reset link to{" "}
          <strong>{user?.email}</strong>.
        </p>
        {resetSent ? (
          <p className="text-sm text-teal-600 font-medium">
            ✓ Reset email sent! Check your inbox.
          </p>
        ) : (
          <button
            onClick={sendPasswordReset}
            disabled={resetLoading}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
          >
            {resetLoading ? "Sending…" : "Send Password Reset Email"}
          </button>
        )}
      </SectionCard>

      <SectionCard title="Danger Zone">
        <p className="text-xs text-gray-400 mb-3">
          These actions are irreversible.
        </p>
        <button className="px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition">
          Delete Account
        </button>
      </SectionCard>
    </div>
  );
}

function PreferencesSection() {
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    pushNotifications: false,
    friendActivity: true,
    newFeatures: true,
    locationAccess: false,
    publicProfile: true,
  });

  function toggle(key: keyof typeof prefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Notifications">
        <ToggleRow
          label="Email Notifications"
          description="Trip updates, friend activity"
          checked={prefs.emailNotifications}
          onChange={() => toggle("emailNotifications")}
        />
        <ToggleRow
          label="Push Notifications"
          description="Mobile & browser alerts"
          checked={prefs.pushNotifications}
          onChange={() => toggle("pushNotifications")}
        />
        <ToggleRow
          label="Friend Activity"
          description="When friends share trips"
          checked={prefs.friendActivity}
          onChange={() => toggle("friendActivity")}
        />
        <ToggleRow
          label="New Features"
          description="Product updates & announcements"
          checked={prefs.newFeatures}
          onChange={() => toggle("newFeatures")}
        />
      </SectionCard>

      <SectionCard title="Permissions">
        <ToggleRow
          label="Location Access"
          description="Used for nearby spot suggestions"
          checked={prefs.locationAccess}
          onChange={() => toggle("locationAccess")}
        />
        <ToggleRow
          label="Public Profile"
          description="Other users can find you"
          checked={prefs.publicProfile}
          onChange={() => toggle("publicProfile")}
        />
      </SectionCard>

      <SectionCard title="Appearance">
        <p className="text-sm text-gray-500 text-center py-6">
          🌗 Dark mode & theme options — coming soon!
        </p>
      </SectionCard>
    </div>
  );
}

function ResourcesSection() {
  const links = [
    {
      icon: "❓",
      label: "FAQ",
      desc: "Answers to common questions",
      href: "#",
    },
    {
      icon: "📱",
      label: "Mobile App",
      desc: "Get SpotoSpot on iOS & Android",
      href: "#",
    },
    {
      icon: "🐛",
      label: "Report a Bug",
      desc: "Something not working? Let us know",
      href: "mailto:bugs@spotospot.com",
    },
    {
      icon: "💬",
      label: "Feedback",
      desc: "Share an idea or suggestion",
      href: "mailto:hello@spotospot.com",
    },
    {
      icon: "📋",
      label: "Terms of Use",
      desc: "Our terms and conditions",
      href: "#",
    },
    {
      icon: "🔒",
      label: "Privacy Policy",
      desc: "How we handle your data",
      href: "#",
    },
  ];

  return (
    <div className="space-y-5">
      <SectionCard title="Resources & Support">
        <div className="space-y-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
            >
              <span className="text-xl w-8 flex justify-center">{l.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{l.label}</p>
                <p className="text-xs text-gray-400">{l.desc}</p>
              </div>
              <svg
                className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const avatarConfig: Partial<AvatarConfig> =
    profile?.avatar_config ?? defaultAvatarConfig;

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  function navTo(section: Section) {
    setActiveSection(section);
    setMobileOpen(false);
  }

  const ActiveSection = {
    profile: <ViewProfileSection />,
    "edit-profile": <EditProfileSection />,
    friends: <FriendsSection />,
    account: <AccountSection />,
    preferences: <PreferencesSection />,
    resources: <ResourcesSection />,
  }[activeSection];

  const activeLabel =
    NAV_ITEMS.find((n) => n.section === activeSection)?.label ?? "";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 transition p-1"
            aria-label="Go back"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-800">
            Settings
          </span>
          {/* Mobile: show current section */}
          <span className="ml-1 text-sm text-gray-400 md:hidden">
            — {activeLabel}
          </span>
          {/* Mobile: hamburger for nav */}
          <button
            className="ml-auto md:hidden text-gray-500"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex max-w-5xl mx-auto w-full px-4 py-6 gap-6">
        {/* Sidebar */}
        <aside
          className={`
          ${mobileOpen ? "block" : "hidden"} md:block
          absolute md:static top-14 left-0 right-0 z-30 md:z-auto
          bg-white md:bg-transparent px-4 py-3 md:p-0 shadow-lg md:shadow-none border-b md:border-0 border-gray-100
          md:w-56 shrink-0
        `}
        >
          {/* User mini-card */}
          <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
            <div className="rounded-full overflow-hidden">
              <Avatar config={avatarConfig} size={40} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {NAV_ITEMS.map((item, idx) => (
              <button
                key={item.section}
                onClick={() => navTo(item.section)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition ${
                  idx > 0 ? "border-t border-gray-50" : ""
                } ${
                  activeSection === item.section
                    ? "bg-teal-50 text-teal-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm border-t border-gray-50 text-red-500 hover:bg-red-50 transition"
            >
              <span className="text-base">🚪</span>
              Sign Out
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{ActiveSection}</main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-5 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="text-base">📍</span>
            <span className="font-semibold text-gray-600">SpotoSpot</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="hover:text-gray-600 transition">
              Terms of Use
            </a>
            <a href="#" className="hover:text-gray-600 transition">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-gray-600 transition">
              Cookie Policy
            </a>
            <a href="#" className="hover:text-gray-600 transition">
              Help
            </a>
          </div>
          <span className="text-gray-300">v0.1.0-beta</span>
        </div>
      </footer>
    </div>
  );
}
