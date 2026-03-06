"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Avatar from "@/src/components/avatar/Avatar";
import {
  defaultAvatarConfig,
  AvatarConfig,
} from "@/src/components/avatar/avatarTypes";
import { createClient } from "@/src/supabase/client";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CardUser {
  id: string;
  full_name: string | null;
  email: string;
  avatar_config: Partial<AvatarConfig> | null;
  created_at: string;
}

export type FriendStatus =
  | { type: "none" }
  | { type: "friends" }
  | { type: "pending_sent"; requestId: string }
  | { type: "pending_received"; requestId: string }
  | { type: "blocked" };

interface UserCardProps {
  user: CardUser;
  status: FriendStatus;
  /** Called after any mutating action so the parent can refetch data. */
  onAction: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function MenuItem({
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

// ─── UserCard ──────────────────────────────────────────────────────────────────

export default function UserCard({ user, status, onAction }: UserCardProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
          await supabase.rpc("send_friend_request", { p_receiver_id: user.id });
          break;
        case "cancel":
          if (status.type === "pending_sent") {
            await supabase.rpc("decline_friend_request", {
              p_request_id: status.requestId,
            });
          }
          break;
        case "accept":
          if (status.type === "pending_received") {
            await supabase.rpc("accept_friend_request", {
              p_request_id: status.requestId,
            });
          }
          break;
        case "decline":
          if (status.type === "pending_received") {
            await supabase.rpc("decline_friend_request", {
              p_request_id: status.requestId,
            });
          }
          break;
        case "remove":
          await supabase.rpc("remove_friend", { p_friend_id: user.id });
          break;
        case "block":
          await supabase.rpc("block_user", { p_blocked_id: user.id });
          break;
        case "unblock":
          await supabase.rpc("remove_block", { p_blocked_id: user.id });
          break;
      }
      onAction();
    } finally {
      setLoading(false);
    }
  }

  // ── Status icon / label ──────────────────────────────────────────────────────
  const statusMeta: Record<
    FriendStatus["type"],
    {
      icon: React.ReactNode;
      label: string;
      cls: string;
    }
  > = {
    none: {
      icon: <PersonAddRoundedIcon fontSize="small" />,
      label: "Add Friend",
      cls: "bg-teal-500 text-white hover:bg-teal-600",
    },
    friends: {
      icon: <PeopleRoundedIcon fontSize="small" />,
      label: "Friends",
      cls: "bg-teal-50 text-teal-600 hover:bg-teal-100",
    },
    pending_sent: {
      icon: <HourglassTopRoundedIcon fontSize="small" />,
      label: "Pending",
      cls: "bg-amber-50 text-amber-600 hover:bg-amber-100",
    },
    pending_received: {
      icon: <PersonAddRoundedIcon fontSize="small" />,
      label: "Respond",
      cls: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    },
    blocked: {
      icon: <BlockRoundedIcon fontSize="small" />,
      label: "Blocked",
      cls: "bg-red-50 text-red-500 hover:bg-red-100",
    },
  };

  const meta = statusMeta[status.type];
  const hasDropdown =
    status.type === "friends" ||
    status.type === "pending_sent" ||
    status.type === "pending_received";

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
      {/* Avatar + info */}
      <Link
        href={`/user/${user.id}`}
        className="flex items-center gap-3 flex-1 min-w-0 group"
      >
        <div className="rounded-full overflow-hidden shrink-0">
          <Avatar
            config={user.avatar_config ?? defaultAvatarConfig}
            size={42}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-teal-600 transition">
            {user.full_name || "User"}
          </p>
          <p className="text-xs text-gray-300 mt-0.5">
            Joined{" "}
            {new Date(user.created_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </Link>

      {/* Action area */}
      <div className="flex items-center gap-1 shrink-0" ref={menuRef}>
        {/* ── "none" status: Add + Block ─────────────────────────────────────── */}
        {status.type === "none" && (
          <>
            <button
              onClick={() => doAction("add")}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-500 text-white text-xs font-medium hover:bg-teal-600 transition disabled:opacity-50"
            >
              <PersonAddRoundedIcon sx={{ fontSize: 16 }} />
              Add
            </button>
            <button
              onClick={() => doAction("block")}
              disabled={loading}
              title="Block user"
              className="p-1.5 text-gray-300 hover:text-red-400 transition disabled:opacity-50"
            >
              <BlockRoundedIcon sx={{ fontSize: 18 }} />
            </button>
          </>
        )}

        {/* ── "blocked" status: Unblock ─────────────────────────────────────── */}
        {status.type === "blocked" && (
          <button
            onClick={() => doAction("unblock")}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition disabled:opacity-50"
          >
            <BlockRoundedIcon sx={{ fontSize: 16 }} />
            Unblock
          </button>
        )}

        {/* ── Dropdown statuses ─────────────────────────────────────────────── */}
        {hasDropdown && (
          <div className="relative">
            <button
              onClick={() => {
                setOpen((o) => !o);
                setConfirm(null);
              }}
              disabled={loading}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition disabled:opacity-50 ${meta.cls}`}
            >
              {meta.icon}
              {meta.label}
              <KeyboardArrowDownRoundedIcon
                sx={{ fontSize: 16 }}
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                {confirm ? (
                  /* Inline confirmation pane */
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
                      <MenuItem
                        icon={<PeopleRoundedIcon fontSize="small" />}
                        label="Remove Friend"
                        danger
                        onClick={() => setConfirm("remove")}
                      />
                    )}
                    {status.type === "pending_sent" && (
                      <MenuItem
                        icon={<CloseRoundedIcon fontSize="small" />}
                        label="Cancel Request"
                        danger
                        onClick={() => doAction("cancel")}
                      />
                    )}
                    {status.type === "pending_received" && (
                      <>
                        <MenuItem
                          icon={<CheckRoundedIcon fontSize="small" />}
                          label="Accept Request"
                          onClick={() => doAction("accept")}
                        />
                        <MenuItem
                          icon={<CloseRoundedIcon fontSize="small" />}
                          label="Decline Request"
                          danger
                          onClick={() => setConfirm("decline")}
                        />
                      </>
                    )}
                    <div className="border-t border-gray-50" />
                    <MenuItem
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
    </div>
  );
}
