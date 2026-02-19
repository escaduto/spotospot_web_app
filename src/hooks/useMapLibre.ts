import maplibregl, { StyleSpecification } from "maplibre-gl";
import { PMTiles, Protocol } from "pmtiles";
import { useRef, useEffect, useState } from "react";
import { GLOBAL_PMTILES_URL } from "../constants/paths";
import { defaultMapStyleJSON } from "../map/styles/default";

interface UseMapLibreProps {
  mapStyleJSON?: StyleSpecification | string;
  zoom?: number;
  mapCenter?: [number, number];
  minZoom?: number;
  maxZoom?: number;
  /** Add DEM hillshade layer on load (default true) */
  enableHillshade?: boolean;
  /** Enable 3-D terrain from DEM (default true) */
  enableTerrain?: boolean;
  /** Called once when the map style has loaded */
  onLoad?: (map: maplibregl.Map) => void;
  /** Called after every pan / zoom / rotate ends */
  onMoveEnd?: (map: maplibregl.Map) => void;
}

export const useMapLibre = ({
  mapStyleJSON = defaultMapStyleJSON,
  zoom = 9,
  mapCenter = [-122.4107, 37.7784],
  minZoom = 4,
  maxZoom = 18,
  enableHillshade = false,
  enableTerrain = false,
  onLoad,
  onMoveEnd,
}: UseMapLibreProps = {}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep callback refs stable so we never re-create the map
  const onLoadRef = useRef(onLoad);
  const onMoveEndRef = useRef(onMoveEnd);
  onLoadRef.current = onLoad;
  onMoveEndRef.current = onMoveEnd;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    const p = new PMTiles(GLOBAL_PMTILES_URL);
    protocol.add(p);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyleJSON,
      center: mapCenter,
      zoom: zoom,
      attributionControl: false,
      minZoom: minZoom,
      maxZoom: maxZoom,
    });

    mapRef.current = map;

    map.on("load", function () {
      if (enableHillshade || enableTerrain) {
        map.addSource("terrarium-dem", {
          type: "raster-dem",
          encoding: "terrarium",
          tiles: [
            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
          ],
          tileSize: 128,
          maxzoom: 13,
        });
      }

      if (enableHillshade) {
        map.addLayer({
          id: "hillshade-layer",
          source: "terrarium-dem",
          type: "hillshade",
          layout: { visibility: "visible" },
          paint: {
            "hillshade-exaggeration": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              0.1,
              12,
              0.2,
              13,
              0.3,
              15,
              0.1,
            ],
          },
        });
      }

      if (enableTerrain) {
        map.setTerrain({ source: "terrarium-dem" });
      }

      setIsLoaded(true);
      onLoadRef.current?.(map);
    });

    if (onMoveEndRef.current) {
      map.on("moveend", () => onMoveEndRef.current?.(map));
    }

    map.dragRotate.disable();
    map.keyboard.disable();
    map.touchZoomRotate.disableRotation();

    setMapInstance(map);

    return () => {
      maplibregl.removeProtocol("pmtiles");
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
      setIsLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { mapContainerRef, mapRef, mapInstance, isLoaded };
};
