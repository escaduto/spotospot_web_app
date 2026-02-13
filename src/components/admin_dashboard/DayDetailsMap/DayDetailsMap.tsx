"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect } from "react";
import { useBaseMap } from "@/src/hooks/useBaseMap";
import type {
  SeedItineraryItems,
  itinerary_item_routes,
} from "@/src/supabase/types";
import type { PlacePointResult } from "@/src/supabase/places";
import { setUpMapLayers } from "./mapSetup";
import { useActivityLayers } from "./useActivityLayers";
import { useSearchPOILayers } from "./useSearchPOILayers";
import { useRouteLayers } from "./useRouteLayers";

interface Props {
  items: SeedItineraryItems[];
  selectedItemId: string | null;
  editingItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onUpdateCoords?: (itemId: string, lng: number, lat: number) => void;
  centerPoint: { lng: number; lat: number } | null;
  searchPOIs?: PlacePointResult[];
  onSelectSearchPOI?: (place: PlacePointResult) => void;
  routes?: itinerary_item_routes[];
}

export default function DayDetailsMap({
  items,
  selectedItemId,
  editingItemId,
  onSelectItem,
  onUpdateCoords,
  centerPoint,
  searchPOIs,
  onSelectSearchPOI,
  routes,
}: Props) {
  const { mapContainerRef, mapRef, mapLoaded } = useBaseMap({
    initialCenter: centerPoint
      ? [centerPoint.lng, centerPoint.lat]
      : [-122.4107, 37.7784],
    initialZoom: 12,
  });

  // Register all sources & layers once the map is ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    setUpMapLayers(map);
  }, [mapLoaded, mapRef]);

  // Layer hooks — each owns its data + interactions
  useActivityLayers({
    mapRef,
    mapLoaded,
    items,
    selectedItemId,
    editingItemId,
    onSelectItem,
    onUpdateCoords,
    centerPoint,
  });

  useSearchPOILayers({
    mapRef,
    mapLoaded,
    searchPOIs,
    onSelectSearchPOI,
  });

  useRouteLayers({
    mapRef,
    mapLoaded,
    routes,
  });

  return (
    <div className="relative w-full h-full min-h-full">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-sm text-gray-400">Loading map…</p>
        </div>
      )}
    </div>
  );
}
