import { poiCategoryList } from "@/src/map/scripts/poi-config";
import {
  activitiesCircle,
  activitiesLabel,
  searchPOIsCircle,
  searchPOIsIcons,
  searchPOIsLabels,
  routeLineCasing,
  routeLine,
  routeBadge,
} from "./mapStyles";
import { addPOILayers } from "@/src/map/scripts/poi-layers";

/**
 * Registers all GeoJSON sources and their layers once the map is loaded.
 * Calling multiple times is safe — the guard returns early.
 */
function setUpMapLayers(map: maplibregl.Map) {
  if (map.getSource("activities")) return;

  // ── Icon images for POI category markers ──
  poiCategoryList.forEach(async (category) => {
    if (map.hasImage(category)) return;
    const image = await map.loadImage(`/icons/${category}.png`);
    map.addImage(category, image.data);
  });

  addPOILayers(map);

  // ── Routes source (lines rendered below points) ──
  map.addSource("routes", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer(routeLineCasing); // casing behind the coloured line
  map.addLayer(routeLine);

  // ── Route midpoints source (icon + label badges) ──
  map.addSource("route-midpoints", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer(routeBadge);

  // ── Activities source ──
  map.addSource("activities", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer(activitiesCircle);
  map.addLayer(activitiesLabel);

  // ── Search POIs source ──
  map.addSource("search-pois", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer(searchPOIsCircle);
  map.addLayer(searchPOIsIcons);
  map.addLayer(searchPOIsLabels);
}

export { setUpMapLayers };
