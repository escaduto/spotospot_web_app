"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useBaseMap } from "@/src/hooks/useBaseMap";
import type { SeedItineraryItems } from "@/src/supabase/types";
import { parsePoint } from "@/src/utils/geo";

interface Props {
  items: SeedItineraryItems[];
  selectedItemId: string | null;
  editingItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onUpdateCoords?: (itemId: string, lng: number, lat: number) => void;
  centerPoint: { lng: number; lat: number } | null;
}

export default function DayDetailsMap({
  items,
  selectedItemId,
  editingItemId,
  onSelectItem,
  onUpdateCoords,
  centerPoint,
}: Props) {
  const { mapContainerRef, mapRef, mapLoaded, fitBounds } = useBaseMap({
    initialCenter: centerPoint
      ? [centerPoint.lng, centerPoint.lat]
      : [-122.4107, 37.7784],
    initialZoom: 12,
  });

  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const repPointMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Add/update activity markers when items or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const validItems = items
      .map((item, index) => {
        const coords = parsePoint(item.coords);
        if (!coords) {
          console.log(`Item ${item.id} has invalid coords:`, item.coords);
          return null;
        }
        return { item, coords, index };
      })
      .filter((x) => x !== null) as Array<{
      item: SeedItineraryItems;
      coords: { lng: number; lat: number };
      index: number;
    }>;

    console.log(`Rendering ${validItems.length} activity markers from ${items.length} items`);

    // Add markers for each activity
    validItems.forEach(({ item, coords, index }) => {
      const isSelected = item.id === selectedItemId;
      const isEditing = item.id === editingItemId;

      const el = document.createElement("div");
      el.className = "activity-marker";
      el.innerHTML = `
        <div class="flex items-center justify-center w-10 h-10 rounded-full transition-all cursor-pointer shadow-lg ${
          isSelected
            ? "bg-blue-600 text-white scale-125"
            : isEditing
            ? "bg-yellow-500 text-white scale-125 animate-pulse"
            : "bg-white text-gray-700 border-2 border-blue-500 hover:scale-110"
        }">
          <span class="text-sm font-bold">${index + 1}</span>
        </div>
      `;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectItem(item.id);
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "center",
        draggable: isEditing,
      })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);

      // Handle drag end for editing
      if (isEditing && onUpdateCoords) {
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          onUpdateCoords(item.id, lngLat.lng, lngLat.lat);
        });
      }

      markersRef.current.set(item.id, marker);
    });

    // Add rep_point marker if exists
    if (centerPoint && repPointMarkerRef.current === null) {
      const el = document.createElement("div");
      el.className = "rep-point-marker";
      el.innerHTML = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 border-2 border-white shadow-lg">
          <span class="text-white text-xs">🏁</span>
        </div>
      `;

      repPointMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([centerPoint.lng, centerPoint.lat])
        .addTo(map);
    }

    // Fit map to show all markers
    const allPoints = validItems.map((x) => x.coords);
    if (centerPoint) allPoints.push(centerPoint);

    if (allPoints.length > 0) {
      fitBounds(allPoints, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
      });
    }
  }, [items, selectedItemId, editingItemId, mapLoaded, mapRef, onSelectItem, onUpdateCoords, fitBounds, centerPoint]);

  // Handle map click to place marker when editing
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !editingItemId || !onUpdateCoords) return;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      onUpdateCoords(editingItemId, lng, lat);
    };

    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
    };
  }, [mapLoaded, mapRef, editingItemId, onUpdateCoords]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: "100%" }}>
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-400">Loading map...</div>
        </div>
      )}
    </div>
  );
}
