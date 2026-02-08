/**
 * POI layer & source management for MapLibre GL.
 *
 * – Generates canvas-based category marker icons at runtime
 * – Adds a clustered GeoJSON source for POIs
 * – Configures cluster, icon, and label layers with
 *   popularity-based rendering priority (symbol-sort-key)
 */

import maplibregl from "maplibre-gl";
import { CATEGORY_GROUPS, DEFAULT_CATEGORY } from "./category-config";

// -------------------------------------------------
// Layer / source IDs (exported for event binding)
// -------------------------------------------------

export const POI_SOURCE_ID = "poi-places";
export const POI_LAYER_ID = "poi-points";
export const POI_LABEL_LAYER_ID = "poi-labels";
export const POI_CLUSTER_LAYER_ID = "poi-clusters";
export const POI_CLUSTER_COUNT_LAYER_ID = "poi-cluster-count";

// -------------------------------------------------
// Canvas marker helpers
// -------------------------------------------------

function createMarkerImage(
  color: string,
  emoji: string,
  size: number = 36,
): ImageData {
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Shadow
  ctx.beginPath();
  ctx.arc(size / 2, size / 2 + 1, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fill();

  // Coloured ring
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // White inner disc
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 5, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Emoji
  ctx.font = `${size * 0.38}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + 1);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function createClusterImage(size: number = 40): ImageData {
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(20, 184, 166, 0.2)";
  ctx.fill();

  // Inner circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.fillStyle = "#14B8A6";
  ctx.fill();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// -------------------------------------------------
// Public API
// -------------------------------------------------

/** Register all category marker images on the map */
export function loadCategoryIcons(map: maplibregl.Map): void {
  const pr = window.devicePixelRatio || 1;
  const size = 36;

  for (const [key, config] of Object.entries(CATEGORY_GROUPS)) {
    const imageId = `poi-${key}`;
    if (!map.hasImage(imageId)) {
      map.addImage(
        imageId,
        createMarkerImage(config.color, config.emoji, size),
        {
          pixelRatio: pr,
        },
      );
    }
  }

  if (!map.hasImage("poi-default")) {
    map.addImage(
      "poi-default",
      createMarkerImage(DEFAULT_CATEGORY.color, DEFAULT_CATEGORY.emoji, size),
      { pixelRatio: pr },
    );
  }

  if (!map.hasImage("poi-cluster")) {
    map.addImage("poi-cluster", createClusterImage(40), { pixelRatio: pr });
  }
}

/** Add the clustered GeoJSON source + all POI layers */
export function addPOILayers(map: maplibregl.Map): void {
  // Source – starts empty, updated via updatePOISource()
  map.addSource(POI_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 50,
  });

  // ---- Cluster circles ----
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

  // ---- Cluster count labels ----
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
    paint: {
      "text-color": "#FFFFFF",
    },
  });

  // ---- Individual POI markers ----
  map.addLayer({
    id: POI_LAYER_ID,
    type: "symbol",
    source: POI_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": [
        "coalesce",
        ["image", ["concat", "poi-", ["get", "category_group"]]],
        ["image", "poi-default"],
      ],
      "icon-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        8,
        0.6,
        12,
        0.8,
        16,
        1,
      ],
      "icon-allow-overlap": false,
      "icon-padding": 4,
      // Lower sort_key ⇒ rendered on top (higher popularity)
      "symbol-sort-key": ["get", "sort_key"],
      // Show labels only at z ≥ 13
      "text-field": ["step", ["zoom"], "", 13, ["get", "name"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 16, 12],
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      "text-optional": true,
      "text-max-width": 8,
    },
    paint: {
      "text-color": "#374151",
      "text-halo-color": "#FFFFFF",
      "text-halo-width": 1.5,
      "icon-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        0.7,
        10,
        0.9,
        14,
        1,
      ],
    },
  });
}

/** Replace the POI source data with a new FeatureCollection */
export function updatePOISource(
  map: maplibregl.Map,
  geojson: GeoJSON.FeatureCollection<GeoJSON.Point>,
): void {
  const source = map.getSource(POI_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (source) {
    source.setData(geojson);
  }
}
