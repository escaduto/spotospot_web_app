import { glyphsURL, mapSource } from "@/src/constants/paths";
import { StyleSpecification } from "maplibre-gl";

// ─────────────────────────────────────────────────────────────────────────────
// Global Minimal Basemap  (z 0 – 7)
//
// Designed for the destination-discovery view: shows landcover texture, water,
// country / region boundaries and major place labels. Everything else is
// stripped out to keep the map clean and fast at very low zooms.
//
// Layer order (bottom → top):
//   background → earth → landcover → water → landuse (nature only)
//   → boundaries → roads (highway only) → place labels
// ─────────────────────────────────────────────────────────────────────────────

// Bright pastel colour constants
const C = {
  // Base land
  earth: "#f5f1ea",
  earthDeep: "#ede7dc",

  // Landcover — very desaturated (Apple/Google level subtlety)
  forest: "#d0dfc4",
  farmland: "#eae7d6",
  grassland: "#d8e8c4",
  scrub: "#dcdcbc",
  glacier: "#e4f0f8",
  barren: "#e4ddd0",
  urban: "#e4e0dc",

  // Landuse fills (z10+)
  residential: "#ede9e2",
  commercial: "#f0e8d8",
  industrial: "#e4ddd4",
  retail: "#f0e4dc",
  hospital: "#fdeaea",
  education: "#fef8e4",
  park: "#d4e8c0",
  parkDark: "#c8e0b0",
  cemetery: "#d8e8d0",
  beach: "#f0e8c4",
  wetland: "#ccddb8",

  // Buildings
  buildingFill: "#e8e2da",
  buildingStroke: "#ccc8c0",

  // Water
  ocean: "#cfebfc",
  water: "#cfebfc",

  // Boundary lines
  countryLine: "#9090a8",
  regionLine: "#b0b0c0",

  // Roads — Apple/Google hierarchy
  highwayCasing: "#c09030",
  highway: "#fffb80",
  majorCasing: "#c8c4bc",
  major: "#dbdbdb",
  mediumCasing: "#d0ccc4",
  medium: "#ebeae8",
  minorCasing: "#d8d6d0",
  minor: "#ebeae8",
  service: "#eeecea",
  rail: "#c4bcd0",
  railDash: "#e8e4ee",

  // Labels
  labelDark: "#2a2826",
  labelMid: "#585450",
  labelLight: "#888480",
  labelWater: "#4a85a8",
  haloColor: "#ffffff",
} as const;

