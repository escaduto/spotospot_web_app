"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  RefObject,
} from "react";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import { useMapSearch, MapSearchResult } from "@/src/hooks/useMapSearch";
import {
  PlacePointResult,
  searchPlacesByFilter,
  placesToGeoJSON,
} from "@/src/supabase/places";
import { getPOIConfig } from "@/src/map/scripts/poi-config";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopDestSearchResult {
  rep_point: string | null;
  bbox: number[] | null;
  destination_value: string;
  label: string;
}

interface Props {
  mapContainerRef: RefObject<HTMLDivElement | null>;
  mapRef: RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  selectedDest: TopDestSearchResult | null;
  onAddPlace: (p: PlacePointResult) => void;
}

// ─── POI filter groups (same shape as DayDetailsMap's MapPOIFilter) ───────────

interface FilterGroup {
  key: string;
  categoryGroup: string | string[];
  label: string;
  color: string;
  subcategories: { key: string; label: string }[];
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    key: "eat",
    categoryGroup: "food_and_drink",
    label: "Food & Drink",
    color: "#E74C3C",
    subcategories: [
      { key: "restaurant", label: "Restaurant" },
      { key: "cafe", label: "Café" },
      { key: "bakery", label: "Bakery" },
      { key: "bar", label: "Bar" },
      { key: "fast_food_restaurant", label: "Fast Food" },
      { key: "ice_cream_shop", label: "Ice Cream" },
      { key: "dessert_shop", label: "Dessert" },
    ],
  },
  {
    key: "nature",
    categoryGroup: "parks_and_nature",
    label: "Parks & Nature",
    color: "#27AE60",
    subcategories: [
      { key: "park", label: "Park" },
      { key: "beach", label: "Beach" },
      { key: "hiking_trail", label: "Hiking" },
      { key: "garden", label: "Garden" },
      { key: "nature_reserve", label: "Nature Reserve" },
    ],
  },
  {
    key: "sightseeing",
    categoryGroup: ["tourism_and_attractions", "arts_and_culture"],
    label: "Sights",
    color: "#F39C12",
    subcategories: [
      { key: "tourist_attraction", label: "Attraction" },
      { key: "landmark", label: "Landmark" },
      { key: "museum", label: "Museum" },
      { key: "viewpoint", label: "Viewpoint" },
    ],
  },
  {
    key: "shopping",
    categoryGroup: "shopping",
    label: "Shopping",
    color: "#E91E63",
    subcategories: [
      { key: "shopping_mall", label: "Mall" },
      { key: "market", label: "Market" },
    ],
  },
  {
    key: "nightlife",
    categoryGroup: "nightlife_and_entertainment",
    label: "Nightlife",
    color: "#FF6F00",
    subcategories: [
      { key: "nightclub", label: "Nightclub" },
      { key: "bar", label: "Bar" },
      { key: "rooftop_bar", label: "Rooftop Bar" },
    ],
  },
  {
    key: "accommodation",
    categoryGroup: "accommodation",
    label: "Stay",
    color: "#3498DB",
    subcategories: [
      { key: "hotel", label: "Hotel" },
      { key: "hostel", label: "Hostel" },
      { key: "resort", label: "Resort" },
    ],
  },
];

const SEARCH_POIS_SRC = "search-pois";

// ─── Component ────────────────────────────────────────────────────────────────

