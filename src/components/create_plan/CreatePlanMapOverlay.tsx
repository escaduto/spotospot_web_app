"use client";

import { useEffect, useState, RefObject } from "react";
import maplibregl from "maplibre-gl";
import { PlacePointResult } from "@/src/supabase/places";
import MapPOISearchBar from "../map_poi_search_bar/MapPOISearchBar";
import FilterCategoryGroups from "../filter_category_groups/FilterCategoryGroups";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopDestSearchResult {
  id: string;
  rep_point: string | null;
  bbox: number[] | null;
  destination_value: string;
  label: string;
  image_url: string | null;
}

interface Props {
  mapContainerRef: RefObject<HTMLDivElement | null>;
  mapRef: RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  selectedDest: TopDestSearchResult | null;
  onAddPlace: (p: PlacePointResult) => void;
  /** Called when the user selects a destination from the map search bar */
  onSelectDest?: (dest: TopDestSearchResult) => void;
  /** Place results from the form's Step-4 autocomplete; shown on map when non-empty */
  externalPOIs?: PlacePointResult[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreatePlanMapOverlay({
  mapContainerRef,
  mapRef,
  mapLoaded,
  onAddPlace,
  externalPOIs = [],
  selectedDest,
}: Props) {
  const [mapCenter, setMapCenter] = useState<
    { lng: number; lat: number } | undefined
  >(undefined);

  // Keep mapCenter in sync so useMapSearch gets proximity bias
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const c = map.getCenter();
    setMapCenter({ lng: c.lng, lat: c.lat });
    const update = () => {
      const c2 = map.getCenter();
      setMapCenter({ lng: c2.lng, lat: c2.lat });
    };
    map.on("moveend", update);
    return () => {
      map.off("moveend", update);
    };
  }, [mapRef, mapLoaded]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex-1 min-w-0">
      {/* Map canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl animate-bounce">🗺️</span>
            <p className="text-sm text-gray-400 animate-pulse">Loading map…</p>
          </div>
        </div>
      )}

      {/* ── Search bar ── */}
      <MapPOISearchBar
        mapRef={mapRef}
        mapLoaded={mapLoaded}
        onAddPlace={onAddPlace}
        mapCenter={mapCenter}
        externalPOIs={externalPOIs}
      />

      {/* Filter POI by category groups */}
      <FilterCategoryGroups
        mapRef={mapRef}
        mapLoaded={mapLoaded}
        selectedDest={selectedDest}
      />
    </div>
  );
}
