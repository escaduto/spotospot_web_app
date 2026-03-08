"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { TripWithDayPlans } from "./TripCard";
import type { PendingInvite } from "./PendingTripInvites";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_PX = 14; // pixels per day
const LANE_H = 56; // height per lane in px
const HEADER_H = 38; // month header height

const COLORS = [
  "#0d9488",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
  "#06b6d4",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(iso: string) {
  return new Date(iso + "T00:00:00");
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function formatRange(start: string, end: string) {
  const s = toDate(start);
  const e = toDate(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (s.getFullYear() !== e.getFullYear())
    return `${s.toLocaleDateString("en-US", { ...opts, year: "numeric" })} – ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}`;
}

function daysUntil(iso: string) {
  const d = toDate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

// ── Hover tooltip ─────────────────────────────────────────────────────────────

interface HoveredTip {
  trip: TripWithDayPlans;
  color: string;
  anchorX: number; // fixed viewport X of bar left edge
  anchorY: number; // fixed viewport Y of bar top edge
  barW: number;
  pending?: boolean;
  inviterName?: string | null;
}

function TripHoverCard({ tip }: { tip: HoveredTip }) {
  const { trip, color } = tip;
  const totalDays =
    trip.start_date && trip.end_date
      ? Math.round(
          (toDate(trip.end_date).getTime() -
            toDate(trip.start_date).getTime()) /
            86400000,
        ) + 1
      : 0;

  const du = trip.start_date ? daysUntil(trip.start_date) : null;
  const isOngoing =
    du !== null && du <= 0 && trip.end_date
      ? daysUntil(trip.end_date) >= 0
      : false;

  // Position: prefer below, but flip above if close to bottom of viewport
  const tipW = 220;
  let left = tip.anchorX;
  if (left + tipW > window.innerWidth - 16)
    left = window.innerWidth - tipW - 16;
  const top = tip.anchorY + (LANE_H - 10) + 6;

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: tipW,
        zIndex: 9999,
        pointerEvents: "none",
      }}
      className="rounded-xl shadow-2xl overflow-hidden border border-gray-100 bg-white animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Cover */}
      <div
        className="relative h-20 shrink-0"
        style={{ background: color + "33" }}
      >
        {trip.image_url ? (
          <Image
            src={trip.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="220px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">
            🗺️
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-1.5 left-2.5 right-2.5">
          <p className="text-white font-semibold text-sm leading-tight line-clamp-1 drop-shadow">
            {trip.title}
          </p>
        </div>
        {/* status dot */}
        <div className="absolute top-2 right-2">
          {tip.pending ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-white">
              Invite
            </span>
          ) : isOngoing ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">
              Ongoing
            </span>
          ) : du !== null && du > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-white">
              in {du}d
            </span>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="p-2.5 flex flex-col gap-1">
        {trip.destination && (
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <LocationOnIcon sx={{ fontSize: 11, color }} />
            {trip.destination}
          </p>
        )}
        {trip.start_date && trip.end_date && (
          <p className="flex items-center gap-1 text-xs text-gray-600">
            <CalendarTodayIcon sx={{ fontSize: 11, color: "#0d9488" }} />
            <span className="font-medium">
              {formatRange(trip.start_date, trip.end_date)}
            </span>
            <span className="text-gray-400">· {totalDays}d</span>
          </p>
        )}
        {(trip.day_plans ?? []).length > 0 && (
          <p className="text-[10px] text-gray-400">
            {(trip.day_plans ?? []).length} day plan
            {(trip.day_plans ?? []).length !== 1 ? "s" : ""} planned
          </p>
        )}
        {tip.pending && tip.inviterName && (
          <p className="text-[10px] text-amber-500 font-medium">
            Invited by {tip.inviterName}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripCalendarView({
  trips,
  pendingInvites,
}: {
  trips: TripWithDayPlans[];
  pendingInvites?: PendingInvite[];
}) {
  const today = new Date();
  const dated = trips.filter((t) => t.start_date && t.end_date);
  const undated = trips.filter((t) => !t.start_date || !t.end_date);

  // Pending invites with / without dates
  const pendingDated = (pendingInvites ?? []).filter(
    (p) => p.trip?.start_date && p.trip?.end_date,
  );
  const pendingUndated = (pendingInvites ?? []).filter(
    (p) => !p.trip?.start_date || !p.trip?.end_date,
  );

  const [hovered, setHovered] = useState<HoveredTip | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBarEnter = useCallback(
    (
      e: React.MouseEvent<HTMLAnchorElement>,
      trip: TripWithDayPlans,
      color: string,
      extra?: { pending?: boolean; inviterName?: string | null },
    ) => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      const rect = e.currentTarget.getBoundingClientRect();
      setHovered({
        trip,
        color,
        anchorX: rect.left,
        anchorY: rect.top,
        barW: rect.width,
        ...extra,
      });
    },
    [],
  );

  const handleBarLeave = useCallback(() => {
    clearTimer.current = setTimeout(() => setHovered(null), 80);
  }, []);

  if (trips.length === 0 && (pendingInvites ?? []).length === 0) return null;

  // ── Timeline bounds ──────────────────────────────────────────────────────
  const allStarts = [
    ...dated.map((t) => toDate(t.start_date!)),
    ...pendingDated.map((p) => toDate(p.trip!.start_date!)),
  ];
  const allEnds = [
    ...dated.map((t) => toDate(t.end_date!)),
    ...pendingDated.map((p) => toDate(p.trip!.end_date!)),
  ];

  const earliestStart =
    allStarts.length > 0 ? allStarts.reduce((a, b) => (a < b ? a : b)) : today;
  const latestEnd =
    allEnds.length > 0 ? allEnds.reduce((a, b) => (a > b ? a : b)) : today;

  const timelineStart = startOfMonth(
    earliestStart < today ? earliestStart : startOfMonth(today),
  );
  const rawEnd = endOfMonth(latestEnd);
  const minEnd = new Date(
    timelineStart.getFullYear(),
    timelineStart.getMonth() + 3,
    0,
  );
  const timelineEnd = rawEnd > minEnd ? rawEnd : minEnd;

  const totalDays = daysBetween(timelineStart, timelineEnd) + 1;
  const totalWidth = totalDays * DAY_PX;

  // ── Month markers ────────────────────────────────────────────────────────
  const months: { label: string; offsetDays: number; days: number }[] = [];
  let cur = new Date(timelineStart);
  while (cur <= timelineEnd) {
    months.push({
      label: cur.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      offsetDays: daysBetween(timelineStart, cur),
      days: daysInMonth(cur),
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  // ── Lane assignment ──────────────────────────────────────────────────────
  const sorted = [...dated].sort(
    (a, b) => toDate(a.start_date!).getTime() - toDate(b.start_date!).getTime(),
  );

  const laneEnds: number[] = [];

  const positioned = sorted.map((trip) => {
    const startDay = Math.max(
      0,
      daysBetween(timelineStart, toDate(trip.start_date!)),
    );
    const endDay = Math.min(
      totalDays - 1,
      daysBetween(timelineStart, toDate(trip.end_date!)),
    );

    let lane = laneEnds.findIndex((e) => e < startDay - 1);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = endDay;

    return { trip, startDay, endDay, lane };
  });

  // Pending invites — continue lane assignment after confirmed trips
  const sortedPending = [...pendingDated].sort(
    (a, b) =>
      toDate(a.trip!.start_date!).getTime() -
      toDate(b.trip!.start_date!).getTime(),
  );

  const positionedPending = sortedPending.map((invite) => {
    const startDay = Math.max(
      0,
      daysBetween(timelineStart, toDate(invite.trip!.start_date!)),
    );
    const endDay = Math.min(
      totalDays - 1,
      daysBetween(timelineStart, toDate(invite.trip!.end_date!)),
    );

    let lane = laneEnds.findIndex((e) => e < startDay - 1);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = endDay;

    return { invite, startDay, endDay, lane };
  });

  const numLanes = Math.max(1, laneEnds.length);
  const timelineHeight = numLanes * LANE_H + 12;

  const todayOffset = daysBetween(timelineStart, today);
  const showToday = todayOffset >= 0 && todayOffset <= totalDays;

  return (
    <div className="w-full">
      {/* ── Scrollable Gantt ─────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div style={{ width: totalWidth }} className="relative select-none">
          {/* Month header row */}
          <div
            className="flex border-b border-gray-100 bg-gray-50"
            style={{ height: HEADER_H }}
          >
            {months.map((m) => (
              <div
                key={m.label}
                style={{ width: m.days * DAY_PX, minWidth: m.days * DAY_PX }}
                className="flex items-center px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200 shrink-0"
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Trip lanes */}
          <div className="relative bg-white" style={{ height: timelineHeight }}>
            {/* Alternating lane background */}
            {Array.from({ length: numLanes }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: i * LANE_H,
                  left: 0,
                  right: 0,
                  height: LANE_H,
                  background:
                    i % 2 === 0 ? "transparent" : "rgba(249,250,251,0.7)",
                }}
              />
            ))}

            {/* Vertical month separators */}
            {months.map((m) => (
              <div
                key={m.label + "-sep"}
                style={{
                  position: "absolute",
                  left: m.offsetDays * DAY_PX,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: "#e5e7eb",
                }}
              />
            ))}

            {/* Today line + label */}
            {showToday && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: todayOffset * DAY_PX,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: "#f87171",
                    zIndex: 10,
                    opacity: 0.85,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: todayOffset * DAY_PX + 3,
                    top: 3,
                    zIndex: 11,
                  }}
                  className="text-[9px] font-bold text-red-400/80 whitespace-nowrap"
                >
                  Today
                </div>
              </>
            )}

            {/* Trip bars */}
            {positioned.map(({ trip, startDay, endDay, lane }, barIdx) => {
              const left = startDay * DAY_PX;
              const width = Math.max((endDay - startDay + 1) * DAY_PX, 8);
              const top = lane * LANE_H + 8;
              const barH = LANE_H - 16;
              const color = COLORS[barIdx % COLORS.length];
              const showImage = trip.image_url && width >= 42;
              const showTitle = width >= 60;
              const showDest = trip.destination && width >= 130;

              const isActive =
                trip.start_date &&
                trip.end_date &&
                today >= toDate(trip.start_date) &&
                today <= toDate(trip.end_date);

              return (
                <a
                  key={trip.id}
                  href={`/trip/${trip.id}`}
                  onMouseEnter={(e) => handleBarEnter(e, trip, color)}
                  onMouseLeave={handleBarLeave}
                  style={{
                    position: "absolute",
                    left,
                    width,
                    top,
                    height: barH,
                    background: color,
                    borderRadius: 8,
                    overflow: "hidden",
                    zIndex: 5,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    paddingLeft: 6,
                    paddingRight: 6,
                    boxShadow: isActive
                      ? `0 0 0 2px white, 0 0 0 3.5px ${color}`
                      : "0 1px 4px rgba(0,0,0,0.15)",
                  }}
                  className="hover:brightness-110 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  {showImage && (
                    <div
                      style={{
                        position: "relative",
                        width: barH - 4,
                        height: barH - 4,
                        borderRadius: 5,
                        overflow: "hidden",
                        flexShrink: 0,
                        opacity: 0.9,
                      }}
                    >
                      <Image
                        src={trip.image_url!}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    </div>
                  )}
                  {showTitle && (
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "block",
                          lineHeight: 1.25,
                          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        }}
                      >
                        {trip.title}
                      </span>
                      {showDest && (
                        <span
                          style={{
                            fontSize: 9,
                            color: "rgba(255,255,255,0.75)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "block",
                            lineHeight: 1.2,
                            marginTop: 1,
                          }}
                        >
                          {trip.destination}
                        </span>
                      )}
                    </div>
                  )}
                </a>
              );
            })}

            {/* Pending invite bars (dashed outline) */}
            {positionedPending.map(({ invite, startDay, endDay, lane }) => {
              const left = startDay * DAY_PX;
              const width = Math.max((endDay - startDay + 1) * DAY_PX, 8);
              const top = lane * LANE_H + 8;
              const barH = LANE_H - 16;
              const color = "#f59e0b";
              const showTitle = width >= 60;
              const tripData = invite.trip!;

              // Build a synthetic TripWithDayPlans for the hover card
              const syntheticTrip: TripWithDayPlans = {
                id: tripData.id,
                title: tripData.title,
                description: tripData.description,
                destination: tripData.destination,
                image_url: tripData.image_url,
                image_blurhash: tripData.image_blurhash,
                start_date: tripData.start_date,
                end_date: tripData.end_date,
                status: tripData.status,
                created_at: invite.created_at,
                updated_at: invite.created_at,
              } as TripWithDayPlans;

              return (
                <a
                  key={`pending-${invite.collaborator_id}`}
                  href={`/trip/${tripData.id}`}
                  onMouseEnter={(e) =>
                    handleBarEnter(e, syntheticTrip, color, {
                      pending: true,
                      inviterName: invite.invited_by,
                    })
                  }
                  onMouseLeave={handleBarLeave}
                  style={{
                    position: "absolute",
                    left,
                    width,
                    top,
                    height: barH,
                    background: `${color}20`,
                    border: `2px dashed ${color}`,
                    borderRadius: 8,
                    zIndex: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    paddingLeft: 6,
                    paddingRight: 6,
                  }}
                  className="hover:brightness-110 transition-all cursor-pointer"
                >
                  {showTitle && (
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: color,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "block",
                          lineHeight: 1.25,
                        }}
                      >
                        {tripData.title}
                      </span>
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────────────── */}
      {(positioned.length > 0 || positionedPending.length > 0) && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 px-0.5">
          {positioned.map(({ trip }, idx) => (
            <a
              key={trip.id}
              href={`/trip/${trip.id}`}
              className="flex items-center gap-1.5 hover:opacity-70 transition min-w-0 group"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: COLORS[idx % COLORS.length] }}
              />
              <span className="text-xs text-gray-600 group-hover:text-gray-900 truncate max-w-40 transition-colors">
                {trip.title}
              </span>
              {trip.start_date && (
                <span className="text-[10px] text-gray-400 shrink-0">
                  {daysUntil(trip.start_date) > 0
                    ? `in ${daysUntil(trip.start_date)}d`
                    : daysUntil(trip.end_date ?? trip.start_date) >= 0
                      ? "ongoing"
                      : "past"}
                </span>
              )}
            </a>
          ))}
          {positionedPending.map(({ invite }) => (
            <a
              key={`legend-pending-${invite.collaborator_id}`}
              href={`/trip/${invite.trip!.id}`}
              className="flex items-center gap-1.5 hover:opacity-70 transition min-w-0 group"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-dashed border-amber-400"
                style={{ background: "#f59e0b20" }}
              />
              <span className="text-xs text-amber-600 group-hover:text-amber-800 truncate max-w-40 transition-colors">
                {invite.trip!.title}
              </span>
              <span className="text-[10px] text-amber-400 shrink-0">
                invite
              </span>
            </a>
          ))}
        </div>
      )}

      {/* ── Undated trips ──────────────────────────────────── */}
      {(undated.length > 0 || pendingUndated.length > 0) && (
        <div className="mt-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            No dates set
          </p>
          <div className="flex flex-wrap gap-2">
            {undated.map((trip) => (
              <a
                key={trip.id}
                href={`/trip/${trip.id}`}
                className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm hover:shadow-md hover:border-teal-200 transition"
              >
                {trip.image_url && (
                  <div className="relative w-7 h-7 rounded-md overflow-hidden shrink-0">
                    <Image
                      src={trip.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="28px"
                    />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 truncate max-w-32">
                  {trip.title}
                </span>
                {trip.destination && (
                  <span className="flex items-center gap-0.5 text-xs text-gray-400 shrink-0">
                    <LocationOnIcon sx={{ fontSize: 11 }} />
                    {trip.destination}
                  </span>
                )}
              </a>
            ))}
            {pendingUndated.map((invite) => (
              <a
                key={`undated-pending-${invite.collaborator_id}`}
                href={`/trip/${invite.trip?.id}`}
                className="flex items-center gap-2 rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 py-2 hover:border-amber-400 transition"
              >
                {invite.trip?.image_url && (
                  <div className="relative w-7 h-7 rounded-md overflow-hidden shrink-0">
                    <Image
                      src={invite.trip.image_url}
                      alt=""
                      fill
                      className="object-cover opacity-70"
                      sizes="28px"
                    />
                  </div>
                )}
                <span className="text-sm font-medium text-amber-700 truncate max-w-32">
                  {invite.trip?.title ?? "Invite"}
                </span>
                <span className="text-[10px] text-amber-400 font-semibold shrink-0">
                  invite
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hover tooltip portal */}
      {hovered && <TripHoverCard tip={hovered} />}
    </div>
  );
}
