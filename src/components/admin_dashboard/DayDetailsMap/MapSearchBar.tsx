"use client";

import { useRef, useEffect, useCallback, MutableRefObject } from "react";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import { useMapSearch, MapSearchResult } from "@/src/hooks/useMapSearch";
import { getPOIConfig } from "@/src/map/scripts/poi-config";
import { setPOILayerVisibility } from "@/src/map/scripts/poi-layers";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

interface MapSearchBarProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  mapCenter?: { lng: number; lat: number };
  /** Fires when the user selects a result (for parent to hook into e.g. add-activity flow) */
  onResultSelect?: (result: MapSearchResult) => void;
  /** Ref to expose the clear() function to the parent */
  clearRef?: MutableRefObject<(() => void) | null>;
}

export default function MapSearchBar({
  mapRef,
  mapLoaded,
  mapCenter,
  onResultSelect,
  clearRef,
}: MapSearchBarProps) {
  const { query, results, loading, isOpen, handleQueryChange, clear, close } =
    useMapSearch(mapCenter);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Dropdown hover → map highlight refs
  const dropdownHoveredIdxRef = useRef<number | null>(null);
  const dropdownPopupRef = useRef<maplibregl.Popup | null>(null);

  // Push results into search-pois source whenever they change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource("search-pois") as GeoJSONSource | undefined;
    if (!source) return;

    const features = results
      .filter((r) => r.lat != null && r.lng != null)
      .map((r, idx) => {
        const cfg = getPOIConfig(r.category);
        return {
          type: "Feature" as const,
          id: idx,
          properties: {
            _placeId: r.id,
            name: r.name,
            name_default: r.name,
            name_en: r.name,
            category: r.category ?? "",
            color: cfg.color,
            background: cfg.bgColor,
            icon: cfg.icon,
            categoryLabel: cfg.label,
            address: r.address ?? "",
            city: r.city ?? "",
            country: r.country ?? "",
            sortKey: 1000 - (r.importance_score ?? 0),
          },
          geometry: {
            type: "Point" as const,
            coordinates: [r.lng!, r.lat!],
          },
        };
      });

    source.setData({
      type: "FeatureCollection",
      features: features as GeoJSON.Feature[],
    });
    setPOILayerVisibility(map, features.length === 0);
  }, [results, mapLoaded, mapRef]);

  // Cleanup dropdown popup on unmount
  useEffect(() => {
    return () => {
      dropdownPopupRef.current?.remove();
    };
  }, []);

  const clearDropdownHover = useCallback(() => {
    const map = mapRef.current;
    if (dropdownHoveredIdxRef.current !== null && map) {
      map.setFeatureState(
        { source: "search-pois", id: dropdownHoveredIdxRef.current },
        { hover: false },
      );
      dropdownHoveredIdxRef.current = null;
    }
    dropdownPopupRef.current?.remove();
    dropdownPopupRef.current = null;
  }, [mapRef]);

  // Close on outside click (but keep results on map)
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        close();
        // Clear dropdown hover popup when closing
        clearDropdownHover();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [close, clearDropdownHover]);

  const handleResultHover = useCallback(
    (r: MapSearchResult, idx: number, entering: boolean) => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      // Always clear previous hover
      clearDropdownHover();
      if (!entering || r.lat == null || r.lng == null) return;

      dropdownHoveredIdxRef.current = idx;
      map.setFeatureState({ source: "search-pois", id: idx }, { hover: true });

      const cfg = getPOIConfig(r.category);
      const location = [r.address, r.city].filter(Boolean).join(", ");
      const html = `
        <div class="poi-popup-card">
          <div class="poi-popup-badge" style="color:${cfg.color}">
            <span class="poi-popup-dot" style="background:${cfg.color}"></span>
            ${cfg.label}
          </div>
          <div class="poi-popup-name">${r.name}</div>
          ${location ? `<div class="poi-popup-location">${location}</div>` : ""}
        </div>
      `;

      dropdownPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 20,
        anchor: "bottom",
        className: "search-poi-popup",
      })
        .setLngLat([r.lng, r.lat])
        .setHTML(html)
        .addTo(map);
    },
    [mapRef, mapLoaded, clearDropdownHover],
  );

  const handleSelect = (result: MapSearchResult) => {
    const map = mapRef.current;
    close(); // close dropdown only — keep results on map until action card is dismissed
    clearDropdownHover();
    onResultSelect?.(result);

    // Fly to the result
    if (result.lat != null && result.lng != null && map && mapLoaded) {
      map.flyTo({
        center: [result.lng, result.lat],
        zoom: Math.max(map.getZoom(), 15),
        duration: 900,
      });
    }
  };

  const handleClear = useCallback(() => {
    clear(); // sets results→[] which triggers effect: clears source + restores POI layers
    clearDropdownHover();
  }, [clear, clearDropdownHover]);

  // Expose handleClear via clearRef so parent can trigger it
  useEffect(() => {
    if (clearRef) clearRef.current = handleClear;
  }, [clearRef, handleClear]);

  const subtitle = (r: MapSearchResult) => {
    if (r.place_table === "landuse_features") return "Area / Landmark";
    if (r.place_table === "building_features") return "Building";
    return [r.address, r.city, r.country].filter(Boolean).join(", ");
  };

  return (
    <div className="relative w-full max-w-sm " ref={dropdownRef}>
      {/* Input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">
          <SearchIcon style={{ fontSize: 15 }} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search places…"
          className="w-full pl-8 pr-8 py-2 text-sm rounded-full border border-gray-200 bg-white/95 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 placeholder:text-gray-400"
        />
        {(query || loading) && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-base leading-none"
          >
            {loading ? (
              <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              <CloseIcon style={{ fontSize: 14 }} />
            )}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden max-h-72 overflow-y-auto">
          {results.map((r, i) => {
            const hasCoords = r.lat != null && r.lng != null;
            return (
              <button
                key={`${r.place_table}-${r.place_source_id}-${i}`}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => handleResultHover(r, i, true)}
                onMouseLeave={() => handleResultHover(r, i, false)}
                disabled={!hasCoords}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  hasCoords
                    ? "hover:bg-gray-50 cursor-pointer"
                    : "opacity-50 cursor-default"
                }`}
              >
                {/* Color dot */}
                <span
                  className="shrink-0 w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: r.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {r.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {subtitle(r)}
                    {!hasCoords && (
                      <span className="ml-1 text-amber-500">
                        · no coordinates (click on map)
                      </span>
                    )}
                  </p>
                </div>
                {r.category && (
                  <span
                    className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium hidden sm:inline"
                    style={{
                      backgroundColor: r.color + "20",
                      color: r.color,
                    }}
                  >
                    {getPOIConfig(r.category).label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
