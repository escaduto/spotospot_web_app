"use client";

import Avatar from "@/src/components/avatar/Avatar";
import {
  AvatarConfig,
  defaultAvatarConfig,
} from "@/src/components/avatar/avatarTypes";

export interface CollaboratorAvatarItem {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_config?: AvatarConfig | null;
  role?: string;
  /** true = accepted, false = pending, undefined = unknown */
  accepted?: boolean;
}

interface Props {
  collaborators: CollaboratorAvatarItem[];
  /** Max avatars to show before +N overflow (default 4) */
  max?: number;
  /** Avatar diameter in px (default 36) */
  size?: number;
  /** Dark or light border ring color (tailwind class, default border-gray-950) */
  ringClass?: string;
  /** Include a trailing label like "3 travellers" */
  showLabel?: boolean;
}

export default function CollaboratorAvatarGroup({
  collaborators,
  max = 4,
  size = 36,
  ringClass = "border-gray-950",
  showLabel = false,
}: Props) {
  const visible = collaborators.slice(0, max);
  const overflow = collaborators.length - visible.length;
  // Overlap: pull each subsequent avatar 10px to the left
  const overlap = Math.floor(size * 0.28);
  const checkSize = Math.max(10, Math.round(size * 0.32));

  return (
    <div className="flex items-center gap-2">
      {/* Stacked avatars */}
      <div
        className="flex items-center"
        style={{ paddingRight: overlap * (visible.length - 1) }}
      >
        {visible.map((c, i) => {
          const label = c.full_name ?? c.email ?? "?";
          const isOwner = c.role === "admin";
          const isPending = c.accepted === false;
          const borderClass = isOwner ? "border-yellow-400" : ringClass;
          return (
            <div
              key={c.id + i}
              title={`${label}${c.role ? ` · ${c.role === "admin" ? "owner" : c.role}` : ""}${isPending ? " (pending)" : ""}`}
              style={{
                marginRight: i < visible.length - 1 ? -overlap : 0,
                zIndex: visible.length - i,
                position: "relative",
                opacity: isPending ? 0.45 : 1,
              }}
              className={`rounded-full border-2 ${borderClass} overflow-visible shrink-0 shadow-md`}
            >
              <div
                className="rounded-full overflow-hidden"
                style={{ width: size, height: size }}
              >
                <Avatar
                  config={c.avatar_config ?? defaultAvatarConfig}
                  size={size}
                />
              </div>
              {c.accepted === true && (
                <span
                  title="Accepted"
                  style={{
                    position: "absolute",
                    bottom: -1,
                    right: -1,
                    width: checkSize,
                    height: checkSize,
                    borderRadius: "50%",
                    background: "#10b981",
                    border: "1.5px solid white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                  }}
                >
                  <svg
                    viewBox="0 0 10 10"
                    style={{ width: checkSize * 0.6, height: checkSize * 0.6 }}
                    fill="none"
                  >
                    <polyline
                      points="1.5,5.5 4,8 8.5,2"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </div>
          );
        })}

        {overflow > 0 && (
          <div
            title={`${overflow} more traveller${overflow !== 1 ? "s" : ""}`}
            style={{
              width: size,
              height: size,
              marginLeft: -overlap,
              zIndex: 0,
              position: "relative",
              fontSize: size * 0.3,
            }}
            className={`rounded-full border-2 ${ringClass} bg-gray-700 flex items-center justify-center font-bold text-white shadow-md shrink-0`}
          >
            +{overflow}
          </div>
        )}
      </div>

      {showLabel && collaborators.length > 0 && (
        <span className="text-xs text-white/50">
          {collaborators.length} traveller
          {collaborators.length !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
