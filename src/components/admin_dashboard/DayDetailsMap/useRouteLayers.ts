import { useEffect } from "react";
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
}

/**
 * Pushes route LineStrings into the "routes" GeoJSON source.
 * All styling is handled by the `routes-line` / `routes-label` layers
 * registered in mapSetup, driven by feature properties.
 */
export function useRouteLayers({
  mapRef,
  mapLoaded,
  routes,
}: UseRouteLayersArgs) {
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
      return;
    }

    const lineFeatures: GeoJSON.Feature[] = [];
    const pointFeatures: GeoJSON.Feature[] = [];

    routes.forEach((route) => {
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

      // Line feature
      lineFeatures.push({
        type: "Feature",
        properties: {
          color: config.color,
          dashed: !!config.dashArray,
        },
        geometry: geojson,
      });

      // Midpoint feature for icon + label badge
      const coords = geojson.coordinates;
      if (coords.length >= 2) {
        const midIdx = Math.floor(coords.length / 2);
        const mid = coords[midIdx];
        pointFeatures.push({
          type: "Feature",
          properties: {
            color: config.color,
            icon,
            distanceLabel: `${distMi} mi`,
          },
          geometry: { type: "Point", coordinates: mid },
        });
      }
    });

    routeSource.setData({
      type: "FeatureCollection",
      features: lineFeatures,
    });
    midpointSource.setData({
      type: "FeatureCollection",
      features: pointFeatures,
    });
  }, [routes, mapLoaded, mapRef]);
}
