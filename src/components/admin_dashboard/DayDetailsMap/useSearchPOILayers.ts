import { useEffect, useRef } from "react";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import type { PlacePointResult } from "@/src/supabase/places";
import { getPOIConfig } from "@/src/map/scripts/poi-config";
import { setPOILayerVisibility } from "@/src/map/scripts/poi-layers";

interface UseSearchPOILayersArgs {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  searchPOIs?: PlacePointResult[];
  onSelectSearchPOI?: (place: PlacePointResult) => void;
  /** When set, programmatically highlights that place in the search-pois layer (from dropdown hover) */
  hoveredPlaceId?: string | null;
}

/**
 * Pushes search-POI data into the "search-pois" GeoJSON source
 * and manages hover highlight + popup card.
 */
export function useSearchPOILayers({
  mapRef,
  mapLoaded,
  searchPOIs,
  onSelectSearchPOI,
  hoveredPlaceId,
}: UseSearchPOILayersArgs) {
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null); // map-mouse hover
  const hoveredIdRef = useRef<number | null>(null); // map-mouse hover idx
  const dropdownPopupRef = useRef<maplibregl.Popup | null>(null); // dropdown hover
  const dropdownHoveredIdxRef = useRef<number | null>(null); // dropdown hover idx
  const callbackRef = useRef(onSelectSearchPOI);
  const prevLengthRef = useRef(0);

  // Keep callback ref in sync
  useEffect(() => {
    callbackRef.current = onSelectSearchPOI;
  }, [onSelectSearchPOI]);

  // ── Push data + toggle default POI layer visibility ──
  useEffect(() => {
    const len = searchPOIs?.length ?? 0;
    const prevLen = prevLengthRef.current;
    prevLengthRef.current = len;

    // Skip redundant empty→empty updates (avoids overwriting MapSearchBar's source data)
    if (len === 0 && prevLen === 0) return;

    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("search-pois") as GeoJSONSource | undefined;
    if (!source) return;

    const features =
      searchPOIs
        ?.filter((p) => p.lat != null && p.lng != null)
        .map((p, idx) => {
          const cfg = getPOIConfig(p.category);
          return {
            type: "Feature" as const,
            id: idx,
            properties: {
              _placeId: p.id,
              name: p.name_en || p.name_default,
              name_default: p.name_default,
              name_en: p.name_en ?? "",
              category: p.category ?? "",
              categoryLabel: cfg.label,
              color: cfg.color,
              background: cfg.bgColor,
              icon: cfg.icon,
              address: p.address ?? "",
              city: p.city ?? "",
              country: p.country ?? "",
              sortKey: 1000 - (p.popularity_score ?? 0),
            },
            geometry: {
              type: "Point" as const,
              coordinates: [p.lng, p.lat],
            },
          };
        }) ?? [];

    source.setData({
      type: "FeatureCollection",
      features: features as GeoJSON.Feature[],
    });

    // Hide default POI tile layers when we have our own results
    setPOILayerVisibility(map, len === 0);
  }, [searchPOIs, mapLoaded, mapRef]);

  // ── Programmatic hover from dropdown (hoveredPlaceId) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear previous dropdown hover
    if (dropdownHoveredIdxRef.current !== null) {
      map.setFeatureState(
        { source: "search-pois", id: dropdownHoveredIdxRef.current },
        { hover: false },
      );
      dropdownHoveredIdxRef.current = null;
    }
    dropdownPopupRef.current?.remove();
    dropdownPopupRef.current = null;

    if (!hoveredPlaceId || !searchPOIs?.length) return;

    const idx = searchPOIs.findIndex((p) => p.id === hoveredPlaceId);
    if (idx === -1) return;
    const place = searchPOIs[idx];

    dropdownHoveredIdxRef.current = idx;
    map.setFeatureState({ source: "search-pois", id: idx }, { hover: true });

    const cfg = getPOIConfig(place.category);
    const location = [place.address, place.city].filter(Boolean).join(", ");
    const html = `
      <div class="poi-popup-card">
        <div class="poi-popup-badge" style="color:${cfg.color}">
          <span class="poi-popup-dot" style="background:${cfg.color}"></span>
          ${cfg.label}
        </div>
        <div class="poi-popup-name">${place.name_en || place.name_default}</div>
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
      .setLngLat([place.lng, place.lat])
      .setHTML(html)
      .addTo(map);
  }, [hoveredPlaceId, searchPOIs, mapLoaded, mapRef]);

  // ── Hover + click interactions ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layers = ["search-pois-circle", "search-pois-icons"];

    const clearHover = () => {
      if (hoveredIdRef.current !== null) {
        map.setFeatureState(
          { source: "search-pois", id: hoveredIdRef.current },
          { hover: false },
        );
        hoveredIdRef.current = null;
      }
      map.getCanvas().style.cursor = "";
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
    };

    const onMove = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      if (!e.features?.length) return;
      const feat = e.features[0];
      const fid = feat.id as number;
      if (hoveredIdRef.current === fid) return;

      clearHover();
      hoveredIdRef.current = fid;
      map.setFeatureState({ source: "search-pois", id: fid }, { hover: true });
      map.getCanvas().style.cursor = "pointer";

      const p = feat.properties!;
      const location = [p.address, p.city].filter(Boolean).join(", ");
      const html = `
        <div class="poi-popup-card">
          <div class="poi-popup-badge" style="color:${p.color}">
            <span class="poi-popup-dot" style="background:${p.color}"></span>
            ${p.categoryLabel}
          </div>
          <div class="poi-popup-name">${p.name}</div>
          ${location ? `<div class="poi-popup-location">${location}</div>` : ""}
        </div>
      `;

      const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [
        number,
        number,
      ];

      hoverPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
        anchor: "bottom",
        className: "search-poi-popup",
      })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);
    };

    const onClick = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const props = feat.properties as Record<string, string | number>;
      const placeId = props?._placeId as string | undefined;
      if (!placeId) return;

      // Try to find in the searchPOIs prop array first
      const fromArray = searchPOIs?.find((pl) => pl.id === placeId);
      if (fromArray) {
        callbackRef.current?.(fromArray);
        return;
      }

      // Fallback: build a PlacePointResult from the feature properties + geometry
      // (covers clicks on results pushed by MapSearchBar when searchPOIs prop is empty)
      const coords = (feat.geometry as GeoJSON.Point).coordinates;
      const place = {
        id: placeId,
        source: "places",
        source_id: placeId,
        name_default:
          (props.name_default as string) || (props.name as string) || "",
        name_en: (props.name_en as string) || (props.name as string) || null,
        category: (props.category as string) || null,
        categories: null,
        category_group: null,
        address: (props.address as string) || null,
        city: (props.city as string) || null,
        region: null,
        country: (props.country as string) || null,
        postal_code: null,
        lat: coords[1],
        lng: coords[0],
        website_url: null,
        phone_number: null,
        popularity_score: null,
        is_top_destination: null,
        metadata: null,
      };
      callbackRef.current?.(place);
    };

    for (const layer of layers) {
      map.on("mousemove", layer, onMove);
      map.on("mouseleave", layer, clearHover);
      map.on("click", layer, onClick);
    }

    return () => {
      for (const layer of layers) {
        map.off("mousemove", layer, onMove);
        map.off("mouseleave", layer, clearHover);
        map.off("click", layer, onClick);
      }
      hoverPopupRef.current?.remove();
      dropdownPopupRef.current?.remove();
    };
  }, [mapLoaded, mapRef, searchPOIs]);
}
