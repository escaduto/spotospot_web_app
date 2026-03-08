"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/src/supabase/client";
import Avatar from "@/src/components/avatar/Avatar";
import {
  defaultAvatarConfig,
  AvatarConfig,
} from "@/src/components/avatar/avatarTypes";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserResult {
  id: string;
  full_name: string | null;
  email: string;
  avatar_config: AvatarConfig | null;
  isFriend?: boolean;
}

interface ExistingMember {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_config?: AvatarConfig | null;
  role: string;
  accepted: boolean;
}

interface Props {
  tripId: string;
  currentUserId: string;
  /** IDs already on the trip (used to mark them as invited in results) */
  excludeIds?: string[];
  /** Full collaborator details to render the current-members list */
  existingMembers?: ExistingMember[];
  onInvited: () => void;
}

function isEmailLike(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripInviteSearch({
  tripId,
  currentUserId,
  excludeIds = [],
  existingMembers = [],
  onInvited,
}: Props) {
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null); // id or "email"
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);

      // 1. Fetch friends matching query (friends show first)
      const [friendsRes, usersRes] = await Promise.all([
        supabase
          .from("friends")
          .select(
            "friend_id, profiles!friends_friend_id_fkey(id, full_name, email, avatar_config)",
          )
          .eq("user_id", currentUserId),
        supabase
          .from("profiles")
          .select("id, full_name, email, avatar_config")
          .or(`email.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`)
          .neq("id", currentUserId)
          .limit(12),
      ]);

      type RawFriend = {
        friend_id: string;
        profiles: {
          id: string;
          full_name: string | null;
          email: string;
          avatar_config: AvatarConfig | null;
        };
      };

      const friendIds = new Set<string>();
      const friendProfiles: UserResult[] = [];
      (friendsRes.data ?? []).forEach((f: unknown) => {
        const row = f as unknown as RawFriend;
        if (!row.profiles) return;
        const p = row.profiles;
        // filter by query
        const matchesQ =
          p.email.toLowerCase().includes(trimmed.toLowerCase()) ||
          (p.full_name ?? "").toLowerCase().includes(trimmed.toLowerCase());
        if (matchesQ) {
          friendIds.add(p.id);
          friendProfiles.push({ ...p, isFriend: true });
        }
      });

      const otherProfiles: UserResult[] = (
        (usersRes.data ?? []) as UserResult[]
      ).filter((u) => !friendIds.has(u.id));

      // Also filter friends who are the current user (shouldn't appear)
      const filteredFriends = friendProfiles.filter(
        (f) => f.id !== currentUserId,
      );

      setResults([...filteredFriends, ...otherProfiles]);
      setSearching(false);
    },
    [supabase, currentUserId],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, runSearch]);

  // ── Invite actions ─────────────────────────────────────────────────────────

  const sendInvite = async (opts: { userId?: string; email?: string }) => {
    const key = opts.userId ?? "email";
    setInviting(key);
    setInviteError(null);
    try {
      if (opts.email && !opts.userId) {
        // Email-only invite: net.http_post inside send_trip_invitation RPC may
        // not be available. Insert the pending collaborator row directly instead.
        const inviteToken = crypto.randomUUID();
        const { error } = await supabase.from("trip_collaborators").insert({
          trip_id: tripId,
          user_id: null,
          email: opts.email.trim().toLowerCase(),
          role,
          invited_by: currentUserId,
          accepted: false,
          declined: false,
          invite_token: inviteToken,
        });
        if (error) throw error;
      } else {
        // User-id invite via RPC (handles linking to existing profile)
        const { error } = await supabase.rpc("send_trip_invitation", {
          p_trip_id: tripId,
          p_role: role,
          p_invited_by: currentUserId,
          ...(opts.userId ? { p_user_id: opts.userId } : {}),
        });
        if (error) throw error;
      }
      setInviteSuccess(opts.userId ?? opts.email ?? "done");
      setQuery("");
      setResults([]);
      setOpen(false);
      onInvited();
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(null);
    }
  };

  const showEmailFallback =
    open &&
    query.trim().length >= 2 &&
    !searching &&
    results.length === 0 &&
    isEmailLike(query);

  const showDropdown =
    open && (searching || results.length > 0 || showEmailFallback);

  return (
    <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
      {/* Header */}
      <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <PeopleIcon style={{ fontSize: 16 }} className="text-teal-400" />
        Invite someone
      </p>

      {/* ── Existing members list ── */}
      {existingMembers.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
            On this trip
          </p>
          <div className="flex flex-col gap-1">
            {existingMembers.map((m, i) => (
              <div
                key={m.id + i}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-gray-800/60"
              >
                <div className="rounded-full overflow-hidden shrink-0">
                  <Avatar
                    config={m.avatar_config ?? defaultAvatarConfig}
                    size={28}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate leading-tight">
                    {m.full_name ?? m.email ?? "Unknown"}
                  </p>
                  {m.full_name && m.email && (
                    <p className="text-[11px] text-gray-500 truncate">
                      {m.email}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                      m.role === "owner" || m.role === "admin"
                        ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        : m.role === "editor"
                          ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                          : "bg-gray-700 text-gray-400 border-gray-600"
                    }`}
                  >
                    {m.role === "admin" ? "owner" : m.role}
                  </span>
                  {!m.accepted && (
                    <span className="text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        {/* Search input */}
        <div ref={containerRef} className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            {searching ? (
              <CircularProgress size={12} style={{ color: "#6b7280" }} />
            ) : (
              <SearchIcon style={{ fontSize: 16 }} />
            )}
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setInviteError(null);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search by name or email…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 rounded-xl focus:outline-none focus:border-teal-500 transition"
          />

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto">
              {/* Friends section label */}
              {results.some((r) => r.isFriend) && (
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                    <PeopleIcon style={{ fontSize: 11 }} />
                    Friends
                  </span>
                </div>
              )}

              {/* Friends */}
              {results
                .filter((r) => r.isFriend)
                .map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isFriend
                    inviting={inviting === u.id}
                    invited={inviteSuccess === u.id}
                    alreadyOnTrip={excludeIds.includes(u.id)}
                    onInvite={() => sendInvite({ userId: u.id })}
                  />
                ))}

              {/* Other users section label */}
              {results.some((r) => !r.isFriend) && (
                <div className="px-3 pt-2 pb-1 border-t border-gray-700/60">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <PersonIcon style={{ fontSize: 11 }} />
                    Users
                  </span>
                </div>
              )}

              {/* Other users */}
              {results
                .filter((r) => !r.isFriend)
                .map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isFriend={false}
                    inviting={inviting === u.id}
                    invited={inviteSuccess === u.id}
                    alreadyOnTrip={excludeIds.includes(u.id)}
                    onInvite={() => sendInvite({ userId: u.id })}
                  />
                ))}

              {/* Email fallback */}
              {showEmailFallback && (
                <button
                  onClick={() => sendInvite({ email: query })}
                  disabled={!!inviting}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-700/50 transition text-left disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-800 flex items-center justify-center shrink-0">
                    <EmailIcon
                      style={{ fontSize: 16 }}
                      className="text-indigo-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {query.trim()}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Send invitation email
                    </p>
                  </div>
                  <span className="text-xs text-indigo-400 font-semibold shrink-0 flex items-center gap-1">
                    {inviting === "email" ? (
                      <CircularProgress size={12} color="inherit" />
                    ) : (
                      <>
                        <EmailIcon style={{ fontSize: 13 }} />
                        Invite
                      </>
                    )}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Role selector */}
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
          className="text-sm bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 shrink-0"
        >
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      {/* Status messages */}
      {inviteError && (
        <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
          <CloseIcon style={{ fontSize: 13 }} />
          {inviteError}
        </p>
      )}
      {inviteSuccess && (
        <p className="text-xs text-teal-400 mt-1.5 flex items-center gap-1">
          <CheckIcon style={{ fontSize: 13 }} />
          Invitation sent!
        </p>
      )}
      {query.trim().length >= 2 &&
        !searching &&
        results.length === 0 &&
        !showEmailFallback && (
          <p className="text-xs text-gray-500 mt-1.5">
            No users found.{" "}
            {isEmailLike(query)
              ? ""
              : "Try an exact email address to send a direct invite."}
          </p>
        )}
    </div>
  );
}

// ── UserRow sub-component ─────────────────────────────────────────────────────

function UserRow({
  user,
  isFriend,
  inviting,
  invited,
  alreadyOnTrip,
  onInvite,
}: {
  user: UserResult;
  isFriend: boolean;
  inviting: boolean;
  invited: boolean;
  alreadyOnTrip: boolean;
  onInvite: () => void;
}) {
  const isDisabled = inviting || invited || alreadyOnTrip;
  return (
    <button
      onClick={alreadyOnTrip ? undefined : onInvite}
      disabled={isDisabled}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700/50 transition text-left group disabled:opacity-60 disabled:cursor-default"
    >
      {/* Avatar */}
      <div className="rounded-full overflow-hidden shrink-0">
        <Avatar config={user.avatar_config ?? defaultAvatarConfig} size={32} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate leading-tight">
          {user.full_name ?? user.email}
        </p>
        {user.full_name && (
          <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
        )}
      </div>

      {/* Badge + action */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isFriend && (
          <span className="text-[9px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30 px-1.5 py-0.5 rounded-full">
            Friend
          </span>
        )}
        <span
          className={`text-xs font-semibold flex items-center gap-0.5 ${
            alreadyOnTrip
              ? "text-indigo-400"
              : invited
                ? "text-teal-400"
                : "text-gray-500 group-hover:text-white"
          } transition`}
        >
          {inviting ? (
            <CircularProgress size={12} style={{ color: "currentColor" }} />
          ) : alreadyOnTrip ? (
            <>
              <CheckIcon style={{ fontSize: 13 }} />
              On trip
            </>
          ) : invited ? (
            <>
              <CheckIcon style={{ fontSize: 13 }} />
              Sent
            </>
          ) : (
            <>
              <AddIcon style={{ fontSize: 13 }} />
              Invite
            </>
          )}
        </span>
      </div>
    </button>
  );
}
