"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { PMTiles, Protocol } from "pmtiles";
import { createClient } from "@/src/supabase/client";
import {
  parseWKBCoords,
  searchPlaces,
  PlacePointResult,
} from "@/src/supabase/places";
import { GLOBAL_PMTILES_URL } from "@/src/constants/paths";
import { Category_Types } from "@/src/types/itinerary";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryPillSelector } from "./CategoryPillSelector";
import { CreatePlanMapOverlay } from "./CreatePlanMapOverlay";

// MUI
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LayersIcon from "@mui/icons-material/Layers";
import PlaceIcon from "@mui/icons-material/Place";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CategoryIcon from "@mui/icons-material/Category";
import { globalMinimal } from "@/src/map/styles/global_minmal";
import { defaultMapStyleJSON } from "@/src/map/styles/default";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TopDestination {
  id: string;
  label: string;
  destination_value: string; // slug
  rep_point: string | null; // WKB geometry
  image_url: string | null;
  bbox: number[] | null; // [minLng, minLat, maxLng, maxLat]
}

interface TopDestSearchResult {
  id: string;
  label: string;
  destination_value: string;
  rep_point: string | null;
  image_url: string | null;
  bbox: number[] | null; // [minLng, minLat, maxLng, maxLat]
}

interface Locality {
  // Returned by search_localities_in_destination RPC
  place_source_id: string;
  name_default: string;
  name_en: string | null;
  lat: number;
  lng: number;
  category: string | null; // division_class
  admin_level: number | null;
  importance_score: number | null;
  // convenience aliases used in the UI
  id: string; // filled from place_source_id after fetch
  name: string; // filled from name_en ?? name_default after fetch
}

// A locality can be a DB-backed Locality or a free-text string typed by the user.
type LocalityEntry = Locality | string;
const getLocalityName = (l: LocalityEntry): string =>
  typeof l === "string" ? l : l.name;

// ─── GeoJSON helpers ───────────────────────────────────────────────────────────

/** Try to extract a renderable GeoJSON geometry from an RPC row */
function tryExtractGeoJSON(
  row: Record<string, unknown>,
): GeoJSON.Geometry | null {
  // 1. get_top_destination_detail returns a "geojson" text column (ST_AsGeoJSON)
  for (const key of ["geojson", "geom_geojson", "geometry_geojson"]) {
    const v = row[key];
    if (typeof v === "string" && v.trim().startsWith("{")) {
      try {
        return JSON.parse(v) as GeoJSON.Geometry;
      } catch {
        /* fall through */
      }
    }
  }
  // 2. geom as inline object (already parsed by Supabase)
  if (
    row.geom &&
    typeof row.geom === "object" &&
    (row.geom as Record<string, unknown>).type
  ) {
    return row.geom as unknown as GeoJSON.Geometry;
  }
  // 3. Fallback: build a bbox rectangle from jsonb bbox
  const bboxRaw = row.bbox;
  let bboxArr: number[] | null = null;
  if (Array.isArray(bboxRaw)) {
    bboxArr = bboxRaw as number[];
  } else if (bboxRaw && typeof bboxRaw === "object") {
    // PostgREST may return jsonb bbox as {xmin,ymin,xmax,ymax}
    const b = bboxRaw as Record<string, number>;
    if (b.xmin != null) bboxArr = [b.xmin, b.ymin, b.xmax, b.ymax];
  }
  if (bboxArr && bboxArr.length >= 4) {
    const [w, s, e, n] = bboxArr;
    return {
      type: "Polygon",
      coordinates: [
        [
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s],
        ],
      ],
    };
  }
  return null;
}

// ─── Map source / layer IDs ────────────────────────────────────────────────────

const DEST_POLYGON_SRC = "dest-polygon-src";
const DEST_POLYGON_FILL = "dest-polygon-fill";
const DEST_POLYGON_LINE = "dest-polygon-line";
const LOCALITY_SRC = "locality-src";
const LOCALITY_LAYER = "locality-layer";
const LOCALITY_LABEL_LAYER = "locality-label-layer";
const PLACES_SRC = "selected-places-src";
const PLACES_LAYER = "selected-places-layer";
// Search-POI overlay (for MapSearchBar + MapPOIFilter in the map panel)
const SEARCH_POIS_SRC = "search-pois";
const SEARCH_POIS_CIRCLE = "search-pois-circle";
const SEARCH_POIS_ICONS = "search-pois-icons";
const SEARCH_POIS_LABELS = "search-pois-label";

// ─── Main component ────────────────────────────────────────────────────────────

