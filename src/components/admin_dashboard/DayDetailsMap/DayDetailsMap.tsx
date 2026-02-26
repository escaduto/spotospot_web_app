"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useCallback, useState, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useBaseMap } from "@/src/hooks/useBaseMap";
import type {
  ItineraryItem,
  itinerary_item_routes,
} from "@/src/supabase/types";
import type { PlacePointResult } from "@/src/supabase/places";
import { setUpMapLayers } from "./mapSetup";
import { useActivityLayers } from "./useActivityLayers";
import { useSearchPOILayers } from "./useSearchPOILayers";
import { useRouteLayers } from "./useRouteLayers";
import { usePOIInteraction } from "@/src/hooks/usePOIInteraction";
import { parsePoint } from "@/src/utils/geo";
import MapPOIFilter from "./MapPOIFilter";
import MapSearchBar from "./MapSearchBar";
import type { MapSearchResult } from "@/src/hooks/useMapSearch";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import SearchPOIActionCard from "../../POIActionCard/POIActionCard";
import fetchPOIBYID from "@/src/supabase/fetchPOIByID";
import {
  highlightPolygonByID,
  clearPolygonHighlight,
} from "@/src/map/scripts/poi-layers";
import { getPOIConfig } from "@/src/map/scripts/poi-config";

// -------------------------------------------------
// Props
// -------------------------------------------------

interface Props {
  items: ItineraryItem[];
  selectedItemId: string | null;
  editingItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onUpdateCoords?: (itemId: string, lng: number, lat: number) => void;
  centerPoint: { lng: number; lat: number } | null;
  searchPOIs?: PlacePointResult[];
  onSelectSearchPOI?: (place: PlacePointResult) => void;
  /** PlaceId being hovered in the activity-editor dropdown (for map highlight) */
  hoveredSearchPOIId?: string | null;
  routes?: itinerary_item_routes[];
  /** Called when user confirms quick-add from a map POI click */
  onQuickAddActivity?: (data: Partial<ItineraryItem>) => void;
  isApproved?: boolean;
}

// -------------------------------------------------
// Component
// -------------------------------------------------

