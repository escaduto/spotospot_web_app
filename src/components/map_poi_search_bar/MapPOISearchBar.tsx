import { MapSearchResult, useMapSearch } from "@/src/hooks/useMapSearch";
import { useCallback, useEffect, useRef } from "react";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import { getPOIConfig } from "@/src/map/scripts/poi-config";
import { PlacePointResult, placesToGeoJSON } from "@/src/supabase/places";

interface Props {
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  externalPOIs: PlacePointResult[];
  mapCenter?: { lng: number; lat: number };
  onAddPlace: (p: PlacePointResult) => void;
  SEARCH_POIS_SRC?: string;
}

function MapPOISearchBar({
  mapRef,
  mapLoaded,
  externalPOIs,
  mapCenter,
  onAddPlace,
  SEARCH_POIS_SRC = "search-pois",
}: Props) {
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

  // ── Clear hover popup on unmount ──────────────────────────────────────────

  useEffect(
    () => () => {
      popupRef.current?.remove();
    },
    [],
  );

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
  }, [mapRef, SEARCH_POIS_SRC]);

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

  // ── Push results into search-pois source ─────────────────────────────────
  // Priority: overlay search results (when query non-empty) > externalPOIs from form

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource(SEARCH_POIS_SRC) as GeoJSONSource | undefined;
    if (!src) return;

    // When overlay query is empty and the form has place results, show those
    if (!query && externalPOIs.length > 0) {
      src.setData(placesToGeoJSON(externalPOIs));
      return;
    }

    // Overlay search results take priority
    const features = searchResults
      .filter((r) => r.lat != null && r.lng != null)
      .map((r, idx) => {
        const cfg = getPOIConfig(r.category);
        return {
          type: "Feature" as const,
          id: idx,
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
  }, [searchResults, externalPOIs, query, mapLoaded, mapRef, SEARCH_POIS_SRC]);

  // ── Clear search ──────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    clearSearch();
    clearHover();
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(SEARCH_POIS_SRC) as GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features: [] });
  }, [clearSearch, clearHover, mapRef, SEARCH_POIS_SRC]);

  // ── Hover a result: feature-state + popup ────────────────────────────────

  const handleResultHover = useCallback(
    (r: MapSearchResult, idx: number, entering: boolean) => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      clearHover();
      if (!entering || r.lat == null || r.lng == null) return;

      hoveredIdxRef.current = idx;
      map.setFeatureState(
        { source: SEARCH_POIS_SRC, id: idx },
        { hover: true },
      );

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
    [mapRef, mapLoaded, clearHover, SEARCH_POIS_SRC],
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

  // ── Subtitle helper ───────────────────────────────────────────────────────

  const resultSubtitle = (r: MapSearchResult) =>
    [r.address, r.city, r.country].filter(Boolean).join(", ");

  return (
    <div className="absolute top-3 left-3 z-20 w-72" ref={dropdownRef}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">
          <SearchIcon style={{ fontSize: 15 }} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={`Search for places`}
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
        {/* Dropdown results */}
        {isOpen && searchResults.length > 0 && (
          <div className="absolute top-full mt-1.5 left-0 right-0 z-21 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden max-h-72 overflow-y-auto">
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
                    style={{
                      fontSize: 16,
                      color: "#0d9488",
                      flexShrink: 0,
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
export default MapPOISearchBar;
