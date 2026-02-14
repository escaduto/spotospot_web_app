import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Protocol, PMTiles } from "pmtiles";
import { PMTILES_URL } from "../constants/paths";
import { defaultMapStyleJSON } from "../map/styles/default";

export interface BaseMapOptions {
  initialCenter?: [number, number];
  initialZoom?: number;
  onMapLoad?: (map: maplibregl.Map) => void;
}

/**
 * Base map hook - provides core MapLibre functionality
 * Can be extended by specific use cases (discover, admin, etc.)
 */
export function useBaseMap(options: BaseMapOptions = {}) {
  const {
    initialCenter = [-122.4107, 37.7784],
    initialZoom = 11,
    onMapLoad,
  } = options;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lng: number; lat: number }>({
    lng: initialCenter[0],
    lat: initialCenter[1],
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    const p = new PMTiles(PMTILES_URL);
    protocol.add(p);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: defaultMapStyleJSON,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 22,
    });

    mapRef.current = map;

    map.on("load", () => {
      setMapLoaded(true);
      onMapLoad?.(map);
    });

    // Track map center
    map.on("move", () => {
      const center = map.getCenter();
      setMapCenter({ lng: center.lng, lat: center.lat });
    });

    // Controls
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    return () => {
      maplibregl.removeProtocol("pmtiles");
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to a location
  const flyTo = useCallback(
    (lng: number, lat: number, zoom: number = 15, duration: number = 1500) => {
      mapRef.current?.flyTo({ center: [lng, lat], zoom, duration });
    },
    [],
  );

  // Fit bounds to show multiple points
  const fitBounds = useCallback(
    (
      points: Array<{ lng: number; lat: number }>,
      options?: maplibregl.FitBoundsOptions,
    ) => {
      const map = mapRef.current;
      if (!map || points.length === 0) return;

      if (points.length === 1) {
        flyTo(points[0].lng, points[0].lat, 15);
        return;
      }

      const bounds = new maplibregl.LngLatBounds();
      points.forEach((point) => {
        bounds.extend([point.lng, point.lat]);
      });

      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 14,
        duration: 1500,
        ...options,
      });
    },
    [flyTo],
  );

  return {
    mapContainerRef,
    mapRef,
    mapLoaded,
    mapCenter,
    flyTo,
    fitBounds,
  };
}
