"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useBaseMap } from "@/src/hooks/useBaseMap";
import type { SeedItineraryItems } from "@/src/supabase/types";
import { parsePoint } from "@/src/utils/geo";
import { getCategoryConfig } from "@/src/map/scripts/category-config";
import { PlacePointResult } from "@/src/supabase/places";

interface Props {
  items: SeedItineraryItems[];
  selectedItemId: string | null;
  editingItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onUpdateCoords?: (itemId: string, lng: number, lat: number) => void;
  centerPoint: { lng: number; lat: number } | null;
  searchPOIs?: PlacePointResult[];
  onSelectSearchPOI?: (place: PlacePointResult) => void;
}

export default function DayDetailsMap({
  items,
  selectedItemId,
  editingItemId,
  onSelectItem,
  onUpdateCoords,
  centerPoint,
  searchPOIs,
  onSelectSearchPOI,
}: Props) {
  const { mapContainerRef, mapRef, mapLoaded, fitBounds } = useBaseMap({
    initialCenter: centerPoint
      ? [centerPoint.lng, centerPoint.lat]
      : [-122.4107, 37.7784],
    initialZoom: 12,
  });

  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const repPointMarkerRef = useRef<maplibregl.Marker | null>(null);
  const searchMarkersRef = useRef<maplibregl.Marker[]>([]);
  const onSelectSearchPOIRef = useRef(onSelectSearchPOI);

  // Keep ref in sync with latest callback
  useEffect(() => {
    onSelectSearchPOIRef.current = onSelectSearchPOI;
  }, [onSelectSearchPOI]);

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

    console.log(
      `Rendering ${validItems.length} activity markers from ${items.length} items`,
    );

    // Add markers for each activity
    validItems.forEach(({ item, coords, index }) => {
      const isSelected = item.id === selectedItemId;
      const isEditing = item.id === editingItemId;

      const el = document.createElement("div");
      el.className = "activity-marker";
      el.innerHTML = `
        <div class="flex items-center justify-center w-6 h-6 rounded-full transition-all cursor-pointer shadow-lg ${
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
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 border-2 border-white shadow-lg"/>
      `;

      repPointMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([centerPoint.lng, centerPoint.lat])
        .addTo(map);
    }
  }, [
    items,
    selectedItemId,
    editingItemId,
    mapLoaded,
    mapRef,
    onSelectItem,
    onUpdateCoords,
    fitBounds,
    centerPoint,
  ]);

  // Fly to selected activity
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !selectedItemId) return;

    const selected = items.find((i) => i.id === selectedItemId);
    if (!selected) return;

    const coords = parsePoint(selected.coords);
    if (!coords) return;

    map.flyTo({ center: [coords.lng, coords.lat], zoom: Math.max(map.getZoom(), 13), duration: 800 });
  }, [selectedItemId, items, mapLoaded, mapRef]);

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

  // Render search POI markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing search markers
    searchMarkersRef.current.forEach((m) => m.remove());
    searchMarkersRef.current = [];

    if (!searchPOIs?.length) return;

    searchPOIs.forEach((place) => {
      const { lat, lng } = place;
      if (lat == null || lng == null) return;

      const config = getCategoryConfig(place.category_group);
      const el = document.createElement("div");
      el.className = "search-poi-marker";
      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#7c3aed;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;transition:transform 0.15s;" 
             onmouseenter="this.style.transform='scale(1.3)'" 
             onmouseleave="this.style.transform='scale(1)'"
             title="${(place.name_en || place.name_default).replace(/"/g, "&quot;")}">
          <span style="font-size:14px;">${config.emoji}</span>
        </div>
      `;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectSearchPOIRef.current?.(place);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);

      searchMarkersRef.current.push(marker);
    });
  }, [searchPOIs, mapLoaded, mapRef]);

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
