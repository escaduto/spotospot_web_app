/**
 * POI layer & source management for MapLibre GL (Discover page).
 *
 * Tile source has two source-layers:
 *   "labels"   — Point geometries (POIs, landuse label points, building label points).
 *                Properties: id, name, category, category_group, importance_score,
 *                            source_table, source_id, area_m2 (landuse/buildings only).
 *   "polygons" — Polygon/MultiPolygon geometries (landuse + building footprints).
 *                Properties: id, source_table, name, category, category_group,
 *                            importance_score, area_m2.
 *
 * Clicking a label with source_table in (landuse_features, building_features)
 * looks up the matching polygon, highlights its fill+outline, and fits the map
 * to its full extent.
 */

import maplibregl from "maplibre-gl";
import { poiCategoryList, POI_GROUPS } from "./poi-config";
import { PLACES_PMTILES_URL } from "@/src/constants/paths";
import { getPolygonGeometry } from "@/src/supabase/places";

// -------------------------------------------------
// Constants — source / layer IDs
// -------------------------------------------------

/** Vector tile source (serves both "labels" and "polygons" source-layers). */
export const POI_SOURCE_ID = "poi-places";

// ── Label / icon layers ──
export const POI_CIRCLES_LAYER_ID = "poi-circles";
export const POI_ICON_LAYER_ID = "poi-icons";
export const POI_LABEL_LAYER_ID = "poi-labels";
export const POI_CLUSTER_COUNT_LAYER_ID = "poi-cluster-count";

// ── Background polygon layers (from "polygons" source-layer) ──
export const POI_POLYGON_FILL_LAYER_ID = "poi-polygon-fill";
export const POI_POLYGON_OUTLINE_LAYER_ID = "poi-polygon-outline";

// ── GeoJSON source for the single clicked polygon highlight ──
export const POI_POLYGON_HIGHLIGHT_SOURCE_ID = "poi-polygon-highlight";
export const POI_POLYGON_HIGHLIGHT_FILL_LAYER_ID = "poi-polygon-highlight-fill";
export const POI_POLYGON_HIGHLIGHT_OUTLINE_LAYER_ID =
  "poi-polygon-highlight-outline";

// ── GeoJSON source for search-result highlights ──
export const POI_HIGHLIGHT_SOURCE_ID = "poi-highlight";
export const POI_HIGHLIGHT_CIRCLE_LAYER_ID = "poi-highlight-circles";
export const POI_HIGHLIGHT_ICON_LAYER_ID = "poi-highlight-icons";
export const POI_HIGHLIGHT_LABEL_LAYER_ID = "poi-highlight-labels";

/** Source tables that carry polygon geometry. */
const POLYGON_TABLES: ReadonlySet<string> = new Set([
  "landuse_features",
  "building_features",
]);

/** Layers that respond to click / hover interactions. */
export const INTERACTIVE_LAYERS = [
  POI_CIRCLES_LAYER_ID,
  POI_ICON_LAYER_ID,
  POI_HIGHLIGHT_CIRCLE_LAYER_ID,
  POI_HIGHLIGHT_ICON_LAYER_ID,
];

// -------------------------------------------------
// Expression builders
// -------------------------------------------------

/**
 * "match" expression: category → icon image name.
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

/**
 * "match" expression: category → hex fill colour.
 * Falls back to "#94a3b8" (slate-400) for unknown categories.
 */
function buildCategoryColorExpr(): maplibregl.ExpressionSpecification {
  const entries: string[] = [];
  const seen = new Set<string>();
  for (const [cat, cfg] of Object.entries(POI_GROUPS)) {
    if (seen.has(cat)) continue;
    seen.add(cat);
    entries.push(cat, cfg.color);
  }
  return [
    "match",
    ["get", "category"],
    ...entries,
    "#94a3b8",
  ] as unknown as maplibregl.ExpressionSpecification;
}

// -------------------------------------------------
// Icon loading
// -------------------------------------------------