export const globalMinimal: StyleSpecification = {
  version: 8,
  name: "Global Minimal",
  sources: {
    terrasketch: mapSource,
  },
  glyphs: glyphsURL,
  layers: [
    // ── 1. Background ─────────────────────────────────────────────────────────
    {
      id: "background",
      type: "background",
      paint: { "background-color": C.earth },
    },

    // ── 2. Earth (land mass) ─────────────────────────────────────────────────
    // Natural Earth polygons z0–z4, OSM coastline z5+
    {
      id: "earth",
      type: "fill",
      source: "terrasketch",
      "source-layer": "earth",
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          C.earth,
          7,
          C.earthDeep,
        ],
      },
    },

    // ── 3. Landcover (Daylight, z0–z7) ───────────────────────────────────────
    // Single layer; colour driven by "kind" match expression.
    {
      id: "landcover",
      type: "fill",
      source: "terrasketch",
      "source-layer": "landcover",
      filter: [
        "in",
        ["get", "kind"],
        [
          "literal",
          [
            "barren",
            "farmland",
            "forest",
            "glacier",
            "grassland",
            "scrub",
            "urban_area",
          ],
        ],
      ],
      paint: {
        "fill-color": [
          "match",
          ["get", "kind"],
          "forest",
          C.forest,
          "farmland",
          C.farmland,
          "grassland",
          C.grassland,
          "scrub",
          C.scrub,
          "glacier",
          C.glacier,
          "barren",
          C.barren,
          "urban_area",
          C.urban,
          /* default */ C.earthDeep,
        ],
        // Very low opacity — fades out at z10 as OSM landuse takes over
        "fill-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          0,
          2,
          0.3,
          5,
          0.45,
          8,
          0.5,
          10,
          0.2,
          12,
          0,
        ],
      },
    },

    // ── 4. Landuse: nature (z6+, before water so ocean clips bleed) ───────────
    {
      id: "landuse_nature",
      type: "fill",
      source: "terrasketch",
      "source-layer": "landuse",
      minzoom: 6,
      filter: [
        "in",
        ["get", "kind"],
        [
          "literal",
          [
            "national_park",
            "nature_reserve",
            "protected_area",
            "forest",
            "wood",
            "park",
            "grass",
            "grassland",
            "scrub",
            "beach",
            "glacier",
            "wetland",
            "cemetery",
            "allotments",
          ],
        ],
      ],
      paint: {
        "fill-color": [
          "match",
          ["get", "kind"],
          ["forest", "wood"],
          C.forest,
          ["grass", "grassland"],
          C.grassland,
          "scrub",
          C.scrub,
          ["national_park", "nature_reserve", "protected_area"],
          C.park,
          "park",
          C.park,
          "beach",
          C.beach,
          "glacier",
          C.glacier,
          "wetland",
          C.wetland,
          "cemetery",
          C.cemetery,
          "allotments",
          C.farmland,
          C.earthDeep,
        ],
        "fill-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6,
          0,
          8,
          0.7,
          12,
          0.85,
        ],
      },
    },

    // ── 4b. Landuse: urban fabric (z10+) ────────────────────────────────────
    {
      id: "landuse_urban",
      type: "fill",
      source: "terrasketch",
      "source-layer": "landuse",
      minzoom: 10,
      filter: [
        "in",
        ["get", "kind"],
        [
          "literal",
          [
            "residential",
            "commercial",
            "industrial",
            "retail",
            "military",
            "railway",
          ],
        ],
      ],
      paint: {
        "fill-color": [
          "match",
          ["get", "kind"],
          "residential",
          C.residential,
          "commercial",
          C.commercial,
          "industrial",
          C.industrial,
          "retail",
          C.retail,
          C.earthDeep,
        ],
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0, 11, 0.75],
      },
    },

    // ── 4c. Landuse: special (z12+) ──────────────────────────────────────────
    {
      id: "landuse_special",
      type: "fill",
      source: "terrasketch",
      "source-layer": "landuse",
      minzoom: 12,
      filter: [
        "in",
        ["get", "kind"],
        [
          "literal",
          [
            "hospital",
            "university",
            "college",
            "school",
            "kindergarten",
            "stadium",
            "sports_centre",
            "golf_course",
            "recreation_ground",
          ],
        ],
      ],
      paint: {
        "fill-color": [
          "match",
          ["get", "kind"],
          "hospital",
          C.hospital,
          ["university", "college", "school", "kindergarten"],
          C.education,
          C.park,
        ],
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 13, 0.65],
      },
    },

    // ── 5. Water fills (rendered after landuse so it clips any bleed) ─────────
    {
      id: "water",
      type: "fill",
      filter: ["==", ["geometry-type"], "Polygon"],
      source: "terrasketch",
      "source-layer": "water",
      paint: {
        "fill-color": ["match", ["get", "kind"], "ocean", C.ocean, C.water],
        "fill-antialias": true,
      },
    },

    // ── 6. Country boundaries ─────────────────────────────────────────────────
    {
      id: "boundaries_country",
      type: "line",
      source: "terrasketch",
      "source-layer": "boundaries",
      filter: ["==", ["get", "kind"], "country"],
      minzoom: 1,
      paint: {
        "line-color": C.countryLine,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1,
          0.4,
          4,
          0.8,
          7,
          1.2,
        ],
        "line-opacity": 0.8,
      },
    },

    // ── 7. Region (state / province) boundaries ───────────────────────────────
    {
      id: "boundaries_region",
      type: "line",
      source: "terrasketch",
      "source-layer": "boundaries",
      filter: ["==", ["get", "kind"], "region"],
      minzoom: 4,
      paint: {
        "line-color": C.regionLine,
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.3, 7, 0.7],
        "line-dasharray": [3, 3],
        "line-opacity": 0.6,
      },
    },

    // ── 8. Rail (z10+) ────────────────────────────────────────────────────────
    {
      id: "rail_casing",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: [
        "in",
        ["get", "kind"],
        ["literal", ["rail", "subway", "light_rail", "tram"]],
      ],
      minzoom: 10,
      layout: { "line-cap": "butt" },
      paint: {
        "line-color": C.rail,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          2,
          14,
          5,
          17,
          8,
        ],
        "line-opacity": 0.5,
      },
    },
    {
      id: "rail",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: [
        "in",
        ["get", "kind"],
        ["literal", ["rail", "subway", "light_rail", "tram"]],
      ],
      minzoom: 10,
      layout: { "line-cap": "butt" },
      paint: {
        "line-color": C.railDash,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          0.8,
          14,
          2,
          17,
          3,
        ],
        "line-dasharray": [3, 3],
      },
    },

    // ── 9. Service roads (z14+) ───────────────────────────────────────────────
    {
      id: "roads_service",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: ["in", ["get", "kind"], ["literal", ["other", "path"]]],
      minzoom: 14,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.service,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14,
          1.5,
          16,
          4,
          18,
          8,
        ],
      },
    },

    // ── 10. Minor roads (z12+) ────────────────────────────────────────────────
    {
      id: "roads_minor_casing",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "minor_road"],
      minzoom: 12,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.minorCasing,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          2,
          14,
          5,
          16,
          10,
          18,
          18,
        ],
      },
    },
    {
      id: "roads_minor",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "minor_road"],
      minzoom: 12,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.minor,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          1,
          14,
          3.5,
          16,
          8,
          18,
          14,
        ],
      },
    },

    // ── 11. Medium roads (z9+) ────────────────────────────────────────────────
    {
      id: "roads_medium_casing",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "medium_road"],
      minzoom: 9,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.mediumCasing,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          2,
          12,
          4,
          15,
          10,
          18,
          18,
        ],
      },
    },
    {
      id: "roads_medium",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "medium_road"],
      minzoom: 9,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.medium,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          1,
          12,
          3,
          15,
          8,
          18,
          16,
        ],
      },
    },

    // ── 12. Major roads (z7+) ─────────────────────────────────────────────────
    {
      id: "roads_major_casing",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "major_road"],
      minzoom: 14,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.majorCasing,
        "line-width": ["interpolate", ["linear"], ["zoom"], 14, 10, 18, 20],
      },
    },
    {
      id: "roads_major",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "major_road"],
      minzoom: 7,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.major,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          7,
          1,
          10,
          3,
          14,
          8,
          18,
          16,
        ],
      },
    },

    // ── 13. Highways (z5+) ────────────────────────────────────────────────────
    {
      id: "roads_highway_casing",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "highway"],
      minzoom: 5,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.highwayCasing,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6,
          1,
          8,
          4,
          12,
          8,
          15,
          16,
          18,
          22,
        ],
      },
    },
    {
      id: "roads_highway",
      type: "line",
      source: "terrasketch",
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "highway"],
      minzoom: 5,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.highway,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          1,
          8,
          3,
          12,
          6,
          15,
          12,
          18,
          18,
        ],
      },
    },

    // ── 14. Buildings (z14+) ──────────────────────────────────────────────────
    {
      id: "buildings",
      type: "fill",
      source: "terrasketch",
      "source-layer": "buildings",
      minzoom: 14,
      paint: {
        "fill-color": C.buildingFill,
        "fill-outline-color": C.buildingStroke,
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, 0.9],
      },
    },

    // ── Water labels ──────────────────────────────────────────────────────────
    {
      id: "water_labels",
      type: "symbol",
      source: "terrasketch",
      "source-layer": "water",
      minzoom: 2,
      filter: [
        "in",
        ["get", "kind"],
        ["literal", ["ocean", "water", "lake", "bay", "strait"]],
      ],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          10,
          5,
          12,
          10,
          14,
        ],
        "text-max-width": 10,
        "text-letter-spacing": 0.08,
        "symbol-placement": "point",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": C.labelWater,
        "text-halo-color": C.haloColor,
        "text-halo-width": 1,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0, 3, 1],
      },
    },

    // ── Country labels ────────────────────────────────────────────────────────
    {
      id: "places_country",
      type: "symbol",
      source: "terrasketch",
      "source-layer": "places",
      filter: ["==", ["get", "kind"], "country"],
      minzoom: 1,
      maxzoom: 9,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 1, 10, 4, 13, 7, 15],
        "text-max-width": 8,
        "text-letter-spacing": 0.15,
        "text-transform": "uppercase",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": C.labelDark,
        "text-halo-color": C.haloColor,
        "text-halo-width": 1,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0, 2, 1],
      },
    },

    // ── Region labels ─────────────────────────────────────────────────────────
    {
      id: "places_region",
      type: "symbol",
      source: "terrasketch",
      "source-layer": "places",
      filter: ["==", ["get", "kind"], "region"],
      minzoom: 4,
      maxzoom: 10,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 9, 8, 12],
        "text-max-width": 8,
        "text-letter-spacing": 0.12,
        "text-transform": "uppercase",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": C.labelLight,
        "text-halo-color": C.haloColor,
        "text-halo-width": 1,
      },
    },

    // ── Major city labels (population_rank ≥ 9, z3+) ─────────────────────────
    {
      id: "places_locality_major",
      type: "symbol",
      source: "terrasketch",
      "source-layer": "places",
      filter: [
        "all",
        ["==", ["get", "kind"], "locality"],
        [">=", ["coalesce", ["get", "population_rank"], 0], 9],
      ],
      minzoom: 3,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          10,
          6,
          12,
          10,
          14,
          14,
          16,
        ],
        "text-max-width": 9,
        "text-allow-overlap": false,
        "text-anchor": "top",
        "text-offset": [0, 0.3],
      },
      paint: {
        "text-color": C.labelDark,
        "text-halo-color": C.haloColor,
        "text-halo-width": 1,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0, 4, 1],
      },
    },

    // ── Mid-tier city labels (rank 5–8, z6+) ──────────────────────────────────
    {
      id: "places_locality_mid",
      type: "symbol",
      source: "terrasketch",
      "source-layer": "places",
      filter: [
        "all",
        ["==", ["get", "kind"], "locality"],
        [">=", ["coalesce", ["get", "population_rank"], 0], 5],
        ["<", ["coalesce", ["get", "population_rank"], 0], 9],
      ],
      minzoom: 6,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6,
          9,
          10,
          12,
          14,
          14,
        ],
        "text-max-width": 8,
        "text-allow-overlap": false,
        "text-anchor": "top",
        "text-offset": [0, 0.3],
      },
      paint: {
        "text-color": C.labelDark,
        "text-halo-color": C.haloColor,
        "text-halo-width": 1,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 7, 1],
      },
    },

    // ── Neighbourhood labels (z11+) ───────────────────────────────────────────
    {
      id: "places_neighbourhood",
      type: "symbol",
      source: "terrasketch",
      "source-layer": "places",
      filter: [
        "in",
        ["get", "kind"],
        ["literal", ["neighbourhood", "suburb", "quarter", "borough"]],
      ],
      minzoom: 11,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 9, 14, 11],
        "text-max-width": 8,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.1,
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": C.labelLight,
        "text-halo-color": C.haloColor,
        "text-halo-width": 1,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0, 12, 1],
      },
    },

    // ── Road labels (z13+) ────────────────────────────────────────────────────
    {
      id: "roads_labels",
      type: "symbol",
      source: "terrasketch",
      "source-layer": "roads",
      filter: [
        "in",
        ["get", "kind"],
        ["literal", ["highway", "major_road", "medium_road", "minor_road"]],
      ],
      minzoom: 13,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          9,
          15,
          11,
          17,
          12,
        ],
        "symbol-placement": "line",
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "viewport",
        "text-max-angle": 30,
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": C.labelMid,
        "text-halo-color": C.haloColor,
        "text-halo-width": 1,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, 1],
      },
    },

    // ── Capital city dots ─────────────────────────────────────────────────────
    {
      id: "places_capital_dot",
      type: "circle",
      source: "terrasketch",
      "source-layer": "places",
      filter: [
        "all",
        ["==", ["get", "kind"], "locality"],
        ["has", "capital"],
        [">=", ["coalesce", ["get", "population_rank"], 0], 10],
      ],
      minzoom: 2,
      maxzoom: 8,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          1.5,
          5,
          2.5,
          7,
          3.5,
        ],
        "circle-color": C.labelDark,
        "circle-stroke-color": C.haloColor,
        "circle-stroke-width": 1.5,
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0, 3, 0.8],
      },
    },
  ],
};
