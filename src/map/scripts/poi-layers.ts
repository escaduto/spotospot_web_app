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
export const POI_HIGHLIGHT_SOURCE_ID = "poi-highlight";
export const POI_HIGHLIGHT_LAYER_ID = "poi-highlight-points";

// -------------------------------------------------
// Canvas marker helpers
// -------------------------------------------------

function createMarkerImage(
  color: string,
  emoji: string,
  size: number = 28,
): ImageData {
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Subtle shadow
  ctx.beginPath();
  ctx.arc(size / 2, size / 2 + 0.5, size / 2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fill();

  // Main circle with gradient-like effect
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2 - size * 0.15,
    0,
    size / 2,
    size / 2,
    size / 2 - 1
  );
  gradient.addColorStop(0, lightenColor(color, 0.15));
  gradient.addColorStop(1, color);

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Subtle white border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Emoji (slightly larger and better positioned)
  ctx.font = `${size * 0.52}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Add subtle shadow to emoji
  ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
  ctx.shadowBlur = 1;
  ctx.shadowOffsetY = 0.5;

  ctx.fillText(emoji, size / 2, size / 2 + 0.5);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Helper function to lighten a color
function lightenColor(color: string, amount: number): string {
  const hex = color.replace("#", "");
  const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + amount * 255);
  const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + amount * 255);
  const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + amount * 255);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
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
  const size = 28; // Smaller, more condensed

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
    map.addImage("poi-cluster", createClusterImage(34), { pixelRatio: pr });
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

  // Highlight source for search results (no clustering)
  map.addSource(POI_HIGHLIGHT_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
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
        0.55,
        11,
        0.7,
        14,
        0.9,
        17,
        1.1,
      ],
      "icon-allow-overlap": false,
      "icon-padding": 2, // Reduced padding for more condensed feel
      // Lower sort_key ⇒ rendered on top (higher popularity)
      "symbol-sort-key": ["get", "sort_key"],
      // Show labels only at z ≥ 14 for less clutter
      "text-field": ["step", ["zoom"], "", 14, ["get", "name"]],
      "text-font": ["Noto Sans Medium"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 14, 9, 17, 11],
      "text-offset": [0, 1.3],
      "text-anchor": "top",
      "text-optional": true,
      "text-max-width": 10,
    },
    paint: {
      "text-color": "#1f2937",
      "text-halo-color": "#FFFFFF",
      "text-halo-width": 2,
      "text-halo-blur": 0.5,
      "icon-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        0.6,
        10,
        0.85,
        14,
        1,
      ],
    },
  });

  // ---- Highlighted POI markers (search results) - rendered on top ----
  map.addLayer({
    id: POI_HIGHLIGHT_LAYER_ID,
    type: "symbol",
    source: POI_HIGHLIGHT_SOURCE_ID,
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
        0.9,
        12,
        1.25,
        17,
        1.5,
      ],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      // Always show labels for highlighted POIs
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 12, 17, 15],
      "text-offset": [0, 1.6],
      "text-anchor": "top",
      "text-optional": false,
      "text-max-width": 12,
      "symbol-sort-key": -1000, // Always render on top
    },
    paint: {
      "text-color": "#0D9488",
      "text-halo-color": "#FFFFFF",
      "text-halo-width": 2.5,
      "text-halo-blur": 0.5,
      "icon-opacity": 1,
    },
  });
}

/** Update highlighted POI source with search results */
export function updateHighlightSource(
  map: maplibregl.Map,
  geojson: GeoJSON.FeatureCollection<GeoJSON.Point>,
): void {
  const source = map.getSource(POI_HIGHLIGHT_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (source) {
    source.setData(geojson);
  }
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