/** Load all category PNG icons onto the map (awaitable). */
export async function loadPOIIcons(map: maplibregl.Map): Promise<void> {
  // "marker" is the fallback icon for unknown categories — must always be loaded.
  const iconsToLoad = [...new Set([...poiCategoryList, "marker"])];
  const promises = iconsToLoad.map(async (icon) => {
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
// Base zoom/importance filter (exported for dynamic filter building)
// -------------------------------------------------

export function buildPOIBaseFilter(): maplibregl.FilterSpecification {
  return [
    "any",
    // LANDUSE + BUILDINGS (cascading by importance)
    [
      "all",
      [
        "in",
        ["get", "source_table"],
        ["literal", ["landuse_features", "building_features"]],
      ],
      [
        "any",
        ["all", [">=", ["get", "importance_score"], 0.8], [">=", ["zoom"], 10]],
        ["all", [">=", ["get", "importance_score"], 0.7], [">=", ["zoom"], 11]],
        ["all", [">=", ["get", "importance_score"], 0.6], [">=", ["zoom"], 13]],
        ["all", [">=", ["get", "importance_score"], 0.5], [">=", ["zoom"], 14]],
        ["all", [">=", ["zoom"], 14]],
      ],
    ],
    // PLACES (cascaded by importance)
    [
      "all",
      ["==", ["get", "source_table"], "places"],
      [
        "any",
        [
          "all",
          [">=", ["get", "importance_score"], 0.88],
          [">=", ["zoom"], 12],
        ],
        [
          "all",
          [">=", ["get", "importance_score"], 0.84],
          [">=", ["zoom"], 13],
        ],
        ["all", [">=", ["get", "importance_score"], 0.8], [">=", ["zoom"], 14]],
        [
          "all",
          [">=", ["get", "importance_score"], 0.75],
          [">=", ["zoom"], 15],
        ],
        ["all", [">=", ["get", "importance_score"], 0.7], [">=", ["zoom"], 16]],
        [
          "all",
          [">=", ["get", "importance_score"], 0.65],
          [">=", ["zoom"], 17],
        ],
        ["all", [">=", ["get", "importance_score"], 0.5], [">=", ["zoom"], 18]],
      ],
    ],
  ] as unknown as maplibregl.FilterSpecification;
}

/**
 * Apply a category-group filter to the POI icon layer.
 * Pass `null` to reset to "show all".
 */
export function setPOICategoryFilter(
  map: maplibregl.Map,
  categoryGroups: string[] | null,
  categories: string[] | null,
): void {
  if (!map.getLayer(POI_ICON_LAYER_ID)) return;
  const base = buildPOIBaseFilter();
  if (!categoryGroups?.length && !categories?.length) {
    map.setFilter(POI_ICON_LAYER_ID, base);
    map.setFilter(POI_CIRCLES_LAYER_ID, null); // circles have minzoom, no base filter
    return;
  }
  const clauses: maplibregl.FilterSpecification[] = [
    base as maplibregl.FilterSpecification,
  ];
  if (categoryGroups?.length) {
    clauses.push([
      "in",
      ["get", "category_group"],
      ["literal", categoryGroups],
    ] as unknown as maplibregl.FilterSpecification);
  }
  if (categories?.length) {
    clauses.push([
      "in",
      ["get", "category"],
      ["literal", categories],
    ] as unknown as maplibregl.FilterSpecification);
  }
  const combined = [
    "all",
    ...clauses,
  ] as unknown as maplibregl.FilterSpecification;
  map.setFilter(POI_ICON_LAYER_ID, combined);
  map.setFilter(POI_CIRCLES_LAYER_ID, combined);
}

/** Show or hide the default POI vector tile layers (e.g. when showing search results). */
export function setPOILayerVisibility(
  map: maplibregl.Map,
  visible: boolean,
): void {
  const v = visible ? "visible" : "none";
  for (const id of [
    POI_ICON_LAYER_ID,
    POI_CIRCLES_LAYER_ID,
    POI_LABEL_LAYER_ID,
  ]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
  }
}

// -------------------------------------------------
// Sources & layers
// -------------------------------------------------

/** Add the vector tile source + all POI / polygon layers. Safe to call multiple times. */
export function addPOILayers(map: maplibregl.Map): void {
  if (map.getSource(POI_SOURCE_ID)) return;

  // ── Vector tile source — single "places" source-layer (labels + landuse + buildings).
  // maxzoom must match highest zoom baked by tippecanoe (z14); MapLibre overzooms above that.
  // minzoom matches --minimum-zoom passed to tippecanoe (default 10).
  //
  // NOTE: generate_tiles.py names the layer "labels" (--named-layer labels:...).
  // The layer name in the DEPLOYED tile must match here. Confirm with:
  //   __debugTile(z, x, y)  → inspect first bytes → ASCII layer name string.
  // If you regenerate tiles the layer name will be "labels" — update source-layer below.
  map.addSource(POI_SOURCE_ID, {
    type: "vector",
    tiles: [PLACES_PMTILES_URL],
    minzoom: 10,
    maxzoom: 14,
  });

  // ── GeoJSON source: clicked-polygon highlight (single feature) ──
  map.addSource(POI_POLYGON_HIGHLIGHT_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  // ── GeoJSON source: search-result highlight (no clustering) ──
  map.addSource(POI_HIGHLIGHT_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  // ── Background polygon tile layers: NOT added.
  // generate_tiles.py produces only ONE source-layer ("places" / "labels").
  // There is no "polygons" source-layer in the PMTiles bundle.
  // Polygon geometry is fetched on-demand from Supabase via get_polygon_geojson() RPC
  // and displayed through the GeoJSON highlight source below.

  // ── Highlighted polygon fill (clicked feature via GeoJSON source) ──
  map.addLayer({
    id: POI_POLYGON_HIGHLIGHT_FILL_LAYER_ID,
    type: "fill",
    source: POI_POLYGON_HIGHLIGHT_SOURCE_ID,
    paint: {
      "fill-color": ["coalesce", ["get", "color"], "#6366f1"],
      "fill-opacity": 0.1,
    },
  });

  // ── Highlighted polygon outline ──
  map.addLayer({
    id: POI_POLYGON_HIGHLIGHT_OUTLINE_LAYER_ID,
    type: "line",
    source: POI_POLYGON_HIGHLIGHT_SOURCE_ID,
    filter: [
      "any",
      // show only landuse polygons
      ["in", ["get", "source_table"], ["literal", ["landuse_features"]]],
    ],
    paint: {
      "line-color": ["coalesce", ["get", "color"], "#6366f1"],
      "line-opacity": 0.8,
      "line-width": 1,
      "line-dasharray": [2, 1],
    },
  });

  // ── POI dot indicators — small always-visible circles on the "labels" layer.
  // Rendered BEFORE the icon layer so icons paint on top.
  // When an icon is collision-hidden at low zoom these dots remain visible
  // and act as a "POIs exist here" hint; clicking zooms in to reveal icons.
  // Uses the same source filter as the icon layer below.
  // Landuse/buildings: free at any zoom (tippecanoe controls floor).
  // Places POIs: gated to z13+ client-side.
  const poiFilter = buildPOIBaseFilter();

  map.addLayer({
    id: POI_CIRCLES_LAYER_ID,
    type: "circle",
    source: POI_SOURCE_ID,
    "source-layer": "places",
    // filter: poiFilter,
    minzoom: 15,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 1.5, 16, 3],
      "circle-color": buildCategoryColorExpr(),
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
      "circle-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        1,
        0.5,
      ],
    },
  });

  // ── POI icon / label layer ──
  // icon-allow-overlap: false  → icons hide when they would collide.
  // icon-ignore-placement: true → our icons don't block basemap labels.
  // symbol-sort-key: (1 - importance) × 1000 — MapLibre places LOWER keys
  // first, so importance=1.0 → key 0 (placed first, wins collisions).
  map.addLayer({
    id: POI_ICON_LAYER_ID,
    type: "symbol",
    source: POI_SOURCE_ID,
    "source-layer": "places",
    filter: poiFilter,
    layout: {
      visibility: "visible",
      "icon-image": buildCategoryIconExpr(),
      "icon-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        0.4,
        13,
        0.3,
        16,
        0.4,
      ],
      "icon-allow-overlap": false,
      "icon-ignore-placement": false,
      "icon-optional": true,
      "icon-padding": 10,
      "symbol-sort-key": ["-", 100, ["get", "importance_score"]],
      "text-field": ["step", ["zoom"], "", 10, ["get", "name"]],
      "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 13, 10, 16, 11],
      "text-offset": [0, 1],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "text-optional": true,
    },
    paint: {
      "text-color": "#7a7a7a",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  });

  // ── Highlighted POI circles (search results) ──
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

  // ── Highlighted POI icons (search results) ──
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

  // ── Highlighted POI labels (search results, always shown) ──
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
// Debug helpers  (call from browser console)
// -------------------------------------------------

const DEBUG_LABELS_LAYER_ID = "__debug-labels-raw";
const DEBUG_POLYGONS_LAYER_ID = "__debug-polygons-raw";
const DEBUG_LABELS_TEXT_ID = "__debug-labels-text";

/**
 * Add bright debug layers that show EVERY feature in both source-layers with
 * no filters, zero collision logic, and IDs/importance printed as labels.
 *
 * Call from the browser console:
 *   window.__map && window.__debugPOI(window.__map)
 *
 * Or expose the map on window in useDiscoverMap:
 *   (window as any).__map = map;
 */
export function addDebugLayers(map: maplibregl.Map): void {
  if (!map.getSource(POI_SOURCE_ID)) {
    console.warn("addDebugLayers: POI source not loaded yet");
    return;
  }

  // Raw dot for every "places" feature — lime green, no filter
  if (!map.getLayer(DEBUG_LABELS_LAYER_ID)) {
    map.addLayer({
      id: DEBUG_LABELS_LAYER_ID,
      type: "circle",
      source: POI_SOURCE_ID,
      "source-layer": "places",
      paint: {
        "circle-radius": 5,
        "circle-color": "#00ff00",
        "circle-stroke-color": "#000000",
        "circle-stroke-width": 1,
        "circle-opacity": 0.9,
      },
    });
  }

  // Text label: "<source_table> | imp=<importance_score>"
  if (!map.getLayer(DEBUG_LABELS_TEXT_ID)) {
    map.addLayer({
      id: DEBUG_LABELS_TEXT_ID,
      type: "symbol",
      source: POI_SOURCE_ID,
      "source-layer": "places",
      layout: {
        "text-field": [
          "concat",
          ["coalesce", ["get", "source_table"], "?"],
          " |",
          ["to-string", ["coalesce", ["get", "importance_score"], -1]],
        ],
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-size": 9,
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#000000",
        "text-halo-color": "#ffff00",
        "text-halo-width": 1.5,
      },
    });
  }

  // Outline for every "polygons" feature — bright red, no filter
  if (!map.getLayer(DEBUG_POLYGONS_LAYER_ID)) {
    map.addLayer({
      id: DEBUG_POLYGONS_LAYER_ID,
      type: "line",
      source: POI_SOURCE_ID,
      "source-layer": "polygons",
      paint: {
        "line-color": "#ff0000",
        "line-width": 1.5,
        "line-opacity": 0.8,
      },
    });
  }

  // Show MapLibre's built-in tile grid (outlines + z/x/y numbers for every source)
  map.showTileBoundaries = true;

  console.info(
    "[POI debug] layers added.\n" +
      '  🟢 Green dots  = every feature in "labels" source-layer\n' +
      '  🔴 Red outline = every feature in "polygons" source-layer\n' +
      "  Yellow text   = source_table | importance_score\n" +
      "  🗺  Tile grid  = tile outlines + z/x/y numbers (all sources)\n" +
      "  Call __debugPOIOff(window.__map) to clean up.",
  );
}

/** Remove debug layers added by addDebugLayers(). */
export function removeDebugLayers(map: maplibregl.Map): void {
  for (const id of [DEBUG_LABELS_LAYER_ID, DEBUG_LABELS_TEXT_ID]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  map.showTileBoundaries = false;
  console.info("[POI debug] layers removed, tile grid hidden.");
}

/**
 * Log a summary of all rendered POI features in the current viewport to the
 * console, grouped by source_table.  Useful to confirm what the renderer
 * actually sees vs what the raw tile contains.
 *
 * Usage:  window.__debugPOIQuery(window.__map)
 */
export function debugQueryRendered(map: maplibregl.Map): void {
  // Source-layer is "places" in the current deployed tile.
  // After regenerating tiles with generate_tiles.py it will become "labels".
  const features = map.querySourceFeatures(POI_SOURCE_ID, {
    sourceLayer: "places",
  });

  const byTable = features.reduce(
    (acc, f) => {
      const t = (f.properties?.source_table as string) ?? "unknown";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.group("[POI debug] querySourceFeatures at current zoom");
  console.log("total features:", features.length, byTable);
  console.log(
    "sample importance scores:",
    features
      .slice(0, 20)
      .map(
        (f) =>
          `${f.properties?.source_table}:${f.properties?.importance_score}`,
      ),
  );
  console.groupEnd();
}

/**
 * Directly fetch a single tile from the places tile server and log the result.
 * Useful to diagnose whether the Cloudflare Worker is returning data at all.
 *
 * Usage from browser console:
 *   __debugTile(12, 654, 1582)   // z/x/y matching tippecanoe-decode output
 */
export async function debugFetchTile(
  z: number,
  x: number,
  y: number,
): Promise<void> {
  const url = PLACES_PMTILES_URL.replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));

  console.group(`[POI debug] Fetching tile ${z}/${x}/${y}`);
  console.log("URL:", url);

  try {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    console.log("HTTP status:", resp.status, resp.statusText);
    console.log("Content-Type:", resp.headers.get("content-type"));
    console.log("Content-Encoding:", resp.headers.get("content-encoding"));
    console.log("Bytes received:", buf.byteLength);
    if (buf.byteLength === 0) {
      console.warn(
        "⚠️  Empty tile (0 bytes) — worker has no data for this tile",
      );
    } else if (!resp.ok) {
      console.warn("⚠️  Non-2xx response — check worker logs");
    } else {
      console.log("✅  Tile received ok — data is coming from the worker");
      console.log(
        "First 16 bytes (hex):",
        Array.from(new Uint8Array(buf.slice(0, 16)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" "),
      );
    }
  } catch (err) {
    console.error("Fetch threw:", err);
    console.warn("⚠️  Network error — CORS block or worker is down");
  }
  console.groupEnd();
}

// -------------------------------------------------
// Geometry / bounds utilities
// -------------------------------------------------

/** Recursively extend a LngLatBounds from any GeoJSON geometry. */
function extendBoundsFromGeometry(
  bounds: maplibregl.LngLatBounds,
  geometry: GeoJSON.Geometry,
): void {
  switch (geometry.type) {
    case "Point":
      bounds.extend(geometry.coordinates as [number, number]);
      break;
    case "MultiPoint":
    case "LineString":
      for (const c of geometry.coordinates)
        bounds.extend(c as [number, number]);
      break;
    case "MultiLineString":
    case "Polygon":
      for (const ring of geometry.coordinates)
        for (const c of ring) bounds.extend(c as [number, number]);
      break;
    case "MultiPolygon":
      for (const poly of geometry.coordinates)
        for (const ring of poly)
          for (const c of ring) bounds.extend(c as [number, number]);
      break;
    case "GeometryCollection":
      for (const g of geometry.geometries) extendBoundsFromGeometry(bounds, g);
      break;
  }
}

// -------------------------------------------------
// Polygon highlight helpers
// -------------------------------------------------

/** Clear the clicked-polygon highlight layer. */
export function clearPolygonHighlight(map: maplibregl.Map): void {
  const src = map.getSource(POI_POLYGON_HIGHLIGHT_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  src?.setData({ type: "FeatureCollection", features: [] });
}

/**
 * Handle a click on any "labels" source-layer feature.
 *
 * - If the feature belongs to landuse_features / building_features, queries
 *   the "polygons" source-layer for the matching polygon, highlights it as a
 *   semi-opaque filled overlay, and fits the map to its full extent.
 * - For plain POI points the polygon highlight is cleared.
 *
 * @param map     The active MapLibre map instance.
 * @param feature The clicked feature from the "labels" source-layer.
 * @param color   Optional override colour for the highlight (defaults to category colour).
 */
/**
 * Handle a click on any "labels" source-layer feature.
 *
 * For landuse / building features: fetches the FULL polygon geometry directly
 * from Supabase (avoids tile-edge clipping from querySourceFeatures), paints
 * the highlight fill+outline, and fits the map to the complete polygon extent.
 *
 * For plain POI points: clears any existing polygon highlight.
 */
export async function handleLabelClick(
  map: maplibregl.Map,
  feature: maplibregl.MapGeoJSONFeature,
  color?: string,
): Promise<void> {
  const props = feature.properties ?? {};
  const sourceTable = props.source_table as string | undefined;
  const sourceId = props.source_id as string | undefined;

  // Not a polygon-backed feature → clear any existing highlight and return.
  if (!sourceTable || !sourceId || !POLYGON_TABLES.has(sourceTable)) {
    clearPolygonHighlight(map);
    return;
  }

  // Resolve the display colour for this category.
  const categoryColor =
    color ??
    POI_GROUPS[props.category as keyof typeof POI_GROUPS]?.color ??
    "#6366f1";

  // Fetch the complete polygon geometry from Supabase to avoid tile-edge
  // clipping artifacts that occur with querySourceFeatures on large polygons.
  const polygonFeature = await getPolygonGeometry(
    sourceTable as "landuse_features" | "building_features",
    sourceId,
  );

  if (!polygonFeature) {
    clearPolygonHighlight(map);
    return;
  }

  // Attach the category colour to the feature properties.
  const featureWithColor: GeoJSON.Feature = {
    ...polygonFeature,
    properties: { ...(polygonFeature.properties ?? {}), color: categoryColor },
  };

  // Push to the GeoJSON highlight source.
  const src = map.getSource(POI_POLYGON_HIGHLIGHT_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  src?.setData({ type: "FeatureCollection", features: [featureWithColor] });

  // Fit the map to the full polygon extent.
  const bounds = new maplibregl.LngLatBounds();
  extendBoundsFromGeometry(bounds, polygonFeature.geometry as GeoJSON.Geometry);
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 60, maxZoom: 18, duration: 600 });
  }
}

// -------------------------------------------------
// Search-result highlight helpers
// -------------------------------------------------

/** Replace search-result highlighted POI source data. */
export function updateHighlightSource(
  map: maplibregl.Map,
  geojson: GeoJSON.FeatureCollection<GeoJSON.Point>,
): void {
  const source = map.getSource(POI_HIGHLIGHT_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (source) source.setData(geojson);
}
