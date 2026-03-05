import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Protocol, PMTiles } from "pmtiles";
import { GLOBAL_PMTILES_URL, PLACES_PMTILES_URL } from "../constants/paths";
import { defaultMapStyleJSON } from "../map/styles/default";
import type { NearbyPlan, DayItem, DayRoute } from "../supabase/itineraries";

// ── Active-plan preview layer IDs ──────────────────────────────────────────
const PLAN_ACTIVITIES_SOURCE = "active-plan-activities";
const PLAN_ROUTES_SOURCE = "active-plan-routes";
const PLAN_ACTIVITY_DOTS_LAYER = "active-plan-activity-dots";
const PLAN_ROUTE_LINE_LAYER = "active-plan-route-line";
const PLAN_ORDER_LABELS_LAYER = "active-plan-order-labels";

// ── Helper: build a DOM element for a plan thumbnail marker ───────────────
// IMPORTANT: MapLibre GL sets `transform: translate(x,y)` directly on the
// element you provide. Never set `style.transform` on `el` itself — it
// overwrites the positioning and snaps the marker to the map origin (0,0).
// The visual shell lives in a child `inner` div so we can scale it freely.
function makePlanMarkerEl(
  plan: NearbyPlan,
  onClick: () => void,
  onContextMenu?: (e: MouseEvent) => void,
): HTMLDivElement {
  // Outer wrapper — MapLibre owns its `transform` for positioning
  const el = document.createElement("div");
  el.style.cssText = "width:52px;height:52px;cursor:pointer;";

  // Inner visual shell — we scale this on hover, never the outer wrapper
  const inner = document.createElement("div");
  inner.style.cssText = [
    "width:52px",
    "height:52px",
    "border-radius:50%",
    "border:2.5px solid white",
    "box-shadow:0 2px 10px rgba(0,0,0,0.35)",
    "background-color:#99f6e4",
    "background-size:cover",
    "background-position:center",
    "transition:transform .15s ease,box-shadow .15s ease",
    "will-change:transform",
  ].join(";");
  el.appendChild(inner);

  // Blurhash placeholder first (base64 JPEG stored in DB)
  if (plan.image_blurhash) {
    inner.style.backgroundImage = `url('data:image/jpeg;base64,${plan.image_blurhash}')`;
  }
  // Swap to real image once loaded
  if (plan.image_url) {
    const img = new Image();
    img.onload = () => {
      inner.style.backgroundImage = `url('${plan.image_url}')`;
    };
    img.src = plan.image_url;
  }

  el.addEventListener("mouseenter", () => {
    inner.style.transform = "scale(1.18)";
    inner.style.boxShadow = "0 4px 18px rgba(0,0,0,0.45)";
  });
  el.addEventListener("mouseleave", () => {
    inner.style.transform = "scale(1)";
    inner.style.boxShadow = "0 2px 10px rgba(0,0,0,0.35)";
  });
  el.addEventListener("click", onClick);
  if (onContextMenu) {
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      onContextMenu(e);
    });
  }

  // Expose inner so callers can set border/shadow on the visual shell
  (el as HTMLDivElement & { _inner: HTMLDivElement })._inner = inner;
  return el;
}
import {
  loadPOIIcons,
  addPOILayers,
  updateHighlightSource,
  handleLabelClick,
  clearPolygonHighlight,
  addDebugLayers,
  removeDebugLayers,
  debugQueryRendered,
  debugFetchTile,
  POI_SOURCE_ID,
  POI_CIRCLES_LAYER_ID,
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
  const [mapZoom, setMapZoom] = useState(11);
  const [lastMoveTs, setLastMoveTs] = useState(0);
  const [highlightedCount, setHighlightedCount] = useState(0);

  // Plan thumbnail markers (kept in a ref so cleanup is straightforward)
  const planMarkersRef = useRef<maplibregl.Marker[]>([]);
  const activePlanMarkerId = useRef<string | null>(null);

  // ------ Track map center on move ------
  const handleViewportChange = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      const center = map.getCenter();
      setMapCenter({ lng: center.lng, lat: center.lat });
      setMapZoom(map.getZoom());
      setLastMoveTs(Date.now());
    }
  }, []);

  // ------ Initialise map ------
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Defer init by one rAF so the browser has flushed layout and the
    // container div has real pixel dimensions when MapLibre measures it.
    const rafId = requestAnimationFrame(() => {
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
        // Force the canvas to recalculate its size in case the container
        // dimensions were not finalised when the map was constructed.
        map.resize();

        // ---- POI icons + layers ----
        await loadPOIIcons(map);
        addPOILayers(map);

        // ---- Dev helpers exposed on window (no-op in prod builds if desired) ----
        if (typeof window !== "undefined") {
          const w = window as unknown as Record<string, unknown>;
          w.__map = map;
          w.__debugPOI = addDebugLayers;
          w.__debugPOIOff = removeDebugLayers;
          w.__debugPOIQuery = debugQueryRendered;
          w.__debugTile = debugFetchTile;
          console.info(
            "[POI debug] Console helpers ready:\n" +
              "  __debugPOI(__map)       — add raw debug layers + tile grid\n" +
              "  __debugPOIOff(__map)    — remove debug layers\n" +
              "  __debugPOIQuery(__map)  — log rendered feature counts\n" +
              "  __debugTile(z, x, y)   — fetch a tile directly and log response",
          );
        }

        // ---- Empty sources for active-plan preview layers ----
        map.addSource(PLAN_ACTIVITIES_SOURCE, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addSource(PLAN_ROUTES_SOURCE, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // Route dashes — sit below the activity dots
        map.addLayer({
          id: PLAN_ROUTE_LINE_LAYER,
          type: "line",
          source: PLAN_ROUTES_SOURCE,
          paint: {
            "line-color": "#0d9488",
            "line-width": 2.5,
            "line-dasharray": [3, 3],
            "line-opacity": 0.75,
          },
          layout: { "line-cap": "round" },
        });

        // Activity dots
        map.addLayer({
          id: PLAN_ACTIVITY_DOTS_LAYER,
          type: "circle",
          source: PLAN_ACTIVITIES_SOURCE,
          paint: {
            "circle-radius": 9,
            "circle-color": "#0d9488",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        // Order number labels on the dots
        map.addLayer({
          id: PLAN_ORDER_LABELS_LAYER,
          type: "symbol",
          source: PLAN_ACTIVITIES_SOURCE,
          layout: {
            "text-field": ["to-string", ["get", "order_index"]],
            "text-size": 10,
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#0d9488",
            "text-halo-width": 0,
          },
        });

        setMapLoaded(true);
      });

      // Track center + zoom for search distance sorting / "search here"
      map.on("moveend", handleViewportChange);
      map.on("zoomend", handleViewportChange);

      // ── Hover on POI circles / icons ──
      // Both layers show the same hover popup; circles and icons share the same
      // underlying tile feature so one handler covers both.
      const poiHoverLayers = [POI_ICON_LAYER_ID, POI_CIRCLES_LAYER_ID];
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
          <div class="poi-popup-hint">${props.category || ""}</div>
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

      // ---- Click on dot circle: zoom in to reveal icons if needed ----
      // If the icon is already visible (zoom ≥ 15) the icon-layer click handles
      // everything; this handler only acts when the user is zoomed out.
      const handleCircleDotClick = (e: maplibregl.MapLayerMouseEvent) => {
        if (!e.features?.length) return;
        const currentZoom = map.getZoom();
        if (currentZoom >= 15) return; // icon click will handle it
        const coords = (e.features[0].geometry as GeoJSON.Point)
          .coordinates as [number, number];
        map.flyTo({
          center: coords,
          zoom: Math.min(currentZoom + 3, 16),
          duration: 700,
        });
      };

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

        // If this label is backed by a polygon (landuse / building), fetch the
        // full geometry from Supabase and highlight it.
        await handleLabelClick(map, feature);

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
      map.on("click", POI_CIRCLES_LAYER_ID, handleCircleDotClick);
      for (const layer of [POI_ICON_LAYER_ID]) {
        map.on("click", layer, handleVectorPOIClick);
      }
      for (const layer of highlightHoverLayers) {
        map.on("click", layer, handleHighlightPOIClick);
      }

      // ---- Click: empty area → deselect + clear polygon highlight ----
      map.on("click", (e) => {
        const hits = map.queryRenderedFeatures(e.point, {
          layers: INTERACTIVE_LAYERS,
        });
        if (hits.length === 0) {
          setSelectedPOI(null);
          clearPolygonHighlight(map);
        }
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
    }); // end requestAnimationFrame

    return () => {
      cancelAnimationFrame(rafId);
      maplibregl.removeProtocol("pmtiles");
      mapRef.current?.remove();
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

  // ------ Plan thumbnail markers ------
  const clearPlanMarkers = useCallback(() => {
    planMarkersRef.current.forEach((m) => m.remove());
    planMarkersRef.current = [];
    activePlanMarkerId.current = null;
  }, []);

  const showPlanMarkers = useCallback(
    (
      plans: NearbyPlan[],
      onClickPlan: (plan: NearbyPlan) => void,
      onRightClickPlan?: (plan: NearbyPlan, e: MouseEvent) => void,
    ) => {
      const map = mapRef.current;
      if (!map) return;

      // Remove existing markers first
      planMarkersRef.current.forEach((m) => m.remove());
      planMarkersRef.current = [];
      activePlanMarkerId.current = null;

      plans.forEach((plan) => {
        if (plan.lat == null || plan.lng == null) return;
        const el = makePlanMarkerEl(
          plan,
          () => {
            // Reset all markers' inner border to default
            planMarkersRef.current.forEach((m) => {
              const inner = (
                m.getElement() as HTMLDivElement & { _inner?: HTMLDivElement }
              )._inner;
              if (inner) {
                inner.style.border = "2.5px solid white";
                inner.style.boxShadow = "0 2px 10px rgba(0,0,0,0.35)";
              }
            });
            // Highlight this marker's inner
            const inner = (el as HTMLDivElement & { _inner?: HTMLDivElement })
              ._inner;
            if (inner) {
              inner.style.border = "3px solid #0d9488";
              inner.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.35)";
            }
            activePlanMarkerId.current = plan.id;
            onClickPlan(plan);
          },
          onRightClickPlan ? (e) => onRightClickPlan(plan, e) : undefined,
        );
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([plan.lng, plan.lat])
          .addTo(map);
        planMarkersRef.current.push(marker);
      });
    },
    [],
  );

  // ------ Active-plan activity dots + route lines ------
  const showActivePlanOnMap = useCallback(
    (items: DayItem[], routes: DayRoute[]) => {
      const map = mapRef.current;
      if (!map || !map.getSource(PLAN_ACTIVITIES_SOURCE)) return;

      // Build activity GeoJSON
      const activityFeatures = items
        .filter((it) => it.lat != null && it.lng != null)
        .map((it, idx) => ({
          type: "Feature" as const,
          id: idx,
          geometry: { type: "Point" as const, coordinates: [it.lng!, it.lat!] },
          properties: {
            id: it.id,
            title: it.title,
            order_index: it.order_index,
            item_type: it.item_type,
            start_time: it.start_time ?? "",
          },
        }));

      // Build route GeoJSON — geometry_geojson may be a JSON string (text col)
      // or an already-parsed object (jsonb col). Handle both.
      const routeFeatures = routes
        .filter((r) => r.geometry_geojson)
        .map((r) => {
          try {
            const geom = r.geometry_geojson!;
            return (
              typeof geom === "string" ? JSON.parse(geom) : geom
            ) as GeoJSON.Feature;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as GeoJSON.Feature[];

      // If no routes stored, draw straight lines between consecutive items
      const linesToUse =
        routeFeatures.length > 0
          ? routeFeatures
          : (items
              .filter((it) => it.lat != null && it.lng != null)
              .slice(0, -1)
              .map((it, idx) => {
                const next = items.filter(
                  (x) => x.lat != null && x.lng != null,
                )[idx + 1];
                if (!next) return null;
                return {
                  type: "Feature" as const,
                  geometry: {
                    type: "LineString" as const,
                    coordinates: [
                      [it.lng!, it.lat!],
                      [next.lng!, next.lat!],
                    ],
                  },
                  properties: {},
                };
              })
              .filter(Boolean) as GeoJSON.Feature[]);

      (
        map.getSource(PLAN_ACTIVITIES_SOURCE) as maplibregl.GeoJSONSource
      ).setData({ type: "FeatureCollection", features: activityFeatures });
      (map.getSource(PLAN_ROUTES_SOURCE) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: linesToUse,
      });
    },
    [],
  );

  const clearActivePlanOnMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const empty: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    (
      map.getSource(PLAN_ACTIVITIES_SOURCE) as
        | maplibregl.GeoJSONSource
        | undefined
    )?.setData(empty);
    (
      map.getSource(PLAN_ROUTES_SOURCE) as maplibregl.GeoJSONSource | undefined
    )?.setData(empty);
    // Reset all marker borders (inner shell, not the marker wrapper)
    planMarkersRef.current.forEach((m) => {
      const inner = (
        m.getElement() as HTMLDivElement & { _inner?: HTMLDivElement }
      )._inner;
      if (inner) {
        inner.style.border = "2.5px solid white";
        inner.style.boxShadow = "0 2px 10px rgba(0,0,0,0.35)";
      }
    });
    activePlanMarkerId.current = null;
  }, []);

  return {
    mapContainerRef,
    mapRef,
    mapLoaded,
    selectedPOI,
    closePOI,
    loadingPOI,
    flyTo,
    mapCenter,
    mapZoom,
    lastMoveTs,
    highlightPlaces,
    clearHighlights,
    highlightedCount,
    showPlanMarkers,
    clearPlanMarkers,
    showActivePlanOnMap,
    clearActivePlanOnMap,
  };
}
