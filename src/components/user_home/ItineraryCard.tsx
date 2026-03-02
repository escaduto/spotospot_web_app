"use client";

import { ItineraryDay } from "@/src/supabase/types";
import Image from "next/image";
import Chip from "@mui/material/Chip";
import LockIcon from "@mui/icons-material/Lock";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EditIcon from "@mui/icons-material/Edit";

function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ItineraryCard({ trip }: { trip: ItineraryDay }) {
  return (
    <a
      href={`/day/${trip.id}`}
      className="group overflow-hidden rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 shadow-sm hover:shadow-md hover:border-amber-400 transition-all"
    >
      <div className="relative h-32 bg-linear-to-br from-amber-50 to-orange-50">
        {trip.image_url ? (
          <Image
            src={trip.image_url}
            blurDataURL={
              trip.image_blurhash
                ? `data:image/jpeg;base64,${trip.image_blurhash}`
                : undefined
            }
            placeholder={trip.image_blurhash ? "blur" : undefined}
            alt={trip.title || "Day plan"}
            fill
            className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-20">
            📝
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
        <div className="absolute top-2.5 right-2.5">
          <Chip
            icon={<LockIcon sx={{ fontSize: "0.7rem !important" }} />}
            label="Draft"
            size="small"
            sx={{
              fontSize: "0.6rem",
              height: 18,
              bgcolor: "#fef3c7",
              color: "#92400e",
              fontWeight: 700,
              "& .MuiChip-icon": { color: "#92400e" },
            }}
          />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-gray-900 group-hover:text-amber-700 transition line-clamp-1">
            {trip.title || "Untitled Draft"}
          </h3>
          <EditIcon
            sx={{ fontSize: 14, color: "#9ca3af", flexShrink: 0, mt: 0.2 }}
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {trip.city && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <LocationOnIcon sx={{ fontSize: 11 }} />
              {trip.city}
            </span>
          )}
          {trip.date && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <CalendarTodayIcon sx={{ fontSize: 11 }} />
              {formatShortDate(trip.date)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

export default ItineraryCard;
