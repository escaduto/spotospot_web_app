"use client";

import Image from "next/image";
import Link from "next/link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon from "@mui/icons-material/Place";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import type { NearbyPlan, DayItem } from "@/src/supabase/itineraries";
import { Category_Types } from "@/src/types/itinerary";

interface Props {
  plan: NearbyPlan | null;
  items: DayItem[];
  loading: boolean;
  onClose: () => void;
}

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getCategoryLabel(value: string) {
  return Category_Types.find((c) => c.value === value)?.label ?? value;
}

const ITEM_TYPE_ICON: Record<string, string> = {
  food: "🍽️",
  accommodation: "🏨",
  transport: "🚌",
  activity: "🎯",
  attraction: "🏛️",
  shopping: "🛍️",
};

export default function DayPlanDetailPanel({
  plan,
  items,
  loading,
  onClose,
}: Props) {
  const visible = plan !== null;

  return (
    <div
      className="absolute inset-y-0 left-0 z-30 flex flex-col bg-white shadow-2xl transition-transform duration-300"
      style={{
        width: 320,
        transform: visible ? "translateX(0)" : "translateX(-100%)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* ── Header bar ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 shrink-0">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <ArrowBackIcon style={{ fontSize: 20 }} />
        </button>
        <span className="text-sm font-semibold text-gray-700 truncate flex-1">
          Day Plan Details
        </span>
        {plan && (
          <Link
            href={`/day/${plan.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition shrink-0"
          >
            Full detail
            <OpenInNewIcon style={{ fontSize: 12 }} />
          </Link>
        )}
      </div>

      {/* ── Plan summary card ──────────────────────────────────────────── */}
      {plan && (
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-teal-50 relative">
              {plan.image_url ? (
                <Image
                  src={plan.image_url}
                  alt={plan.title ?? "Plan"}
                  fill
                  className="object-cover"
                  placeholder={plan.image_blurhash ? "blur" : undefined}
                  blurDataURL={
                    plan.image_blurhash
                      ? `data:image/jpeg;base64,${plan.image_blurhash}`
                      : undefined
                  }
                  sizes="56px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🗺️
                </div>
              )}
            </div>

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                {plan.title ?? "Day plan"}
              </h2>
              {(plan.city || plan.country) && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {[plan.city, plan.country].filter(Boolean).join(", ")}
                </p>
              )}
              {plan.category_type && plan.category_type.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {plan.category_type.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="text-[10px] font-medium px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-100"
                    >
                      {getCategoryLabel(cat)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {plan.description && (
            <p className="mt-2 text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {plan.description}
            </p>
          )}
        </div>
      )}

      {/* ── Activity list ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pt-3 pb-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            {loading ? "Loading activities…" : `${items.length} Activities`}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 px-4 py-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-start gap-3 animate-pulse">
                <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">
            No activities found
          </p>
        ) : (
          <ol className="flex flex-col px-3 pb-4">
            {items.map((item, idx) => {
              const isLast = idx === items.length - 1;
              const icon =
                ITEM_TYPE_ICON[item.item_type?.toLowerCase()] ?? "📍";
              const timeStr = formatTime(item.start_time);

              return (
                <li key={item.id} className="flex items-stretch gap-3 py-0">
                  {/* Left track: number + vertical line */}
                  <div className="flex flex-col items-center shrink-0">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center mt-2.5 shrink-0">
                      {item.order_index}
                    </span>
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-teal-100 my-1 min-h-3" />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={`flex-1 py-2.5 ${!isLast ? "border-b border-transparent" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-sm">{icon}</span>
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {item.title}
                        </span>
                      </div>
                      {timeStr && (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400 shrink-0">
                          <AccessTimeIcon style={{ fontSize: 10 }} />
                          {timeStr}
                        </span>
                      )}
                    </div>
                    {item.location_name && (
                      <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5 truncate">
                        <PlaceIcon style={{ fontSize: 11 }} />
                        {item.location_name}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* ── Footer CTA ─────────────────────────────────────────────────── */}
      {plan && (
        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
          <Link
            href={`/day/${plan.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <DirectionsWalkIcon style={{ fontSize: 16 }} />
            Open full day plan
            <OpenInNewIcon style={{ fontSize: 13 }} />
          </Link>
        </div>
      )}
    </div>
  );
}