export function CreatePlanMapOverlay({
  mapContainerRef,
  mapRef,
  mapLoaded,
  selectedDest,
  onAddPlace,
}: Props) {
  const [mapCenter, setMapCenter] = useState<{ lng: number; lat: number } | undefined>(undefined);

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
    return () => { map.off("moveend", update); };
  }, [mapRef, mapLoaded]);

  // ── Search bar state ──────────────────────────────────────────────────────

  const {
    query,
    results: searchResults,
    loading: searchLoading,
    isOpen,
    handleQueryChange,
    clear: clearSearch,
    close: closeSearch,
  } = useMapSearch(mapCenter);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoveredIdxRef = useRef<number | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────

  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(false);
  const activeFilterRef = useRef<Set<string> | null>(null);

  // ── Push search results into search-pois source ───────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource(SEARCH_POIS_SRC) as GeoJSONSource | undefined;
    if (!src) return;

    const features = searchResults
      .filter((r) => r.lat != null && r.lng != null)
      .map((r, idx) => {
        const cfg = getPOIConfig(r.category);
        return {
          type: "Feature" as const,
          id: idx, // numeric id required for feature-state
          properties: {
            _placeId: r.place_source_id,
            name: r.name,
            name_default: r.name,
            name_en: r.name,
            category: r.category ?? "",
            category_group: r.category_group ?? "other",
            color: cfg.color,
            icon: cfg.icon,
            address: r.address ?? "",
            city: r.city ?? "",
            country: r.country ?? "",
            popularity_score: r.importance_score ?? 0,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [r.lng!, r.lat!],
          },
        };
      });

    src.setData({
      type: "FeatureCollection",
      features: features as GeoJSON.Feature[],
    });
  }, [searchResults, mapLoaded, mapRef]);

  // ── Clear hover popup on unmount ──────────────────────────────────────────

  useEffect(() => () => { popupRef.current?.remove(); }, []);

  const clearHover = useCallback(() => {
    const map = mapRef.current;
    if (hoveredIdxRef.current !== null && map) {
      map.setFeatureState(
        { source: SEARCH_POIS_SRC, id: hoveredIdxRef.current },
        { hover: false },
      );
      hoveredIdxRef.current = null;
    }
    popupRef.current?.remove();
    popupRef.current = null;
  }, [mapRef]);

  // ── Close dropdown on outside click ──────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        closeSearch();
        clearHover();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeSearch, clearHover]);

  // ── Hover a result: feature-state + popup ────────────────────────────────

  const handleResultHover = useCallback(
    (r: MapSearchResult, idx: number, entering: boolean) => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      clearHover();
      if (!entering || r.lat == null || r.lng == null) return;

      hoveredIdxRef.current = idx;
      map.setFeatureState({ source: SEARCH_POIS_SRC, id: idx }, { hover: true });

      const cfg = getPOIConfig(r.category);
      const location = [r.address, r.city].filter(Boolean).join(", ");
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 20,
        anchor: "bottom",
      })
        .setLngLat([r.lng, r.lat])
        .setHTML(
          `<div style="padding:4px 6px;min-width:120px">
            <div style="font-size:10px;font-weight:600;color:${cfg.color};margin-bottom:2px;text-transform:uppercase;letter-spacing:0.04em">${cfg.label}</div>
            <div style="font-size:12px;font-weight:700;color:#111">${r.name}</div>
            ${location ? `<div style="font-size:11px;color:#6b7280;margin-top:1px">${location}</div>` : ""}
          </div>`,
        )
        .addTo(map);
    },
    [mapRef, mapLoaded, clearHover],
  );

  // ── Select a result: fly + call onAddPlace ────────────────────────────────

  const handleResultSelect = useCallback(
    (r: MapSearchResult) => {
      const map = mapRef.current;
      closeSearch();
      clearHover();

      if (r.lat != null && r.lng != null) {
        const place: PlacePointResult = {
          id: r.id,
          place_source_id: r.place_source_id,
          place_table: r.place_table,
          name_default: r.name,
          name_en: r.name,
          category: r.category,
          categories: null,
          category_group: r.category_group,
          address: r.address,
          city: r.city,
          region: null,
          country: r.country,
          postal_code: null,
          lat: r.lat,
          lng: r.lng,
          website_url: null,
          phone_number: null,
          popularity_score: r.importance_score,
          is_top_destination: null,
          metadata: null,
        };
        onAddPlace(place);

        if (map && mapLoaded) {
          map.flyTo({
            center: [r.lng, r.lat],
            zoom: Math.max(map.getZoom(), 15),
            duration: 800,
          });
        }
      }
    },
    [mapRef, mapLoaded, closeSearch, clearHover, onAddPlace],
  );

  // ── Clear search ──────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    clearSearch();
    clearHover();
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(SEARCH_POIS_SRC) as GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features: [] });
  }, [clearSearch, clearHover, mapRef]);

  // ── POI filter: toggle a group ────────────────────────────────────────────

  const applyFilter = useCallback(
    async (groups: Set<string>) => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      const src = map.getSource(SEARCH_POIS_SRC) as GeoJSONSource | undefined;
      if (!src) return;

      if (groups.size === 0) {
        activeFilterRef.current = null;
        src.setData({ type: "FeatureCollection", features: [] });
        return;
      }

      activeFilterRef.current = groups;
      setFetching(true);

      try {
        const center = map.getCenter();
        const allGroups: string[] = [];
        for (const gKey of groups) {
          const group = FILTER_GROUPS.find((g) => g.key === gKey);
          if (!group) continue;
          const cg = Array.isArray(group.categoryGroup)
            ? group.categoryGroup
            : [group.categoryGroup];
          allGroups.push(...cg);
        }

        const matched = await searchPlacesByFilter(
          allGroups,
          [],
          { lat: center.lat, lng: center.lng },
          300,
        );

        // Scope to destination bbox when available
        const bbox = selectedDest?.bbox;
        const scoped =
          bbox && bbox.length >= 4
            ? matched.filter(
                (p) =>
                  p.lng >= bbox[0] && p.lat >= bbox[1] &&
                  p.lng <= bbox[2] && p.lat <= bbox[3],
              )
            : matched;

        if (activeFilterRef.current !== groups) return; // stale
        src.setData(placesToGeoJSON(scoped));
      } catch (err) {
        console.error("CreatePlanMapOverlay filter error:", err);
      } finally {
        setFetching(false);
      }
    },
    [mapRef, mapLoaded, selectedDest],
  );

  const toggleFilterGroup = useCallback(
    (gKey: string) => {
      setActiveGroups((prev) => {
        const next = new Set(prev);
        if (next.has(gKey)) next.delete(gKey);
        else next.add(gKey);
        applyFilter(next);
        return next;
      });
    },
    [applyFilter],
  );

  const clearFilter = useCallback(() => {
    setActiveGroups(new Set());
    applyFilter(new Set());
  }, [applyFilter]);

  // ── Subtitle helper ───────────────────────────────────────────────────────

  const resultSubtitle = (r: MapSearchResult) =>
    [r.address, r.city, r.country].filter(Boolean).join(", ");

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
      <div
        className="absolute top-3 left-3 z-20 w-72"
        ref={dropdownRef}
      >
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">
            <SearchIcon style={{ fontSize: 15 }} />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={
              selectedDest
                ? `Search in ${selectedDest.label}…`
                : "Search places…"
            }
            className="w-full pl-8 pr-8 py-2 text-sm rounded-full border border-gray-200 bg-white/95 shadow-md focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 placeholder:text-gray-400"
          />
          {(query || searchLoading) && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {searchLoading ? (
                <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
              ) : (
                <CloseIcon style={{ fontSize: 14 }} />
              )}
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {isOpen && searchResults.length > 0 && (
          <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden max-h-72 overflow-y-auto">
            {searchResults.map((r, i) => {
              const hasCoords = r.lat != null && r.lng != null;
              return (
                <button
                  key={`${r.place_source_id}-${i}`}
                  onClick={() => handleResultSelect(r)}
                  onMouseEnter={() => handleResultHover(r, i, true)}
                  onMouseLeave={() => handleResultHover(r, i, false)}
                  disabled={!hasCoords}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    hasCoords
                      ? "hover:bg-gray-50 cursor-pointer"
                      : "opacity-50 cursor-default"
                  }`}
                >
                  <span
                    className="shrink-0 w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {r.name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {resultSubtitle(r)}
                    </p>
                  </div>
                  <AddCircleOutlineIcon
                    style={{ fontSize: 16, color: "#0d9488", flexShrink: 0 }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── POI filter strip ── */}
      <div className="absolute bottom-8 left-3 z-20 flex items-center gap-1.5 max-w-[calc(100%-24px)] overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <div
          className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-white/60 px-2.5 py-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {FILTER_GROUPS.map((group) => {
            const isActive = activeGroups.has(group.key);
            return (
              <button
                key={group.key}
                onClick={() => toggleFilterGroup(group.key)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isActive
                    ? "text-white border-transparent shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
                style={
                  isActive
                    ? { backgroundColor: group.color, borderColor: group.color }
                    : {}
                }
              >
                {group.label}
              </button>
            );
          })}

          {activeGroups.size > 0 && (
            <button
              onClick={clearFilter}
              className="shrink-0 px-2.5 py-1 rounded-full text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 bg-white transition-colors"
            >
              ✕ Clear
            </button>
          )}

          {fetching && (
            <span className="shrink-0 w-4 h-4 rounded-full border-2 border-gray-300 border-t-teal-600 animate-spin" />
          )}
        </div>
      </div>

      {/* ── "Click dot to add" hint ── */}
      {(activeGroups.size > 0 || (isOpen && searchResults.length > 0)) && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            <CheckCircleIcon style={{ fontSize: 13 }} />
            Click a dot on the map to add to your plan
          </div>
        </div>
      )}
    </div>
  );
}
