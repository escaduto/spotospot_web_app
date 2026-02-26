"use client";

import { useState, useEffect } from "react";
import type { ItineraryItem } from "@/src/supabase/types";
import { PlacePointResult } from "@/src/supabase/places";
import { usePlacesSearch } from "@/src/hooks/usePlacesSearch";
import { getPOIConfig } from "@/src/map/scripts/poi-config";
import CloseIcon from "@mui/icons-material/Close";
import TaskAltIcon from "@mui/icons-material/TaskAlt";

interface Props {
  item?: ItineraryItem;
  dayId: string;
  nextIndex?: number;
  onSave: (updates: Partial<ItineraryItem>) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  mapCenter?: { lng: number; lat: number };
  onSearchResultsChange?: (places: PlacePointResult[]) => void;
  /** Called when user hovers a search-result row (placeId) or leaves (null) */
  onHoverSearchResult?: (placeId: string | null) => void;
  mapSelectedPOI?: PlacePointResult | null;
  onMapPOIConsumed?: () => void;
}

export default function ActivityEditor({
  item,
  dayId,
  nextIndex = 0,
  onSave,
  onCancel,
  onDelete,
  mapCenter,
  onSearchResultsChange,
  onHoverSearchResult,
  mapSelectedPOI,
  onMapPOIConsumed,
}: Props) {
  const isNew = !item;
  const [form, setForm] = useState({
    title: item?.title ?? "",
    location_name: item?.location_name ?? "",
    item_type: item?.item_type ?? "activity",
    description: item?.description ?? "",
    duration_minutes: item?.duration_minutes ?? 60,
    coords: item?.location_coords ?? null,
    place_source_id: item?.place_source_id ?? null,
    place_table: item?.place_table ?? null,
    start_time: item?.start_time ?? "",
    end_time: item?.end_time ?? "",
  });

  // Track whether coords were explicitly set via POI selection
  const [coordsManuallySet, setCoordsManuallySet] = useState(false);

  const [showPOISearch, setShowPOISearch] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync form coords when item prop changes (e.g. after drag-to-update)
  useEffect(() => {
    if (item?.location_coords != null && !coordsManuallySet) {
      setForm((f) => ({ ...f, coords: item.location_coords ?? null }));
    }
  }, [item?.location_coords, coordsManuallySet]);

  // POI search with current map center for distance-based sorting
  const { query, results, isOpen, handleQueryChange, clear } =
    usePlacesSearch(mapCenter);

  // Report search results to parent (for map display)
  useEffect(() => {
    onSearchResultsChange?.(results);
  }, [results, onSearchResultsChange]);

  // Handle POI selected from map click
  useEffect(() => {
    if (mapSelectedPOI) {
      handleSelectPOIInternal(mapSelectedPOI);
      onMapPOIConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSelectedPOI]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { coords: _coords, ...rest } = form;
      const updates: Partial<ItineraryItem> = {
        ...rest,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        itinerary_day_id: dayId,
        order_index: item?.order_index ?? nextIndex,
      };
      // Only include coords if explicitly set via POI selection
      if (coordsManuallySet) {
        updates.location_coords = form.coords;
      }
      await onSave(updates);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPOIInternal = (place: PlacePointResult) => {
    setForm((f) => ({
      ...f,
      place_source_id: place.id,
      place_table: place.place_table || "places",
      location_name: place.name_en || place.name_default,
      coords: `POINT(${place.lng} ${place.lat})`,
    }));
    setCoordsManuallySet(true);
    setShowPOISearch(false);
    clear();
  };

  const handleSelectPOI = (place: PlacePointResult) => {
    handleSelectPOIInternal(place);
  };

  return (
    <div className="border-2 border-blue-400 rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-gray-900">
          {isNew ? "New Activity" : "Edit Activity"}
        </h4>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 flex items-center"
        >
          <CloseIcon style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-gray-600">Title *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          placeholder="e.g., Visit Golden Gate Bridge"
        />
      </div>

      {/* POI Search/Match */}
      <div>
        <label className="text-xs font-medium text-gray-600">
          Link to POI{" "}
          {form.place_source_id && (
            <span className="text-green-600 inline-flex items-center gap-0.5">
              <TaskAltIcon style={{ fontSize: 11 }} /> Matched
            </span>
          )}
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              handleQueryChange(e.target.value);
              setShowPOISearch(true);
            }}
            onFocus={() => setShowPOISearch(true)}
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
            placeholder="Search for a place..."
          />

          {showPOISearch && isOpen && results.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg border shadow-xl max-h-60 overflow-y-auto z-50">
              {results.map((place) => {
                const config = getPOIConfig(place.category);
                return (
                  <button
                    key={place.id}
                    onClick={() => handleSelectPOI(place)}
                    onMouseEnter={() => onHoverSearchResult?.(place.id)}
                    onMouseLeave={() => onHoverSearchResult?.(null)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left border-b last:border-0"
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {place.name_en || place.name_default}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {[place.city, place.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {form.place_source_id && (
          <div className="mt-1 text-xs">
            <span className="text-green-600">
              Matched to: {form.location_name}
            </span>
            <button
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  place_source_id: null,
                  place_table: null,
                  location_name: "",
                  coords: null,
                }))
              }
              className="ml-2 text-red-600 underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Location name (manual) */}
      <div>
        <label className="text-xs font-medium text-gray-600">
          Location Name
        </label>
        <input
          type="text"
          value={form.location_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, location_name: e.target.value }))
          }
          className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          placeholder="e.g., Golden Gate Bridge"
        />
      </div>

      {/* Type and Duration */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-600">Type</label>
          <select
            value={form.item_type}
            onChange={(e) =>
              setForm((f) => ({ ...f, item_type: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          >
            <option value="activity">Activity</option>
            <option value="food">Food</option>
            <option value="transport">Transport</option>
            <option value="accommodation">Accommodation</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">
            Duration (min)
          </label>
          <input
            type="number"
            value={form.duration_minutes}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                duration_minutes: parseInt(e.target.value) || 0,
              }))
            }
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          />
        </div>
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-600">
            Start Time
          </label>
          <input
            type="time"
            value={form.start_time}
            onChange={(e) =>
              setForm((f) => ({ ...f, start_time: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">End Time</label>
          <input
            type="time"
            value={form.end_time}
            onChange={(e) =>
              setForm((f) => ({ ...f, end_time: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-gray-600">Description</label>
        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          rows={3}
          placeholder="Activity details..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSubmit}
          disabled={!form.title || saving}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={saving}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Delete
          </button>
        )}
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
