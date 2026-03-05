"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { RefObject } from "react";
import type { SelectedPOI } from "@/src/hooks/useDiscoverMap";
import POIPopup from "./POIPopup";

interface Props {
  mapContainerRef: RefObject<HTMLDivElement | null>;
  mapLoaded: boolean;
  selectedPOI: SelectedPOI | null;
  loadingPOI: boolean;
  onClosePOI: () => void;
}

export default function DiscoverMap({
  mapContainerRef,
  loadingPOI,
  selectedPOI,
  onClosePOI,
}: Props) {
  return (
    <div className="absolute inset-0" style={{ width: "100%", height: "100%" }}>
      {/* Inline w/h guarantee MapLibre reads non-zero dimensions at init */}
      <div
        ref={mapContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* Loading indicator */}
      {loadingPOI && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-gray-500 shadow-sm flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            Loading details…
          </div>
        </div>
      )}

      {/* POI popup */}
      {selectedPOI && <POIPopup poi={selectedPOI} onClose={onClosePOI} />}
    </div>
  );
}
