"use client";

import { Trip, ItineraryDay } from "@/src/supabase/types";
import Image from "next/image";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import MapIcon from "@mui/icons-material/Map";
import CollaboratorAvatarGroup from "@/src/components/trip/CollaboratorAvatarGroup";
import type { AvatarConfig } from "@/src/components/avatar/avatarTypes";

export type TripDayPlanSummary = Pick<
  ItineraryDay,
  "id" | "title" | "date" | "city"
>;

export interface TripCollaboratorSummary {
  user_id: string;
  role: string;
  full_name?: string | null;
  avatar_url?: string | null;
  avatar_config?: AvatarConfig | null;
}

export type TripWithDayPlans = Trip & {
  day_plans?: TripDayPlanSummary[];
  /** Role of the current user on this trip (admin = owner) */
  collaborator_role?: string;
  /** All members on this trip */
  collaborators?: TripCollaboratorSummary[];
};

const STATUS_STYLES: Record<string, { label: string; dot: string }> = {
  active: { label: "Active", dot: "#10b981" },
  planning: { label: "Planning", dot: "#3b82f6" },
  completed: { label: "Completed", dot: "#9ca3af" },
  cancelled: { label: "Cancelled", dot: "#f59e0b" },
};

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last && days.length <= 13) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TripCard({ trip }: { trip: TripWithDayPlans }) {
  const statusInfo = STATUS_STYLES[trip.status] ?? {
    label: trip.status,
    dot: "#9ca3af",
  };
  const dayPlanDates = new Set(
    (trip.day_plans ?? []).map((dp) => dp.date).filter(Boolean),
  );
  const calDays =
    trip.start_date && trip.end_date
      ? getDaysInRange(trip.start_date, trip.end_date)
      : [];
  const totalDays =
    trip.start_date && trip.end_date
      ? Math.round(
          (new Date(trip.end_date).getTime() -
            new Date(trip.start_date).getTime()) /
            86400000,
        ) + 1
      : 0;

  return (
    <a
      href={`/trip/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all"
    >
      {/* Cover image */}
      <div className="relative h-36 shrink-0 bg-linear-to-br from-teal-50 to-cyan-50">
        {trip.image_url ? (
          <Image
            src={trip.image_url}
            placeholder={trip.image_blurhash ? "blur" : undefined}
            blurDataURL={
              trip.image_blurhash
                ? `data:image/jpeg;base64,${trip.image_blurhash}`
                : undefined
            }
            alt={trip.title || "Trip cover"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl opacity-30">
            🗺️
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
          <h3 className="font-semibold text-white drop-shadow line-clamp-1 group-hover:text-teal-200 transition min-w-0">
            {trip.title}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {trip.collaborator_role && (
              <span
                title={
                  trip.collaborator_role === "admin"
                    ? "Owner"
                    : trip.collaborator_role === "editor"
                      ? "Editor"
                      : "Viewer"
                }
                style={{
                  background:
                    trip.collaborator_role === "admin"
                      ? "rgba(139,92,246,0.9)"
                      : trip.collaborator_role === "editor"
                        ? "rgba(13,148,136,0.9)"
                        : "rgba(99,102,241,0.9)",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  display: "inline-block",
                  boxShadow: "0 0 0 1.5px rgba(255,255,255,0.4)",
                }}
              />
            )}
            <span
              title={statusInfo.label}
              style={{
                background: statusInfo.dot,
                width: 8,
                height: 8,
                borderRadius: "50%",
                display: "inline-block",
                boxShadow: "0 0 0 1.5px rgba(255,255,255,0.4)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {/* Destination */}
        {trip.destination && (
          <p className="flex items-center gap-1 text-xs text-gray-500 -mb-1">
            <MapIcon sx={{ fontSize: 13 }} />
            {trip.destination}
          </p>
        )}

        {/* Date range */}
        {trip.start_date && trip.end_date ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <CalendarTodayIcon sx={{ fontSize: 13, color: "#0d9488" }} />
            <span className="font-medium">
              {formatShortDate(trip.start_date)} –{" "}
              {formatShortDate(trip.end_date)}
            </span>
            {totalDays > 0 && (
              <span className="text-gray-400">·&nbsp;{totalDays}d</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No dates set</p>
        )}

        {/* Mini calendar bar */}
        {calDays.length > 0 && (
          <div className="flex gap-0.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {calDays.map((d) => {
              const hasPlan = dayPlanDates.has(d);
              const day = new Date(d + "T00:00:00").getDate();
              return (
                <div
                  key={d}
                  title={hasPlan ? `Day plan: ${d}` : d}
                  className={`flex flex-col items-center justify-center min-w-7 h-9 rounded-md text-[10px] font-semibold select-none transition-colors ${
                    hasPlan
                      ? "bg-teal-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <span>{day}</span>
                  {hasPlan && (
                    <span className="text-[6px] leading-none">●</span>
                  )}
                </div>
              );
            })}
            {totalDays > 14 && (
              <div className="flex items-center px-1.5 text-[10px] text-gray-400">
                +{totalDays - 14}
              </div>
            )}
          </div>
        )}

        {/* Day plans count + collaborator avatars */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 border-t border-gray-50">
          <span className="text-xs text-gray-500">
            {(trip.day_plans ?? []).length} day plan
            {(trip.day_plans ?? []).length !== 1 ? "s" : ""}
          </span>
          {(trip.collaborators ?? []).length > 0 && (
            <CollaboratorAvatarGroup
              collaborators={(trip.collaborators ?? []).map((c) => ({
                id: c.user_id,
                full_name: c.full_name,
                avatar_config: c.avatar_config,
                role: c.role,
              }))}
              max={4}
              size={22}
              ringClass="border-white"
            />
          )}
        </div>
      </div>
    </a>
  );
}

export default TripCard;