export default function DayDetailsMap({
  items,
  selectedItemId,
  editingItemId,
  onSelectItem,
  onUpdateCoords,
  centerPoint,
  searchPOIs,
  onSelectSearchPOI,
  hoveredSearchPOIId,
  routes,
  onQuickAddActivity,
  isApproved = false,
}: Props) {
  const { mapContainerRef, mapRef, mapLoaded } = useBaseMap({
    initialCenter: centerPoint
      ? [centerPoint.lng, centerPoint.lat]
      : [-122.4107, 37.7784],
    initialZoom: 12,
  });

  // Search POI action card state (click on search-pois layer marker)
  const [clickedSearchPOI, setClickedSearchPOI] =
    useState<PlacePointResult | null>(null);
  const searchClearRef = useRef<(() => void) | null>(null);

  const [mapCenter, setMapCenter] = useState(
    centerPoint ?? { lng: -122.4107, lat: 37.7784 },
  );
  const mapCenterRef = useRef(mapCenter);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const filterRefetchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mapCenterRef.current = mapCenter;
  }, [mapCenter]);

  // Track map center for search sorting
  const handleMoveEnd = useCallback(() => {
    const c = mapRef.current?.getCenter();
    if (c) {
      const mc = { lng: c.lng, lat: c.lat };
      setMapCenter(mc);
      mapCenterRef.current = mc;
    }
  }, [mapRef]);

  // Register all sources & layers once the map is ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    setUpMapLayers(map);
    map.on("moveend", handleMoveEnd);
    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [mapLoaded, mapRef, handleMoveEnd]);

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
    onSelectSearchPOI: setClickedSearchPOI,
    hoveredPlaceId: hoveredSearchPOIId,
  });

  useRouteLayers({
    mapRef,
    mapLoaded,
    routes,
  });

  // Compute next order index for quick-add
  const selectedItem = items.find((i) => i.id === selectedItemId);
  const insertAfterIndex = selectedItem
    ? selectedItem.order_index + 1
    : items.length
      ? Math.max(...items.map((i) => i.order_index)) + 1
      : 1;

  // Reusable POI hover + click — opens quick-add panel
  usePOIInteraction({
    mapRef,
    mapLoaded,
    onPOIClick: (result) => {
      if (isApproved) return;
      fetchPOIBYID(result.id, result.source_table || "places").then((place) => {
        setClickedSearchPOI(place);
        // For landuse / building features, highlight their polygon footprint.
        // source_id in tile properties is the DB _id used by getPolygonGeometry.
        const sourceId = (result.properties.source_id as string) || result.id;
        const color = getPOIConfig(place.category).color;
        highlightPolygonByID(
          mapRef.current!,
          sourceId,
          result.source_table || "places",
          color,
        );
      });
    },
  });

  // Fit map to all activities
  const fitToActivities = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const withCoords = items
      .map((i) => parsePoint(i.location_coords))
      .filter(Boolean) as { lng: number; lat: number }[];
    if (withCoords.length === 0) return;
    if (withCoords.length === 1) {
      map.flyTo({ center: [withCoords[0].lng, withCoords[0].lat], zoom: 14 });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    withCoords.forEach((c) => bounds.extend([c.lng, c.lat]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 900 });
  }, [items, mapRef]);

  // Handle search result selection → show SearchPOIActionCard
  const handleSearchSelect = useCallback(
    (r: MapSearchResult) => {
      if (r.lat == null || r.lng == null || isApproved) return;
      // Convert MapSearchResult → PlacePointResult for the action card
      const place: PlacePointResult = {
        id: r.id,
        place_source_id: r.place_source_id || r.id,
        place_table: r.place_table || "places",
        name_default: r.name,
        name_en: r.name,
        category: r.category,
        categories: r.category ? [r.category] : null,
        category_group: r.category_group ?? null,
        address: r.address ?? null,
        city: r.city ?? null,
        region: null,
        country: r.country ?? null,
        postal_code: null,
        lat: r.lat,
        lng: r.lng,
        website_url: null,
        phone_number: null,
        popularity_score: r.importance_score ?? null,
        is_top_destination: null,
        metadata: null,
      };
      setClickedSearchPOI(place);
    },
    [isApproved],
  );

  return (
    <div className="relative w-full h-full min-h-full">
      {/* Map canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-sm text-gray-400">Loading map…</p>
        </div>
      )}

      {/* Top overlay: filter pills + search bar */}
      {mapLoaded && (
        <div className="absolute top-3 right-4 z-20 gap-y-3 pointer-events-none">
          {/* Search bar */}
          <div className="pointer-events-auto w-full max-w-sm  flex items-center">
            <MapSearchBar
              mapRef={mapRef}
              mapLoaded={mapLoaded}
              mapCenter={mapCenter}
              onResultSelect={handleSearchSelect}
              clearRef={searchClearRef}
            />
          </div>

          {/* Filter pills */}
          <div className="pointer-events-auto w-1/2 lg:w-1/4">
            <MapPOIFilter
              mapRef={mapRef}
              mapLoaded={mapLoaded}
              onBoundsChanged={() => setShowSearchHere(true)}
              refetchRef={filterRefetchRef}
            />
          </div>
        </div>
      )}

      {/* "Search this area" button – shown after map pans while filter active */}
      {mapLoaded && showSearchHere && (
        <button
          onClick={() => {
            filterRefetchRef.current?.();
            setShowSearchHere(false);
          }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white rounded-full px-4 py-1.5 shadow-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <SearchIcon style={{ fontSize: 13 }} /> Search this area
        </button>
      )}

      {/* Fit-all button */}
      {mapLoaded && items.length > 0 && (
        <button
          onClick={fitToActivities}
          title="Fit all activities in view"
          className="absolute bottom-24 right-3 z-20 bg-white rounded-xl px-3 py-2 shadow-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <OpenInFullIcon style={{ fontSize: 14 }} />
          <span className="text-xs">Fit all</span>
        </button>
      )}

      {/* Editing hint */}
      {editingItemId && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-yellow-100 border-2 border-yellow-400 px-4 py-2 rounded-full shadow-lg pointer-events-none">
          <p className="text-xs font-semibold text-yellow-900 flex items-center gap-1">
            <LocationOnIcon style={{ fontSize: 13 }} /> Drag marker to
            reposition · click map POI to quick-add
          </p>
        </div>
      )}

      {/* Search POI action card (click on search-pois layer marker) */}
      {clickedSearchPOI && !isApproved && (
        <SearchPOIActionCard
          key={clickedSearchPOI.id}
          place={clickedSearchPOI}
          editingItemId={editingItemId}
          nextIndex={insertAfterIndex}
          onAddActivity={(data) => {
            onQuickAddActivity?.(data);
            searchClearRef.current?.();
            setClickedSearchPOI(null);
            if (mapRef.current) clearPolygonHighlight(mapRef.current);
          }}
          onReplaceActivity={(p) => {
            onSelectSearchPOI?.(p);
            searchClearRef.current?.();
            setClickedSearchPOI(null);
            if (mapRef.current) clearPolygonHighlight(mapRef.current);
          }}
          onDismiss={() => {
            setClickedSearchPOI(null);
            if (mapRef.current) clearPolygonHighlight(mapRef.current);
          }}
        />
      )}
    </div>
  );
}
