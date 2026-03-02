"use client";

import { ItineraryDay } from "@/src/supabase/types";
import Image from "next/image";
import Chip from "@mui/material/Chip";
import PublicIcon from "@mui/icons-material/Public";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Compact card for publicly published day plans */
function PublicPlanCard({ plan }: { plan: ItineraryDay }) {
  return (
    <a
      href={`/day/${plan.id}`}
      className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md hover:border-teal-200 transition-all"
    >
      {/* Thumbnail */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-linear-to-br from-teal-50 to-cyan-50">
        {plan.image_url ? (
          <Image
            src={plan.image_url}
            blurDataURL={
              plan.image_blurhash
                ? `data:image/jpeg;base64,${plan.image_blurhash}`
                : undefined
            }
            placeholder={plan.image_blurhash ? "blur" : undefined}
            alt={plan.title || "Day plan"}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl opacity-30">
            🗺️
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-gray-900 group-hover:text-teal-600 line-clamp-1 transition">
          {plan.title || "Untitled Plan"}
        </h4>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          {plan.city && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <LocationOnIcon sx={{ fontSize: 11 }} />
              {plan.city}
            </span>
          )}
          {plan.date && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <CalendarTodayIcon sx={{ fontSize: 11 }} />
              {formatShortDate(plan.date)}
            </span>
          )}
        </div>
      </div>

      {/* Badge */}
      <Chip
        icon={<PublicIcon sx={{ fontSize: "0.75rem !important" }} />}
        label="Public"
        size="small"
        sx={{
          fontSize: "0.6rem",
          height: 18,
          bgcolor: "#d1fae5",
          color: "#065f46",
          fontWeight: 700,
          "& .MuiChip-icon": { color: "#065f46" },
        }}
      />
    </a>
  );
}

export default PublicPlanCard;
