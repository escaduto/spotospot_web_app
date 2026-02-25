import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { getPOIConfig } from "@/src/map/scripts/poi-config";
import {
  POI_SOURCE_ID,
  POI_CIRCLES_LAYER_ID,
  POI_ICON_LAYER_ID,
  POI_HIGHLIGHT_SOURCE_ID,
  POI_HIGHLIGHT_CIRCLE_LAYER_ID,
  POI_HIGHLIGHT_ICON_LAYER_ID,
} from "@/src/map/scripts/poi-layers";

// -------------------------------------------------
// Types
// -------------------------------------------------

export interface POIClickResult {
  /** The place id (from the `places` table) or landuse/building source ID */
  id: string;
  name: string;
  category: string | null;
  category_group: string | null;
  importance_score: number;
  coordinates: [number, number];
  source_table: string | null;
  /** Additional raw tile properties */
  properties: Record<string, unknown>;
}

interface UsePOIInteractionOptions {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  onPOIClick: (result: POIClickResult) => void;
  /** Extra CSS class for the hover popup */
  popupClassName?: string;
}

// -------------------------------------------------
// Hook
// -------------------------------------------------

/**
 * Reusable hook that wires up hover tooltips + click handlers for the
 * vector-tile POI layers AND the GeoJSON highlight layers.
 *
 * Used by both the Discover map and the DayDetails admin map.
 */
export function usePOIInteraction({
  mapRef,
  mapLoaded,
  onPOIClick,
  popupClassName = "search-poi-popup",
}: UsePOIInteractionOptions) {
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredRef = useRef<{
    source: string;
    sourceLayer?: string;
    id: number | undefined;
  } | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // ── Shared helpers ──────────────────────────────────────────────────────

    const clearHover = () => {
      if (hoveredRef.current) {
        const { source, sourceLayer, id } = hoveredRef.current;
        if (id != null) {
          const stateRef = sourceLayer
            ? { source, sourceLayer, id }
            : { source, id };
          map.setFeatureState(stateRef, { hover: false });
        }
        hoveredRef.current = null;
      }
      map.getCanvas().style.cursor = "";
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
    };

    const showPopup = (html: string, coords: [number, number]) => {
      hoverPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
        anchor: "bottom",
        className: popupClassName,
      })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);
    };

    // ── Vector-tile POI hover ────────────────────────────────────────────────

    const onVectorHover = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      if (!e.features?.length) return;
      const feat = e.features[0];
      const fid = feat.id as number | undefined;
      if (
        hoveredRef.current?.id === fid &&
        hoveredRef.current?.source === POI_SOURCE_ID
      )
        return;

      clearHover();
      hoveredRef.current = {
        source: POI_SOURCE_ID,
        sourceLayer: "places",
        id: fid,
      };
      if (fid != null) {
        map.setFeatureState(
          { source: POI_SOURCE_ID, sourceLayer: "places", id: fid },
          { hover: true },
        );
      }
      map.getCanvas().style.cursor = "pointer";

      const props = feat.properties!;
      const cfg = getPOIConfig(props.category as string);
      const html = `
        <div class="poi-popup-card">
          <div class="poi-popup-badge" style="color:${cfg.color}">
            <span class="poi-popup-dot" style="background:${cfg.color}"></span>
            ${cfg.label}
          </div>
          <div class="poi-popup-name">${props.name || "Unknown"}</div>
          <div class="poi-popup-hint">${props.category || ""}</div>
        </div>
      `;
      const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [
        number,
        number,
      ];
      showPopup(html, coords);
    };

    // ── GeoJSON highlight hover ──────────────────────────────────────────────

    const onHighlightHover = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      if (!e.features?.length) return;
      const feat = e.features[0];
      const fid = feat.id as number | undefined;
      if (
        hoveredRef.current?.id === fid &&
        hoveredRef.current?.source === POI_HIGHLIGHT_SOURCE_ID
      )
        return;

      clearHover();
      hoveredRef.current = { source: POI_HIGHLIGHT_SOURCE_ID, id: fid };
      if (fid != null) {
        map.setFeatureState(
          { source: POI_HIGHLIGHT_SOURCE_ID, id: fid },
          { hover: true },
        );
      }
      map.getCanvas().style.cursor = "pointer";

      const props = feat.properties!;
      const location = [props.address as string, props.city as string]
        .filter(Boolean)
        .join(", ");
      const html = `
        <div class="poi-popup-card">
          <div class="poi-popup-badge" style="color:${props.color}">
            <span class="poi-popup-dot" style="background:${props.color}"></span>
            ${props.categoryLabel}
          </div>
          <div class="poi-popup-name">${props.name}</div>
          ${location ? `<div class="poi-popup-location">${location}</div>` : ""}
        </div>
      `;
      const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [
        number,
        number,
      ];
      showPopup(html, coords);
    };

    // ── Vector-tile POI click ────────────────────────────────────────────────

    const onVectorClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const feat = e.features[0];
      const props = feat.properties!;
      const coords = (feat.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];
      onPOIClick({
        id: (props.id as string) || "",
        name: (props.name as string) || "Unknown",
        category: (props.category as string) || null,
        category_group: (props.category_group as string) || null,
        importance_score: Number(props.importance_score ?? 0),
        coordinates: coords,
        source_table: (props.source_table as string) || null,
        properties: props as Record<string, unknown>,
      });
    };

    // ── Highlight POI click ──────────────────────────────────────────────────

    const onHighlightClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const feat = e.features[0];
      const props = feat.properties!;
      const coords = (feat.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];
      onPOIClick({
        id: (props._placeId as string) || "",
        name: (props.name as string) || "",
        category: (props.category as string) || null,
        category_group: (props.category_group as string) || null,
        importance_score: Number(props.popularity_score ?? 0),
        coordinates: coords,
        source_table: "places",
        properties: props as Record<string, unknown>,
      });
    };

    // ── Register handlers ────────────────────────────────────────────────────

    const vectorLayers = [POI_ICON_LAYER_ID, POI_CIRCLES_LAYER_ID];
    const highlightLayers = [
      POI_HIGHLIGHT_CIRCLE_LAYER_ID,
      POI_HIGHLIGHT_ICON_LAYER_ID,
    ];

    if (!map) return;

    for (const layer of vectorLayers) {
      if (map.getLayer(layer)) {
        map.on("mousemove", layer, onVectorHover);
        map.on("mouseleave", layer, clearHover);
        map.on("click", layer, onVectorClick);
      }
    }
    for (const layer of highlightLayers) {
      if (map.getLayer(layer)) {
        map.on("mousemove", layer, onHighlightHover);
        map.on("mouseleave", layer, clearHover);
        map.on("click", layer, onHighlightClick);
      }
    }

    return () => {
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
      // Guard: map internal state may be torn down if map.remove() was called first
      try {
        for (const layer of vectorLayers) {
          if (map.getLayer(layer)) {
            map.off("mousemove", layer, onVectorHover);
            map.off("mouseleave", layer, clearHover);
            map.off("click", layer, onVectorClick);
          }
        }
        for (const layer of highlightLayers) {
          if (map.getLayer(layer)) {
            map.off("mousemove", layer, onHighlightHover);
            map.off("mouseleave", layer, clearHover);
            map.off("click", layer, onHighlightClick);
          }
        }
      } catch {
        // map was already destroyed; nothing to clean up
      }
    };
    // onPOIClick is a new function reference each render — stable ref pattern avoids
    // re-registering listeners on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, mapRef]);
}
