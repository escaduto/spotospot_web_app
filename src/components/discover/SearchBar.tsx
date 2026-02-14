"use client";

import { useEffect, useRef } from "react";
import { usePlacesSearch } from "@/src/hooks/usePlacesSearch";
import {
  getPOIConfig,
  getCategoryGroupConfig,
} from "@/src/map/scripts/poi-config";
import type { PlacePointResult } from "@/src/supabase/places";

interface SearchBarProps {
  onSelectPlace: (place: PlacePointResult) => void;
  onShowAllResults?: (places: PlacePointResult[]) => void;
  mapCenter?: { lng: number; lat: number };
}

export default function SearchBar({
  onSelectPlace,
  onShowAllResults,
  mapCenter,
}: SearchBarProps) {
  const { query, results, loading, isOpen, handleQueryChange, clear, close } =
    usePlacesSearch(mapCenter);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [close]);

  const handleSelect = (place: PlacePointResult) => {
    onSelectPlace(place);
    clear();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* ---- Input ---- */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {loading ? (
            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          ) : (
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
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search places, restaurants, attractions…"
          className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-gray-200 shadow-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
        />

        {query && (
          <button
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            aria-label="Clear search"
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
        )}
      </div>

      {/* ---- Results dropdown ---- */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-xl max-h-96 overflow-hidden z-50 flex flex-col">
          {/* Show all results button */}
          {onShowAllResults && results.length > 1 && (
            <button
              onClick={() => {
                onShowAllResults(results);
                close();
              }}
              className="w-full px-3 py-2.5 bg-teal-50 hover:bg-teal-100 transition-colors text-left border-b border-teal-200 flex items-center gap-2"
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
                className="text-teal-600"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-sm font-medium text-teal-700">
                Show all {results.length} results on map
              </span>
            </button>
          )}

          {/* Individual results */}
          <div className="overflow-y-auto max-h-80">
            {results.map((place) => {
              const config = place.category
                ? getPOIConfig(place.category)
                : getCategoryGroupConfig(place.category_group);
              return (
                <button
                  key={place.id}
                  onClick={() => handleSelect(place)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: config.color }}
                  >
                    <span className="text-[10px] text-white">●</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {place.name_en || place.name_default}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {[place.address, place.city, place.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
                    style={{
                      backgroundColor: config.bgColor,
                      color: config.color,
                    }}
                  >
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
