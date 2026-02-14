/**
 * POI layer & source management for MapLibre GL (Discover page).
 *
 * Uses SDF PNG icons matching the DayDetailsMap approach:
 *   circle (colored) + icon (white SDF) + label
 * Includes a clustered source for viewport POIs and a
 * non-clustered highlight source for search results.
 */

import maplibregl from "maplibre-gl";
import { poiCategoryList } from "./poi-config";

// -------------------------------------------------
// Layer / source IDs (exported for event binding)
// -------------------------------------------------

export const POI_SOURCE_ID = "poi-places";
export const POI_CIRCLE_LAYER_ID = "poi-circles";
export const POI_ICON_LAYER_ID = "poi-icons";
export const POI_LABEL_LAYER_ID = "poi-labels";
export const POI_CLUSTER_LAYER_ID = "poi-clusters";
export const POI_CLUSTER_COUNT_LAYER_ID = "poi-cluster-count";

export const POI_HIGHLIGHT_SOURCE_ID = "poi-highlight";
export const POI_HIGHLIGHT_CIRCLE_LAYER_ID = "poi-highlight-circles";
export const POI_HIGHLIGHT_ICON_LAYER_ID = "poi-highlight-icons";
export const POI_HIGHLIGHT_LABEL_LAYER_ID = "poi-highlight-labels";

/** Layers that respond to click / hover interactions */
export const INTERACTIVE_LAYERS = [
  POI_CIRCLE_LAYER_ID,
  POI_ICON_LAYER_ID,
  POI_CLUSTER_LAYER_ID,
  POI_HIGHLIGHT_CIRCLE_LAYER_ID,
  POI_HIGHLIGHT_ICON_LAYER_ID,
];

// -------------------------------------------------
// Icon loading
// -------------------------------------------------

/** Load all category SDF icon PNGs onto the map (awaitable). */
export async function loadPOIIcons(map: maplibregl.Map): Promise<void> {
  const promises = poiCategoryList.map(async (icon) => {
    if (map.hasImage(icon)) return;
    try {
      const img = await map.loadImage(`/icons/${icon}.png`);
      if (!map.hasImage(icon)) {
        map.addImage(icon, img.data, { sdf: true });
      }
    } catch (err) {
      console.warn(`Failed to load POI icon: ${icon}`, err);
    }
  });
  await Promise.all(promises);
}

// -------------------------------------------------
// Sources & layers
// -------------------------------------------------

/** Add the clustered GeoJSON source + all POI layers. Safe to call multiple times. */
export function addPOILayers(map: maplibregl.Map): void {
  if (map.getSource(POI_SOURCE_ID)) return;

  // ── Main POI source (clustered) ──
  map.addSource(POI_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 50,
  });

  // ── Highlight source for search results (no clustering) ──
  map.addSource(POI_HIGHLIGHT_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  // ── Cluster circles ──
  map.addLayer({
    id: POI_CLUSTER_LAYER_ID,
    type: "circle",
    source: POI_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#14B8A6",
        20,
        "#0D9488",
        50,
        "#0F766E",
      ],
      "circle-radius": ["step", ["get", "point_count"], 18, 20, 24, 50, 30],
      "circle-stroke-width": 3,
      "circle-stroke-color": "rgba(20, 184, 166, 0.25)",
    },
  });

  // ── Cluster count labels ──
  map.addLayer({
    id: POI_CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: POI_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["Noto Sans Regular"],
      "text-size": 13,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#FFFFFF" },
  });

  // ── Individual POI circles (colored by category) ──
  map.addLayer({
    id: POI_CIRCLE_LAYER_ID,
    type: "circle",
    source: POI_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        12,
        10,
      ],
      "circle-color": ["get", "color"],
      "circle-stroke-color": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        ["get", "bgColor"],
        "#ffffff",
      ],
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        3,
        2,
      ],
      "circle-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        1,
        0.85,
      ],
    },
  });

  // ── Individual POI icons (white SDF on colored circle) ──
  map.addLayer({
    id: POI_ICON_LAYER_ID,
    type: "symbol",
    source: POI_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": ["get", "icon"],
      "icon-size": 0.5,
      "icon-allow-overlap": false,
      "icon-ignore-placement": true,
      "symbol-sort-key": ["get", "sort_key"],
    },
    paint: { "icon-color": "#ffffff" },
  });

  // ── Individual POI labels ──
  map.addLayer({
    id: POI_LABEL_LAYER_ID,
    type: "symbol",
    source: POI_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    minzoom: 14,
    layout: {
      "text-field": ["get", "name"],
      "text-size": 10,
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "symbol-sort-key": ["get", "sort_key"],
    },
    paint: {
      "text-color": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        "#7c3aed",
        "#5c5c5c",
      ],
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  });

  // ── Highlighted POI circles ──
  map.addLayer({
    id: POI_HIGHLIGHT_CIRCLE_LAYER_ID,
    type: "circle",
    source: POI_HIGHLIGHT_SOURCE_ID,
    paint: {
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        16,
        12,
      ],
      "circle-color": ["get", "color"],
      "circle-stroke-color": ["get", "bgColor"],
      "circle-stroke-width": 3,
      "circle-opacity": 1,
    },
  });

  // ── Highlighted POI icons ──
  map.addLayer({
    id: POI_HIGHLIGHT_ICON_LAYER_ID,
    type: "symbol",
    source: POI_HIGHLIGHT_SOURCE_ID,
    layout: {
      "icon-image": ["get", "icon"],
      "icon-size": 1,
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: { "icon-color": "#ffffff" },
  });

  // ── Highlighted POI labels (always shown) ──
  map.addLayer({
    id: POI_HIGHLIGHT_LABEL_LAYER_ID,
    type: "symbol",
    source: POI_HIGHLIGHT_SOURCE_ID,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
      "text-size": 12,
      "text-offset": [0, 1.8],
      "text-anchor": "top",
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#0D9488",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    },
  });
}

// -------------------------------------------------
// Data helpers
// -------------------------------------------------

/** Replace the main POI source data */
export function updatePOISource(
  map: maplibregl.Map,
  geojson: GeoJSON.FeatureCollection<GeoJSON.Point>,
): void {
  const source = map.getSource(POI_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (source) source.setData(geojson);
}

/** Replace highlighted POI source data (search results) */
export function updateHighlightSource(
  map: maplibregl.Map,
  geojson: GeoJSON.FeatureCollection<GeoJSON.Point>,
): void {
  const source = map.getSource(POI_HIGHLIGHT_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (source) source.setData(geojson);
}
