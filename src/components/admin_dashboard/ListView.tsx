"use client";

import type { SeedItineraryDays } from "@/src/supabase/types";
import Image from "next/image"; // Add this import

interface Props {
  days: SeedItineraryDays[];
  onSelect: (day: SeedItineraryDays) => void;
}

const statusBadge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ListView({ days, onSelect }: Props) {
  if (days.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        No itinerary days match your filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {days.map((day) => (
        <button
          key={day.id}
          disabled={day.approval_status === "approved"}
          onClick={() => onSelect(day)}
          className="text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition group"
        >
          <div className="relative h-40 bg-gray-200 dark:bg-gray-700">
            {/* To use next/image with external URLs, add images.unsplash.com to next.config.js images.domains */}
            {day.image_url ? (
              <Image
                src={day.image_url}
                alt={day.title || "Itinerary image"}
                width={320}
                height={160}
                className="w-full h-full object-cover"
                style={{ objectFit: "cover" }}
                priority={false}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No Image
              </div>
            )}
            <span
              className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                statusBadge[day.approval_status] ?? ""
              }`}
            >
              {day.approval_status}
            </span>
          </div>

          <div className="p-3 space-y-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition">
              {day.title}
            </h3>
            <p className="text-xs text-gray-500">
              {[day.city, day.country].filter(Boolean).join(", ") ||
                "No location"}
            </p>
            {day.description && (
              <p className="text-xs text-gray-400 line-clamp-2">
                {day.description}
              </p>
            )}
            <div className="flex gap-2 pt-1 flex-wrap">
              {day.category_type && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                  {day.category_type}
                </span>
              )}
              {day.rep_point && (
                <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                  📍 coords
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