export default function CreatePlanPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const destMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  // ── Step 1: destination ────────────────────────────────────────────────────
  const [topDestinations, setTopDestinations] = useState<TopDestination[]>([]);
  const [selectedDest, setSelectedDest] = useState<TopDestSearchResult | null>(
    null,
  );
  const [destQuery, setDestQuery] = useState("");
  const [destSearchResults, setDestSearchResults] = useState<
    TopDestSearchResult[]
  >([]);
  const [destSearchLoading, setDestSearchLoading] = useState(false);
  const destDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Step 2: localities ─────────────────────────────────────────────────────
  // allLocalities = full list fetched once per destination; never re-fetched on query
  const [allLocalities, setAllLocalities] = useState<Locality[]>([]);
  const [selectedLocalities, setSelectedLocalities] = useState<LocalityEntry[]>(
    [],
  );
  const [localityQuery, setLocalityQuery] = useState("");
  const [localityLoading, setLocalityLoading] = useState(false);
  const [hoveredLocalityId, setHoveredLocalityId] = useState<string | null>(
    null,
  );
  // Callback ref so map click events can toggle locality selection
  const toggleLocalityByIdRef = useRef<((id: string) => void) | null>(null);
  // Client-side filtered view for the autocomplete
  const filteredLocalities = useMemo(() => {
    if (!localityQuery.trim()) return allLocalities;
    const q = localityQuery.toLowerCase();
    return allLocalities.filter((l) => l.name.toLowerCase().includes(q));
  }, [allLocalities, localityQuery]);
  // Top-N by importance score (RPC already returns them sorted) for quick chips
  const topLocalities = useMemo(
    () => allLocalities.slice(0, 6),
    [allLocalities],
  );

  // ── Step 2b: categories (trip vibe) ───────────────────────────────────────
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // ── Step 3: places ─────────────────────────────────────────────────────────
  const [selectedPlaces, setSelectedPlaces] = useState<PlacePointResult[]>([]);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlacePointResult[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const placeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Callback ref so CreatePlanMapOverlay can add places without prop-drilling
  const addPlaceFromMapRef = useRef<((p: PlacePointResult) => void) | null>(
    null,
  );
  useEffect(() => {
    addPlaceFromMapRef.current = (p: PlacePointResult) => {
      setSelectedPlaces((prev) =>
        prev.some((x) => x.id === p.id) ? prev : [...prev, p],
      );
    };
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Map init ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    const p = new PMTiles(GLOBAL_PMTILES_URL);
    protocol.add(p);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: defaultMapStyleJSON,
      center: [-100, 45],
      zoom: 3,
      attributionControl: false,
      minZoom: 1,
      maxZoom: 18,
    });
    mapRef.current = map;

    map.on("load", () => {
      // Destination polygon source (empty initially)
      map.addSource(DEST_POLYGON_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: DEST_POLYGON_FILL,
        type: "fill",
        source: DEST_POLYGON_SRC,
        paint: {
          "fill-color": "#0d9488",
          "fill-opacity": 0.15,
        },
      });
      map.addLayer({
        id: DEST_POLYGON_LINE,
        type: "line",
        source: DEST_POLYGON_SRC,
        paint: {
          "line-color": "#0d9488",
          "line-width": 2,
          "line-opacity": 0.8,
        },
      });

      // Locality points source
      map.addSource(LOCALITY_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: LOCALITY_LAYER,
        type: "circle",
        source: LOCALITY_SRC,
        paint: {
          "circle-radius": [
            "case",
            ["get", "selected"],
            8,
            ["case", ["get", "hovered"], 8, 6],
          ],
          "circle-color": [
            "case",
            ["get", "selected"],
            "#6366f1",
            ["case", ["get", "hovered"], "#a5b4fc", "#94a3b8"],
          ],
          "circle-stroke-width": [
            "case",
            ["get", "selected"],
            2.5,
            ["case", ["get", "hovered"], 2, 1.5],
          ],
          "circle-stroke-color": "#fff",
          "circle-opacity": [
            "case",
            ["get", "selected"],
            1,
            ["case", ["get", "hovered"], 0.9, 0.65],
          ],
        },
      });
      map.addLayer({
        id: LOCALITY_LABEL_LAYER,
        type: "symbol",
        source: LOCALITY_SRC,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "#fff",
          "text-halo-width": 1.5,
        },
      });

      // Click / hover on locality dots → toggle selection
      map.on("click", LOCALITY_LAYER, (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const id = String(
          (feat.properties as Record<string, unknown>).id ?? "",
        );
        if (!id) return;
        toggleLocalityByIdRef.current?.(id);
      });
      map.on("mouseenter", LOCALITY_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mousemove", LOCALITY_LAYER, (e) => {
        const feat = e.features?.[0];
        const id = feat
          ? String((feat.properties as Record<string, unknown>).id ?? "")
          : null;
        setHoveredLocalityId(id || null);
      });
      map.on("mouseleave", LOCALITY_LAYER, () => {
        map.getCanvas().style.cursor = "";
        setHoveredLocalityId(null);
      });

      // Selected places source
      map.addSource(PLACES_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: PLACES_LAYER,
        type: "circle",
        source: PLACES_SRC,
        paint: {
          "circle-radius": 7,
          "circle-color": "#f59e0b",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );

      // ── Search-POIs overlay source (used by map overlay search / filter) ──
      map.addSource(SEARCH_POIS_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: SEARCH_POIS_CIRCLE,
        type: "circle",
        source: SEARCH_POIS_SRC,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            ["case", ["boolean", ["feature-state", "hover"], false], 8, 4],
            15,
            ["case", ["boolean", ["feature-state", "hover"], false], 16, 8],
          ],
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            1,
          ],
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1,
            0.85,
          ],
        },
      });
      map.addLayer({
        id: SEARCH_POIS_ICONS,
        type: "symbol",
        source: SEARCH_POIS_SRC,
        minzoom: 12,
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.3, 15, 0.5],
          "icon-anchor": "center",
          "icon-allow-overlap": true,
        },
        paint: { "icon-color": "#ffffff" },
      });
      map.addLayer({
        id: SEARCH_POIS_LABELS,
        type: "symbol",
        source: SEARCH_POIS_SRC,
        minzoom: 11,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-offset": [0, 1],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "#fff",
          "text-halo-width": 1.5,
        },
      });

      // Click on search-pois dot → add to selected places
      map.on("click", SEARCH_POIS_CIRCLE, (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const props = feat.properties as Record<string, unknown>;
        const [lng, lat] = (feat.geometry as GeoJSON.Point).coordinates;
        const place: PlacePointResult = {
          id: String(props._placeId ?? props.place_source_id ?? ""),
          place_source_id: String(
            props._placeId ?? props.place_source_id ?? "",
          ),
          place_table: String(props.place_table ?? "places"),
          name_default: String(props.name_default ?? props.name ?? ""),
          name_en: props.name_en != null ? String(props.name_en) : null,
          category: props.category != null ? String(props.category) : null,
          categories: null,
          category_group:
            props.category_group != null ? String(props.category_group) : null,
          address: props.address != null ? String(props.address) : null,
          city: props.city != null ? String(props.city) : null,
          region: null,
          country: props.country != null ? String(props.country) : null,
          postal_code: null,
          lat,
          lng,
          website_url: null,
          phone_number: null,
          popularity_score:
            props.popularity_score != null
              ? Number(props.popularity_score)
              : null,
          is_top_destination: null,
          metadata: null,
        };
        addPlaceFromMapRef.current?.(place);
      });
      map.on("mouseenter", SEARCH_POIS_CIRCLE, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", SEARCH_POIS_CIRCLE, () => {
        map.getCanvas().style.cursor = "";
      });

      setMapLoaded(true);
      // Trigger resize so MapLibre picks up the correct flex-layout dimensions.
      // requestAnimationFrame alone isn't always sufficient; belt-and-suspenders.
      requestAnimationFrame(() => map.resize());
      setTimeout(() => map.resize(), 100);
    });

    return () => {
      maplibregl.removeProtocol("pmtiles");
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Load all top destinations on mount ─────────────────────────────────────

  useEffect(() => {
    supabase
      .rpc("get_top_destinations")
      .then(
        ({
          data,
          error,
        }: {
          data: TopDestination[] | null;
          error: { message: string } | null;
        }) => {
          if (error) console.error("get_top_destinations:", error);
          if (data) setTopDestinations(data);
        },
      );
  }, [supabase]);

  // ── Place image markers on map when destinations + map are ready ───────────

  const handleMarkerClick = useCallback((dest: TopDestination) => {
    setSelectedDest({
      id: dest.id,
      label: dest.label,
      destination_value: dest.destination_value,
      rep_point: dest.rep_point,
      image_url: dest.image_url,
      bbox: dest.bbox,
    });
    setDestQuery(dest.label);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || topDestinations.length === 0) return;

    // Clear existing markers
    destMarkersRef.current.forEach((m) => m.remove());
    destMarkersRef.current.clear();

    topDestinations.forEach((dest) => {
      const coords = parseWKBCoords(dest.rep_point);
      if (!coords) return;

      // MapLibre sets `transform: translate(x,y)` on the element passed to Marker.
      // If we also set `transform: scale(...)` on that same element on hover it
      // overwrites the translate and the marker jumps to the screen origin.
      // Fix: pass a transparent outer wrapper to Marker so MapLibre controls its
      // transform, then scale/style the inner visual element independently.
      const outer = document.createElement("div");
      outer.style.cssText = `width: 40px; height: 40px; cursor: pointer;`;

      const inner = document.createElement("div");
      inner.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        background-size: cover;
        background-position: center;
        background-color: #e2e8f0;
        transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
        overflow: hidden;
        pointer-events: none;
      `;
      if (dest.image_url) {
        inner.style.backgroundImage = `url('${dest.image_url}')`;
      } else {
        inner.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:18px">📍</div>`;
      }
      outer.appendChild(inner);

      outer.addEventListener("mouseenter", () => {
        if (inner.dataset.selected !== "true") {
          inner.style.transform = "scale(1.2)";
          inner.style.boxShadow = "0 4px 16px rgba(0,0,0,0.4)";
        }
      });
      outer.addEventListener("mouseleave", () => {
        if (inner.dataset.selected !== "true") {
          inner.style.transform = "";
          inner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        }
      });
      outer.addEventListener("click", () => handleMarkerClick(dest));

      // Tooltip popup — attach to the outer so it fires correctly
      const popup = new maplibregl.Popup({
        offset: 24,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(
        `<div style="font-size:12px;font-weight:600;padding:2px 4px">${dest.label}</div>`,
      );
      outer.addEventListener("mouseenter", () =>
        popup.addTo(map).setLngLat([coords.lng, coords.lat]),
      );
      outer.addEventListener("mouseleave", () => popup.remove());

      const marker = new maplibregl.Marker({ element: outer, anchor: "center" })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);

      destMarkersRef.current.set(dest.destination_value, marker);
    });
  }, [mapLoaded, topDestinations, handleMarkerClick]);

  // ── Update marker "selected" styling ──────────────────────────────────────
  // marker.getElement() returns the outer wrapper; style the inner visual child.

  useEffect(() => {
    destMarkersRef.current.forEach((marker, key) => {
      const outer = marker.getElement();
      const inner = outer.firstElementChild as HTMLElement | null;
      if (!inner) return;
      const isSelected = selectedDest?.destination_value === key;
      inner.dataset.selected = String(isSelected);
      inner.style.border = isSelected ? "3px solid #0d9488" : "3px solid white";
      inner.style.transform = isSelected ? "scale(1.15)" : "";
      inner.style.boxShadow = isSelected
        ? "0 4px 20px rgba(13,148,136,0.5)"
        : "0 2px 8px rgba(0,0,0,0.3)";
      // Elevate the MapLibre marker container (parent of outer) for z-ordering
      const markerContainer = outer.parentElement;
      if (markerContainer)
        markerContainer.style.zIndex = isSelected ? "20" : "";
    });
  }, [selectedDest]);

  // ── Fetch destination polygon when selected ─────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const src = map.getSource(DEST_POLYGON_SRC) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!src) return;

    if (!selectedDest) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    (async () => {
      const { data, error } = await supabase.rpc("get_top_destination_detail", {
        destination_value: selectedDest.destination_value,
      });
      if (error) {
        console.error("get_top_destination_detail:", error);
        // Try to fly using rep_point only
        const coords = parseWKBCoords(selectedDest.rep_point);
        if (coords)
          map.flyTo({
            center: [coords.lng, coords.lat],
            zoom: 10,
            duration: 1200,
          });
        src.setData({ type: "FeatureCollection", features: [] });
        return;
      }

      const row = (Array.isArray(data) ? data[0] : data) as Record<
        string,
        unknown
      > | null;
      if (!row) {
        src.setData({ type: "FeatureCollection", features: [] });
        return;
      }

      const geom = tryExtractGeoJSON(row);
      if (geom) {
        const feature: GeoJSON.Feature = {
          type: "Feature",
          geometry: geom,
          properties: {},
        };
        src.setData({ type: "FeatureCollection", features: [feature] });

        // Fly to bounds of geometry
        try {
          const bounds = new maplibregl.LngLatBounds();
          const addCoords = (coords: number[][] | number[][][]) => {
            const flat = coords.flat(3) as number[];
            for (let i = 0; i < flat.length; i += 2) {
              bounds.extend([flat[i], flat[i + 1]]);
            }
          };
          if (geom.type === "Polygon")
            addCoords(geom.coordinates as number[][][]);
          else if (geom.type === "MultiPolygon")
            (geom.coordinates as number[][][][]).forEach((poly) =>
              addCoords(poly as number[][][]),
            );
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 1200 });
          }
        } catch {
          // If bounds calculation fails, just fly to rep_point
          const coords = parseWKBCoords(selectedDest.rep_point);
          if (coords)
            map.flyTo({
              center: [coords.lng, coords.lat],
              zoom: 10,
              duration: 1200,
            });
        }
      } else {
        // No geometry — use rep_point
        const coords = parseWKBCoords(selectedDest.rep_point);
        if (coords)
          map.flyTo({
            center: [coords.lng, coords.lat],
            zoom: 10,
            duration: 1200,
          });
        src.setData({ type: "FeatureCollection", features: [] });
      }
    })();
  }, [selectedDest, mapLoaded, supabase]);

  // ── Update locality layer on map ───────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource(LOCALITY_SRC) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!src) return;

    const selectedIds = new Set(
      selectedLocalities
        .filter((l): l is Locality => typeof l !== "string")
        .map((l) => l.id),
    );
    const features: GeoJSON.Feature[] = allLocalities
      .map((loc) => {
        if (!loc.lat || !loc.lng) return null;
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [loc.lng, loc.lat] },
          properties: {
            id: loc.id,
            name: loc.name,
            selected: selectedIds.has(loc.id),
            hovered: loc.id === hoveredLocalityId,
          },
        };
      })
      .filter(Boolean) as GeoJSON.Feature[];

    src.setData({ type: "FeatureCollection", features });
  }, [allLocalities, selectedLocalities, hoveredLocalityId, mapLoaded]);

  // ── Update selected places layer on map ────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource(PLACES_SRC) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!src) return;

    const features: GeoJSON.Feature[] = selectedPlaces.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      properties: { name: p.name_default },
    }));
    src.setData({ type: "FeatureCollection", features });
  }, [selectedPlaces, mapLoaded]);

  // ─── Search: destinations ───────────────────────────────────────────────────

  const handleDestQueryChange = useCallback(
    (_: React.SyntheticEvent, value: string) => {
      setDestQuery(value);
      if (destDebounce.current) clearTimeout(destDebounce.current);
      if (value.trim().length < 2) {
        setDestSearchResults([]);
        return;
      }
      setDestSearchLoading(true);
      destDebounce.current = setTimeout(async () => {
        const { data } = await supabase.rpc("search_top_destinations", {
          search_query: value.trim(),
        });
        setDestSearchResults((data as TopDestSearchResult[]) ?? []);
        setDestSearchLoading(false);
      }, 300);
    },
    [supabase],
  );

  const handleDestChange = useCallback(
    (_: React.SyntheticEvent, value: TopDestSearchResult | null) => {
      setSelectedDest(value);
      setSelectedLocalities([]);
      setAllLocalities([]);
      setLocalityQuery("");
      setSelectedPlaces([]);
      setPlaceResults([]);
      setPlaceQuery("");

      if (!value) return;

      // Pan map to destination
      const coords = parseWKBCoords(value.rep_point);
      if (coords && mapRef.current) {
        mapRef.current.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 9,
          duration: 1200,
        });
      }

      // Load ALL localities once for this destination (client-side filtering after)
      setLocalityLoading(true);
      supabase
        .rpc("search_localities_in_destination", {
          destination_value: value.destination_value,
          search_query: null, // null → return all areas ordered by importance_score
        })
        .then(
          ({
            data,
            error,
          }: {
            data: Record<string, unknown>[] | null;
            error: { message: string } | null;
          }) => {
            if (error)
              console.error("search_localities_in_destination:", error);
            const rows = (data ?? []).map((r) => ({
              ...r,
              id: String(r.place_source_id),
              name: (r.name_en ?? r.name_default ?? "") as string,
            })) as Locality[];
            setAllLocalities(rows);
            setLocalityLoading(false);
          },
        );
    },
    [supabase],
  );

  // ─── Search: localities — purely client-side filter over allLocalities ─────────
  // (no more RPC call on each keystroke; allLocalities loaded once per destination)

  const handleLocalityQueryChange = useCallback(
    (_: React.SyntheticEvent, value: string) => {
      setLocalityQuery(value);
    },
    [],
  );

  // ─── Sync toggleLocalityById callback ────────────────────────────────────────

  useEffect(() => {
    toggleLocalityByIdRef.current = (id: string) => {
      const loc = allLocalities.find((l) => l.id === id);
      if (!loc) return;
      setSelectedLocalities((prev) => {
        const exists = prev.some(
          (l): l is Locality => typeof l !== "string" && l.id === id,
        );
        if (exists)
          return prev.filter((l) => typeof l === "string" || l.id !== id);
        return [...prev, loc];
      });
    };
  }, [allLocalities]);

  // ─── Search: places — scoped to destination bbox, ordered by distance ────────

  const handlePlaceQueryChange = useCallback(
    (_: React.SyntheticEvent, value: string) => {
      setPlaceQuery(value);
      if (placeDebounce.current) clearTimeout(placeDebounce.current);
      if (value.trim().length < 2) {
        setPlaceResults([]);
        return;
      }
      setPlaceLoading(true);
      placeDebounce.current = setTimeout(async () => {
        // Pass destination centre as mapCenter so the RPC orders by distance
        const destCoords = selectedDest
          ? parseWKBCoords(selectedDest.rep_point)
          : null;
        const results = await searchPlaces(
          value.trim(),
          40,
          destCoords ?? undefined,
        );
        // Client-side clip to destination bbox when available
        const bbox = selectedDest?.bbox;
        const scoped =
          bbox && bbox.length >= 4
            ? results.filter(
                (p) =>
                  p.lng >= bbox[0] &&
                  p.lat >= bbox[1] &&
                  p.lng <= bbox[2] &&
                  p.lat <= bbox[3],
              )
            : results;
        setPlaceResults(scoped);
        setPlaceLoading(false);
      }, 350);
    },
    [selectedDest],
  );

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    if (!selectedDest) return;
    setCreating(true);

    const localityNames = selectedLocalities
      .map(getLocalityName)
      .filter(Boolean);

    // Persist params so the /creating streaming page can pick them up even
    // after the Next.js client-side navigation clears component state.
    sessionStorage.setItem(
      "__creating_plan",
      JSON.stringify({
        destination_value: selectedDest.destination_value,
        destination_label: selectedDest.label,
        destination_image_url: selectedDest.image_url ?? null,
        locality_names: localityNames.length > 0 ? localityNames : undefined,
        categories:
          selectedCategories.length > 0 ? selectedCategories : undefined,
        places:
          selectedPlaces.length > 0
            ? selectedPlaces.map((p) => ({
                id: p.place_source_id ?? p.id,
                source_table: p.place_table,
              }))
            : undefined,
      }),
    );

    router.push("/creating");
  }, [
    selectedDest,
    selectedLocalities,
    selectedCategories,
    selectedPlaces,
    router,
  ]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  const canCreate = !!selectedDest && !creating;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* ── Mini header ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5 bg-white/90 backdrop-blur-sm z-30">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">📍</span>
          <span className="text-base font-bold bg-linear-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
            SpotoSpot
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs font-medium text-gray-400 uppercase tracking-wider">
            Create a Plan
          </span>
          <Button
            component={Link}
            href="/dashboard"
            size="small"
            startIcon={<ArrowBackIcon />}
            sx={{ textTransform: "none", color: "#6b7280", fontSize: "0.8rem" }}
          >
            Dashboard
          </Button>
        </div>
      </header>

      {/* ── Main split ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* RIGHT — Form panel */}
        <div className="flex w-100 shrink-0 flex-col overflow-y-auto border-l border-gray-100 bg-white">
          <div className="flex flex-col gap-6 p-5">
            {/* Title */}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Create a Day Plan
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Pick a destination, choose your vibe, narrow to areas, add
                specific spots — then let AI build your itinerary.
              </p>
            </div>

            {/* ── Step 1: Destination ── */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-white">
                  1
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  Choose a destination
                </span>
                <LocationOnIcon
                  sx={{ fontSize: 16, color: "#0d9488", ml: "auto" }}
                />
              </div>

              <Autocomplete<TopDestSearchResult>
                options={destSearchResults}
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(a, b) =>
                  a.destination_value === b.destination_value
                }
                value={selectedDest}
                inputValue={destQuery}
                onInputChange={handleDestQueryChange}
                onChange={handleDestChange}
                loading={destSearchLoading}
                filterOptions={(x) => x}
                size="small"
                noOptionsText={
                  destQuery.length < 2
                    ? "Type to search…"
                    : "No destinations found"
                }
                renderOption={(props, option) => (
                  <li {...props} key={option.destination_value}>
                    <div className="flex items-center gap-2.5 py-0.5">
                      {option.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={option.image_url}
                          alt=""
                          className="h-8 w-8 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 text-base">
                          📍
                        </div>
                      )}
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search destinations…"
                    variant="outlined"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {destSearchLoading && <CircularProgress size={14} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              {/* Selected badge */}
              {selectedDest && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2">
                  {selectedDest.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedDest.image_url}
                      alt=""
                      className="h-9 w-9 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center text-xl shrink-0">
                      📍
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-teal-800">
                      {selectedDest.label}
                    </p>
                    <p className="text-xs text-teal-600">
                      {selectedDest.destination_value}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Step 2: Trip vibe / categories ── */}
            {selectedDest && (
              <>
                <Divider />
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                      2
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      Trip vibe
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      (optional)
                    </span>
                    <CategoryIcon
                      sx={{ fontSize: 16, color: "#8b5cf6", ml: "auto" }}
                    />
                  </div>
                  <p className="mb-2.5 text-xs text-gray-400">
                    Tell the AI what kind of trip you want.
                  </p>
                  <CategoryPillSelector
                    selected={selectedCategories}
                    onChange={setSelectedCategories}
                  />
                  {selectedCategories.length > 0 && (
                    <p className="mt-2 text-xs text-violet-600">
                      {selectedCategories.length} vibe
                      {selectedCategories.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── Step 3: Localities ── */}
            {selectedDest && (
              <>
                <Divider />
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                      3
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      Focus areas
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      (optional, multi-select)
                    </span>
                    <LayersIcon
                      sx={{ fontSize: 16, color: "#6366f1", ml: "auto" }}
                    />
                  </div>
                  <p className="mb-2 text-xs text-gray-400">
                    Narrow your plan to specific neighbourhoods within{" "}
                    <strong className="text-gray-600">
                      {selectedDest.label}
                    </strong>
                    . Type any name to add a custom area.
                  </p>

                  <Autocomplete<LocalityEntry, true, false, true>
                    multiple
                    freeSolo
                    options={filteredLocalities}
                    getOptionLabel={(o) =>
                      typeof o === "string" ? o : (o.name ?? "")
                    }
                    isOptionEqualToValue={(a, b) => {
                      if (typeof a === "string" && typeof b === "string")
                        return a === b;
                      if (typeof a !== "string" && typeof b !== "string")
                        return a.id === b.id;
                      return false;
                    }}
                    value={selectedLocalities}
                    inputValue={localityQuery}
                    onInputChange={handleLocalityQueryChange}
                    onChange={(_, v) => setSelectedLocalities(v)}
                    onHighlightChange={(_, option) => {
                      setHoveredLocalityId(
                        option && typeof option !== "string" ? option.id : null,
                      );
                    }}
                    loading={localityLoading}
                    filterOptions={(x) => x}
                    size="small"
                    disableCloseOnSelect
                    noOptionsText={
                      localityLoading
                        ? "Loading…"
                        : "No areas found — press Enter to add"
                    }
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });
                        const label =
                          typeof option === "string" ? option : option.name;
                        const isManual = typeof option === "string";
                        return (
                          <Chip
                            key={key}
                            label={label}
                            size="small"
                            sx={{
                              bgcolor: isManual ? "#f0fdf4" : "#eef2ff",
                              color: isManual ? "#166534" : "#4338ca",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                            {...tagProps}
                          />
                        );
                      })
                    }
                    renderOption={(props, option) => {
                      const name =
                        typeof option === "string" ? option : option.name;
                      const id = typeof option === "string" ? null : option.id;
                      return (
                        <li
                          {...props}
                          key={id ?? name}
                          onMouseEnter={() => setHoveredLocalityId(id)}
                          onMouseLeave={() => setHoveredLocalityId(null)}
                        >
                          <div className="flex flex-col py-0.5">
                            <span className="text-sm">{name}</span>
                            {typeof option !== "string" && option.category && (
                              <span className="text-xs text-gray-400">
                                {option.category}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={
                          selectedLocalities.length === 0
                            ? "Search or type an area…"
                            : ""
                        }
                        variant="outlined"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {localityLoading && (
                                <CircularProgress size={14} />
                              )}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />

                  {/* Top suggested neighbourhoods as quick-select chips */}
                  {topLocalities.length > 0 && !localityQuery && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {topLocalities.map((loc) => {
                        const isSelected = selectedLocalities.some(
                          (l): l is Locality =>
                            typeof l !== "string" && l.id === loc.id,
                        );
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() =>
                              setSelectedLocalities((prev) =>
                                isSelected
                                  ? prev.filter(
                                      (l) =>
                                        typeof l === "string" ||
                                        l.id !== loc.id,
                                    )
                                  : [...prev, loc],
                              )
                            }
                            className={`px-2.5 py-0.5 text-[11px] rounded-full border transition-colors ${
                              isSelected
                                ? "bg-indigo-500 border-indigo-500 text-white"
                                : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            }`}
                          >
                            {loc.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedLocalities.length > 0 && (
                    <p className="mt-1.5 text-xs text-indigo-600">
                      {selectedLocalities.length} area
                      {selectedLocalities.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── Step 4: Specific places ── */}
            {selectedDest && (
              <>
                <Divider />
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      4
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      Include specific spots
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      (optional)
                    </span>
                    <PlaceIcon
                      sx={{ fontSize: 16, color: "#f59e0b", ml: "auto" }}
                    />
                  </div>
                  <p className="mb-2 text-xs text-gray-400">
                    Search for specific places, or click any dot on the map to
                    add it. Results are scoped to your destination.
                  </p>

                  <Autocomplete<PlacePointResult, true>
                    multiple
                    options={placeResults}
                    getOptionLabel={(o) => o.name_en ?? o.name_default}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    value={selectedPlaces}
                    inputValue={placeQuery}
                    onInputChange={handlePlaceQueryChange}
                    onChange={(_, v) => setSelectedPlaces(v)}
                    loading={placeLoading}
                    filterOptions={(x) => x}
                    size="small"
                    disableCloseOnSelect
                    noOptionsText={
                      placeQuery.length < 2
                        ? "Type to search…"
                        : "No places found"
                    }
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });
                        return (
                          <Chip
                            key={key}
                            label={option.name_en ?? option.name_default}
                            size="small"
                            sx={{
                              bgcolor: "#fef3c7",
                              color: "#92400e",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                            {...tagProps}
                          />
                        );
                      })
                    }
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <div className="flex flex-col py-0.5">
                          <span className="text-sm font-medium">
                            {option.name_en ?? option.name_default}
                          </span>
                          {(option.city || option.category) && (
                            <span className="text-xs text-gray-400">
                              {[option.category, option.city]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </div>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={
                          selectedPlaces.length === 0 ? "Search places…" : ""
                        }
                        variant="outlined"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {placeLoading && <CircularProgress size={14} />}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />

                  {selectedPlaces.length > 0 && (
                    <p className="mt-1.5 text-xs text-amber-700">
                      {selectedPlaces.length} place
                      {selectedPlaces.length !== 1 ? "s" : ""} pinned
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── Summary ── */}
            {selectedDest && (
              <>
                <Divider />
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Plan summary
                  </p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <LocationOnIcon sx={{ fontSize: 14, color: "#0d9488" }} />
                      {selectedDest.label}
                    </div>
                    {selectedCategories.length > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <CategoryIcon sx={{ fontSize: 14, color: "#8b5cf6" }} />
                        {selectedCategories
                          .map(
                            (v) =>
                              Category_Types.find((c) => c.value === v)
                                ?.label ?? v,
                          )
                          .join(", ")}
                      </div>
                    )}
                    {selectedLocalities.length > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <LayersIcon sx={{ fontSize: 14, color: "#6366f1" }} />
                        {selectedLocalities.map(getLocalityName).join(", ")}
                      </div>
                    )}
                    {selectedPlaces.length > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <PlaceIcon sx={{ fontSize: 14, color: "#f59e0b" }} />
                        {selectedPlaces.length} specific spot
                        {selectedPlaces.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Error */}
            {createError && (
              <Alert severity="error" onClose={() => setCreateError(null)}>
                {createError}
              </Alert>
            )}

            {/* ── Create button ── */}
            <Button
              variant="contained"
              size="large"
              disabled={!canCreate}
              onClick={handleCreate}
              startIcon={
                creating ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AutoAwesomeIcon />
                )
              }
              endIcon={!creating && <AddIcon />}
              sx={{
                borderRadius: 9999,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.95rem",
                py: 1.5,
                background: canCreate
                  ? "linear-gradient(to right, #0d9488, #06b6d4)"
                  : undefined,
                "&:hover": { filter: "brightness(1.1)" },
              }}
            >
              {creating ? "Building your plan…" : "Create Plan"}
            </Button>

            {!selectedDest && (
              <p className="text-center text-xs text-gray-400">
                Select a destination above to get started
              </p>
            )}
          </div>
        </div>

        {/* LEFT — Map + POI search overlay */}
        <CreatePlanMapOverlay
          mapContainerRef={mapContainerRef}
          mapRef={mapRef}
          mapLoaded={mapLoaded}
          selectedDest={selectedDest}
          onAddPlace={(p: PlacePointResult) =>
            setSelectedPlaces((prev) =>
              prev.some((x) => x.id === p.id) ? prev : [...prev, p],
            )
          }
          onSelectDest={(dest) => {
            setSelectedDest(dest);
            setDestQuery(dest.label);
          }}
          externalPOIs={placeQuery.length >= 2 ? placeResults : []}
        />
      </div>
    </div>
  );
}
