import { useEffect, useRef } from "react";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import type { itinerary_item_routes } from "@/src/supabase/types";
import {
  getTransportConfig,
  getSingleTransportConfig,
} from "@/src/map/scripts/transport-config";

interface UseRouteLayersArgs {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  routes?: itinerary_item_routes[];
  /** The currently selected activity id — routes matching from_item_id get casing */
  selectedItemId?: string | null;
  /** Route IDs that are multi-selected (for bulk transport edit) */
  selectedRouteIds?: Set<string>;
  /** Left-click on a route line without modifier → select the from activity */
  onSelectActivity?: (itemId: string) => void;
  /**
   * Right-click on a route line → open transport editor.
   * x/y are viewport (CSS) pixel coordinates.
   */
  onRouteContextMenu?: (
    routeId: string,
    types: string[],
    x: number,
    y: number,
  ) => void;
  /** Ctrl/Cmd+click on a route → toggle it in the multi-select set */
  onToggleRouteSelection?: (routeId: string) => void;
}

/**
 * Compute the true geographic midpoint of a polyline by arc-length interpolation.
 * Fixes the badge position for 2-point straight lines (ferry, flight).
 */
function computeLineMidpoint(coords: number[][]): number[] {
  if (coords.length < 2) return coords[0];
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    const d = Math.sqrt(dx * dx + dy * dy);
    lens.push(d);
    total += d;
  }
  const half = total / 2;
  let acc = 0;
  for (let i = 0; i < lens.length; i++) {
    if (acc + lens[i] >= half) {
      const t = lens[i] === 0 ? 0 : (half - acc) / lens[i];
      return [
        coords[i][0] + t * (coords[i + 1][0] - coords[i][0]),
        coords[i][1] + t * (coords[i + 1][1] - coords[i][1]),
      ];
    }
    acc += lens[i];
  }
  return coords[coords.length - 1];
}

