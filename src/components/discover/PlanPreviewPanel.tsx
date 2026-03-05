"use client";

import Image from "next/image";
import Link from "next/link";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
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
  // "HH:MM:SS" or "HH:MM" → "H:MM AM/PM"
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getCategoryLabel(value: string) {
  return Category_Types.find((c) => c.value === value)?.label ?? value;
}

export default function PlanPreviewPanel({
  plan,
  items,
  loading,
  onClose,
}: Props) {
  const visible = plan !== null;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-white rounded-t-2xl shadow-2xl border-t border-gray-100 max-h-[60vh] flex flex-col overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-0 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-4 pt-3 pb-2 shrink-0">
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-teal-50 relative">
            {plan?.image_url ? (
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
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                🗺️
              </div>
            )}
          </div>

          {/* Title + location */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
              {plan?.title ?? "Day plan"}
            </h3>
            {(plan?.city || plan?.country) && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {[plan?.city, plan?.country].filter(Boolean).join(", ")}
              </p>
            )}
            {/* Category pills */}
            {plan?.category_type && plan.category_type.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
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

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {plan && (
              <Link
                href={`/day/${plan.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition"
              >
                View plan
                <OpenInNewIcon style={{ fontSize: 13 }} />
              </Link>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <CloseIcon style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-gray-100" />

        {/* Activity list */}
        <div className="overflow-y-auto flex-1 px-4 py-2">
          {loading ? (
            <div className="flex flex-col gap-2 py-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-2 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 h-3 bg-gray-200 rounded" />
                  <div className="w-12 h-3 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">
              No activities found
            </p>
          ) : (
            <ol className="flex flex-col gap-0">
              {items.map((item, idx) => (
                <li key={item.id} className="flex items-start gap-2.5 py-1.5">
                  {/* Order badge */}
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {item.order_index}
                  </span>

                  {/* Title + time */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate leading-snug">
                      {item.title}
                    </p>
                    {item.location_name && (
                      <p className="text-[11px] text-gray-400 truncate">
                        {item.location_name}
                      </p>
                    )}
                  </div>

                  {/* Time + route connector */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {item.start_time && (
                      <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                        <AccessTimeIcon style={{ fontSize: 10 }} />
                        {formatTime(item.start_time)}
                      </span>
                    )}
                    {idx < items.length - 1 && (
                      <span className="text-[10px] text-teal-400 flex items-center gap-0.5">
                        <DirectionsWalkIcon style={{ fontSize: 10 }} />
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Footer CTA */}
        {plan && (
          <div className="px-4 pb-4 pt-2 shrink-0 border-t border-gray-50">
            <Link
              href={`/day/${plan.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition"
            >
              Open full day plan
              <OpenInNewIcon style={{ fontSize: 15 }} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
