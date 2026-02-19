/**
 * POI layer & source management for MapLibre GL (Discover page).
 *
 * Uses SDF PNG icons matching the DayDetailsMap approach:
 *   circle (colored) + icon (white SDF) + label
 * Includes a clustered source for viewport POIs and a
 * non-clustered highlight source for search results.
 */

import maplibregl from "maplibre-gl";
import { poiCategoryList, POI_GROUPS } from "./poi-config";
import { PLACES_PMTILES_URL } from "@/src/constants/paths";

// -------------------------------------------------
// Layer / source IDs (exported for event binding)
// -------------------------------------------------

export const POI_SOURCE_ID = "poi-places";
export const POI_ICON_LAYER_ID = "poi-icons";
export const POI_LABEL_LAYER_ID = "poi-labels";
export const POI_CLUSTER_COUNT_LAYER_ID = "poi-cluster-count";

export const POI_HIGHLIGHT_SOURCE_ID = "poi-highlight";
export const POI_HIGHLIGHT_CIRCLE_LAYER_ID = "poi-highlight-circles";
export const POI_HIGHLIGHT_ICON_LAYER_ID = "poi-highlight-icons";
export const POI_HIGHLIGHT_LABEL_LAYER_ID = "poi-highlight-labels";

/** Layers that respond to click / hover interactions */
export const INTERACTIVE_LAYERS = [
  POI_ICON_LAYER_ID,
  POI_HIGHLIGHT_CIRCLE_LAYER_ID,
  POI_HIGHLIGHT_ICON_LAYER_ID,
];

// -------------------------------------------------
// Icon loading
// -------------------------------------------------

/**
 * Build a MapLibre "match" expression: category → icon image name.
 * Falls back to "marker" for unknown categories.
 */
function buildCategoryIconExpr(): maplibregl.ExpressionSpecification {
  const entries: string[] = [];
  const seen = new Set<string>();
  for (const [cat, cfg] of Object.entries(POI_GROUPS)) {
    if (seen.has(cat)) continue;
    seen.add(cat);
    entries.push(cat, cfg.icon);
  }
  return [
    "match",
    ["get", "category"],
    ...entries,
    "marker",
  ] as unknown as maplibregl.ExpressionSpecification;
}

/** Load all category SDF icon PNGs onto the map (awaitable). */
export async function loadPOIIcons(map: maplibregl.Map): Promise<void> {
  const promises = poiCategoryList.map(async (icon) => {
    if (map.hasImage(icon)) return;
    try {
      const img = await map.loadImage(`/icons/${icon}.png`);
      if (!map.hasImage(icon)) {
        map.addImage(icon, img.data);
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

  map.addSource(POI_SOURCE_ID, {
    type: "vector",
    tiles: [PLACES_PMTILES_URL],
    minzoom: 0,
    maxzoom: 14,
  });

  // ── Highlight source for search results (no clustering) ──
  map.addSource(POI_HIGHLIGHT_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  // ── Individual POI icons (pre-baked colored circle PNGs from convert-icons) ──
  map.addLayer({
    id: POI_ICON_LAYER_ID,
    type: "symbol",
    source: POI_SOURCE_ID,
    "source-layer": "places",
    layout: {
      visibility: "visible",
      "icon-image": buildCategoryIconExpr(),
      "icon-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        0.3,
        14,
        0.4,
        18,
        0.5,
      ],
      "icon-allow-overlap": false,
      "icon-ignore-placement": false,
      "icon-padding": 2,
      "symbol-sort-key": [
        "-",
        100,
        ["coalesce", ["get", "importance_score"], 0],
      ],
      "text-field": ["step", ["zoom"], "", 12, ["get", "name"]],
      "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
      "text-size": 10,
      "text-offset": [0, 1.8],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "text-optional": true,
    },
    filter: [
      "any",
      [
        "all",
        ["<", ["zoom"], 12],
        [">=", ["coalesce", ["get", "importance_score"], 0], 0.98],
      ],
      // zoom 12-12.99 → importance >= 0.95
      [
        "all",
        [">=", ["zoom"], 12],
        ["<", ["zoom"], 13],
        [">=", ["coalesce", ["get", "importance_score"], 0], 0.95],
      ],
      // zoom 13-13.99 → importance >= 0.90
      [
        "all",
        [">=", ["zoom"], 13],
        ["<", ["zoom"], 14],
        [">=", ["coalesce", ["get", "importance_score"], 0], 0.93],
      ],
      // zoom 14-14.99 → importance >= 0.85
      [
        "all",
        [">=", ["zoom"], 14],
        ["<", ["zoom"], 15],
        [">=", ["coalesce", ["get", "importance_score"], 0], 0.9],
      ],
      // zoom 15-15.99 → importance >= 0.80
      [
        "all",
        [">=", ["zoom"], 15],
        ["<", ["zoom"], 16],
        [">=", ["coalesce", ["get", "importance_score"], 0], 0.8],
      ],
      // zoom 16+ → show all
      [">=", ["zoom"], 16],
    ],
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