export function useRouteLayers({
  mapRef,
  mapLoaded,
  routes,
  selectedItemId,
  selectedRouteIds,
  onSelectActivity,
  onRouteContextMenu,
  onToggleRouteSelection,
}: UseRouteLayersArgs) {
  const hoveredIdRef = useRef<number | null>(null);
  // routeId → feature index (stable across re-renders for feature-state look-ups)
  const routeIdxMapRef = useRef<Map<string, number>>(new Map());

  // Keep latest callbacks in refs so event listeners never go stale
  const onSelectActivityRef = useRef(onSelectActivity);
  const onContextMenuRef = useRef(onRouteContextMenu);
  const onToggleRef = useRef(onToggleRouteSelection);
  useEffect(() => {
    onSelectActivityRef.current = onSelectActivity;
  }, [onSelectActivity]);
  useEffect(() => {
    onContextMenuRef.current = onRouteContextMenu;
  }, [onRouteContextMenu]);
  useEffect(() => {
    onToggleRef.current = onToggleRouteSelection;
  }, [onToggleRouteSelection]);

  // ── Rebuild GeoJSON whenever routes or activity-selection changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const routeSource = map.getSource("routes") as GeoJSONSource | undefined;
    const midpointSource = map.getSource("route-midpoints") as
      | GeoJSONSource
      | undefined;
    if (!routeSource || !midpointSource) return;

    if (!routes?.length) {
      routeSource.setData({ type: "FeatureCollection", features: [] });
      midpointSource.setData({ type: "FeatureCollection", features: [] });
      routeIdxMapRef.current.clear();
      return;
    }

    const hasSelection = selectedItemId != null;
    const lineFeatures: GeoJSON.Feature[] = [];
    const pointFeatures: GeoJSON.Feature[] = [];
    const idxMap = new Map<string, number>();

    routes.forEach((route, idx) => {
      let geojson: GeoJSON.LineString | null = null;
      try {
        const parsed =
          typeof route.geometry_geojson === "string"
            ? JSON.parse(route.geometry_geojson)
            : route.geometry_geojson;
        if (
          parsed?.type === "LineString" &&
          Array.isArray(parsed.coordinates)
        ) {
          geojson = parsed as GeoJSON.LineString;
        }
      } catch {
        return;
      }
      if (!geojson) return;

      const config = getTransportConfig(route.transportation_type);
      const types = route.transportation_type ?? [];
      const icon =
        types.length > 1
          ? getSingleTransportConfig(types[0]).icon
          : config.icon;
      const distMi = (route.distance_m / 1609.34).toFixed(1);
      const isSelected = hasSelection && route.from_item_id === selectedItemId;
      const isDimmed = hasSelection && !isSelected;

      idxMap.set(route.id, idx);

      // Line feature — numeric id required for feature-state
      lineFeatures.push({
        type: "Feature",
        id: idx,
        properties: {
          routeId: route.id,
          fromItemId: route.from_item_id ?? "",
          transportTypes: JSON.stringify(types),
          color: config.color,
          dashed: !!config.dashArray,
          selected: isSelected,
          dimmed: isDimmed,
        },
        geometry: geojson,
      });

      // Midpoint badge — numeric id matches route idx for feature-state coordination
      const coords = geojson.coordinates;
      if (coords.length >= 2) {
        const mid = computeLineMidpoint(coords);
        pointFeatures.push({
          type: "Feature",
          id: idx,
          properties: {
            color: config.color,
            icon,
            distanceLabel: `${distMi} mi`,
            selected: isSelected,
            dimmed: isDimmed,
          },
          geometry: { type: "Point", coordinates: mid },
        });
      }
    });

    routeIdxMapRef.current = idxMap;
    routeSource.setData({ type: "FeatureCollection", features: lineFeatures });
    midpointSource.setData({
      type: "FeatureCollection",
      features: pointFeatures,
    });
  }, [routes, selectedItemId, mapLoaded, mapRef]);

  // ── Sync multiSelected feature-state whenever set changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !routes?.length) return;
    routes.forEach((route) => {
      const idx = routeIdxMapRef.current.get(route.id);
      if (idx === undefined) return;
      const val = selectedRouteIds?.has(route.id) ?? false;
      map.setFeatureState(
        { source: "routes", id: idx },
        { multiSelected: val },
      );
      map.setFeatureState(
        { source: "route-midpoints", id: idx },
        { multiSelected: val },
      );
    });
  }, [selectedRouteIds, routes, mapLoaded, mapRef]);

  // ── Hover + click + right-click handlers (registered once) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const onMouseMove = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      if (!e.features?.length) return;
      const fid = e.features[0].id as number;
      if (hoveredIdRef.current !== null && hoveredIdRef.current !== fid) {
        map.setFeatureState(
          { source: "routes", id: hoveredIdRef.current },
          { hover: false },
        );
        map.setFeatureState(
          { source: "route-midpoints", id: hoveredIdRef.current },
          { hover: false },
        );
      }
      hoveredIdRef.current = fid;
      map.setFeatureState({ source: "routes", id: fid }, { hover: true });
      map.setFeatureState(
        { source: "route-midpoints", id: fid },
        { hover: true },
      );
      map.getCanvas().style.cursor = "pointer";
    };

    const onMouseLeave = () => {
      if (hoveredIdRef.current !== null) {
        map.setFeatureState(
          { source: "routes", id: hoveredIdRef.current },
          { hover: false },
        );
        map.setFeatureState(
          { source: "route-midpoints", id: hoveredIdRef.current },
          { hover: false },
        );
        hoveredIdRef.current = null;
      }
      map.getCanvas().style.cursor = "";
    };

    const onClick = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties as {
        routeId: string;
        fromItemId: string;
      };
      const isMultiMod = e.originalEvent.ctrlKey || e.originalEvent.metaKey;
      if (isMultiMod) {
        onToggleRef.current?.(props.routeId);
      } else if (props.fromItemId) {
        onSelectActivityRef.current?.(props.fromItemId);
      }
    };

    const onContextMenu = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      if (!e.features?.length) return;
      e.originalEvent.preventDefault();
      const props = e.features[0].properties as {
        routeId: string;
        transportTypes: string;
      };
      let types: string[] = [];
      try {
        types = JSON.parse(props.transportTypes ?? "[]");
      } catch {
        /* ok */
      }
      const { clientX: x, clientY: y } = e.originalEvent;
      onContextMenuRef.current?.(props.routeId, types, x, y);
    };

    map.on("mousemove", "routes-line", onMouseMove);
    map.on("mouseleave", "routes-line", onMouseLeave);
    map.on("click", "routes-line", onClick);
    map.on("contextmenu", "routes-line", onContextMenu);

    return () => {
      map.off("mousemove", "routes-line", onMouseMove);
      map.off("mouseleave", "routes-line", onMouseLeave);
      map.off("click", "routes-line", onClick);
      map.off("contextmenu", "routes-line", onContextMenu);
    };
  }, [mapLoaded, mapRef]);
}
