"use client";

import Image from "next/image";
import Link from "next/link";
import type { NearbyPlan } from "@/src/supabase/itineraries";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

interface Props {
  plan: NearbyPlan;
  onClick?: () => void;
}

function formatDistance(km: number | null): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export default function PlanCard({ plan, onClick }: Props) {
  const location = [plan.city, plan.country].filter(Boolean).join(", ");
  const dist = formatDistance(plan.distance_km);

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all overflow-hidden cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-28 bg-gray-100 overflow-hidden">
        {plan.image_url ? (
          <Image
            src={plan.image_url}
            alt={plan.title ?? "Day plan"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="300px"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-teal-100 to-cyan-50 flex items-center justify-center">
            <span className="text-3xl opacity-30">🗺️</span>
          </div>
        )}
        {/* Category pills overlay */}
        {plan.category_type && plan.category_type.length > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1 max-w-full">
            {plan.category_type.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="text-[9px] font-semibold bg-black/50 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm capitalize"
              >
                {cat.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">
          {plan.title ?? "Untitled plan"}
        </h3>

        {(location || dist) && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <LocationOnIcon style={{ fontSize: 11 }} />
            <span className="truncate">{location || dist}</span>
            {dist && location && (
              <span className="shrink-0 ml-auto text-[10px] text-teal-600 font-medium">
                {dist}
              </span>
            )}
          </div>
        )}

        {/* View link */}
        <Link
          href={`/day/${plan.id}`}
          onClick={(e) => e.stopPropagation()}
          target="_blank"
          className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-800 transition"
        >
          <OpenInNewIcon style={{ fontSize: 12 }} />
          View plan
        </Link>
      </div>
    </div>
  );
}
