import { useEffect, useRef } from "react";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import type { PlacePointResult } from "@/src/supabase/places";
import { getPOIConfig } from "@/src/map/scripts/poi-config";

interface UseSearchPOILayersArgs {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  searchPOIs?: PlacePointResult[];
  onSelectSearchPOI?: (place: PlacePointResult) => void;
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
}: UseSearchPOILayersArgs) {
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredIdRef = useRef<number | null>(null);
  const callbackRef = useRef(onSelectSearchPOI);

  // Keep callback ref in sync
  useEffect(() => {
    callbackRef.current = onSelectSearchPOI;
  }, [onSelectSearchPOI]);

  // ── Push data ──
  useEffect(() => {
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
              categoryLabel: cfg.label,
              color: cfg.color,
              background: cfg.bgColor,
              icon: cfg.icon,
              address: p.address ?? "",
              city: p.city ?? "",
              // Higher popularity → lower sort key → rendered on top
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
  }, [searchPOIs, mapLoaded, mapRef]);

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
      const placeId = e.features?.[0]?.properties?._placeId;
      if (!placeId || !searchPOIs) return;
      const place = searchPOIs.find((pl) => pl.id === placeId);
      if (place) callbackRef.current?.(place);
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
    };
  }, [mapLoaded, mapRef, searchPOIs]);
}
