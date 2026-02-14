import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Protocol, PMTiles } from "pmtiles";
import { PMTILES_URL } from "../constants/paths";
import { defaultMapStyleJSON } from "../map/styles/default";
import {
  loadPOIIcons,
  addPOILayers,
  updatePOISource,
  updateHighlightSource,
  POI_SOURCE_ID,
  POI_CIRCLE_LAYER_ID,
  POI_ICON_LAYER_ID,
  POI_CLUSTER_LAYER_ID,
  POI_HIGHLIGHT_SOURCE_ID,
  POI_HIGHLIGHT_CIRCLE_LAYER_ID,
  POI_HIGHLIGHT_ICON_LAYER_ID,
  INTERACTIVE_LAYERS,
} from "../map/scripts/poi-layers";
import {
  getPlacesInBounds,
  PlacePointResult,
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
  const [mapCenter, setMapCenter] = useState<{ lng: number; lat: number }>({
    lng: -122.4107,
    lat: 37.7784,
  });
  const [highlightedCount, setHighlightedCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchIdRef = useRef(0); // monotonic counter to ignore stale responses
  const lastBoundsRef = useRef<string | null>(null); // Track last fetched bounds

  // ------ Fetch POIs for current viewport ------
  const fetchPOIs = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    const zoom = map.getZoom();
    // Skip at very low zoom – too many POIs, query will be slow
    if (zoom < 6) {
      updatePOISource(map, { type: "FeatureCollection", features: [] });
      setPOICount(0);
      setLoadingPOIs(false);
      return;
    }

    const bounds = map.getBounds();
    const boundsObj: PlaceBounds = {
      minLng: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLng: bounds.getEast(),
      maxLat: bounds.getNorth(),
    };

    // Create a bounds signature to check if we've already fetched this area
    const boundsSignature = `${boundsObj.minLng.toFixed(4)},${boundsObj.minLat.toFixed(4)},${boundsObj.maxLng.toFixed(4)},${boundsObj.maxLat.toFixed(4)},${zoom.toFixed(1)}`;

    // Skip if we've already fetched this exact viewport
    if (lastBoundsRef.current === boundsSignature) {
      return;
    }

    lastBoundsRef.current = boundsSignature;
    const id = ++fetchIdRef.current;

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
    const map = mapRef.current;
    if (map) {
      const center = map.getCenter();
      setMapCenter({ lng: center.lng, lat: center.lat });
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Increase debounce to 800ms for better performance
    debounceRef.current = setTimeout(() => fetchPOIs(), 800);
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
      maxZoom: 22,
    });

    mapRef.current = map;

    map.on("load", async () => {
      // ---- POI icons + layers ----
      await loadPOIIcons(map);
      addPOILayers(map);

      setMapLoaded(true);
      fetchPOIs();
    });

    // Viewport change → reload POIs
    map.on("moveend", handleViewportChange);

    // ── Hover on POI circles / icons ──
    const poiHoverLayers = [POI_CIRCLE_LAYER_ID, POI_ICON_LAYER_ID];
    const highlightHoverLayers = [
      POI_HIGHLIGHT_CIRCLE_LAYER_ID,
      POI_HIGHLIGHT_ICON_LAYER_ID,
    ];
    let hoveredPOI: { source: string; id: number } | null = null;
    let hoverPopup: maplibregl.Popup | null = null;

    const clearHover = () => {
      if (hoveredPOI) {
        map.setFeatureState(
          { source: hoveredPOI.source, id: hoveredPOI.id },
          { hover: false },
        );
        hoveredPOI = null;
      }
      map.getCanvas().style.cursor = "";
      hoverPopup?.remove();
      hoverPopup = null;
    };

    const makeHoverHandler =
      (sourceId: string) =>
      (
        e: maplibregl.MapMouseEvent & {
          features?: maplibregl.MapGeoJSONFeature[];
        },
      ) => {
        if (!e.features?.length) return;
        const feat = e.features[0];
        const fid = feat.id as number;
        if (hoveredPOI?.id === fid && hoveredPOI?.source === sourceId) return;

        clearHover();
        hoveredPOI = { source: sourceId, id: fid };
        map.setFeatureState({ source: sourceId, id: fid }, { hover: true });
        map.getCanvas().style.cursor = "pointer";

        const props = feat.properties!;
        const location = [props.address, props.city].filter(Boolean).join(", ");
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

        hoverPopup = new maplibregl.Popup({
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

    for (const layer of poiHoverLayers) {
      map.on("mousemove", layer, makeHoverHandler(POI_SOURCE_ID));
      map.on("mouseleave", layer, clearHover);
    }
    for (const layer of highlightHoverLayers) {
      map.on("mousemove", layer, makeHoverHandler(POI_HIGHLIGHT_SOURCE_ID));
      map.on("mouseleave", layer, clearHover);
    }

    // ---- Click handler for POIs ----
    const handlePOIClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const props = feature.properties!;
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];

      setSelectedPOI({
        id: props._placeId,
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
    };

    // Click listeners for POI + highlight layers
    for (const layer of [...poiHoverLayers, ...highlightHoverLayers]) {
      map.on("click", layer, handlePOIClick);
    }

    // ---- Click: cluster → zoom in ----
    map.on("click", POI_CLUSTER_LAYER_ID, (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [POI_CLUSTER_LAYER_ID],
      });
      if (!features.length) return;

      const clusterId = features[0].properties!.cluster_id;
      const source = map.getSource(POI_SOURCE_ID) as maplibregl.GeoJSONSource;

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
        layers: INTERACTIVE_LAYERS,
      });
      if (hits.length === 0) setSelectedPOI(null);
    });

    // ---- Cursor affordance for clusters ----
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
      hoverPopup?.remove();
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

  // ------ Highlight search results on the map ------
  const highlightPlaces = useCallback(
    (places: PlacePointResult[], fitBounds = false) => {
      const map = mapRef.current;
      if (!map || places.length === 0) return;

      const geojson = placesToGeoJSON(places);
      updateHighlightSource(map, geojson);
      setHighlightedCount(places.length);

      // Optionally fit the map to show all highlighted places
      if (fitBounds && places.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        places.forEach((place) => {
          bounds.extend([place.lng, place.lat]);
        });

        map.fitBounds(bounds, {
          padding: { top: 120, bottom: 120, left: 450, right: 120 },
          maxZoom: 13, // Don't zoom out too much
          minZoom: 11, // Don't zoom in too close when showing multiple
          duration: 1500,
        });
      }
    },
    [],
  );

  // ------ Clear highlighted places ------
  const clearHighlights = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    updateHighlightSource(map, { type: "FeatureCollection", features: [] });
    setHighlightedCount(0);
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
    mapCenter,
    highlightPlaces,
    clearHighlights,
    highlightedCount,
  };
}
