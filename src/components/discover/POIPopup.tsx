"use client";

import {
  getPOIConfig,
  getCategoryGroupConfig,
} from "@/src/map/scripts/poi-config";
import type { SelectedPOI } from "@/src/hooks/useDiscoverMap";

interface POIPopupProps {
  poi: SelectedPOI;
  onClose: () => void;
}

export default function POIPopup({ poi, onClose }: POIPopupProps) {
  const config = poi.category
    ? getPOIConfig(poi.category)
    : getCategoryGroupConfig(poi.category_group);

  const location = [poi.city, poi.region, poi.country]
    .filter(Boolean)
    .join(", ");

  let hostname = "";
  if (poi.website_url) {
    try {
      hostname = new URL(poi.website_url).hostname;
    } catch {
      hostname = poi.website_url;
    }
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 md:bottom-auto md:top-20 md:left-auto md:right-4 md:w-80 z-20 animate-slide-up md:animate-none">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* ---- Header with category colour ---- */}
        <div
          className="px-4 py-3 flex items-start justify-between gap-2"
          style={{ backgroundColor: config.bgColor }}
        >
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <span
              className="w-7 h-7 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
              style={{ backgroundColor: config.color }}
            >
              <span className="text-xs text-white font-bold">●</span>
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                {poi.name}
              </h3>
              {poi.name !== poi.name_default && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {poi.name_default}
                </p>
              )}
              <span
                className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: config.color, color: "white" }}
              >
                {config.label}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 -mr-1 -mt-0.5 shrink-0 transition"
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ---- Details ---- */}
        <div className="px-4 py-3 space-y-2.5">
          {poi.address && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span className="mt-0.5 shrink-0">📍</span>
              <span className="leading-relaxed">{poi.address}</span>
            </div>
          )}
          {location && (
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <span className="mt-0.5 shrink-0">🌍</span>
              <span>{location}</span>
            </div>
          )}
          {poi.phone_number && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span className="mt-0.5 shrink-0">📞</span>
              <a
                href={`tel:${poi.phone_number}`}
                className="hover:text-teal-600 transition"
              >
                {poi.phone_number}
              </a>
            </div>
          )}
          {poi.website_url && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span className="mt-0.5 shrink-0">🔗</span>
              <a
                href={poi.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-teal-600 truncate transition"
              >
                {hostname}
              </a>
            </div>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {poi.is_top_destination && (
              <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                ⭐ Top Destination
              </span>
            )}
            {poi.popularity_score > 0 && (
              <span className="text-[11px] text-gray-400">
                Popularity {Math.round(poi.popularity_score)}/100
              </span>
            )}
          </div>

          {/* Coordinate chip */}
          <div className="pt-1 border-t border-gray-100">
            <span className="text-[10px] font-mono text-gray-400">
              {poi.coordinates[1].toFixed(5)}, {poi.coordinates[0].toFixed(5)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
