"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useDiscoverMap } from "@/src/hooks/useDiscoverMap";
import { CATEGORY_GROUPS } from "@/src/map/scripts/category-config";
import SearchBar from "./SearchBar";
import POIPopup from "./POIPopup";

export default function DiscoverMap() {
  const {
    mapContainerRef,
    mapLoaded,
    selectedPOI,
    closePOI,
    poiCount,
    loadingPOIs,
    flyTo,
  } = useDiscoverMap();

  return (
    <div className="relative w-full h-full" style={{ minHeight: "100%" }}>
      {/* ---- Map canvas ---- */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* ---- Search bar (floating top) ---- */}
      <div className="absolute top-4 left-4 right-4 md:left-4 md:right-auto md:w-96 z-10">
        <SearchBar
          onSelectPlace={(place) => {
            flyTo(place.lng, place.lat, 15);
          }}
        />
      </div>

      {/* ---- Loading indicator ---- */}
      {loadingPOIs && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-gray-500 shadow-sm flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            Loading places…
          </div>
        </div>
      )}

      {/* ---- POI count badge ---- */}
      {mapLoaded && !loadingPOIs && poiCount > 0 && (
        <div className="absolute bottom-6 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
            📍 {poiCount.toLocaleString()} places in view
          </div>
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
              {Object.entries(CATEGORY_GROUPS).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="text-xs leading-none">{config.emoji}</span>
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
