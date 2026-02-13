import { useEffect, useRef } from "react";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import type { SeedItineraryItems } from "@/src/supabase/types";
import { parsePoint } from "@/src/utils/geo";

interface UseActivityLayersArgs {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  items: SeedItineraryItems[];
  selectedItemId: string | null;
  editingItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onUpdateCoords?: (itemId: string, lng: number, lat: number) => void;
  centerPoint: { lng: number; lat: number } | null;
}

/**
 * Pushes activity items into the "activities" GeoJSON source and
 * manages feature-state for selection / editing highlights.
 *
 * The ONE item being edited gets a draggable DOM Marker overlay
 * because MapLibre GeoJSON features don't support native drag.
 */
export function useActivityLayers({
  mapRef,
  mapLoaded,
  items,
  selectedItemId,
  editingItemId,
  onSelectItem,
  onUpdateCoords,
  centerPoint,
}: UseActivityLayersArgs) {
  const dragMarkerRef = useRef<maplibregl.Marker | null>(null);
  const repPointMarkerRef = useRef<maplibregl.Marker | null>(null);

  // ── Push data into GeoJSON source ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("activities") as GeoJSONSource | undefined;
    if (!source) return;

    const features = items
      .map((item, index) => {
        const coords = parsePoint(item.coords);
        if (!coords) return null;

        const timeRange = [item.start_time, item.end_time]
          .filter(Boolean)
          .join(" – ");

        return {
          type: "Feature" as const,
          id: index, // numeric id for feature-state
          properties: {
            _itemId: item.id,
            label: String(index + 1),
            sortKey: index,
            title: item.title,
            itemType: item.item_type,
            locationName: item.location_name ?? "",
            timeRange,
            durationMin: item.duration_minutes ?? 0,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [coords.lng, coords.lat],
          },
        };
      })
      .filter(Boolean);

    source.setData({
      type: "FeatureCollection",
      features: features as GeoJSON.Feature[],
    });

    // Apply feature-state for selection / editing
    // (must run after setData, on next tick so features are registered)
    requestAnimationFrame(() => {
      items.forEach((item, index) => {
        map.setFeatureState(
          { source: "activities", id: index },
          {
            selected: item.id === selectedItemId,
            editing: item.id === editingItemId,
          },
        );
      });
    });
  }, [items, selectedItemId, editingItemId, mapLoaded, mapRef]);

  // ── Draggable marker for the editing item ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Remove previous drag marker
    dragMarkerRef.current?.remove();
    dragMarkerRef.current = null;

    if (!editingItemId || !onUpdateCoords) return;

    const editItem = items.find((i) => i.id === editingItemId);
    if (!editItem) return;

    const coords = parsePoint(editItem.coords);
    if (!coords) return;

    const el = document.createElement("div");
    el.className =
      "flex items-center justify-center w-7 h-7 rounded-full " +
      "bg-yellow-500 text-white shadow-lg cursor-grab " +
      "animate-pulse border-2 border-white";

    const idx = items.indexOf(editItem) + 1;
    el.innerHTML = `<span class="text-xs font-bold">${idx}</span>`;

    const marker = new maplibregl.Marker({
      element: el,
      anchor: "center",
      draggable: true,
    })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);

    marker.on("dragend", () => {
      const { lng, lat } = marker.getLngLat();
      onUpdateCoords(editingItemId, lng, lat);
    });

    dragMarkerRef.current = marker;

    return () => {
      marker.remove();
      dragMarkerRef.current = null;
    };
  }, [editingItemId, items, mapLoaded, mapRef, onUpdateCoords]);

  // ── Click on activity circle → select ──
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredIdRef = useRef<number | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layer = "activities-circle";

    const clearHover = () => {
      if (hoveredIdRef.current !== null) {
        map.setFeatureState(
          { source: "activities", id: hoveredIdRef.current },
          { hover: false },
        );
        hoveredIdRef.current = null;
      }
      map.getCanvas().style.cursor = "";
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
    };

    const onMove = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      if (!e.features?.length) return;
      const feat = e.features[0];
      const fid = feat.id as number;
      if (hoveredIdRef.current === fid) return;

      clearHover();
      hoveredIdRef.current = fid;
      map.setFeatureState({ source: "activities", id: fid }, { hover: true });
      map.getCanvas().style.cursor = "pointer";

      const p = feat.properties!;
      const durationStr = p.durationMin > 0 ? `${p.durationMin} min` : "";
      const details = [p.timeRange, durationStr].filter(Boolean).join(" · ");

      const html = `
        <div class="activity-popup-card">
          <div class="activity-popup-header">
            <span class="activity-popup-number">${p.label}</span>
            <span class="activity-popup-type">${p.itemType}</span>
          </div>
          <div class="activity-popup-title">${p.title}</div>
          ${p.locationName ? `<div class="activity-popup-location">${p.locationName}</div>` : ""}
          ${details ? `<div class="activity-popup-details">${details}</div>` : ""}
        </div>
      `;

      const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [
        number,
        number,
      ];

      hoverPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 18,
        anchor: "bottom",
        className: "activity-popup",
      })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);
    };

    const onClick = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      const itemId = e.features?.[0]?.properties?._itemId;
      if (itemId) onSelectItem(itemId);
    };

    map.on("mousemove", layer, onMove);
    map.on("mouseleave", layer, clearHover);
    map.on("click", layer, onClick);

    return () => {
      map.off("mousemove", layer, onMove);
      map.off("mouseleave", layer, clearHover);
      map.off("click", layer, onClick);
      hoverPopupRef.current?.remove();
    };
  }, [mapLoaded, mapRef, onSelectItem]);

  // ── Map click while editing → place at click location ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !editingItemId || !onUpdateCoords) return;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      onUpdateCoords(editingItemId, e.lngLat.lng, e.lngLat.lat);
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [mapLoaded, mapRef, editingItemId, onUpdateCoords]);

  // ── Fly to selected ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !selectedItemId) return;

    const selected = items.find((i) => i.id === selectedItemId);
    if (!selected) return;
    const coords = parsePoint(selected.coords);
    if (!coords) return;

    map.flyTo({
      center: [coords.lng, coords.lat],
      zoom: Math.max(map.getZoom(), 13),
      duration: 800,
    });
  }, [selectedItemId, items, mapLoaded, mapRef]);

  // ── Rep-point marker (green dot at center) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !centerPoint) return;

    if (repPointMarkerRef.current) return; // already placed

    const el = document.createElement("div");
    el.className =
      "w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-lg opacity-60";

    repPointMarkerRef.current = new maplibregl.Marker({
      element: el,
      anchor: "center",
    })
      .setLngLat([centerPoint.lng, centerPoint.lat])
      .addTo(map);

    return () => {
      repPointMarkerRef.current?.remove();
      repPointMarkerRef.current = null;
    };
  }, [centerPoint, mapLoaded, mapRef]);
}
