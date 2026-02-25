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
import { createClient } from "@/src/supabase/client";
import { getPOIConfig } from "@/src/map/scripts/poi-config";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import PlaceIcon from "@mui/icons-material/Place";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LanguageIcon from "@mui/icons-material/Language";
import PhoneIcon from "@mui/icons-material/Phone";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

// -------------------------------------------------
// Quick-add panel shown when user clicks a map POI
// -------------------------------------------------

interface QuickAddPanelProps {
  name: string;
  category: string | null;
  placeId: string;
  coordinates: [number, number];
  nextIndex: number;
  onAdd: (data: Partial<ItineraryItem>) => void;
  onDismiss: () => void;
}

function QuickAddPanel({
  name,
  category,
  placeId,
  coordinates,
  nextIndex,
  onAdd,
  onDismiss,
}: QuickAddPanelProps) {
  const cfg = getPOIConfig(category);
  const [title, setTitle] = useState(name);

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm shrink-0"
            style={{ backgroundColor: cfg.color }}
          >
            <PlaceIcon style={{ fontSize: 14 }} />
          </span>
          <div>
            <p className="text-xs font-semibold text-gray-900 leading-tight">
              {name}
            </p>
            <p className="text-[10px] text-gray-400">{cfg.label}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Title override */}
      <div>
        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          Activity title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() =>
            onAdd({
              title,
              location_name: name,
              location_coords: `POINT(${coordinates[0]} ${coordinates[1]})`,
              place_id: placeId || null,
              order_index: nextIndex,
              item_type: "activity",
            })
          }
          disabled={!title.trim()}
          className="flex-1 bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-xl disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          + Add Activity
        </button>
        <button
          onClick={onDismiss}
          className="text-xs text-gray-500 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------
// Action card shown when user clicks a search-result POI on map
// -------------------------------------------------

interface SearchPOIActionCardProps {
  place: PlacePointResult;
  editingItemId: string | null;
  nextIndex: number;
  onAddActivity: (data: Partial<ItineraryItem>) => void;
  onReplaceActivity: (place: PlacePointResult) => void;
  onDismiss: () => void;
}

function SearchPOIActionCard({
  place,
  editingItemId,
  nextIndex,
  onAddActivity,
  onReplaceActivity,
  onDismiss,
}: SearchPOIActionCardProps) {
  const cfg = getPOIConfig(place.category);
  const [title, setTitle] = useState(place.name_en || place.name_default);
  const [extra, setExtra] = useState<{
    website_url: string | null;
    phone_number: string | null;
  } | null>(null);

  useEffect(() => {
    if (!place.id) return;
    const sb = createClient();
    sb.from("places")
      .select("website_url, phone_number")
      .eq("id", place.id)
      .single()
      .then(({ data }) => {
        if (data)
          setExtra(
            data as { website_url: string | null; phone_number: string | null },
          );
      });
  }, [place.id]);

  const location = [place.address, place.city, place.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: cfg.color }}
          >
            <PlaceIcon style={{ fontSize: 14 }} />
          </span>
          <div>
            <p className="text-xs font-semibold text-gray-900 leading-tight">
              {place.name_en || place.name_default}
            </p>
            <p className="text-[10px] text-gray-400">{cfg.label}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 shrink-0"
        >
          <CloseIcon style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Location */}
      {location && (
        <p className="text-[11px] text-gray-500 flex items-center gap-0.5">
          <LocationOnIcon style={{ fontSize: 12 }} /> {location}
        </p>
      )}

      {/* Extra details */}
      {extra?.website_url && (
        <a
          href={extra.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
        >
          <LanguageIcon style={{ fontSize: 11 }} /> Website
        </a>
      )}
      {extra?.phone_number && (
        <p className="text-[11px] text-gray-500 flex items-center gap-0.5">
          <PhoneIcon style={{ fontSize: 11 }} /> {extra.phone_number}
        </p>
      )}

      {/* Title override */}
      <div>
        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          Activity title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() =>
            onAddActivity({
              title,
              location_name: place.name_en || place.name_default,
              location_coords: `POINT(${place.lng} ${place.lat})`,
              place_id: place.id || null,
              order_index: nextIndex,
              item_type: "activity",
            })
          }
          disabled={!title.trim()}
          className="flex-1 bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-xl disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          + Add Activity
        </button>
        {editingItemId && (
          <button
            onClick={() => onReplaceActivity(place)}
            className="text-xs text-blue-600 border border-blue-300 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors font-medium"
          >
            Replace
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-xs text-gray-500 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

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

  // Quick-add panel state
  const [quickAdd, setQuickAdd] = useState<{
    name: string;
    category: string | null;
    placeId: string;
    coordinates: [number, number];
  } | null>(null);

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
    onPOIClick: useCallback(
      (result) => {
        if (isApproved) return;
        setQuickAdd({
          name: result.name,
          category: result.category,
          placeId: result.id,
          coordinates: result.coordinates,
        });
      },
      [isApproved],
    ),
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
        source: r.source_table,
        source_id: r.id,
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
          <div className="pointer-events-auto">
            <div className=" backdrop-blur-sm rounded-2xl px-3 py-2 shadow-md border border-white/60 flex items-center gap-1.5 flex-wrap">
              <MapPOIFilter
                mapRef={mapRef}
                mapLoaded={mapLoaded}
                onBoundsChanged={() => setShowSearchHere(true)}
                refetchRef={filterRefetchRef}
              />
            </div>
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

      {/* Quick-add panel */}
      {quickAdd && !isApproved && (
        <QuickAddPanel
          name={quickAdd.name}
          category={quickAdd.category}
          placeId={quickAdd.placeId}
          coordinates={quickAdd.coordinates}
          nextIndex={insertAfterIndex}
          onAdd={(data) => {
            onQuickAddActivity?.(data);
            setQuickAdd(null);
          }}
          onDismiss={() => setQuickAdd(null)}
        />
      )}

      {/* Search POI action card (click on search-pois layer marker) */}
      {clickedSearchPOI && !isApproved && (
        <SearchPOIActionCard
          place={clickedSearchPOI}
          editingItemId={editingItemId}
          nextIndex={insertAfterIndex}
          onAddActivity={(data) => {
            onQuickAddActivity?.(data);
            searchClearRef.current?.();
            setClickedSearchPOI(null);
          }}
          onReplaceActivity={(p) => {
            onSelectSearchPOI?.(p);
            searchClearRef.current?.();
            setClickedSearchPOI(null);
          }}
          onDismiss={() => setClickedSearchPOI(null)}
        />
      )}
    </div>
  );
}
