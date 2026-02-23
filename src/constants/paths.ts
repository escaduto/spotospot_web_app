import { SourceSpecification } from "maplibre-gl";

const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
export const spriteSheetRootPath = `${baseUrl}/sprites`;
export const glyphsURL = "/fonts/{fontstack}/{range}.pbf";
export const GLOBAL_PMTILES_URL =
  "https://terrasketch-tiles.terrasketchmaps.workers.dev/protomaps_20241104_wholeworld/{z}/{x}/{y}.mvt?v=2";
export const PLACES_PMTILES_URL =
  "https://terrasketch-tiles.terrasketchmaps.workers.dev/places/{z}/{x}/{y}.mvt?v=2";

export const mapSource: SourceSpecification = {
  type: "vector",
  attribution:
    '<a href="https://terrasketch.com">TerraSketch</a> <a href="https://github.com/protomaps/basemaps">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
  tiles: [
    "https://terrasketch-tiles.terrasketchmaps.workers.dev/protomaps_20241104_wholeworld/{z}/{x}/{y}.mvt",
  ],
  minzoom: 0,
  maxzoom: 15,
};

export const terrainSource = {
  type: "raster-dem" as const,
  encoding: "terrarium",
  tiles: [
    "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
  ],
  tileSize: 128,
  maxzoom: 15,
};
