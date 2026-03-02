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
import MapReorderPanel from "./MapReorderPanel";
import type { MapSearchResult } from "@/src/hooks/useMapSearch";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import RouteIcon from "@mui/icons-material/Route";
import ReorderIcon from "@mui/icons-material/Reorder";
import NearMeIcon from "@mui/icons-material/NearMe";
import SearchPOIActionCard from "../../POIActionCard/POIActionCard";
import RouteTransportCard from "./RouteTransportCard";
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
  onUpdateRouteTransportTypes?: (
    routeId: string,
    types: string[],
  ) => Promise<void>;
  /** Called when user confirms a new activity order from the reorder widget */
  onSaveReorder?: (orderedIds: string[]) => Promise<void>;
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
  onUpdateRouteTransportTypes,
  onSaveReorder,
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

  // Route interaction state
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(
    new Set(),
  );
  const [routeEditCard, setRouteEditCard] = useState<{
    routeIds: string[];
    initialTypes: string[];
    x: number;
    y: number;
  } | null>(null);

  // Map widget modes
  const [reorderMode, setReorderMode] = useState(false);
  const [dragModeActive, setDragModeActive] = useState(false);

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

  // Escape key → clear route multi-select and close transport card
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedRouteIds(new Set());
        setRouteEditCard(null);
        setReorderMode(false);
        setDragModeActive(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
    dragModeActive,
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
    selectedItemId,
    selectedRouteIds,
    onSelectActivity: (fromItemId) => {
      if (isApproved) return;
      setSelectedRouteIds(new Set()); // clear multi-select on activity select
      onSelectItem(fromItemId);
    },
    onRouteContextMenu: (routeId, types, x, y) => {
      if (isApproved) return;
      // If right-clicked route is in multi-select, open card for all selected
      const ids = selectedRouteIds.has(routeId)
        ? [...selectedRouteIds]
        : [routeId];
      setRouteEditCard({ routeIds: ids, initialTypes: types, x, y });
    },
    onToggleRouteSelection: (routeId) => {
      if (isApproved) return;
      setSelectedRouteIds((prev) => {
        const next = new Set(prev);
        if (next.has(routeId)) next.delete(routeId);
        else next.add(routeId);
        return next;
      });
    },
  });

  // Compute next order index for quick-add
  const selectedItem = items.find((i) => i.id === selectedItemId);
  const insertAfterIndex = selectedItem
    ? selectedItem.order_index + 1
    : items.length
      ? Math.max(...items.map((i) => i.order_index)) + 1
      : 1;

  // Reusable POI hover + click — disabled when drag mode is active
  usePOIInteraction({
    mapRef,
    mapLoaded,
    onPOIClick: (result) => {
      if (isApproved || dragModeActive) return;
      fetchPOIBYID(result.id, result.source_table || "places").then(
        (place: PlacePointResult) => {
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
        },
      );
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

      {/* Fit-all + Reorder + Reposition widget group */}
      {mapLoaded && items.length > 0 && (
        <div className="absolute bottom-24 right-3 z-20 flex flex-col gap-1.5 items-end">
          {/* Reposition button — only when editing */}
          {editingItemId && !isApproved && (
            <button
              onClick={() => setDragModeActive((d) => !d)}
              title={
                dragModeActive
                  ? "Exit reposition mode"
                  : "Reposition activity on map"
              }
              className={`rounded-xl px-3 py-2 shadow-md border text-sm font-medium transition-colors flex items-center gap-1.5 ${
                dragModeActive
                  ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
                  : "bg-white text-orange-600 border-orange-300 hover:bg-orange-50"
              }`}
            >
              <NearMeIcon style={{ fontSize: 14 }} />
              <span className="text-xs">
                {dragModeActive ? "Exit reposition" : "Reposition"}
              </span>
            </button>
          )}

          {/* Reorder button */}
          {!isApproved && !dragModeActive && (
            <button
              onClick={() => setReorderMode((r) => !r)}
              title="Reorder activities"
              className={`rounded-xl px-3 py-2 shadow-md border text-sm font-medium transition-colors flex items-center gap-1.5 ${
                reorderMode
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <ReorderIcon style={{ fontSize: 14 }} />
              <span className="text-xs">Reorder</span>
            </button>
          )}

          {/* Fit all button */}
          {!dragModeActive && (
            <button
              onClick={fitToActivities}
              title="Fit all activities in view"
              className="bg-white rounded-xl px-3 py-2 shadow-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <OpenInFullIcon style={{ fontSize: 14 }} />
              <span className="text-xs">Fit all</span>
            </button>
          )}
        </div>
      )}

      {/* Editing hint */}
      {editingItemId && !dragModeActive && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-yellow-100 border-2 border-yellow-400 px-4 py-2 rounded-full shadow-lg pointer-events-none">
          <p className="text-xs font-semibold text-yellow-900 flex items-center gap-1">
            <LocationOnIcon style={{ fontSize: 13 }} /> Click map POI to
            quick-add · use Reposition to move marker
          </p>
        </div>
      )}

      {/* Drag mode hint */}
      {editingItemId && dragModeActive && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-orange-100 border-2 border-orange-400 px-4 py-2 rounded-full shadow-lg pointer-events-none">
          <p className="text-xs font-semibold text-orange-900 flex items-center gap-1">
            <NearMeIcon style={{ fontSize: 13 }} /> Drag the marker to
            reposition · Esc to exit
          </p>
        </div>
      )}

      {/* Reorder panel */}
      {reorderMode && !isApproved && (
        <MapReorderPanel
          items={items}
          onSave={async (orderedIds) => {
            setReorderMode(false);
            await onSaveReorder?.(orderedIds);
          }}
          onCancel={() => setReorderMode(false)}
        />
      )}

      {/* Multi-select route bar */}
      {!isApproved && selectedRouteIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-gray-900/90 text-white rounded-full px-4 py-2 flex items-center gap-3 shadow-xl backdrop-blur-sm">
          <RouteIcon style={{ fontSize: 14 }} />
          <span className="text-xs font-medium">
            {selectedRouteIds.size} route{selectedRouteIds.size > 1 ? "s" : ""}{" "}
            selected
          </span>
          <button
            onClick={() => {
              const ids = [...selectedRouteIds];
              // Grab types from first route for initial state
              const firstRoute = routes?.find((r) => r.id === ids[0]);
              setRouteEditCard({
                routeIds: ids,
                initialTypes: firstRoute?.transportation_type ?? [],
                x: window.innerWidth / 2 - 128,
                y: window.innerHeight - 360,
              });
            }}
            className="text-xs bg-blue-500 hover:bg-blue-600 px-2.5 py-1 rounded-full font-medium transition-colors"
          >
            Edit types
          </button>
          <button
            onClick={() => setSelectedRouteIds(new Set())}
            className="text-xs text-gray-300 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Route transport type editor card (right-click or bulk) */}
      {routeEditCard && !isApproved && (
        <RouteTransportCard
          routeIds={routeEditCard.routeIds}
          initialTypes={routeEditCard.initialTypes}
          position={{ x: routeEditCard.x, y: routeEditCard.y }}
          onSave={async (routeIds, types) => {
            await Promise.all(
              routeIds.map((id) => onUpdateRouteTransportTypes?.(id, types)),
            );
            setSelectedRouteIds(new Set());
          }}
          onClose={() => setRouteEditCard(null)}
        />
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
