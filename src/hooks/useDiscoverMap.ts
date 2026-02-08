import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Protocol, PMTiles } from "pmtiles";
import { PMTILES_URL } from "../constants/paths";
import { defaultMapStyleJSON } from "../map/styles/default";
import {
  loadCategoryIcons,
  addPOILayers,
  updatePOISource,
  POI_LAYER_ID,
  POI_CLUSTER_LAYER_ID,
} from "../map/scripts/poi-layers";
import {
  getPlacesInBounds,
  placesToGeoJSON,
  type PlaceBounds,
} from "../supabase/places";

// -------------------------------------------------
// Types
// -------------------------------------------------

export interface SelectedPOI {
  id: string;
  name: string;
  name_default: string;
  category: string | null;
  category_group: string;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  popularity_score: number;
  is_top_destination: boolean;
  website_url: string | null;
  phone_number: string | null;
  coordinates: [number, number];
}

// -------------------------------------------------
// Hook
// -------------------------------------------------

export function useDiscoverMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<SelectedPOI | null>(null);
  const [poiCount, setPOICount] = useState(0);
  const [loadingPOIs, setLoadingPOIs] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchIdRef = useRef(0); // monotonic counter to ignore stale responses

  // ------ Fetch POIs for current viewport ------
  const fetchPOIs = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    const zoom = map.getZoom();
    // Skip at very low zoom – too many POIs, query will be slow
    if (zoom < 6) {
      updatePOISource(map, { type: "FeatureCollection", features: [] });
      setPOICount(0);
      return;
    }

    const id = ++fetchIdRef.current;
    const bounds = map.getBounds();

    const boundsObj: PlaceBounds = {
      minLng: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLng: bounds.getEast(),
      maxLat: bounds.getNorth(),
    };

    setLoadingPOIs(true);
    try {
      const places = await getPlacesInBounds(boundsObj, zoom);
      // Only apply if this is still the latest request
      if (id !== fetchIdRef.current) return;
      const geojson = placesToGeoJSON(places);
      updatePOISource(map, geojson);
      setPOICount(places.length);
    } catch (err) {
      if (id === fetchIdRef.current) {
        console.error("Error fetching POIs:", err);
      }
    } finally {
      if (id === fetchIdRef.current) {
        setLoadingPOIs(false);
      }
    }
  }, []);

  // ------ Debounced handler for moveend / zoomend ------
  const handleViewportChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPOIs(), 500);
  }, [fetchPOIs]);

  // ------ Initialise map ------
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    const p = new PMTiles(PMTILES_URL);
    protocol.add(p);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: defaultMapStyleJSON,
      center: [-122.4107, 37.7784],
      zoom: 11,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 18,
    });

    mapRef.current = map;

    map.on("load", () => {
      // ---- POI icons + layers ----
      loadCategoryIcons(map);
      addPOILayers(map);

      setMapLoaded(true);
      fetchPOIs();
    });

    // Viewport change → reload POIs
    map.on("moveend", handleViewportChange);

    // ---- Click: individual POI ----
    map.on("click", POI_LAYER_ID, (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const props = feature.properties!;
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];

      setSelectedPOI({
        id: props.id,
        name: props.name,
        name_default: props.name_default,
        category: props.category,
        category_group: props.category_group,
        address: props.address,
        city: props.city,
        region: props.region,
        country: props.country,
        popularity_score: Number(props.popularity_score),
        is_top_destination:
          props.is_top_destination === true ||
          props.is_top_destination === "true",
        website_url: props.website_url,
        phone_number: props.phone_number,
        coordinates: coords,
      });
    });

    // ---- Click: cluster → zoom in ----
    map.on("click", POI_CLUSTER_LAYER_ID, (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [POI_CLUSTER_LAYER_ID],
      });
      if (!features.length) return;

      const clusterId = features[0].properties!.cluster_id;
      const source = map.getSource("poi-places") as maplibregl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.easeTo({
          center: (features[0].geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ],
          zoom,
        });
      });
    });

    // ---- Click: empty area → deselect ----
    map.on("click", (e) => {
      const hits = map.queryRenderedFeatures(e.point, {
        layers: [POI_LAYER_ID, POI_CLUSTER_LAYER_ID],
      });
      if (hits.length === 0) setSelectedPOI(null);
    });

    // ---- Cursor affordance ----
    map.on("mouseenter", POI_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", POI_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", POI_CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", POI_CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    // ---- Controls ----
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
      if (debounceRef.current) clearTimeout(debounceRef.current);
      maplibregl.removeProtocol("pmtiles");
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------ Fly to a location (used by search) ------
  const flyTo = useCallback((lng: number, lat: number, zoom: number = 15) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1500 });
  }, []);

  const closePOI = useCallback(() => setSelectedPOI(null), []);

  return {
    mapContainerRef,
    mapRef,
    mapLoaded,
    selectedPOI,
    closePOI,
    poiCount,
    loadingPOIs,
    flyTo,
  };
}
