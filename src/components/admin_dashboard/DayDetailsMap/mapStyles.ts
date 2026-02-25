import type maplibregl from "maplibre-gl";

/*
 * Layer z-ordering via symbol-sort-key ranges:
 *   Activities  → 0–999
 *   Search POIs → 1000–1999
 *   Routes      → rendered below all point layers (line type)
 *
 * Each source uses a single sort-key property so circles, icons,
 * and labels never fight each other for draw priority.
 */

// ─── Activities ──────────────────────────────────────────

export const activitiesCircle: maplibregl.LayerSpecification = {
  id: "activities-circle",
  type: "circle",
  source: "activities",
  paint: {
    "circle-radius": [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      18,
      ["boolean", ["feature-state", "editing"], false],
      18,
      ["boolean", ["feature-state", "hover"], false],
      18,
      12,
    ],
    "circle-color": [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      "#2563eb", // blue-600
      ["boolean", ["feature-state", "editing"], false],
      "#eab308", // yellow-500
      ["boolean", ["feature-state", "hover"], false],
      "#2563eb", // blue-600
      "#ffffff",
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      "#ffffff",
      ["boolean", ["feature-state", "editing"], false],
      "#ffffff",
      ["boolean", ["feature-state", "hover"], false],
      "#ffffff",
      "#3b82f6", // blue-500
    ],
  },
};

export const activitiesLabel: maplibregl.LayerSpecification = {
  id: "activities-label",
  type: "symbol",
  source: "activities",
  layout: {
    "text-field": ["get", "label"],
    "text-size": 16,
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    "text-allow-overlap": true,
    "text-ignore-placement": true,
    "symbol-sort-key": ["get", "sortKey"],
  },
  paint: {
    "text-color": [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      "#ffffff",
      ["boolean", ["feature-state", "editing"], false],
      "#ffffff",
      ["boolean", ["feature-state", "hover"], false],
      "#ffffff",
      "#374151", // gray-700
    ],
  },
};

// ─── Search POIs ─────────────────────────────────────────

export const searchPOIsCircle: maplibregl.LayerSpecification = {
  id: "search-pois-circle",
  type: "circle",
  source: "search-pois",

  layout: {
    "circle-sort-key": ["+", ["get", "sortKey"], 1000],
  },
  paint: {
    "circle-radius": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      20,
      3,
    ],
    "circle-color": ["get", "color"],
    "circle-stroke-color": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      ["get", "background"],
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
};

export const searchPOIsIcons: maplibregl.LayerSpecification = {
  id: "search-pois-icons",
  type: "symbol",
  source: "search-pois",
  layout: {
    "icon-image": ["get", "icon"],
    "icon-size": 0.5,
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
    "symbol-sort-key": ["get", "sortKey"],
  },
  paint: { "icon-color": "#ffffff" },
};

export const searchPOIsLabels: maplibregl.LayerSpecification = {
  id: "search-pois-label",
  type: "symbol",
  source: "search-pois",
  layout: {
    "text-field": ["get", "name"],
    "text-size": 10,
    "text-offset": [0, 1.5],
    "text-anchor": "top",
    "text-allow-overlap": false,
    "symbol-sort-key": ["get", "sortKey"],
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
};

// ─── Routes ──────────────────────────────────────────────

export const routeLine: maplibregl.LayerSpecification = {
  id: "routes-line",
  type: "line",
  source: "routes",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": ["get", "color"],
    "line-width": 5,
    "line-opacity": 0.7,
    "line-dasharray": [
      "case",
      ["boolean", ["get", "dashed"], false],
      ["literal", [1, 2]],
      ["literal", [1, 0]],
    ],
  },
};

/** Combined icon + distance label placed at route midpoints */
export const routeBadge: maplibregl.LayerSpecification = {
  id: "routes-badge",
  type: "symbol",
  source: "route-midpoints",
  layout: {
    "icon-image": ["get", "icon"],
    "icon-size": 0.5,
    "icon-anchor": "center",
    "text-field": ["get", "distanceLabel"],
    "text-size": 11,
    "text-font": ["Open Sans Regular", "Arial Unicode MS Bold"],
    "text-anchor": "left",
    "text-offset": [1.6, 0],
    "icon-allow-overlap": false,
    "text-allow-overlap": false,
    "icon-ignore-placement": true,
    "text-ignore-placement": true,
  },
  paint: {
    "icon-color": ["get", "color"],
    "text-color": ["get", "color"],
    "text-halo-color": "#ffffff",
    "text-halo-width": 2,
  },
};
