"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl, { LngLatBounds } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapLibre } from "@/src/hooks/useMapLibre";
import type {
  SeedItineraryDays,
  SeedItineraryItems,
} from "@/src/supabase/types";
import { parsePoint } from "@/src/utils/geo";

interface Props {
  days: SeedItineraryDays[];
  items: SeedItineraryItems[];
  onSelectDay: (day: SeedItineraryDays) => void;
}

export default function MapView({ days, items, onSelectDay }: Props) {
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onSelectDayRef = useRef(onSelectDay);

  useEffect(() => {
    onSelectDayRef.current = onSelectDay;
  }, [onSelectDay]);

  const handleLoad = useCallback((map: maplibregl.Map) => {
    // Map is ready — markers will be added via the effect below
  }, []);

  const { mapContainerRef, mapInstance, isLoaded } = useMapLibre({
    zoom: 2,
    mapCenter: [0, 30],
    minZoom: 1,
    maxZoom: 18,
    enableHillshade: false,
    enableTerrain: false,
    onLoad: handleLoad,
  });

  useEffect(() => {
    if (!mapInstance || !isLoaded) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new LngLatBounds();
    let hasBounds = false;

    // Day markers (larger, colored by status)
    days.forEach((day) => {
      const repPoint = parsePoint(day.rep_point);
      if (!repPoint) return;
      const { lat, lng } = repPoint;

      const statusColor =
        day.approval_status === "approved"
          ? "#22c55e"
          : day.approval_status === "rejected"
            ? "#ef4444"
            : "#eab308";

      const el = document.createElement("div");
      el.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${statusColor};
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        cursor: pointer;
      `;
      el.title = day.title || "Untitled";

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapInstance);

      // Create popup
      const popup = new maplibregl.Popup({
        offset: 12,
        closeButton: false,
        maxWidth: "220px",
      }).setHTML(
        `<div style="font-family:system-ui;padding:4px 0">
          <strong style="font-size:13px">${day.title || "Untitled"}</strong>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">
            ${[day.city, day.country].filter(Boolean).join(", ") || "No location"}
          </div>
          <div style="font-size:10px;margin-top:4px;color:${statusColor};font-weight:600">
            ${day.approval_status.toUpperCase()}
          </div>
        </div>`,
      );

      marker.setPopup(popup);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectDayRef.current(day);
      });

      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
      hasBounds = true;
    });

    // Item markers (smaller, gray)
    items.forEach((item) => {
      const coords = parsePoint(item.coords);
      if (!coords) return;
      const { lat, lng } = coords;

      const el = document.createElement("div");
      el.style.cssText = `
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #9ca3af;
        border: 1px solid #6b7280;
        cursor: default;
      `;
      el.title = item.title;

      const popup = new maplibregl.Popup({
        offset: 8,
        closeButton: false,
        maxWidth: "200px",
      }).setHTML(
        `<div style="font-family:system-ui;padding:2px 0">
          <strong style="font-size:12px">${item.title}</strong>
          <div style="font-size:10px;color:#6b7280">${item.item_type}${item.location_name ? ` · ${item.location_name}` : ""}</div>
        </div>`,
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapInstance);

      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
      hasBounds = true;
    });

    if (hasBounds) {
      mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 12 });
    }
  }, [mapInstance, isLoaded, days, items]);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <div ref={mapContainerRef} className="w-full h-150" />
    </div>
  );
}
