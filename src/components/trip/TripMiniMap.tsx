"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol, PMTiles } from "pmtiles";
import { GLOBAL_PMTILES_URL } from "@/src/constants/paths";
import { defaultMapStyleJSON } from "@/src/map/styles/default";
import { createClient } from "@/src/supabase/client";
import { parsePoint } from "@/src/utils/geo";
import type { ItineraryDay } from "@/src/supabase/types";

interface Activity {
  id: string;
  title: string;
  item_type: string;
  order_index: number;
  day_id: string;
  lat: number;
  lng: number;
}

interface RouteFeature {
  geometry_geojson: string | object;
  day_id: string;
}

interface Props {
  days: ItineraryDay[];
  tripId: string;
}

// Color palette for each day (cycles)
const DAY_COLORS = [
  "#0d9488", "#6366f1", "#f59e0b", "#ec4899",
  "#10b981", "#8b5cf6", "#f97316", "#06b6d4",
];

export default function TripMiniMap({ days, tripId }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // ── Initialize map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const rafId = requestAnimationFrame(() => {
      if (!mapContainerRef.current) return;

      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      const p = new PMTiles(GLOBAL_PMTILES_URL);
      protocol.add(p);

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: defaultMapStyleJSON,
        center: [-122.4107, 37.7784],
        zoom: 10,
        attributionControl: false,
        minZoom: 1,
        maxZoom: 18,
      });

      mapRef.current = map;

      map.on("load", () => {
        map.resize();
        setMapLoaded(true);
      });

      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
    });

    return () => {
      cancelAnimationFrame(rafId);
      maplibregl.removeProtocol("pmtiles");
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Add layers + markers after map loads ──────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const supabase = createClient();

    const dayIds = days.map((d) => d.id);
    if (dayIds.length === 0) return;

    (async () => {
      // Fetch activities and routes for all days in this trip
      const [itemsRes, routesRes] = await Promise.all([
        supabase
          .from("itinerary_items")
          .select("id, title, item_type, order_index, itinerary_day_id, location_coords::text")
          .in("itinerary_day_id", dayIds)
          .order("order_index"),
        supabase
          .from("itinerary_item_routes")
          .select("itinerary_day_id, geometry_geojson::text")
          .in("itinerary_day_id", dayIds),
      ]);

      const activities: Activity[] = [];
      for (const row of (itemsRes.data ?? []) as Record<string, unknown>[]) {
        const coords = parsePoint(row.location_coords);
        if (!coords) continue;
        activities.push({
          id: row.id as string,
          title: (row.title as string) ?? "",
          item_type: (row.item_type as string) ?? "activity",
          order_index: (row.order_index as number) ?? 0,
          day_id: row.itinerary_day_id as string,
          lat: coords.lat,
          lng: coords.lng,
        });
      }

      const routes: RouteFeature[] = ((routesRes.data ?? []) as Record<string, unknown>[])
        .filter((r) => r.geometry_geojson)
        .map((r) => ({
          geometry_geojson: r.geometry_geojson as string | object,
          day_id: r.itinerary_day_id as string,
        }));

      // ── Route lines (one source per day for coloring) ───────────────────
      days.forEach((day, idx) => {
        const color = DAY_COLORS[idx % DAY_COLORS.length];
        const dayRoutes = routes.filter((r) => r.day_id === day.id);

        const lineFeatures = dayRoutes
          .map((r) => {
            try {
              const geom =
                typeof r.geometry_geojson === "string"
                  ? JSON.parse(r.geometry_geojson)
                  : r.geometry_geojson;
              return { type: "Feature" as const, geometry: geom, properties: {} };
            } catch {
              return null;
            }
          })
          .filter(Boolean) as GeoJSON.Feature[];

        const sourceId = `trip-routes-${day.id}`;
        const layerId = `trip-route-line-${day.id}`;

        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: "geojson",
            data: { type: "FeatureCollection", features: lineFeatures },
          });
          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": color,
              "line-width": 2,
              "line-opacity": 0.45,
              "line-dasharray": [4, 3],
            },
            layout: { "line-cap": "round" },
          });
        }
      });

      // ── Activity dot markers (smaller, per-day color) ──────────────────
      const actSourceId = "trip-activities";
      const actLayerId = "trip-activity-dots";
      const actLabelId = "trip-activity-labels";

      const actFeatures: GeoJSON.Feature[] = activities.map((a, idx) => ({
        type: "Feature",
        id: idx,
        geometry: { type: "Point", coordinates: [a.lng, a.lat] },
        properties: {
          id: a.id,
          title: a.title,
          item_type: a.item_type,
          order_index: a.order_index,
          day_id: a.day_id,
          color:
            DAY_COLORS[days.findIndex((d) => d.id === a.day_id) % DAY_COLORS.length] ?? "#6b7280",
        },
      }));

      if (!map.getSource(actSourceId)) {
        map.addSource(actSourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: actFeatures },
        });

        map.addLayer({
          id: actLayerId,
          type: "circle",
          source: actSourceId,
          paint: {
            "circle-radius": 7,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#fff",
            "circle-opacity": 0.85,
          },
        });

        map.addLayer({
          id: actLabelId,
          type: "symbol",
          source: actSourceId,
          layout: {
            "text-field": ["to-string", ["get", "order_index"]],
            "text-size": 8,
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#fff" },
        });

        // Hover popup on activities
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 10,
          className: "trip-map-popup",
        });

        map.on("mouseenter", actLayerId, (e) => {
          map.getCanvas().style.cursor = "pointer";
          const feat = e.features?.[0];
          if (!feat) return;
          const { title, item_type } = feat.properties!;
          const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number];
          popup
            .setLngLat(coords)
            .setHTML(
              `<div style="font-size:12px;font-weight:600;color:#111">${title}</div>` +
              `<div style="font-size:10px;color:#6b7280;margin-top:2px;text-transform:capitalize">${(item_type as string).replace(/_/g, " ")}</div>`,
            )
            .addTo(map);
        });
        map.on("mouseleave", actLayerId, () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }

      // ── Day thumbnail markers ──────────────────────────────────────────
      const bounds = new maplibregl.LngLatBounds();
      let hasAnyBounds = false;

      days.forEach((day, idx) => {
        const coords = parsePoint(day.rep_point);
        if (!coords) return;
        hasAnyBounds = true;
        bounds.extend([coords.lng, coords.lat]);

        const color = DAY_COLORS[idx % DAY_COLORS.length];
        const el = document.createElement("div");
        el.style.cssText = "width:44px;height:44px;cursor:pointer;";

        const inner = document.createElement("div");
        inner.style.cssText = [
          "width:44px",
          "height:44px",
          `border: 2.5px solid ${color}`,
          "border-radius:50%",
          "box-shadow:0 2px 8px rgba(0,0,0,0.3)",
          "background-color:#e2e8f0",
          "background-size:cover",
          "background-position:center",
          "transition:transform .15s ease",
          "position:relative",
          "overflow:hidden",
        ].join(";");
        el.appendChild(inner);

        // Blurhash placeholder → real image
        if (day.image_blurhash) {
          inner.style.backgroundImage = `url('data:image/jpeg;base64,${day.image_blurhash}')`;
        }
        if (day.image_url) {
          const img = new Image();
          img.onload = () => { inner.style.backgroundImage = `url('${day.image_url}')`; };
          img.src = day.image_url;
        }

        // Day number badge
        const badge = document.createElement("div");
        badge.style.cssText = [
          "position:absolute",
          "bottom:-1px",
          "right:-1px",
          `background:${color}`,
          "color:white",
          "font-size:9px",
          "font-weight:700",
          "width:16px",
          "height:16px",
          "border-radius:50%",
          "display:flex",
          "align-items:center",
          "justify-content:center",
          "border:1.5px solid white",
        ].join(";");
        badge.textContent = String(idx + 1);
        inner.appendChild(badge);

        el.addEventListener("mouseenter", () => { inner.style.transform = "scale(1.15)"; });
        el.addEventListener("mouseleave", () => { inner.style.transform = "scale(1)"; });

        // Hover popup
        const markerPopup = new maplibregl.Popup({
          closeButton: false,
          offset: 26,
          className: "trip-map-popup",
          anchor: "bottom",
        }).setHTML(
          `<div style="font-size:12px;font-weight:700;color:#111;max-width:140px">${day.title ?? "Day " + (idx + 1)}</div>` +
          (day.city ? `<div style="font-size:10px;color:#6b7280;margin-top:2px">${[day.city, day.country].filter(Boolean).join(", ")}</div>` : "") +
          `<div style="font-size:10px;color:#6b7280;margin-top:2px">Day ${idx + 1}${day.date ? " · " + new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</div>`,
        );

        el.addEventListener("mouseenter", () => markerPopup.addTo(map));
        el.addEventListener("mouseleave", () => markerPopup.remove());

        new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([coords.lng, coords.lat])
          .addTo(map);
      });

      // Fit map to show all day markers
      if (hasAnyBounds) {
        map.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          maxZoom: 13,
          duration: 800,
        });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, tripId]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ minHeight: 400 }}
    />
  );
}
