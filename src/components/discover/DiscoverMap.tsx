"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useDiscoverMap } from "@/src/hooks/useDiscoverMap";
import { CATEGORY_GROUP_CONFIG } from "@/src/map/scripts/poi-config";
import SearchBar from "./SearchBar";
import POIPopup from "./POIPopup";

export default function DiscoverMap() {
  const {
    mapContainerRef,
    mapLoaded,
    selectedPOI,
    closePOI,
    loadingPOI,
    flyTo,
    mapCenter,
    highlightPlaces,
    clearHighlights,
    highlightedCount,
  } = useDiscoverMap();

  return (
    <div className="relative w-full h-full" style={{ minHeight: "100%" }}>
      {/* ---- Map canvas ---- */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* ---- Search bar (floating top) ---- */}
      <div className="absolute top-4 left-4 right-4 md:left-4 md:right-auto md:w-96 z-10">
        <SearchBar
          mapCenter={mapCenter}
          onSelectPlace={(place) => {
            // Highlight just this one place
            highlightPlaces([place], false);
            // Zoom in closer to the selected place
            flyTo(place.lng, place.lat, 17);
          }}
          onShowAllResults={(places) => {
            highlightPlaces(places, true);
          }}
        />
      </div>

      {/* ---- Loading indicator ---- */}
      {loadingPOI && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-gray-500 shadow-sm flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            Loading details…
          </div>
        </div>
      )}

      {/* ---- Clear search results button ---- */}
      {mapLoaded && highlightedCount > 0 && (
        <div className="absolute top-20 left-4 right-4 md:left-4 md:right-auto md:w-96 z-10">
          <button
            onClick={clearHighlights}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition flex items-center justify-center gap-2"
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
            Clear {highlightedCount} highlighted result
            {highlightedCount !== 1 ? "s" : ""}
          </button>
        </div>
      )}

      {/* ---- Category legend (desktop only) ---- */}
      {mapLoaded && (
        <div className="absolute bottom-16 right-14 z-10 hidden lg:block">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">
              Categories
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {Object.entries(CATEGORY_GROUP_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">
                    {config.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- POI detail popup ---- */}
      {selectedPOI && <POIPopup poi={selectedPOI} onClose={closePOI} />}
    </div>
  );
}
