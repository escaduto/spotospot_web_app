import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Protocol, PMTiles } from "pmtiles";
import { GLOBAL_PMTILES_URL, PLACES_PMTILES_URL } from "../constants/paths";
import { defaultMapStyleJSON } from "../map/styles/default";
import {
  loadPOIIcons,
  addPOILayers,
  updateHighlightSource,
  POI_SOURCE_ID,
  POI_ICON_LAYER_ID,
  POI_HIGHLIGHT_SOURCE_ID,
  POI_HIGHLIGHT_CIRCLE_LAYER_ID,
  POI_HIGHLIGHT_ICON_LAYER_ID,
  INTERACTIVE_LAYERS,
} from "../map/scripts/poi-layers";
import {
  PlacePointResult,
  placesToGeoJSON,
  getPlaceDetails,
} from "../supabase/places";
import { getPOIConfig } from "../map/scripts/poi-config";

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
  const [loadingPOI, setLoadingPOI] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lng: number; lat: number }>({
    lng: -122.4107,
    lat: 37.7784,
  });
  const [highlightedCount, setHighlightedCount] = useState(0);

  // ------ Track map center on move ------
  const handleViewportChange = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      const center = map.getCenter();
      setMapCenter({ lng: center.lng, lat: center.lat });
    }
  }, []);

  // ------ Initialise map ------
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    // Register global basemap
    const globalTiles = new PMTiles(GLOBAL_PMTILES_URL);
    protocol.add(globalTiles);

    // Register places tiles
    const placesTiles = new PMTiles(PLACES_PMTILES_URL);
    protocol.add(placesTiles);

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
    });

    // Track center for search distance sorting
    map.on("moveend", handleViewportChange);

    // ── Hover on POI circles / icons ──
    const poiHoverLayers = [POI_ICON_LAYER_ID];
    const highlightHoverLayers = [
      POI_HIGHLIGHT_CIRCLE_LAYER_ID,
      POI_HIGHLIGHT_ICON_LAYER_ID,
    ];
    let hoveredPOI: { source: string; id: number | undefined } | null = null;
    let hoverPopup: maplibregl.Popup | null = null;

    const clearHover = () => {
      if (hoveredPOI && hoveredPOI.id != null) {
        const featureState =
          hoveredPOI.source === POI_SOURCE_ID
            ? {
                source: hoveredPOI.source,
                sourceLayer: "places",
                id: hoveredPOI.id,
              }
            : { source: hoveredPOI.source, id: hoveredPOI.id };
        map.setFeatureState(featureState, { hover: false });
      }
      hoveredPOI = null;
      map.getCanvas().style.cursor = "";
      hoverPopup?.remove();
      hoverPopup = null;
    };

    // Hover handler for vector tile POIs (has id, name, category, icon, importance_score)
    const makeVectorHoverHandler = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      if (!e.features?.length) return;
      const feat = e.features[0];
      const fid = feat.id as number | undefined;
      if (hoveredPOI?.id === fid && hoveredPOI?.source === POI_SOURCE_ID)
        return;

      clearHover();
      hoveredPOI = { source: POI_SOURCE_ID, id: fid };
      if (fid != null) {
        map.setFeatureState(
          { source: POI_SOURCE_ID, sourceLayer: "places", id: fid },
          { hover: true },
        );
      }
      map.getCanvas().style.cursor = "pointer";

      const props = feat.properties!;
      const cfg = getPOIConfig(props.category);
      const html = `
        <div class="poi-popup-card">
          <div class="poi-popup-badge" style="color:${cfg.color}">
            <span class="poi-popup-dot" style="background:${cfg.color}"></span>
            ${cfg.label}
          </div>
          <div class="poi-popup-name">${props.name || "Unknown"}</div>
          <div class="poi-popup-importance">Popularity: ${(
            Number(props.importance_score) * 100
          ).toFixed(1)}%</div>
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

    // Hover handler for GeoJSON highlight source (has full properties)
    const makeHighlightHoverHandler = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      if (!e.features?.length) return;
      const feat = e.features[0];
      const fid = feat.id as number | undefined;
      if (
        hoveredPOI?.id === fid &&
        hoveredPOI?.source === POI_HIGHLIGHT_SOURCE_ID
      )
        return;

      clearHover();
      hoveredPOI = { source: POI_HIGHLIGHT_SOURCE_ID, id: fid };
      if (fid != null) {
        map.setFeatureState(
          { source: POI_HIGHLIGHT_SOURCE_ID, id: fid },
          { hover: true },
        );
      }
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
      map.on("mousemove", layer, makeVectorHoverHandler);
      map.on("mouseleave", layer, clearHover);
    }
    for (const layer of highlightHoverLayers) {
      map.on("mousemove", layer, makeHighlightHoverHandler);
      map.on("mouseleave", layer, clearHover);
    }

    // ---- Click handler for vector tile POIs → fetch full details from DB ----
    const handleVectorPOIClick = async (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const props = feature.properties!;
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];
      const placeId = props.id as string;
      if (!placeId) return;

      // Show immediately with tile data, then enrich
      const cfg = getPOIConfig(props.category);
      setSelectedPOI({
        id: placeId,
        name: props.name || "Unknown",
        name_default: props.name || "",
        category: props.category || null,
        category_group: cfg.label,
        address: null,
        city: null,
        region: null,
        country: null,
        popularity_score: props.popularity_score ?? 0,
        is_top_destination: false,
        website_url: null,
        phone_number: null,
        coordinates: coords,
      });

      // Fetch full details from places table
      try {
        setLoadingPOI(true);
        const details = await getPlaceDetails(placeId);
        if (details?.place) {
          const p = details.place;
          setSelectedPOI((prev) =>
            prev?.id === placeId
              ? {
                  ...prev,
                  name: p.name_en || p.name_default,
                  name_default: p.name_default,
                  category: p.category,
                  category_group: p.category_group || cfg.label,
                  address: p.address,
                  city: p.city,
                  region: p.region,
                  country: p.country,
                  popularity_score: p.popularity_score ?? 0,
                  is_top_destination: p.is_top_destination ?? false,
                  website_url: p.website_url,
                  phone_number: p.phone_number,
                }
              : prev,
          );
        }
      } catch (err) {
        console.error("Error fetching place details:", err);
      } finally {
        setLoadingPOI(false);
      }
    };

    // ---- Click handler for highlight (GeoJSON) POIs ----
    const handleHighlightPOIClick = (e: maplibregl.MapLayerMouseEvent) => {
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

    // Click listeners
    for (const layer of poiHoverLayers) {
      map.on("click", layer, handleVectorPOIClick);
    }
    for (const layer of highlightHoverLayers) {
      map.on("click", layer, handleHighlightPOIClick);
    }

    // ---- Click: empty area → deselect ----
    map.on("click", (e) => {
      const hits = map.queryRenderedFeatures(e.point, {
        layers: INTERACTIVE_LAYERS,
      });
      if (hits.length === 0) setSelectedPOI(null);
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
    loadingPOI,
    flyTo,
    mapCenter,
    highlightPlaces,
    clearHighlights,
    highlightedCount,
  };
}
